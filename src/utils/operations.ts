import type { Location, QueueRecord } from '../services/api';
import type { EquipmentItem, EquipmentKit, OperationalIndicator, PickingComparison, WarehouseRack } from '../types/warehouse';

export const money = (value: number) => value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

export function inventoryTotals(items: EquipmentItem[]) {
  return items.reduce((total, item) => ({
    units: total.units + item.totalQuantity,
    available: total.available + item.availableQuantity,
    demand: total.demand + item.annualDemand,
    value: total.value + item.totalQuantity * item.unitCostMXN,
  }), { units: 0, available: 0, demand: 0, value: 0 });
}

export function operationalIndicators(materials: EquipmentItem[], records: QueueRecord[]): OperationalIndicator[] {
  const totals = inventoryTotals(materials);
  const arrivals = records.reduce((sum, record) => sum + record.total_llegadas, 0);
  const average = (key: 'promedio_espera_seg' | 'promedio_servicio_seg') =>
    arrivals ? Math.round(records.reduce((sum, record) => sum + record[key] * record.total_llegadas, 0) / arrivals) : null;
  const wait = average('promedio_espera_seg');
  const service = average('promedio_servicio_seg');
  return [
    { id: 'wait', indicator: 'Espera promedio', actualValue: wait ?? 'Sin registros', institutionalTarget: '≤ 240',
      proposedOptimizedValue: '—', unit: 'seg', operationalNote: 'Promedio ponderado por llegadas registradas.',
      status: wait === null ? 'warning' : wait <= 240 ? 'optimal' : 'critical' },
    { id: 'service', indicator: 'Atención promedio', actualValue: service ?? 'Sin registros', institutionalTarget: '≤ 25 en carril rápido',
      proposedOptimizedValue: '—', unit: 'seg', operationalNote: 'Los registros horarios incluyen todas las ventanillas.',
      status: 'warning' },
    { id: 'arrivals', indicator: 'Llegadas en la muestra', actualValue: arrivals, institutionalTarget: '—',
      proposedOptimizedValue: '—', unit: 'vales', operationalNote: `${records.length} registros horarios en MariaDB.`, status: 'optimal' },
    { id: 'stock', indicator: 'Existencias disponibles', actualValue: totals.available, institutionalTarget: '—',
      proposedOptimizedValue: '—', unit: 'unidades', operationalNote: `${totals.units} unidades totales en el inventario.`, status: 'optimal' },
    { id: 'value', indicator: 'Valor del inventario', actualValue: money(totals.value), institutionalTarget: '—',
      proposedOptimizedValue: '—', unit: 'MXN', operationalNote: 'Costo unitario por existencias totales.', status: 'optimal' },
  ];
}

type Point = { x: number; y: number };
const windowPoint: Point = { x: 370, y: 47 };

export function warehousePlan(locations: Location[], materials: EquipmentItem[], kits: EquipmentKit[]) {
  const positioned = locations.filter(location => location.coord_x !== null && location.coord_y !== null);
  const extent = (values: number[]) => [Math.min(...values), Math.max(...values)] as const;
  const xRange = extent(positioned.map(location => location.coord_x!));
  const yRange = extent(positioned.map(location => location.coord_y!));
  const scale = (value: number, [min, max]: readonly [number, number], start: number, span: number) =>
    min === max ? start + span / 2 : start + (value - min) / (max - min) * span;
  const points = new Map<string, Point>();
  const byLocation = new Map<string, Location>();
  const racks: WarehouseRack[] = positioned.map(location => {
    const id = String(location.id);
    const x = scale(location.coord_x!, xRange, 160, 265);
    const y = scale(location.coord_y!, yRange, 130, 405);
    points.set(id, { x: x + 37, y: y + 22 });
    byLocation.set(id, location);
    const items = materials.filter(item => item.locationId === id);
    const totals = inventoryTotals(items);
    return {
      id, code: location.estante, zone: location.zona, name: location.nivel,
      x, y, width: 74, height: 44, itemCount: totals.available, avgDailyPicks: Number((totals.demand / 365).toFixed(1)),
      totalValueMXN: totals.value, description: `${location.distancia_metros} m desde ventanilla · ${totals.available} de ${totals.units} unidades disponibles`,
      shelves: [{ level: location.nivel, items: items.map(item => `${item.name} · ${item.availableQuantity}/${item.totalQuantity} disponibles`),
        utilization: totals.units ? Math.round(100 * totals.available / totals.units) : 0 }],
    };
  });

  const gridDistance = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  const ratios = positioned.flatMap(location => {
    const point = points.get(String(location.id))!;
    const distance = gridDistance(windowPoint, point);
    return distance && location.distancia_metros ? [location.distancia_metros / distance] : [];
  });
  const metersPerUnit = ratios.length ? ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length : 0;

  function simulate(ids: string[]) {
    let current = windowPoint;
    let distance = 0;
    const path = [current];
    for (const next of [...ids.map(id => points.get(id)!), windowPoint]) {
      path.push({ x: next.x, y: current.y }, next);
      distance += gridDistance(current, next);
      current = next;
    }
    return { path, meters: ids.length === 1 ? 2 * byLocation.get(ids[0])!.distancia_metros : Number((distance * metersPerUnit).toFixed(1)) };
  }

  const routes: PickingComparison[] = kits.flatMap(kit => {
    if (!kit.active || !points.has(kit.locationId)) return [];
    const ids = kit.items.map(line => materials.find(item => item.id === line.equipmentId)?.locationId);
    if (!ids.length || ids.some(id => !id || !points.has(id))) return [];
    const traditional = simulate([...new Set(ids as string[])]);
    const preassembled = simulate([kit.locationId]);
    return [{
      orderName: kit.name,
      pathTraditional: traditional.path, pathOptimized: preassembled.path,
      traditionalDistanceMeters: traditional.meters, optimizedDistanceMeters: preassembled.meters,
      traditionalTimeSeconds: Math.round(traditional.meters), optimizedTimeSeconds: Math.round(preassembled.meters),
    }];
  });
  return { racks, routes };
}
