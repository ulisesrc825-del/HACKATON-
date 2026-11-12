import React, { useRef, useState } from 'react';
import { LOAN_STATUS, LoanRequest } from '../types/warehouse';
import { errorMessage } from '../services/api';
import type { LoanUpdate } from '../services/api';
import { ReturnAuditForm } from './ReturnAuditForm';
import { QrCode, Scan, CheckCircle2, Clock, Zap, AlertTriangle, ShieldCheck, Search, ArrowRight } from 'lucide-react';

interface TechnicianScannerViewProps {
  loans: LoanRequest[];
  onRefreshLoans: () => Promise<LoanRequest[]>;
  onUpdateStatus: (id: number, input: LoanUpdate) => Promise<LoanRequest>;
}

export const TechnicianScannerView: React.FC<TechnicianScannerViewProps> = ({ loans, onRefreshLoans, onUpdateStatus }) => {
  const [scannedCode, setScannedCode] = useState<string>('');
  const [activeWindow, setActiveWindow] = useState<'lane2_fast' | 'lane1_return'>('lane2_fast');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selectedLoan = loans.find(loan => loan.recordId === selectedId);
  const [busy, setBusy] = useState(false);
  const started = useRef(0);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'warn' } | null>(null);

  function loadLoan(loan: LoanRequest) {
    setSelectedId(loan.recordId);
    started.current = performance.now();
    setActiveWindow(['entregado', 'vencido', 'devuelto', 'con_incidencia'].includes(loan.status) ? 'lane1_return' : 'lane2_fast');
    setFeedbackMsg(null);
  }

  async function findLoan(code: string) {
    const query = code.trim().toUpperCase();
    if (!query) return;
    const freshLoans = await onRefreshLoans();
    const found = freshLoans.find(loan => loan.id.toUpperCase() === query || loan.qrDataString.toUpperCase() === query)
      ?? freshLoans.find(loan => loan.studentMatricula.toUpperCase() === query);
    if (found) loadLoan(found);
    else {
      setSelectedId(null);
      setFeedbackMsg({ text: 'No se encontró ningún vale con ese código.', type: 'warn' });
    }
  }

  async function search(code: string) {
    if (busy) return;
    setBusy(true);
    try {
      await findLoan(code);
    } catch (error) {
      setFeedbackMsg({ text: errorMessage(error), type: 'warn' });
    } finally {
      setBusy(false);
    }
  }

  async function readQr(file: File) {
    setBusy(true);
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      if (!context) { bitmap.close(); throw new Error('No se pudo preparar la imagen.'); }
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      const { default: decode } = await import('jsqr');
      const decoded = decode(pixels.data, pixels.width, pixels.height);
      if (!decoded) throw new Error('No se encontró un código QR legible en la imagen.');
      setScannedCode(decoded.data);
      await findLoan(decoded.data);
    } catch (error) {
      setFeedbackMsg({ text: errorMessage(error), type: 'warn' });
    } finally {
      setBusy(false);
    }
  }

  async function handleDispatch() {
    if (!selectedLoan || busy) return;
    setBusy(true);
    try {
      await onUpdateStatus(selectedLoan.recordId, {
        estado: 'entregado', segundos_atencion: Math.round((performance.now() - started.current) / 1000),
      });
      setFeedbackMsg({ text: 'Vale ' + selectedLoan.id + ' despachado. Existencias actualizadas.', type: 'success' });
    } catch (error) {
      setFeedbackMsg({ text: errorMessage(error), type: 'warn' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Editorial Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Ventanilla de Almacén y Escáner QR
        </h1>
        <p className="mt-1 text-xs text-slate-600 max-w-2xl">
          Operación de los 2 técnicos de turno: <strong>Ventanilla 2 (Carril Rápido)</strong> para entregas en &lt; 25s y <strong>Ventanilla 1</strong> para diagnósticos rápidos de retorno.
        </p>
      </div>

      {/* Technician Lane Mode Switch */}
      <div className="flex p-1 bg-slate-100 rounded-xl max-w-lg">
        <button
          onClick={() => setActiveWindow('lane2_fast')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeWindow === 'lane2_fast'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Ventanilla 2: Carril Rápido (Despacho QR)</span>
        </button>
        <button
          onClick={() => setActiveWindow('lane1_return')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeWindow === 'lane1_return'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Ventanilla 1: Retorno & Diagnóstico (20s)</span>
        </button>
      </div>

      {/* Scanner Input and Quick Sample Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <form onSubmit={event => { event.preventDefault(); void search(scannedCode); }} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Scan className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text" aria-label="Código QR, folio o matrícula"
              placeholder="Escanea o escribe el Folio de Vale (ej. VALE-2026-0941) o Matrícula..."
              value={scannedCode}
              onChange={(e) => setScannedCode(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500 uppercase"
            />
          </div>
          <button
            type="submit" disabled={busy}
            className="px-5 py-2.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <Search className="w-4 h-4" />
            <span>Buscar Vale QR</span>
          </button>
        </form>
        <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer focus-within:ring-2 focus-within:ring-blue-600">
          <QrCode className="w-4 h-4" /> Leer QR de una imagen
          <input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={event => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void readQr(file);
          }} />
        </label>

        {/* Quick simulation buttons to test recent loans */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-slate-400 font-semibold uppercase">
            Vales recientes
          </span>
          {loans.slice(0, 4).map((l) => (
            <button
              key={l.id}
              disabled={busy}
              onClick={() => { setScannedCode(l.id); void search(l.id); }}
              className={`px-2.5 py-1 text-[11px] font-mono rounded-md border transition-all cursor-pointer ${
                selectedLoan?.id === l.id
                  ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              {l.id} ({l.studentName.split(' ')[0]} - {l.subject.slice(0, 15)}...)
            </button>
          ))}
        </div>

        {feedbackMsg && (
          <div role={feedbackMsg.type === "warn" ? "alert" : "status"}
            className={`p-3 rounded-xl text-xs font-medium border flex items-center gap-2 ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}
      </div>

      {/* Selected Loan Ticket Inspector & Action Dispatch Box */}
      {selectedLoan ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Loan Details & Picking Locations */}
          <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-mono font-bold text-blue-600 uppercase">
                  {selectedLoan.dispatchLane}
                </span>
                <h2 className="text-xl font-extrabold text-slate-900">
                  {selectedLoan.id}
                </h2>
              </div>
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-bold font-mono ${
                  selectedLoan.status === 'pendiente'
                    ? 'bg-amber-100 text-amber-900'
                    : selectedLoan.status === 'entregado'
                    ? 'bg-blue-100 text-blue-900'
                    : selectedLoan.status === 'devuelto'
                    ? 'bg-emerald-100 text-emerald-900'
                    : 'bg-rose-100 text-rose-900'
                }`}
              >
                Estado: {LOAN_STATUS[selectedLoan.status]}
              </span>
            </div>

            {/* Student & Course Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Estudiante</span>
                <span className="font-bold text-slate-900">{selectedLoan.studentName}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Matrícula</span>
                <span className="font-mono font-bold text-blue-700">{selectedLoan.studentMatricula}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Carrera</span>
                <span className="font-medium text-slate-800">{selectedLoan.career}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Materia Solicitada</span>
                <span className="font-bold text-slate-900">{selectedLoan.subject}</span>
              </div>
            </div>

            {/* Materials to Hand Over with Exact Shelf Location */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Materiales a Despachar ({selectedLoan.totalItemsCount} piezas)
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  Ubicación en Almacén
                </span>
              </div>

              <div className="space-y-2">
                {selectedLoan.items.map((it, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-300 transition-all flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-400 text-[10px]">
                          [{it.code}]
                        </span>
                        <span className="font-bold text-slate-900">
                          {it.name}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded-xs ${
                            it.categoryABC === 'A'
                              ? 'bg-emerald-50 text-emerald-700'
                              : it.categoryABC === 'B'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-indigo-50 text-indigo-700'
                          }`}
                        >
                          Clase {it.categoryABC}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-blue-700 font-medium flex items-center gap-1.5">
                        <span className="font-mono bg-blue-50 px-1.5 py-0.5 rounded-xs border border-blue-100">
                          {it.shelfLocation}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-base font-extrabold text-slate-900">
                        x{it.quantity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Handover / Diagnostic Actions Box */}
          <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Operación de Despacho
            </h3>

            {activeWindow === 'lane2_fast' ? (
              <div className="space-y-4">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900">
                  <span className="font-bold block mb-1">⚡ Protocolo de Carril Rápido:</span>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    1. Verifica la matrícula en pantalla.<br />
                    2. Toma los materiales de Zona A o bandeja de Kitting.<br />
                    3. Entrega al alumno y pulsa Despachar.
                  </p>
                </div>

                {selectedLoan.status === 'pendiente' && <p className="text-xs text-amber-800">El docente debe aprobar el vale antes del despacho.</p>}
                <button
                  onClick={handleDispatch} disabled={busy || selectedLoan.status !== "aprobado"}
                  className="w-full py-3 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Zap className="w-4 h-4" />
                  <span>{busy ? 'Guardando despacho…' : 'Confirmar Despacho Exprés'}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-900">
                  <span className="font-bold block mb-1">🔍 Protocolo de Retorno con Diagnóstico (20s):</span>
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    1. Revisa integridad física de cables y puntas.<br />
                    2. Prueba de encendido en banco de prueba.<br />
                    3. Registra conforme o deriva a mantenimiento.
                  </p>
                </div>

                {['entregado', 'vencido'].includes(selectedLoan.status) && selectedLoan.dispatchedAt
                  ? <ReturnAuditForm key={selectedLoan.recordId} loan={selectedLoan} onUpdate={onUpdateStatus} />
                  : <p className="text-xs text-slate-600">Estado del vale · {LOAN_STATUS[selectedLoan.status]}</p>}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-400">
          <Scan className="w-12 h-12 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-semibold text-slate-700">No hay ningún vale seleccionado</p>
          <p className="text-xs text-slate-500 mt-1">Escanea el código QR del alumno o selecciona uno de los vales recientes arriba.</p>
        </div>
      )}
    </div>
  );
};
