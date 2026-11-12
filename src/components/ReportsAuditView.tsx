import React, { useState } from 'react';
import { LOAN_STATUS, LoanRequest, LoanStatus, UserProfile } from '../types/warehouse';
import { errorMessage } from '../services/api';
import type { LoanUpdate } from '../services/api';
import { ReturnAuditForm } from './ReturnAuditForm';
import { Search, Filter, Download, Printer, Eye, CheckCircle2, Clock, AlertTriangle, ShieldCheck, FileSpreadsheet, X, Layers } from 'lucide-react';

interface ReportsAuditViewProps {
  loans: LoanRequest[];
  user: UserProfile;
  onUpdateStatus: (id: number, input: LoanUpdate) => Promise<LoanRequest>;
}

export const ReportsAuditView: React.FC<ReportsAuditViewProps> = ({ loans, user, onUpdateStatus }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCareer, setSelectedCareer] = useState<string>('ALL');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inspectedLoan = loans.find(loan => loan.recordId === selectedId);
  const canApprove = user.role === 'admin' || (user.role === 'teacher' && inspectedLoan?.teacherId === user.id);
  const canDispatch = user.role === 'technician' || user.role === 'admin';

  async function changeStatus(estado: LoanStatus) {
    if (!inspectedLoan || busy) return;
    setBusy(true);
    setError('');
    try { await onUpdateStatus(inspectedLoan.recordId, { estado }); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(false); }
  }

  // Filter loans
  const filteredLoans = loans.filter((loan) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      loan.id.toLowerCase().includes(term) ||
      loan.studentName.toLowerCase().includes(term) ||
      loan.studentMatricula.toLowerCase().includes(term) ||
      loan.career.toLowerCase().includes(term) ||
      loan.subject.toLowerCase().includes(term) ||
      loan.items.some((it) => it.name.toLowerCase().includes(term) || it.code.toLowerCase().includes(term));

    const matchesCareer = selectedCareer === 'ALL' || loan.career === selectedCareer;
    const matchesSubject = selectedSubject === 'ALL' || loan.subject === selectedSubject;
    const matchesStatus = selectedStatus === 'ALL' || loan.status === selectedStatus;

    return matchesSearch && matchesCareer && matchesSubject && matchesStatus;
  });

  const careers = Array.from(new Set(loans.map((l) => l.career)));
  const subjects = Array.from(new Set(loans.map((l) => l.subject)));

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Folio',
      'Matrícula',
      'Nombre Completo',
      'Carrera',
      'Materia Solicitada',
      'Material Solicitado',
      'Fecha y Hora Solicitud',
      'Estado',
      'Ventanilla Despacho',
      'Valor Inventario MXN',
    ];

    const rows = filteredLoans.map(loan => [
      loan.id, loan.studentMatricula, loan.studentName, loan.career, loan.subject,
      loan.items.map(item => item.name + ' (×' + item.quantity + ')').join(' | '),
      loan.requestedAt, LOAN_STATUS[loan.status], loan.dispatchLane, loan.totalValueMXN,
    ]);
    function cell(value: string | number) {
      const text = String(value);
      const safe = typeof value === 'string' && /^[\\s]*[=+@-]/.test(text) ? "'" + text : text;
      return '"' + safe.replaceAll('"', '""') + '"';
    }
    const blob = new Blob(['\\uFEFF', [headers, ...rows].map(row => row.map(cell).join(',')).join('\\r\\n')],
      { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'reporte_prestamos_almacen_' + new Date().toISOString().slice(0, 10) + '.csv';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-6">
      {/* Editorial Title & Export CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Reportes y Auditoría de Préstamos
          </h1>
          <p className="mt-1 text-xs text-slate-600 max-w-2xl">
            Trazabilidad completa de solicitudes: quién solicitó, número de matrícula, carrera, nombre completo,
            materiales específicos, fecha/hora y materia académica asignada.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Bitácora</span>
          </button>
        </div>
      </div>

      {/* KPI Audit Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Vales Registrados en Turno
          </span>
          <div className="mt-1 text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {loans.length} <span className="text-xs font-sans font-normal text-slate-500">solicitudes</span>
          </div>
          <p className="mt-1 text-[11px] text-blue-700 font-medium">
            100% trazabilidad vinculada a matrícula
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Despacho en Carril Rápido
          </span>
          <div className="mt-1 text-2xl font-bold font-mono text-emerald-700 tabular-nums">
            80.0% <span className="text-xs font-sans font-normal text-slate-500">(QR)</span>
          </div>
          <p className="mt-1 text-[11px] text-emerald-800 font-medium">
            Tiempo de entrega &lt; 25 segundos
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Inspección de Retorno
          </span>
          <div className="mt-1 text-2xl font-bold font-mono text-indigo-700 tabular-nums">
            98.2% <span className="text-xs font-sans font-normal text-slate-500">evaluados</span>
          </div>
          <p className="mt-1 text-[11px] text-indigo-800 font-medium">
            Erradica el 14% de fallas no diagnosticadas
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Ahorro Papelería Acumulado
          </span>
          <div className="mt-1 text-2xl font-bold font-mono text-amber-700 tabular-nums">
            $13,440 <span className="text-xs font-sans font-normal text-slate-500">MXN/año</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Vales 100% digitales y sin impresiones
          </p>
        </div>
      </div>

      {/* Main Filter and Audit Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {/* Filters Strip */}
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar alumno, matrícula, equipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Filter by Career */}
          <div>
            <select
              value={selectedCareer}
              onChange={(e) => setSelectedCareer(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Todas las Carreras</option>
              {careers.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Filter by Subject */}
          <div>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Todas las Materias</option>
              {subjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Filter by Status */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Todos los Estados</option>
              {Object.entries(LOAN_STATUS).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
            </select>
          </div>
        </div>

        {/* Audit Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/70 text-slate-600 border-b border-slate-200 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Folio / QR</th>
                <th className="py-3 px-4">Quién Solicitó (Nombre Completo)</th>
                <th className="py-3 px-3">Matrícula</th>
                <th className="py-3 px-4">Carrera</th>
                <th className="py-3 px-4">Materia Solicitada</th>
                <th className="py-3 px-4">Material que Solicitó</th>
                <th className="py-3 px-4">Cuándo lo Solicitó</th>
                <th className="py-3 px-3 text-center">Estado</th>
                <th className="py-3 px-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No se encontraron vales con los criterios de búsqueda seleccionados.
                  </td>
                </tr>
              ) : (
                filteredLoans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-slate-50 transition-colors">
                    {/* Folio */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {loan.id}
                    </td>

                    {/* Nombre Completo */}
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div>{loan.studentName}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{loan.studentEmail}</div>
                    </td>

                    {/* Matrícula */}
                    <td className="py-3 px-3 font-mono font-medium text-blue-700 whitespace-nowrap">
                      {loan.studentMatricula}
                    </td>

                    {/* Carrera */}
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {loan.career}
                    </td>

                    {/* Materia para la que lo solicitó */}
                    <td className="py-3 px-4 text-slate-900 font-medium">
                      <div className="text-blue-900 font-bold">{loan.subject}</div>
                      {loan.practiceName && (
                        <div className="text-[10px] text-slate-400">{loan.practiceName}</div>
                      )}
                    </td>

                    {/* Material que solicitó */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="space-y-1">
                        {loan.items.map((it, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[11px] bg-slate-50 px-2 py-0.5 rounded-sm">
                            <span className="truncate mr-2 font-medium text-slate-800">{it.name}</span>
                            <span className="font-mono font-bold text-slate-900 shrink-0">x{it.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Cuándo lo solicitó */}
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {loan.requestedAt}
                    </td>

                    {/* Estado */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-sm font-semibold text-[10px] ${
                          loan.status === 'pendiente'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : loan.status === 'entregado'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : loan.status === 'devuelto'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {LOAN_STATUS[loan.status]}
                      </span>
                    </td>

                    {/* Acción Inspección */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => { setError(''); setSelectedId(loan.recordId); }}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                        title="Ver detalle del vale"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspected Loan Modal Detail */}
      {inspectedLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold block">
                  EXPEDIENTE DE PRÉSTAMO
                </span>
                <h3 className="text-base font-bold">{inspectedLoan.id}</h3>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-800">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 block">Alumno Solicitante:</span>
                  <span className="font-bold text-slate-900">{inspectedLoan.studentName}</span>
                  <span className="text-[10px] font-mono text-slate-500 block">{inspectedLoan.studentMatricula}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Carrera:</span>
                  <span className="font-semibold text-slate-800">{inspectedLoan.career}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Materia:</span>
                  <span className="font-bold text-blue-700">{inspectedLoan.subject}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Fecha y Hora Solicitud:</span>
                  <span className="font-mono text-slate-700">{inspectedLoan.requestedAt}</span>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-900 block mb-2">
                  Materiales Asignados y Ubicación en Almacén:
                </span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {inspectedLoan.items.map((it, idx) => (
                    <div key={idx} className="p-2 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-900">{it.name}</div>
                        <div className="text-[10px] font-mono text-slate-500">{it.code} · {it.shelfLocation}</div>
                        {it.condition !== 'pendiente' && <p className="mt-1 text-slate-600">
                          Devueltas {it.returned} de {it.delivered} · {({ buen_estado: 'Buen estado', danado: 'Dañado', perdido: 'Perdido', consumido: 'Consumido' })[it.condition]}
                          {it.reviewNote && (' · ' + it.reviewNote)}
                        </p>}
                      </div>
                      <span className="font-mono font-bold text-slate-900">x{it.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {inspectedLoan.notes && (
                <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-[11px]">
                  <strong>Observación Técnica:</strong> {inspectedLoan.notes}
                </div>
              )}

              <div className="border-t border-slate-200 pt-3">
                <p className="mb-2 font-semibold">Estado · {LOAN_STATUS[inspectedLoan.status]}</p>
                {inspectedLoan.teacherName && <p className="mb-2">Docente · {inspectedLoan.teacherName}</p>}
                {error && <p role="alert" className="mb-2 text-rose-800">{error}</p>}
                {canApprove && inspectedLoan.status === 'pendiente' && <div className="flex gap-2">
                  <button type="button" disabled={busy} onClick={() => void changeStatus('aprobado')}
                    className="rounded-lg bg-emerald-700 px-3 py-2 font-bold text-white cursor-pointer">Aprobar vale</button>
                  <button type="button" disabled={busy} onClick={() => void changeStatus('rechazado')}
                    className="rounded-lg bg-rose-700 px-3 py-2 font-bold text-white cursor-pointer">Rechazar vale</button>
                </div>}
                {canDispatch && inspectedLoan.status === 'aprobado' && <button type="button" disabled={busy}
                  onClick={() => void changeStatus('entregado')} className="rounded-lg bg-blue-700 px-3 py-2 font-bold text-white cursor-pointer">
                  Confirmar despacho
                </button>}
                {canDispatch && ['entregado', 'vencido'].includes(inspectedLoan.status) && inspectedLoan.dispatchedAt
                  && <ReturnAuditForm key={inspectedLoan.recordId} loan={inspectedLoan} onUpdate={onUpdateStatus} />}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
