import React from 'react';
import type { OperationalIndicator } from '../types/warehouse';
import { Clock, TrendingUp, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, DollarSign } from 'lucide-react';

interface KPIDashboardProps {
  indicators: OperationalIndicator[];
  onNavigateToQueue: () => void;
  onNavigateToLayout: () => void;
}

export const KPIDashboard: React.FC<KPIDashboardProps> = ({ indicators, onNavigateToQueue, onNavigateToLayout }) => {
  return (
    <div className="space-y-8">
      {/* Editorial Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Evidencia Inicial vs. Metas Institucionales
        </h1>
        <p className="mt-2 text-sm text-slate-600 max-w-3xl leading-relaxed">
          Indicadores calculados a partir de las existencias y los registros de atención en ventanilla.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {indicators.slice(0, 4).map(indicator => <div key={indicator.id} className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{indicator.indicator}</h2>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-slate-900">{indicator.actualValue}</span>
            {typeof indicator.actualValue === 'number' && <span className="text-xs text-slate-500">{indicator.unit}</span>}
          </div>
          <p className="mt-2 text-xs text-slate-600">{indicator.operationalNote}</p>
        </div>)}
      </div>

      {/* Main Comparative Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Matriz Comparativa de Desempeño Operativo
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Consulta los registros observados y las metas del proyecto.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateToLayout}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Ver Layout ABC</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <span className="text-slate-300">·</span>
            <button
              onClick={onNavigateToQueue}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Simular Colas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100/70 text-slate-600 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 sm:px-6">Indicador / Registro</th>
                <th className="py-3 px-4 text-rose-700">Valor Actual</th>
                <th className="py-3 px-4 text-slate-700">Meta Institucional</th>
                <th className="py-3 px-4 text-emerald-700">Propuesta Reingeniería</th>
                <th className="py-3 px-4 hidden md:table-cell">Unidad</th>
                <th className="py-3 px-4 sm:px-6">Observación Operativa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {indicators.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 sm:px-6 font-semibold text-slate-900">
                    <div className="flex items-center gap-2">
                      {row.status === 'critical' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      )}
                      <span>{row.indicator}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-medium text-rose-600 tabular-nums whitespace-nowrap">
                    {row.actualValue}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                    {row.institutionalTarget}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-emerald-700 bg-emerald-50/40 tabular-nums whitespace-nowrap">
                    {row.proposedOptimizedValue}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-mono text-slate-500 hidden md:table-cell whitespace-nowrap">
                    {row.unit}
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 text-xs text-slate-600 max-w-md">
                    {row.operationalNote}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Strategic Operational Insight Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <h3 className="text-sm font-bold text-slate-900">
            01. Reingeniería de Ventanilla Doble
          </h3>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            Se sustituye la ventanilla única por un sistema desacoplado: <strong>Carril Rápido</strong> (entrega en &lt;25 segundos con QR para reservas digitales)
            y <strong>Ventanilla General / Devoluciones</strong> (con diagnóstico de 20 segundos para documentar daños y pérdidas).
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <h3 className="text-sm font-bold text-slate-900">
            02. Almacenamiento ABC por Rotación
          </h3>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            El 20% de los equipos con mayor rotación (Zona A) se relocalizan en los anaqueles a menos de 6 metros de ventanilla.
            Los equipos costosos de baja rotación (Zona C) se concentran al fondo con custodia de seguridad controlada por código.
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <h3 className="text-sm font-bold text-slate-900">
            03. Estrategia de Kits Pre-armados
          </h3>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            Durante las horas valle (10:00, 12:00 y 14:00), los técnicos preparan bandejas con los 4-5 instrumentos requeridos para cada práctica.
            En la hora pico, el técnico entrega la bandeja completa de 1 solo movimiento en lugar de realizar 5 viajes distintos.
          </p>
        </div>
      </div>
    </div>
  );
};
