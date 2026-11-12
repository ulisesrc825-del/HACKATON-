import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { KPIDashboard } from './components/KPIDashboard';
import { WarehouseLayoutMap } from './components/WarehouseLayoutMap';
import { QueueTheorySimulator } from './components/QueueTheorySimulator';
import { InventoryABCMatrix } from './components/InventoryABCMatrix';
import { FinancialROI } from './components/FinancialROI';
import { ExecutiveReportModal } from './components/ExecutiveReportModal';
import { StudentPortal } from './components/StudentPortal';
import { ReportsAuditView } from './components/ReportsAuditView';
import { TechnicianScannerView } from './components/TechnicianScannerView';
import { LoginScreenUPTex } from './components/LoginScreenUPTex';
import { LabTimelineScheduler } from './components/LabTimelineScheduler';
import { UserRoleManagement } from './components/UserRoleManagement';
import { api, ApiError, errorMessage } from './services/api';
import type { AuthConfig, Catalogs, LoanUpdate, NewBooking, NewLoan, NewUser, QueueRecord, Teacher } from './services/api';
import type { CartItem, EquipmentItem, EquipmentKit, LabBooking, LoanRequest, UserProfile, UserRole } from './types/warehouse';
import { operationalIndicators } from './utils/operations';

const homeTab: Record<UserRole, string> = {
  student: 'student_catalog', teacher: 'laboratories', technician: 'scanner', admin: 'laboratories',
};

export default function App() {
  if (import.meta.env.VITE_FRONTEND_PREVIEW === 'true') {
    return <LoginScreenUPTex preview initialError="" onLogin={() => undefined} />;
  }
  return <ConnectedApp />;
}

function ConnectedApp() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [config, setConfig] = useState<AuthConfig>();
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [activeTab, setActiveTab] = useState('student_catalog');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([api.session(), api.authConfig()]).then(([session, settings]) => {
      if (!mounted) return;
      if (session.status === 'fulfilled') openSession(session.value);
      if (settings.status === 'fulfilled') setConfig(settings.value);
      else setSessionError(errorMessage(settings.reason));
      setCheckingSession(false);
    });
    return () => { mounted = false; };
  }, []);

  function openSession(user: UserProfile) {
    setCurrentUser(user);
    setActiveTab(homeTab[user.role]);
    setCart([]);
    setCartOpen(false);
    setSessionError('');
    setIsReportOpen(false);
  }

  async function logout() {
    try {
      await api.logout();
      setCurrentUser(null);
      setCart([]);
      setCartOpen(false);
      setSessionError('');
    } catch (error) {
      setSessionError(errorMessage(error));
    }
  }

  const demoRoles = config?.demoUsers.map(user => user.role) ?? [];
  async function rotateRole() {
    if (!currentUser || demoRoles.length < 2) return;
    const next = demoRoles[(demoRoles.indexOf(currentUser.role) + 1) % demoRoles.length];
    try {
      openSession(await api.login({ demoRole: next }));
    } catch (error) {
      setSessionError(errorMessage(error));
    }
  }
  const switchRole = demoRoles.length > 1 ? rotateRole : undefined;

  if (checkingSession) return <p role="status" className="p-8 text-center text-sm text-slate-600">Comprobando sesión…</p>;
  if (!currentUser) return <LoginScreenUPTex initialConfig={config} initialError={sessionError} onLogin={openSession} />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar currentUser={currentUser} activeTab={activeTab} setActiveTab={setActiveTab} cart={cart}
        onOpenCart={() => { setActiveTab('student_catalog'); setCartOpen(true); }} onOpenReport={() => setIsReportOpen(true)}
        onLogout={logout} onSwitchRole={switchRole} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {sessionError && <p role="alert" className="mb-4 text-sm text-rose-700">{sessionError}</p>}
        <Workspace key={currentUser.id} user={currentUser} tab={activeTab} navigate={setActiveTab}
          cart={cart} setCart={setCart} cartOpen={cartOpen} setCartOpen={setCartOpen}
          reportOpen={isReportOpen} closeReport={() => setIsReportOpen(false)}
          onSessionExpired={() => { setCurrentUser(null); setCart([]); }} />
      </main>
      <footer className="bg-white border-t border-slate-200 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <span className="font-semibold text-slate-800">Universidad Politécnica de Texcoco · Inventario UPTex</span>
          <div className="flex items-center gap-4">
            {switchRole && <button onClick={switchRole} className="text-[#007A33] font-bold cursor-pointer">Rotar rol de demo</button>}
            <button onClick={logout} className="text-rose-600 hover:text-rose-800 font-medium cursor-pointer">Cerrar sesión</button>
            <button onClick={() => setIsReportOpen(true)} className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1 cursor-pointer">
              <FileText className="w-3.5 h-3.5" /> Ver dictamen técnico
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface WorkspaceProps {
  user: UserProfile;
  tab: string;
  navigate: (tab: string) => void;
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  reportOpen: boolean;
  closeReport: () => void;
  onSessionExpired: () => void;
}

const cartKey = (item: CartItem) => `${item.equipmentId}/${item.kitId ?? ''}`;

function Workspace({ user, tab, navigate, cart, setCart, cartOpen, setCartOpen, reportOpen, closeReport, onSessionExpired }: WorkspaceProps) {
  const [catalogs, setCatalogs] = useState<Catalogs>();
  const [materials, setMaterials] = useState<EquipmentItem[]>([]);
  const [kits, setKits] = useState<EquipmentKit[]>([]);
  const [loans, setLoans] = useState<LoanRequest[]>([]);
  const [bookings, setBookings] = useState<LabBooking[]>([]);
  const [queue, setQueue] = useState<QueueRecord[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let mounted = true;
    setError('');
    Promise.all([
      api.catalogs(), api.materials(), api.kits(), api.loans(), api.bookings(), api.queue(), api.teachers(),
      user.role === 'admin' ? api.users() : Promise.resolve([]),
    ]).then(([nextCatalogs, nextMaterials, nextKits, nextLoans, nextBookings, nextQueue, nextTeachers, nextUsers]) => {
      if (!mounted) return;
      setCatalogs(nextCatalogs);
      setMaterials(nextMaterials);
      setKits(nextKits);
      setLoans(nextLoans);
      setBookings(nextBookings);
      setQueue(nextQueue);
      setTeachers(nextTeachers);
      setUsers(nextUsers);
    }).catch(cause => {
      if (!mounted) return;
      if (cause instanceof ApiError && cause.status === 401) onSessionExpired();
      else setError(errorMessage(cause));
    });
    return () => { mounted = false; };
  }, [user.role, revision]);

  function addToCart(item: EquipmentItem | EquipmentKit) {
    const add = 'unitCostMXN' in item
      ? [{ material: item, quantity: 1, kitId: undefined }]
      : item.items.map(line => ({
        material: materials.find(material => material.id === line.equipmentId)!, quantity: line.quantity, kitId: item.id,
      }));
    if (!add.length || add.some(({ material }) => !material || material.state !== 'activo')) {
      throw new Error('Este material o kit no está disponible.');
    }
    const next = [...cart];
    for (const { material, quantity, kitId } of add) {
      const count = next.filter(line => line.equipmentId === material.id).reduce((total, line) => total + line.quantity, 0);
      if (count + quantity > material.availableQuantity) throw new Error(`Existencias insuficientes para ${material.name}.`);
      const line: CartItem = {
        equipmentId: material.id, name: material.name, code: material.code, categoryABC: material.categoryABC,
        quantity, kitId, unitCostMXN: material.unitCostMXN, shelfLocation: material.shelfLocation,
      };
      const index = next.findIndex(current => cartKey(current) === cartKey(line));
      if (index === -1) next.push(line);
      else next[index] = { ...line, quantity: next[index].quantity + quantity };
    }
    setCart(next);
  }

  function changeQuantity(key: string, delta: number) {
    const line = cart.find(item => cartKey(item) === key);
    if (!line) return;
    const count = cart.filter(item => item.equipmentId === line.equipmentId).reduce((total, item) => total + item.quantity, 0);
    const available = materials.find(material => material.id === line.equipmentId)?.availableQuantity ?? 0;
    if (delta > 0 && count + delta > available) throw new Error(`Existencias insuficientes para ${line.name}.`);
    setCart(cart.map(item => cartKey(item) === key ? { ...item, quantity: item.quantity + delta } : item).filter(item => item.quantity > 0));
  }

  async function createLoan(input: NewLoan, key: string) {
    const created = await api.createLoan(input, key);
    setLoans(current => [created, ...current.filter(loan => loan.recordId !== created.recordId)]);
    setCart([]);
    return created;
  }

  async function updateLoan(id: number, input: LoanUpdate) {
    const result = await api.updateLoan(id, input);
    setLoans(current => current.map(loan => loan.recordId === id ? result.loan : loan));
    if (result.materials) setMaterials(result.materials);
    return result.loan;
  }

  async function refreshLoans() {
    const current = await api.loans();
    setLoans(current);
    return current;
  }

  async function createBooking(input: NewBooking) {
    const booking = await api.createBooking(input);
    setBookings(current => [booking, ...current]);
  }

  async function changeRole(id: string, role: UserRole) {
    const updated = await api.updateRole(id, role);
    setUsers(current => current.map(account => account.id === id ? updated : account));
    setTeachers(current => [...current.filter(teacher => teacher.id !== id),
      ...(role === 'teacher' && updated.active ? [{ id, name: updated.fullName }] : [])]);
  }

  async function createUser(input: NewUser) {
    const account = await api.createUser(input);
    setUsers(current => [...current, account]);
    if (account.role === 'teacher') setTeachers(current => [...current, { id: account.id, name: account.fullName }]);
  }

  if (error) return (
    <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
      {error} <button className="ml-2 font-bold underline cursor-pointer" onClick={() => setRevision(value => value + 1)}>Reintentar</button>
    </div>
  );
  if (!catalogs) return <p role="status" className="p-8 text-center text-sm text-slate-600">Cargando datos de Inventario UPTex…</p>;

  const indicators = operationalIndicators(materials, queue);
  return (
    <>
      {tab === 'laboratories' && <LabTimelineScheduler laboratories={catalogs.laboratorios} bookings={bookings}
        currentUser={user} subjects={catalogs.materias} teachers={teachers} loans={loans} onAddBooking={createBooking} />}
      {tab === 'roles' && user.role === 'admin' && <UserRoleManagement users={users} currentUser={user}
        careers={catalogs.carreras} onUpdateUserRole={changeRole} onAddUser={createUser} />}
      {tab === 'student_catalog' && <StudentPortal currentUser={user} cart={cart} isCartOpen={cartOpen} setIsCartOpen={setCartOpen} materials={materials} kits={kits}
        subjects={catalogs.materias} teachers={teachers} loans={loans} onAddToCart={addToCart}
        onUpdateCartQuantity={changeQuantity} onRemoveFromCart={key => setCart(current => current.filter(item => cartKey(item) !== key))}
        onCreateLoanRequest={createLoan} />}
      {tab === 'scanner' && <TechnicianScannerView loans={loans} onRefreshLoans={refreshLoans} onUpdateStatus={updateLoan} />}
      {tab === 'reports' && <ReportsAuditView loans={loans} user={user} onUpdateStatus={updateLoan} />}
      {tab === 'layout' && <WarehouseLayoutMap materials={materials} locations={catalogs.ubicaciones} kits={kits} />}
      {tab === 'queue' && <QueueTheorySimulator records={queue} />}
      {tab === 'abc' && <InventoryABCMatrix materials={materials} kits={kits} />}
      {tab === 'indicators' && <KPIDashboard indicators={indicators} onNavigateToQueue={() => navigate('queue')} onNavigateToLayout={() => navigate('layout')} />}
      {tab === 'financial' && <FinancialROI materials={materials} />}
      <ExecutiveReportModal isOpen={reportOpen} onClose={closeReport} indicators={indicators} />
    </>
  );
}
