import { Router } from 'express';
import { pool, rows, route } from './db.js';

export const catalog = Router();

const materialQuery = `SELECT m.*, c.nombre AS categoria, u.zona, u.estante, u.nivel,
  u.distancia_metros, u.coord_x, u.coord_y
  FROM materiales m JOIN categorias c ON c.id = m.categoria_id
  JOIN ubicaciones u ON u.id = m.ubicacion_id`;

export function materials(db = pool) {
  return rows(db, `${materialQuery} ORDER BY m.id`);
}

catalog.get('/catalogos', route(async (_req, res) => {
  const tables = ['carreras', 'materias', 'categorias', 'ubicaciones', 'laboratorios'];
  const records = await Promise.all(tables.map(table => rows(pool, `SELECT * FROM ${table} ORDER BY id`)));
  res.json(Object.fromEntries(tables.map((table, index) => [table, records[index]])));
}));

catalog.get('/materiales', route(async (_req, res) => res.json(await materials())));

catalog.get('/kits', route(async (_req, res) => {
  const [kits, details, inventory] = await Promise.all([
    rows(pool, `SELECT k.*, m.nombre AS materia, u.zona, u.estante, u.nivel, u.distancia_metros, u.coord_x, u.coord_y
      FROM kits k LEFT JOIN materias m ON m.id = k.materia_id
      JOIN ubicaciones u ON u.id = k.ubicacion_id ORDER BY k.id`),
    rows(pool, 'SELECT * FROM detalle_kits ORDER BY id'),
    materials(),
  ]);
  const byId = new Map(inventory.map(item => [item.id, item]));
  const byKit = Map.groupBy(details, detail => detail.kit_id);
  res.json(kits.map(kit => ({
    ...kit,
    detalle_kits: (byKit.get(kit.id) ?? []).map(detail => ({ ...detail, material: byId.get(detail.material_id) })),
  })));
}));

catalog.get('/metricas-cola', route(async (_req, res) => {
  res.json(await rows(pool, 'SELECT * FROM registros_cola ORDER BY fecha, hora, id'));
}));
