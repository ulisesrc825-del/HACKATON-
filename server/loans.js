import { createHash, randomInt, randomUUID } from 'node:crypto';
import { Router } from 'express';
import { HttpError, integer, pool, requireRole, route, rows, string, transaction } from './db.js';
import { materials } from './catalog.js';

export const loans = Router();

async function listLoans(db, filter = '1 = 1', params = []) {
  const from = `FROM prestamos p JOIN usuarios u ON u.id = p.solicitante_id
    JOIN materias m ON m.id = p.materia_id LEFT JOIN carreras c ON c.id = u.carrera_id
    LEFT JOIN usuarios d ON d.id = p.docente_id`;
  const records = await rows(db, `SELECT p.*, u.nombre_completo AS solicitante,
    u.matricula AS solicitante_matricula, u.correo AS solicitante_correo, c.nombre AS carrera,
    d.nombre_completo AS docente, m.nombre AS materia ${from}
    WHERE ${filter} ORDER BY p.fecha_solicitud DESC, p.id DESC`, params);
  const details = await rows(db, `SELECT dp.*, i.codigo_inventario, i.nombre,
    i.clasificacion_abc, i.tipo, i.costo_unitario, ub.estante, ub.nivel
    ${from} JOIN detalle_prestamos dp ON dp.prestamo_id = p.id
    JOIN materiales i ON i.id = dp.material_id JOIN ubicaciones ub ON ub.id = i.ubicacion_id
    WHERE ${filter} ORDER BY dp.id`, params);
  const byLoan = Map.groupBy(details, detail => detail.prestamo_id);
  return records.map(loan => ({ ...loan, detalle_prestamos: byLoan.get(loan.id) ?? [] }));
}

loans.get('/', route(async (req, res) => {
  const { id, rol } = req.user;
  const result = await transaction(db => {
    if (rol === 'alumno') return listLoans(db, 'p.solicitante_id = ?', [id]);
    if (rol === 'docente') return listLoans(db, '(p.solicitante_id = ? OR p.docente_id = ?)', [id, id]);
    return listLoans(db);
  });
  res.json(result);
}));

function detailLines(value) {
  if (!Array.isArray(value) || !value.length || value.length > 100) {
    throw new HttpError(400, 'Incluye entre 1 y 100 renglones de materiales.');
  }
  const merged = new Map();
  for (const item of value) {
    const materialId = integer(item?.material_id, 'Material');
    const kitId = item?.kit_id == null ? null : integer(item.kit_id, 'Kit');
    const key = `${materialId}/${kitId ?? ''}`;
    const quantity = integer(item?.cantidad_pedida, 'Cantidad pedida', 1, 100000) + (merged.get(key)?.quantity ?? 0);
    merged.set(key, { materialId, kitId, quantity });
  }
  return [...merged.values()];
}

loans.post('/', route(async (req, res) => {
  requireRole(req.user, 'alumno', 'docente');
  const { materia_id, nombre_practica, carril = 'rapido_qr', observaciones, docente_id, detalle_prestamos } = req.body;
  const subject = integer(materia_id, 'Materia');
  const practice = string(nombre_practica, 'Práctica', 150);
  const notes = string(observaciones, 'Observaciones', 2000, false);
  const teacher = req.user.rol === 'docente' ? req.user.id
    : docente_id == null ? null : integer(docente_id, 'Docente');
  if (!['rapido_qr', 'normal'].includes(carril)) throw new HttpError(400, 'Selecciona un carril válido.');
  const details = detailLines(detalle_prestamos);
  const key = req.get('Idempotency-Key');
  if (key && !/^[\w-]{16,100}$/.test(key)) throw new HttpError(400, 'Identificador de solicitud inválido.');
  const qr = key
    ? `UPTEX-${createHash('sha256').update(`${req.user.id}:${key}`).digest('hex')}`
    : `UPTEX-${randomUUID()}`;

  const result = await transaction(async db => {
    // Serializa reintentos del mismo solicitante antes de leer el código QR.
    await rows(db, 'SELECT id FROM usuarios WHERE id = ? FOR UPDATE', [req.user.id]);
    if (key) {
      const [existing] = await listLoans(db, 'p.codigo_qr = ? AND p.solicitante_id = ?', [qr, req.user.id]);
      if (existing) return { loan: existing, status: 200 };
    }
    if (teacher) {
      const [record] = await rows(db, "SELECT id FROM usuarios WHERE id = ? AND activo = 1 AND rol = 'docente'", [teacher]);
      if (!record) throw new HttpError(400, 'Selecciona un docente activo.');
    }
    const [year] = await rows(db, 'SELECT YEAR(CURDATE()) AS year');
    let inserted;
    for (let attempt = 0; attempt < 20; attempt++) {
      const folio = `VALE-${year.year}-${String(randomInt(1, 10000)).padStart(4, '0')}`;
      try {
        inserted = await rows(db, `INSERT INTO prestamos
          (folio, codigo_qr, solicitante_id, docente_id, materia_id, nombre_practica, carril,
            estado, fecha_solicitud, fecha_limite, observaciones)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente', NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY), ?)`,
        [folio, qr, req.user.id, teacher, subject, practice, carril, notes]);
        break;
      } catch (error) {
        if (error.code !== 'ER_DUP_ENTRY') throw error;
      }
    }
    if (!inserted) throw new HttpError(503, 'No se pudo asignar un folio. Intenta de nuevo.');

    const totals = new Map();
    for (const { materialId, kitId, quantity } of details) {
      const total = quantity + (totals.get(materialId) ?? 0);
      totals.set(materialId, total);
      if (kitId) {
        const [member] = await rows(db, `SELECT dk.id FROM detalle_kits dk JOIN kits k ON k.id = dk.kit_id
          WHERE dk.kit_id = ? AND dk.material_id = ? AND k.activo = 1`, [kitId, materialId]);
        if (!member) throw new HttpError(400, 'El material no pertenece a un kit activo.');
      }
      const [material] = await rows(db, 'SELECT estado, stock_disponible, nombre FROM materiales WHERE id = ?', [materialId]);
      if (!material || material.estado !== 'activo') throw new HttpError(409, 'Un material ya no está habilitado.');
      if (total > material.stock_disponible) throw new HttpError(409, `Existencias insuficientes para ${material.nombre}.`);
      await rows(db, `INSERT INTO detalle_prestamos (prestamo_id, material_id, kit_id, cantidad_pedida, estado_devolucion)
        VALUES (?, ?, ?, ?, 'pendiente')`, [inserted.insertId, materialId, kitId, quantity]);
    }
    const [loan] = await listLoans(db, 'p.id = ?', [inserted.insertId]);
    return { loan, status: 201 };
  });
  res.status(result.status).json(result.loan);
}));

const dispatchRoles = ['tecnico', 'admin'];
const finalStates = ['devuelto', 'con_incidencia'];
const allowedReturnConditions = ['buen_estado', 'danado', 'perdido', 'consumido'];

function updatesByDetail(input, allowedIds, required) {
  if (input == null && !required) return null;
  if (!Array.isArray(input) || input.length !== allowedIds.size) {
    throw new HttpError(400, 'Incluye una revisión por cada renglón del vale.');
  }
  const result = new Map();
  for (const detail of input) {
    const id = integer(detail?.id, 'Renglón');
    if (!allowedIds.has(id) || result.has(id)) throw new HttpError(400, 'Hay un renglón inválido o repetido.');
    result.set(id, detail);
  }
  return result;
}

async function moveStock(db, material, loanId, userId, delta, type) {
  if (!delta) return;
  const next = material.stock_disponible + delta;
  if (next < 0 || next > material.stock_total) {
    throw new HttpError(409, `El movimiento excede las existencias de ${material.nombre}.`);
  }
  await rows(db, 'UPDATE materiales SET stock_disponible = ? WHERE id = ?', [next, material.id]);
  await rows(db, `INSERT INTO movimientos_inventario
    (material_id, usuario_id, prestamo_id, tipo_movimiento, cantidad, stock_resultante)
    VALUES (?, ?, ?, ?, ?, ?)`, [material.id, userId, loanId, type, delta, next]);
  material.stock_disponible = next;
}

async function dispatch(db, loan, user, details, inventory, input, notes) {
  const updates = updatesByDetail(input.detalle_prestamos, new Set(details.map(item => item.id)), false);
  const seconds = input.segundos_atencion == null ? null : integer(input.segundos_atencion, 'Tiempo de atención', 0);
  let delivered = 0;
  for (const line of details) {
    const material = inventory.get(line.material_id);
    const quantity = updates
      ? integer(updates.get(line.id).cantidad_entregada, 'Cantidad entregada', 0, line.cantidad_pedida)
      : line.cantidad_pedida;
    if (quantity && material.estado !== 'activo') throw new HttpError(409, `${material.nombre} no está habilitado.`);
    await moveStock(db, material, loan.id, user.id, -quantity, 'salida_prestamo');
    await rows(db, 'UPDATE detalle_prestamos SET cantidad_entregada = ? WHERE id = ?', [quantity, line.id]);
    delivered += quantity;
  }
  if (!delivered) throw new HttpError(400, 'Entrega al menos una unidad.');
  await rows(db, `UPDATE prestamos SET estado = 'entregado', tecnico_entrega_id = ?, fecha_entrega = NOW(),
    segundos_atencion = COALESCE(?, GREATEST(0, TIMESTAMPDIFF(SECOND, fecha_solicitud, NOW()))),
    observaciones = CONCAT_WS(CHAR(10), observaciones, ?) WHERE id = ?`, [user.id, seconds, notes, loan.id]);
}

async function checkIn(db, loan, user, details, inventory, input, notes) {
  const received = details.filter(line => line.cantidad_entregada > 0);
  if (!received.length) throw new HttpError(409, 'El vale no tiene materiales entregados.');
  const updates = updatesByDetail(input.detalle_prestamos, new Set(received.map(item => item.id)), true);
  let hasIncident = false;
  for (const line of received) {
    const material = inventory.get(line.material_id);
    const update = updates.get(line.id);
    const condition = update.estado_devolucion;
    const quantity = integer(update.cantidad_devuelta, 'Cantidad devuelta', 0, line.cantidad_entregada);
    const note = string(update.nota_revision, 'Nota de revisión', 255, false);
    if (!allowedReturnConditions.includes(condition)
        || (condition === 'consumido' && material.tipo !== 'consumible')
        || (['perdido', 'consumido'].includes(condition) ? quantity !== 0 : quantity !== line.cantidad_entregada)) {
      throw new HttpError(400, `Revisa la cantidad y el estado de ${material.nombre}.`);
    }
    await rows(db, `UPDATE detalle_prestamos SET cantidad_devuelta = ?, estado_devolucion = ?,
      nota_revision = ? WHERE id = ?`, [quantity, condition, note, line.id]);
    if (material.tipo !== 'consumible' && condition !== 'perdido') {
      await moveStock(db, material, loan.id, user.id, quantity, 'entrada_devolucion');
    }
    if (condition === 'danado' || condition === 'perdido') {
      hasIncident = true;
      const lost = condition === 'perdido';
      await rows(db, `INSERT INTO incidencias (prestamo_id, material_id, responsable_id, reportado_por_id,
        tipo, gravedad, costo_reposicion, estado, descripcion) VALUES (?, ?, ?, ?, ?, ?, ?, 'abierta', ?)`,
      [loan.id, material.id, loan.solicitante_id, user.id, lost ? 'extravio' : 'dano',
        lost ? 'grave' : 'media', lost ? line.cantidad_entregada * material.costo_unitario : 0,
        note ?? (lost ? 'Material extraviado durante el préstamo.' : 'Daño detectado en la devolución.')]);
    }
  }
  const status = hasIncident ? 'con_incidencia' : 'devuelto';
  if (input.estado !== status) throw new HttpError(400, 'El estado del vale debe coincidir con los resultados de revisión.');
  await rows(db, `UPDATE prestamos SET estado = ?, tecnico_recibe_id = ?, fecha_devolucion = NOW(),
    observaciones = CONCAT_WS(CHAR(10), observaciones, ?) WHERE id = ?`, [status, user.id, notes, loan.id]);
}

loans.patch('/:id/estado', route(async (req, res) => {
  const { estado: next, observaciones } = req.body;
  const approval = ['aprobado', 'rechazado'].includes(next);
  if (!approval && !['entregado', ...finalStates].includes(next)) throw new HttpError(400, 'Estado inválido.');
  requireRole(req.user, ...(approval ? ['docente', 'admin'] : dispatchRoles));
  const notes = string(observaciones, 'Observaciones', 2000, false);
  const loanId = integer(req.params.id, 'Préstamo');

  const result = await transaction(async db => {
    const [loan] = await rows(db, 'SELECT * FROM prestamos WHERE id = ? FOR UPDATE', [loanId]);
    if (!loan) throw new HttpError(404, 'El vale no existe.');
    if (approval && req.user.rol === 'docente' && loan.docente_id !== req.user.id) {
      throw new HttpError(403, 'Solo el docente asignado puede revisar este vale.');
    }
    const expected = approval ? ['pendiente'] : next === 'entregado' ? ['aprobado'] : ['entregado', 'vencido'];
    if (loan.estado !== next) {
      if (!expected.includes(loan.estado) || (loan.estado === 'vencido' && !loan.fecha_entrega)) {
        throw new HttpError(409, 'El vale cambió de estado o aún no está listo para esta acción.');
      }
      if (approval) {
        await rows(db, `UPDATE prestamos SET estado = ?, observaciones = CONCAT_WS(CHAR(10), observaciones, ?)
          WHERE id = ?`, [next, notes, loanId]);
      } else {
        const details = await rows(db, 'SELECT * FROM detalle_prestamos WHERE prestamo_id = ? ORDER BY id FOR UPDATE', [loanId]);
        const ids = [...new Set(details.map(item => item.material_id))];
        if (!ids.length) throw new HttpError(409, 'El vale no tiene renglones de materiales.');
        const locked = await rows(db, `SELECT * FROM materiales WHERE id IN (${ids.map(() => '?').join(',')})
          ORDER BY id FOR UPDATE`, ids);
        const inventory = new Map(locked.map(item => [item.id, item]));
        if (next === 'entregado') await dispatch(db, loan, req.user, details, inventory, req.body, notes);
        else await checkIn(db, loan, req.user, details, inventory, req.body, notes);
      }
    }
    const [updated] = await listLoans(db, 'p.id = ?', [loanId]);
    return { prestamo: updated, materiales: approval ? null : await materials(db) };
  });
  res.json(result);
}));
