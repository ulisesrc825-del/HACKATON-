import type {
  ABCCategory, EquipmentItem, EquipmentKit, Laboratory, LabBooking,
  LoanRequest, LoanStatus, ReturnCondition, UserProfile, UserRole,
} from '../types/warehouse';

const base = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Ocurrió un error inesperado.';

async function request<T>(path: string, method = 'GET', body?: unknown, headers?: Record<string, string>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method, credentials: 'include',
      headers: body === undefined ? headers : { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con la API. Inicia el sistema con npm run dev:full o INICIAR.cmd.');
  }
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload === null) throw new ApiError(response.status, payload?.error || 'La API devolvió una respuesta inesperada.');
  return payload;
}

export interface Subject { id: number; carrera_id: number; nombre: string; cuatrimestre: number }
export interface Career { id: number; nombre: string; clave: string }
export interface Teacher { id: string; name: string }
export interface Location {
  id: number; zona: ABCCategory; estante: string; nivel: string; distancia_metros: number;
  coord_x: number | null; coord_y: number | null;
}
interface RawLab { id: number; clave: string; nombre: string; edificio: string; capacidad: number; estado: Laboratory['status'] }
export interface Catalogs {
  carreras: Career[];
  materias: Subject[];
  categorias: { id: number; nombre: string; descripcion: string | null }[];
  ubicaciones: Location[];
  laboratorios: Laboratory[];
}
export interface QueueRecord {
  id: number; fecha: string; hora: number; ventanillas_activas: number;
  total_llegadas: number; promedio_servicio_seg: number; promedio_espera_seg: number;
}
export interface AuthConfig {
  demoUsers: { id: string; role: UserRole; matricula: string }[];
  captchaSiteKey: string | null;
  mailMode: 'smtp' | 'console' | 'off';
}
export interface NewLoan {
  materia_id: number; nombre_practica: string; docente_id?: number; observaciones: string;
  detalle_prestamos: { material_id: number; kit_id?: number; cantidad_pedida: number }[];
}
export interface LoanUpdate {
  estado: LoanStatus;
  observaciones?: string;
  segundos_atencion?: number;
  detalle_prestamos?: { id: number; cantidad_devuelta: number; estado_devolucion: ReturnCondition; nota_revision?: string }[];
}
export interface NewBooking {
  laboratorio_id: number; docente_id?: number; materia_id: number; prestamo_id?: number;
  grupo: string; fecha: string; hora_inicio: string; hora_fin: string;
}
export type NewUser = Pick<UserProfile, 'matricula' | 'email' | 'fullName' | 'careerId' | 'role'>;

interface RawMaterial extends Omit<Location, 'id'> {
  id: number; ubicacion_id: number; codigo_inventario: string; nombre: string; categoria: string;
  clasificacion_abc: ABCCategory; costo_unitario: number; stock_total: number; stock_disponible: number;
  demanda_anual: number; tipo: EquipmentItem['type']; estado: EquipmentItem['state'];
}
interface RawKit {
  id: number; ubicacion_id: number; codigo: string; nombre: string; materia: string | null;
  estante: string; nivel: string; activo: number;
  detalle_kits: { material_id: number; cantidad: number; material: RawMaterial }[];
}
interface RawLoan {
  id: number; folio: string; codigo_qr: string; solicitante: string; solicitante_matricula: string;
  solicitante_correo: string; carrera: string | null; materia: string; nombre_practica: string;
  fecha_solicitud: string; estado: LoanStatus; fecha_entrega: string | null; fecha_devolucion: string | null;
  carril: 'rapido_qr' | 'normal' | 'devolucion'; observaciones: string | null;
  docente_id: number | null; docente: string | null;
  detalle_prestamos: (Pick<RawMaterial, 'codigo_inventario' | 'nombre' | 'clasificacion_abc' | 'tipo' | 'costo_unitario' | 'estante' | 'nivel'> & {
    id: number; material_id: number; kit_id: number | null; cantidad_pedida: number; cantidad_entregada: number;
    cantidad_devuelta: number; estado_devolucion: ReturnCondition | 'pendiente'; nota_revision: string | null;
  })[];
}
interface RawBooking {
  id: number; laboratorio_id: number; laboratorio: string; docente: string; docente_matricula: string;
  docente_correo: string; materia: string; grupo: string; fecha: string; hora_inicio: string; hora_fin: string;
  estado: LabBooking['status']; practica: string | null;
}

const zones: Record<ABCCategory, EquipmentItem['zone']> = {
  A: 'Zona A (Inmediata)', B: 'Zona B (Media)', C: 'Zona C (Fondo/Custodia)',
};
function mapMaterials(materials: RawMaterial[]): EquipmentItem[] {
  return [...materials].sort((a, b) => b.demanda_anual - a.demanda_anual || a.id - b.id).map(material => ({
    id: String(material.id), code: material.codigo_inventario, name: material.nombre, family: material.categoria,
    categoryABC: material.clasificacion_abc, unitCostMXN: material.costo_unitario, totalQuantity: material.stock_total,
    availableQuantity: material.stock_disponible, annualDemand: material.demanda_anual,
    locationId: String(material.ubicacion_id), shelfLocation: `${material.estante} · ${material.nivel}`,
    zone: zones[material.zona], accessDistanceMeters: material.distancia_metros, type: material.tipo,
    state: material.estado,
  }));
}

function mapKit(kit: RawKit): EquipmentKit {
  return {
    id: String(kit.id), code: kit.codigo, locationId: String(kit.ubicacion_id), name: kit.nombre,
    targetPractice: kit.materia ?? 'Uso general', preAssembledLocation: `${kit.estante} · ${kit.nivel}`,
    active: Boolean(kit.activo),
    items: kit.detalle_kits.map(item => ({
      equipmentId: String(item.material_id), name: item.material.nombre, quantity: item.cantidad,
    })),
  };
}

function mapLoan(loan: RawLoan): LoanRequest {
  const items = loan.detalle_prestamos.map(line => ({
    id: line.id, equipmentId: String(line.material_id), kitId: line.kit_id ? String(line.kit_id) : undefined,
    name: line.nombre, code: line.codigo_inventario, categoryABC: line.clasificacion_abc, quantity: line.cantidad_pedida,
    type: line.tipo, unitCostMXN: line.costo_unitario, shelfLocation: `${line.estante} · ${line.nivel}`,
    delivered: line.cantidad_entregada, returned: line.cantidad_devuelta,
    condition: line.estado_devolucion, reviewNote: line.nota_revision,
  }));
  const lanes = { rapido_qr: 'Carril Rápido', normal: 'Ventanilla General', devolucion: 'Devolución' } as const;
  return {
    id: loan.folio, recordId: loan.id, qrDataString: loan.codigo_qr, studentName: loan.solicitante,
    studentMatricula: loan.solicitante_matricula, studentEmail: loan.solicitante_correo, career: loan.carrera ?? '',
    subject: loan.materia, practiceName: loan.nombre_practica, teacherId: loan.docente_id == null ? null : String(loan.docente_id),
    teacherName: loan.docente, items, totalItemsCount: items.reduce((sum, line) => sum + line.quantity, 0),
    totalValueMXN: items.reduce((sum, line) => sum + line.quantity * line.unitCostMXN, 0), requestedAt: loan.fecha_solicitud,
    status: loan.estado, dispatchedAt: loan.fecha_entrega ?? undefined, returnedAt: loan.fecha_devolucion ?? undefined,
    dispatchLane: lanes[loan.carril], notes: loan.observaciones ?? undefined,
  };
}

function mapBooking(booking: RawBooking): LabBooking {
  return {
    id: String(booking.id), labId: String(booking.laboratorio_id), labName: booking.laboratorio, teacherName: booking.docente,
    teacherMatricula: booking.docente_matricula, teacherEmail: booking.docente_correo, subject: booking.materia,
    group: booking.grupo, date: booking.fecha, startTime: booking.hora_inicio, endTime: booking.hora_fin,
    purpose: booking.practica, status: booking.estado,
  };
}

export const api = {
  authConfig: () => request<AuthConfig>('/auth/config'),
  session: () => request<UserProfile>('/auth/session'),
  login: (body: { identifier?: string; password?: string; demoRole?: UserRole; remember?: boolean; captchaToken?: string }) =>
    request<UserProfile>('/auth/login', 'POST', body),
  logout: () => request<void>('/auth/logout', 'POST', {}),
  sendCode: (body: { email: string; purpose: 'activation' | 'recovery'; matricula?: string; captchaToken?: string }) =>
    request<{ challengeId: string }>('/auth/codigo', 'POST', body),
  verifyCode: (challengeId: string, code: string) => request<void>('/auth/verificar-codigo', 'POST', { challengeId, code }),
  setPassword: (body: { challengeId: string; code: string; password: string; accepted: boolean; captchaToken?: string }) =>
    request<UserProfile>('/auth/clave', 'POST', body),
  catalogs: async (): Promise<Catalogs> => {
    const data = await request<Omit<Catalogs, 'laboratorios'> & { laboratorios: RawLab[] }>('/catalogos');
    return { ...data, laboratorios: data.laboratorios.map(lab => ({
      id: String(lab.id), code: lab.clave, name: lab.nombre, building: lab.edificio,
      capacityStudents: lab.capacidad, status: lab.estado,
    })) };
  },
  materials: async () => mapMaterials(await request<RawMaterial[]>('/materiales')),
  kits: async () => (await request<RawKit[]>('/kits')).map(mapKit),
  loans: async () => (await request<RawLoan[]>('/prestamos')).map(mapLoan),
  createLoan: async (body: NewLoan, key: string) => mapLoan(await request<RawLoan>('/prestamos', 'POST', body, { 'Idempotency-Key': key })),
  updateLoan: async (id: number, body: LoanUpdate) => {
    const result = await request<{ prestamo: RawLoan; materiales: RawMaterial[] | null }>(`/prestamos/${id}/estado`, 'PATCH', body);
    return { loan: mapLoan(result.prestamo), materials: result.materiales && mapMaterials(result.materiales) };
  },
  bookings: async () => (await request<RawBooking[]>('/reservas-laboratorio')).map(mapBooking),
  createBooking: async (body: NewBooking) => mapBooking(await request<RawBooking>('/reservas-laboratorio', 'POST', body)),
  queue: () => request<QueueRecord[]>('/metricas-cola'),
  teachers: () => request<Teacher[]>('/usuarios/docentes'),
  users: () => request<UserProfile[]>('/usuarios'),
  createUser: (body: NewUser) => request<UserProfile>('/usuarios', 'POST', body),
  updateRole: (id: string, role: UserRole) => request<UserProfile>(`/usuarios/${id}/rol`, 'PATCH', { role }),
};
