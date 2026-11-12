export type ABCCategory = 'A' | 'B' | 'C';

export interface EquipmentItem {
  id: string;
  code: string;
  name: string;
  family: string;
  categoryABC: ABCCategory;
  unitCostMXN: number;
  totalQuantity: number;
  availableQuantity: number;
  annualDemand: number;
  locationId: string;
  type: 'equipo' | 'componente' | 'consumible';
  state: 'activo' | 'mantenimiento' | 'baja';
  shelfLocation: string; // e.g. "Rack-A1-Nivel2"
  zone: 'Zona A (Inmediata)' | 'Zona B (Media)' | 'Zona C (Fondo/Custodia)';
  accessDistanceMeters: number; // distance from dispatch window
}

export interface EquipmentKit {
  id: string;
  code: string;
  locationId: string;
  name: string;
  targetPractice: string;
  items: { equipmentId: string; name: string; quantity: number }[];
  preAssembledLocation: string;
  active: boolean;
}

export interface WarehouseRack {
  id: string;
  code: string;
  zone: ABCCategory;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  itemCount: number;
  avgDailyPicks: number;
  totalValueMXN: number;
  description: string;
  shelves: {
    level: string;
    items: string[];
    utilization: number;
  }[];
}

export interface OperationalIndicator {
  id: string;
  indicator: string;
  actualValue: number | string;
  institutionalTarget: number | string;
  proposedOptimizedValue: number | string;
  unit: string;
  operationalNote: string;
  status: 'critical' | 'warning' | 'optimal';
}

export interface PickingComparison {
  orderName: string;
  traditionalDistanceMeters: number;
  optimizedDistanceMeters: number;
  traditionalTimeSeconds: number;
  optimizedTimeSeconds: number;
  pathTraditional: { x: number; y: number }[];
  pathOptimized: { x: number; y: number }[];
}

export type UserRole = 'student' | 'teacher' | 'technician' | 'admin';

export interface UserProfile {
  id: string;
  matricula: string;
  email: string;
  fullName: string;
  career: string;
  role: UserRole;
  careerId: string | null;
  active: boolean;
}

export interface CartItem {
  equipmentId: string;
  name: string;
  code: string;
  categoryABC: ABCCategory;
  quantity: number;
  unitCostMXN: number;
  shelfLocation: string;
  kitId?: string;
}

export const LOAN_STATUS = {
  pendiente: 'Pendiente de aprobación',
  aprobado: 'Aprobado',
  entregado: 'Despachado',
  devuelto: 'Devuelto conforme',
  vencido: 'Vencido',
  rechazado: 'Rechazado',
  con_incidencia: 'Con incidencia',
} as const;

export type LoanStatus = keyof typeof LOAN_STATUS;
export type ReturnCondition = 'buen_estado' | 'danado' | 'perdido' | 'consumido';

export interface LoanLine extends CartItem {
  id: number;
  type: EquipmentItem['type'];
  delivered: number;
  returned: number;
  condition: ReturnCondition | 'pendiente';
  reviewNote: string | null;
}

export interface LoanRequest {
  id: string; // Folio visible
  recordId: number;
  qrDataString: string;
  studentMatricula: string;
  studentName: string;
  studentEmail: string;
  career: string;
  subject: string; // Materia para la que lo solicitó
  practiceName?: string;
  teacherId: string | null;
  teacherName: string | null;
  items: LoanLine[];
  totalItemsCount: number;
  totalValueMXN: number;
  requestedAt: string; // ISO string or human date
  status: LoanStatus;
  dispatchedAt?: string;
  returnedAt?: string;
  dispatchLane: 'Carril Rápido' | 'Ventanilla General' | 'Devolución';
  notes?: string;
}

export interface Laboratory {
  id: string;
  code: string; // e.g. "LAB-01"
  name: string;
  building: string;
  capacityStudents: number;
  status: 'disponible' | 'mantenimiento' | 'cerrado';
}

export interface LabBooking {
  id: string;
  labId: string;
  labName: string;
  teacherName: string;
  teacherMatricula: string;
  teacherEmail: string;
  subject: string; // Materia para la que solicita
  group: string; // Grupo, ej. "MEC-401"
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  status: 'confirmada' | 'cancelada' | 'completada';
  purpose: string | null;
}

