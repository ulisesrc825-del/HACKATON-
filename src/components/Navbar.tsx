import React from 'react';
import { UserProfile, CartItem } from '../types/warehouse';
import { FileText, Layers, Sliders, MapPin, DollarSign, Clock, ShoppingCart, LogOut, User, QrCode, Scan, ShieldCheck, ClipboardList, Calendar, Users } from 'lucide-react';

interface NavbarProps {
  currentUser: UserProfile | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  cart: CartItem[];
  onOpenCart?: () => void;
  onOpenReport: () => void;
  onLogout: () => void;
  onSwitchRole?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  cart,
  onOpenCart,
  onOpenReport,
  onLogout,
  onSwitchRole,
}) => {
  const totalCartCount = cart.reduce((acc, it) => acc + it.quantity, 0);

  const roleBadgeText: Record<string, string> = {
    student: 'Alumno',
    teacher: 'Profesor',
    technician: 'Técnico',
    admin: 'Administrador',
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          {/* Zone 1: Brand wordmark with UPTex styling */}
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
              Inventario <span className="text-[#007A33] font-black">UPTex</span>
            </span>
            <span className="hidden sm:inline-block text-xs font-mono text-slate-400 border-l border-slate-200 pl-2.5">
              Laboratorios & Almacén
            </span>
          </div>

          {/* Zone 2: Navigation Links (Customized per Role) */}
          <nav aria-label="Navegación principal" className="hidden lg:flex min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-xs font-semibold text-slate-600">
            {/* Student Links */}
            {currentUser?.role === 'student' && (
              <>
                <button
                  onClick={() => setActiveTab('student_catalog')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 py-1 ${
                    activeTab === 'student_catalog' ? 'text-[#007A33] font-bold border-b-2 border-[#007A33]' : ''
                  }`}
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Catálogo de Materiales</span>
                </button>

                <button
                  onClick={() => setActiveTab('laboratories')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 py-1 ${
                    activeTab === 'laboratories' ? 'text-[#007A33] font-bold border-b-2 border-[#007A33]' : ''
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Horarios de Laboratorios</span>
                </button>
              </>
            )}

            {/* Teacher Links */}
            {currentUser?.role === 'teacher' && (
              <>
                <button
                  onClick={() => setActiveTab('laboratories')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 py-1 ${
                    activeTab === 'laboratories' ? 'text-[#007A33] font-bold border-b-2 border-[#007A33]' : ''
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-rose-600" />
                  <span>Apartar Laboratorios (7am - 9pm)</span>
                </button>

                <button
                  onClick={() => setActiveTab('student_catalog')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 py-1 ${
                    activeTab === 'student_catalog' ? 'text-[#007A33] font-bold border-b-2 border-[#007A33]' : ''
                  }`}
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Solicitud de Materiales y Kits</span>
                </button>
              </>
            )}

            {currentUser?.role === 'teacher' && <button type="button" onClick={() => setActiveTab('reports')}
              className="flex items-center gap-1.5 whitespace-nowrap hover:text-[#007A33]">
              <ClipboardList className="w-3.5 h-3.5" /> Aprobar vales
            </button>}
            {/* Technician Links */}
            {currentUser?.role === 'technician' && (
              <>
                <button
                  onClick={() => setActiveTab('scanner')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 py-1 ${
                    activeTab === 'scanner' ? 'text-[#007A33] font-bold border-b-2 border-[#007A33]' : ''
                  }`}
                >
                  <Scan className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Ventanilla & Escáner QR</span>
                </button>

                <button
                  onClick={() => setActiveTab('laboratories')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 py-1 ${
                    activeTab === 'laboratories' ? 'text-[#007A33] font-bold border-b-2 border-[#007A33]' : ''
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Ocupación de Laboratorios</span>
                </button>

                <button
                  onClick={() => setActiveTab('reports')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 py-1 ${
                    activeTab === 'reports' ? 'text-[#007A33] font-bold border-b-2 border-[#007A33]' : ''
                  }`}
                >
                  <ClipboardList className="w-3.5 h-3.5 text-blue-600" />
                  <span>Reportes de Préstamos</span>
                </button>

                <button
                  onClick={() => setActiveTab('layout')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 py-1 ${
                    activeTab === 'layout' ? 'text-[#007A33] font-bold border-b-2 border-[#007A33]' : ''
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Layout ABC 2D</span>
                </button>

                <button
                  onClick={() => setActiveTab('queue')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 py-1 ${
                    activeTab === 'queue' ? 'text-[#007A33] font-bold border-b-2 border-[#007A33]' : ''
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Teoría de Colas</span>
                </button>
              </>
            )}

            {currentUser?.role === 'technician' && <button onClick={() => setActiveTab('abc')}
              className="flex shrink-0 items-center gap-1.5 whitespace-nowrap py-1 hover:text-[#007A33]">
              <Layers className="w-3.5 h-3.5" /> Matriz ABC
            </button>}

            {/* Admin Links */}
            {currentUser?.role === 'admin' && (
              <>
                <button
                  onClick={() => setActiveTab('laboratories')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 py-1 ${
                    activeTab === 'laboratories' ? 'text-[#007A33] font-bold border-b-2 border-[#007A33]' : ''
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-rose-600" />
                  <span>Laboratorios (7am - 9pm)</span>
                </button>

                <button
                  onClick={() => setActiveTab('roles')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 py-1 ${
                    activeTab === 'roles' ? 'text-[#007A33] font-bold border-b-2 border-[#007A33]' : ''
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Asignar Roles</span>
                </button>

                <button
                  onClick={() => setActiveTab('reports')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 py-1 ${
                    activeTab === 'reports' ? 'text-[#007A33] font-bold border-b-2 border-[#007A33]' : ''
                  }`}
                >
                  <ClipboardList className="w-3.5 h-3.5 text-blue-600" />
                  <span>Reportes</span>
                </button>

                <button
                  onClick={() => setActiveTab('scanner')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 py-1 ${
                    activeTab === 'scanner' ? 'text-[#007A33] font-bold border-b-2 border-[#007A33]' : ''
                  }`}
                >
                  <Scan className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Ventanilla</span>
                </button>

                <button
                  onClick={() => setActiveTab('layout')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 py-1 ${
                    activeTab === 'layout' ? 'text-[#007A33] font-bold border-b-2 border-[#007A33]' : ''
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Layout ABC</span>
                </button>

                <button
                  onClick={() => setActiveTab('queue')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 py-1 ${
                    activeTab === 'queue' ? 'text-[#007A33] font-bold border-b-2 border-[#007A33]' : ''
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Colas</span>
                </button>

                <button
                  onClick={() => setActiveTab('financial')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 py-1 ${
                    activeTab === 'financial' ? 'text-[#007A33] font-bold border-b-2 border-[#007A33]' : ''
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Costos/ROI</span>
                </button>
                <button onClick={() => setActiveTab('abc')} className="flex shrink-0 items-center gap-1.5 whitespace-nowrap py-1 hover:text-[#007A33]">
                  <Layers className="w-3.5 h-3.5" /> Matriz ABC
                </button>
                <button onClick={() => setActiveTab('indicators')} className="flex shrink-0 items-center gap-1.5 whitespace-nowrap py-1 hover:text-[#007A33]">
                  <Sliders className="w-3.5 h-3.5" /> Indicadores
                </button>
              </>
            )}
          </nav>

          {/* Zone 3: User Profile, Cart & Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            {(currentUser?.role === 'student' || currentUser?.role === 'teacher') && onOpenCart && (
              <button
                onClick={onOpenCart}
                className="relative p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors flex items-center gap-1.5 cursor-pointer text-xs font-semibold"
                title="Ver carrito de materiales"
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="hidden sm:inline">Carrito</span>
                {totalCartCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#007A33] text-white font-mono font-bold text-[10px]">
                    {totalCartCount}
                  </span>
                )}
              </button>
            )}

            {/* User Badge / Role Switcher */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
              <button
                onClick={onSwitchRole}
                disabled={!onSwitchRole}
                className="text-left px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                title={onSwitchRole ? "Rotar rol de demostración" : undefined}
              >
                <div className="text-[11px] font-bold text-slate-900 flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-500" />
                  <span className="truncate max-w-[120px]">{currentUser?.fullName?.split(' ')[0]} {currentUser?.fullName?.split(' ')[1] || ''}</span>
                </div>
                <div className="text-[9px] font-mono text-[#007A33] font-bold capitalize">
                  {roleBadgeText[currentUser?.role || 'student']}
                </div>
              </button>

              <button
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile secondary navigation */}
        <nav aria-label="Navegación móvil" className="lg:hidden flex items-center gap-2 overflow-x-auto py-2.5 border-t border-slate-100 text-xs font-medium text-slate-600">
          {currentUser?.role === 'student' && (
            <>
              <button
                onClick={() => setActiveTab('student_catalog')}
                className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
                  activeTab === 'student_catalog' ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'hover:bg-slate-100'
                }`}
              >
                Catálogo
              </button>
              <button
                onClick={() => setActiveTab('laboratories')}
                className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
                  activeTab === 'laboratories' ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'hover:bg-slate-100'
                }`}
              >
                Laboratorios
              </button>
            </>
          )}

          {currentUser?.role === 'teacher' && (
            <>
              <button
                onClick={() => setActiveTab('laboratories')}
                className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
                  activeTab === 'laboratories' ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'hover:bg-slate-100'
                }`}
              >
                Apartar Laboratorios (7am-9pm)
              </button>
              <button
                onClick={() => setActiveTab('student_catalog')}
                className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
                  activeTab === 'student_catalog' ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'hover:bg-slate-100'
                }`}
              >
                Materiales
              </button>
            </>
          )}

          {currentUser?.role === 'teacher' && <button type="button" onClick={() => setActiveTab('reports')}
            className="whitespace-nowrap px-3 py-1.5 hover:text-[#007A33]">Aprobar vales</button>}

          {(currentUser?.role === 'technician' || currentUser?.role === 'admin') && (
            <>
              <button
                onClick={() => setActiveTab('laboratories')}
                className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
                  activeTab === 'laboratories' ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'hover:bg-slate-100'
                }`}
              >
                Laboratorios (7am-9pm)
              </button>
              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => setActiveTab('roles')}
                  className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
                    activeTab === 'roles' ? 'bg-indigo-50 text-indigo-800 font-semibold' : 'hover:bg-slate-100'
                  }`}
                >
                  Asignar Roles
                </button>
              )}
              <button
                onClick={() => setActiveTab('reports')}
                className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
                  activeTab === 'reports' ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-slate-100'
                }`}
              >
                Reportes
              </button>
              <button
                onClick={() => setActiveTab('scanner')}
                className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
                  activeTab === 'scanner' ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'hover:bg-slate-100'
                }`}
              >
                Ventanilla
              </button>
              <button
                onClick={() => setActiveTab('layout')}
                className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
                  activeTab === 'layout' ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-slate-100'
                }`}
              >
                Layout 2D
              </button>
              <button onClick={() => setActiveTab('queue')} className="whitespace-nowrap px-3 py-1.5">Teoría de Colas</button>
              <button onClick={() => setActiveTab('abc')} className="whitespace-nowrap px-3 py-1.5">Matriz ABC</button>
              {currentUser.role === 'admin' && <>
                <button onClick={() => setActiveTab('indicators')} className="whitespace-nowrap px-3 py-1.5">Indicadores</button>
                <button onClick={() => setActiveTab('financial')} className="whitespace-nowrap px-3 py-1.5">Costos/ROI</button>
              </>}
            </>
          )}
        </nav>
      </div>
    </header>
  );
};
