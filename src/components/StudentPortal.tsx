import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { errorMessage } from '../services/api';
import type { NewLoan, Subject, Teacher } from '../services/api';
import { LOAN_STATUS } from '../types/warehouse';
import { CartItem, EquipmentItem, EquipmentKit, LoanRequest, UserProfile } from '../types/warehouse';
import { ShoppingCart, Plus, Minus, Trash2, QrCode, CheckCircle2, Search, X, Sparkles, Printer, ArrowRight, BookOpen, Clock, AlertCircle } from 'lucide-react';

interface StudentPortalProps {
  currentUser: UserProfile;
  cart: CartItem[];
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  materials: EquipmentItem[];
  kits: EquipmentKit[];
  subjects: Subject[];
  teachers: Teacher[];
  loans: LoanRequest[];
  onAddToCart: (item: EquipmentItem | EquipmentKit) => void;
  onUpdateCartQuantity: (equipmentId: string, delta: number) => void;
  onRemoveFromCart: (equipmentId: string) => void;
  onCreateLoanRequest: (loan: NewLoan, key: string) => Promise<LoanRequest>;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  currentUser,
  cart,
  isCartOpen,
  setIsCartOpen,
  materials,
  kits,
  subjects,
  teachers,
  loans,
  onAddToCart,
  onUpdateCartQuantity,
  onRemoveFromCart,
  onCreateLoanRequest,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedFamily, setSelectedFamily] = useState<string>('ALL');
  const [subject, setSubject] = useState(String(subjects.find(item => String(item.carrera_id) === currentUser.careerId)?.id ?? subjects[0]?.id ?? ''));
  const [teacher, setTeacher] = useState(teachers[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const pendingRequest = useRef<{ body: string; key: string }>(null);
  const [practiceName, setPracticeName] = useState('');
  const [pickupSlot, setPickupSlot] = useState<string>('09:00 - 09:30 (Hora Pico 1)');
  const [generatedLoan, setGeneratedLoan] = useState<LoanRequest | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Generate QR code image when a loan ticket is created
  useEffect(() => {
    if (generatedLoan) {
      QRCode.toDataURL(
        generatedLoan.qrDataString,
        {
          width: 260,
          margin: 1.5,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        },
        (err, url) => {
          if (!err && url) {
            setQrDataUrl(url);
          }
        }
      );
    }
  }, [generatedLoan]);

  const handleAddWithFeedback = (item: EquipmentItem | EquipmentKit) => {
    setActionError('');
    try {
      onAddToCart(item);
    } catch (error) {
      setActionError(errorMessage(error));
      return;
    }
    setJustAddedId(('unitCostMXN' in item ? 'material-' : 'kit-') + item.id);
    setTimeout(() => {
      setJustAddedId(null);
    }, 1200);
  };

  async function handleGenerateTicket(event: React.FormEvent) {
    event.preventDefault();
    if (!cart.length || busy) return;
    setBusy(true);
    setActionError('');
    const input: NewLoan = {
      materia_id: Number(subject),
      docente_id: currentUser.role === 'student' ? Number(teacher) : undefined,
      nombre_practica: practiceName.trim(),
      observaciones: 'Horario estimado de recogida: ' + pickupSlot,
      detalle_prestamos: cart.map(item => ({
        material_id: Number(item.equipmentId), kit_id: item.kitId ? Number(item.kitId) : undefined,
        cantidad_pedida: item.quantity,
      })),
    };
    const serialized = JSON.stringify(input);
    if (pendingRequest.current?.body !== serialized) pendingRequest.current = { body: serialized, key: crypto.randomUUID() };
    try {
      const created = await onCreateLoanRequest(input, pendingRequest.current.key);
      pendingRequest.current = null;
      openTicket(created);
      setIsCartOpen(false);
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function openTicket(loan: LoanRequest) {
    setQrDataUrl('');
    setGeneratedLoan(loan);
  }

  function changeQuantity(item: CartItem, delta: number) {
    setActionError('');
    try {
      onUpdateCartQuantity(item.equipmentId + '/' + (item.kitId ?? ''), delta);
    } catch (error) {
      setActionError(errorMessage(error));
    }
  }

  // Filter materials catalog
  const filteredEquipment = materials.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.family.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFamily = selectedFamily === 'ALL' || item.family === selectedFamily;
    return matchesSearch && matchesFamily;
  });

  const families = Array.from(new Set(materials.map((i) => i.family)));

  return (
    <div className="space-y-8">
      {actionError && !isCartOpen && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{actionError}</p>}
      {/* Student Greeting Banner & Top-Right Cart Trigger */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              Portal del Alumno · Solicitud Digital
            </span>
            <span className="text-xs font-mono text-slate-500">
              Matrícula: {currentUser.matricula}
            </span>
          </div>
          <h1 className="mt-1.5 text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Bienvenido, {currentUser.fullName}
          </h1>
          <p className="mt-0.5 text-xs text-slate-600">
            {currentUser.career} · Selecciona los materiales para tu práctica y obtén tu código QR para el Carril Rápido.
          </p>
        </div>

        {/* Top-Right Shopping Cart Button */}
        <button
          onClick={() => setIsCartOpen(true)}
          className="relative inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all shadow-xs cursor-pointer shrink-0"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Carrito de Materiales</span>
          {totalCartCount > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-xs font-bold font-mono">
              {totalCartCount}
            </span>
          )}
        </button>
      </div>

      {/* Featured: Pre-assembled Laboratory Kits (1-Click Add) */}
      <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/60 p-5 rounded-2xl border border-blue-200/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Kits de Laboratorio Pre-armados (Recomendados para entrega instantánea)
            </h2>
          </div>
          <span className="text-[11px] font-mono text-blue-700">Entrega en &lt; 20 seg</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {kits.filter(kit => kit.active).map((kit) => (
            <div
              key={kit.id}
              className="bg-white p-3.5 rounded-xl border border-blue-100 flex flex-col justify-between shadow-xs hover:border-blue-300 transition-all"
            >
              <div>
                <span className="text-[10px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-xs">
                  {kit.items.length} equipos en bandeja
                </span>
                <h3 className="mt-1.5 text-xs font-bold text-slate-900 leading-snug">
                  {kit.name}
                </h3>
                <p className="mt-1 text-[11px] text-slate-500 line-clamp-2">
                  {kit.targetPractice}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-mono">
                  Carril Rápido
                </span>
                <button
                  onClick={() => handleAddWithFeedback(kit)}
                  className="px-2.5 py-1 text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Agregar Kit</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Material Catalog */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {/* Filters and Search Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar multímetro, osciloscopio, fuente, cables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Family Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Categoría:</span>
            <select
              value={selectedFamily}
              onChange={(e) => setSelectedFamily(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Todas las Categorías</option>
              {families.map((fam) => (
                <option key={fam} value={fam}>{fam}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Equipment Grid */}
        <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEquipment.map((item) => {
            const inCart = cart.find((c) => c.equipmentId === item.id && !c.kitId);
            const isJustAdded = justAddedId === 'material-' + item.id;

            return (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-mono text-slate-400 text-[10px]">
                      {item.code}
                    </span>
                    <span
                      className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-xs ${
                        item.categoryABC === 'A'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : item.categoryABC === 'B'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                      }`}
                    >
                      Clase {item.categoryABC}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 leading-snug">
                    {item.name}
                  </h3>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {item.family}
                  </div>
                  <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-2">
                    <span className="font-mono">{item.shelfLocation}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-slate-400">{item.accessDistanceMeters}m</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 block">
                      {({ activo: 'Existencias', mantenimiento: 'En mantenimiento', baja: 'Dado de baja' })[item.state]}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-800">
                      {item.availableQuantity} / {item.totalQuantity} disp.
                    </span>
                  </div>

                  {/* Add Button */}
                  <button
                    disabled={item.state !== "activo" || item.availableQuantity === 0}
                    onClick={() => handleAddWithFeedback(item)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      isJustAdded
                        ? 'bg-emerald-600 text-white'
                        : inCart
                        ? 'bg-blue-100 text-blue-900 hover:bg-blue-200'
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xs'
                    }`}
                  >
                    {isJustAdded ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>¡Agregado!</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>{inCart ? `Agregar (+${inCart.quantity})` : 'Agregar'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cart Drawer / Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Carrito de Materiales para Alumnos
                </h2>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Content */}
            <div className="p-6 space-y-6 text-xs text-slate-800">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">Tu carrito está vacío</p>
                  <p className="text-[11px] mt-1">Explora el catálogo y presiona el botón '+' para agregar materiales.</p>
                </div>
              ) : (
                <>
                  {/* Items list */}
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {cart.map((item) => (
                      <div
                        key={item.equipmentId + '/' + (item.kitId ?? '')}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 truncate">
                              {item.name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">
                              [{item.code}]
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {item.shelfLocation}
                          </div>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            aria-label={'Restar una unidad de ' + item.name}
                            onClick={() => changeQuantity(item, -1)}
                            className="p-1 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-mono font-bold text-slate-900 w-5 text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            aria-label={'Agregar una unidad de ' + item.name}
                            onClick={() => changeQuantity(item, 1)}
                            className="p-1 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            aria-label={'Quitar ' + item.name}
                            onClick={() => onRemoveFromCart(item.equipmentId + '/' + (item.kitId ?? ''))}
                            className="p-1 rounded-md text-rose-500 hover:bg-rose-50 cursor-pointer ml-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary Bar */}
                  <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between text-xs font-semibold text-blue-950">
                    <span>Total de Equipos Solicitados:</span>
                    <span className="font-mono text-sm">{totalCartCount} piezas</span>
                  </div>

                  {/* Checkout Form */}
                  <form onSubmit={handleGenerateTicket} className="space-y-4 pt-2 border-t border-slate-200">
                    {/* Materia */}
                    <div>
                      <label className="block font-bold text-slate-900 mb-1">
                        ¿Para qué Materia lo solicitas? *
                      </label>
                      <select
                        required aria-label="Materia"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="" disabled>Selecciona una materia</option>
                        {subjects.map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}
                      </select>
                    </div>

                    {currentUser.role === 'student' && (
                      <label className="block font-bold text-slate-900">
                        Docente que autoriza *
                        <select required value={teacher} onChange={event => setTeacher(event.target.value)}
                          className="mt-1 w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg">
                          <option value="" disabled>Selecciona un docente</option>
                          {teachers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </select>
                      </label>
                    )}

                    {/* Práctica */}
                    <div>
                      <label className="block font-bold text-slate-900 mb-1">
                        Número de Práctica o Actividad *
                      </label>
                      <input
                        type="text" aria-label="Número de práctica o actividad"
                        required
                        placeholder="Ej. Práctica 3: Filtros Activos con OpAmps"
                        maxLength={150}
                        value={practiceName}
                        onChange={(e) => setPracticeName(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900"
                      />
                    </div>

                    {/* Turno / Horario */}
                    <div>
                      <label className="block font-bold text-slate-900 mb-1">
                        Horario Estimado de Recogida *
                      </label>
                      <select
                        value={pickupSlot}
                        onChange={(e) => setPickupSlot(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900"
                      >
                        <option value="09:00 - 09:30 (Hora Pico 1)">09:00 - 09:30 (Hora Pico 1 - Carril Rápido)</option>
                        <option value="11:00 - 11:30 (Hora Pico 2)">11:00 - 11:30 (Hora Pico 2 - Carril Rápido)</option>
                        <option value="13:00 - 13:30 (Hora Pico 3)">13:00 - 13:30 (Hora Pico 3 - Carril Rápido)</option>
                        <option value="15:00 - 15:30 (Turno Vespertino)">15:00 - 15:30 (Turno Vespertino)</option>
                      </select>
                    </div>

                    {actionError && <p role="alert" className="text-rose-700 font-medium">{actionError}</p>}
                    {/* Submit Button */}
                    <button
                      type="submit" disabled={busy}
                      className="w-full py-3 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>{busy ? 'Guardando vale…' : 'Confirmar y Generar Código QR de Vale'}</span>
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Generated Digital QR Loan Ticket Modal */}
      {!!loans.filter(loan => loan.studentMatricula === currentUser.matricula).length && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-slate-900">Mis vales</h2>
          <ul className="mt-2 divide-y divide-slate-100">
            {loans.filter(loan => loan.studentMatricula === currentUser.matricula).map(loan => (
              <li key={loan.recordId} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
                <span className="font-semibold">{loan.id} · {loan.subject}</span>
                <span>{LOAN_STATUS[loan.status]}</span>
                <button type="button" className="font-bold text-blue-700 hover:underline cursor-pointer" onClick={() => openTicket(loan)}>Ver código QR</button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {generatedLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div role="dialog" aria-modal="true" aria-label={`Vale ${generatedLoan.id}`}
            className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Header */}
            <div className="p-5 bg-slate-900 text-white text-center relative">
              <span className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase font-bold block">
                VALE OFICIAL DIGITAL · {generatedLoan.dispatchLane}
              </span>
              <h2 className="text-xl font-extrabold mt-0.5">
                {generatedLoan.id}
              </h2>
              <button
                onClick={() => setGeneratedLoan(null)}
                aria-label="Cerrar vale"
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* QR Code Presentation */}
            <div className="p-6 text-center space-y-4">
              <div className="inline-block p-3 bg-white border-2 border-slate-900 rounded-2xl shadow-xs">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Código QR del Vale de Préstamo"
                    className="w-52 h-52 mx-auto"
                  />
                ) : (
                  <div className="w-52 h-52 flex items-center justify-center text-xs text-slate-400">
                    Generando código QR...
                  </div>
                )}
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 text-left">
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{LOAN_STATUS[generatedLoan.status]}</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  {generatedLoan.status === 'pendiente'
                    ? 'Presenta el QR en ventanilla una vez que el docente apruebe el vale.'
                    : generatedLoan.status === 'aprobado' ? 'Presenta este código en la ventanilla de despacho.' : 'Consulta los datos del vale en el historial.'}
                </p>
              </div>

              {/* Loan Details List */}
              <div className="text-left text-xs space-y-2 pt-2 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Estudiante:</span>
                    <span className="font-bold text-slate-900">{generatedLoan.studentName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Matrícula:</span>
                    <span className="font-mono font-bold text-slate-900">{generatedLoan.studentMatricula}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">Carrera:</span>
                  <span className="font-medium text-slate-800">{generatedLoan.career}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">Materia Solicitada:</span>
                  <span className="font-bold text-blue-700">{generatedLoan.subject}</span>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Materiales Incluidos ({generatedLoan.totalItemsCount} piezas):
                  </span>
                  <ul className="space-y-1 text-[11px] text-slate-700 max-h-32 overflow-y-auto pr-1">
                    {generatedLoan.items.map((it, idx) => (
                      <li key={idx} className="flex justify-between bg-slate-50 px-2 py-1 rounded-sm">
                        <span>{it.name}</span>
                        <span className="font-mono font-bold text-slate-900">x{it.quantity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2 px-3 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir Vale</span>
                </button>
                <button
                  onClick={() => setGeneratedLoan(null)}
                  className="flex-1 py-2 px-3 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer"
                >
                  Listo, Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
