import { Router } from 'express';
import { HttpError, integer, pool, requireRole, route, rows, string, transaction } from './db.js';

export const reservations = Router();
const selectBooking = `SELECT r.*, l.nombre AS laboratorio, u.nombre_completo AS docente,
  u.matricula AS docente_matricula, u.correo AS docente_correo, m.nombre AS materia,
  p.nombre_practica AS practica
  FROM reservas_laboratorio r JOIN laboratorios l ON l.id = r.laboratorio_id
  JOIN usuarios u ON u.id = r.docente_id JOIN materias m ON m.id = r.materia_id
  LEFT JOIN prestamos p ON p.id = r.prestamo_id`;

reservations.get('/', route(async (_req, res) => {
  res.json(await rows(pool, `${selectBooking} ORDER BY r.fecha DESC, r.hora_inicio, r.id`));
}));

function time(value) {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)) {
    throw new HttpError(400, 'Ingresa horas válidas en formato HH:MM.');
  }
  return value.length === 5 ? `${value}:00` : value;
}

reservations.post('/', route(async (req, res) => {
  requireRole(req.user, 'docente', 'admin');
  const { laboratorio_id, materia_id, docente_id, prestamo_id, fecha, hora_inicio, hora_fin, grupo } = req.body;
  const labId = integer(laboratorio_id, 'Laboratorio');
  const subjectId = integer(materia_id, 'Materia');
  const teacherId = req.user.rol === 'docente' ? req.user.id : integer(docente_id, 'Docente');
  const loanId = prestamo_id == null ? null : integer(prestamo_id, 'Préstamo');
  const group = string(grupo, 'Grupo', 20);
  const date = typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? new Date(fecha) : null;
  if (!date || !Number.isFinite(+date) || date.toISOString().slice(0, 10) !== fecha) {
    throw new HttpError(400, 'Ingresa una fecha válida.');
  }
  const start = time(hora_inicio);
  const end = time(hora_fin);
  if (end <= start) throw new HttpError(400, 'La hora de fin debe ser posterior al inicio.');

  const booking = await transaction(async db => {
    const [lab] = await rows(db, 'SELECT estado FROM laboratorios WHERE id = ? FOR UPDATE', [labId]);
    if (!lab || lab.estado !== 'disponible') throw new HttpError(409, 'El laboratorio no está disponible.');
    const conflicts = await rows(db, `SELECT id FROM reservas_laboratorio
      WHERE laboratorio_id = ? AND fecha = ? AND estado <> 'cancelada'
      AND hora_inicio < ? AND hora_fin > ? LIMIT 1 FOR UPDATE`, [labId, fecha, end, start]);
    if (conflicts.length) throw new HttpError(409, 'El laboratorio ya tiene una reserva en ese horario.');

    const [teacher] = await rows(db, "SELECT id FROM usuarios WHERE id = ? AND activo = 1 AND rol = 'docente'", [teacherId]);
    if (!teacher) throw new HttpError(400, 'Selecciona un docente activo.');
    if (loanId) {
      const [loan] = await rows(db, 'SELECT solicitante_id, docente_id, materia_id FROM prestamos WHERE id = ?', [loanId]);
      if (!loan || loan.materia_id !== subjectId || ![loan.solicitante_id, loan.docente_id].includes(teacherId)) {
        throw new HttpError(400, 'El préstamo debe corresponder al docente y a la materia.');
      }
    }
    const result = await rows(db, `INSERT INTO reservas_laboratorio
      (laboratorio_id, docente_id, materia_id, prestamo_id, grupo, fecha, hora_inicio, hora_fin, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmada')`, [labId, teacherId, subjectId, loanId, group, fecha, start, end]);
    const [created] = await rows(db, `${selectBooking} WHERE r.id = ?`, [result.insertId]);
    return created;
  });
  res.status(201).json(booking);
}));
