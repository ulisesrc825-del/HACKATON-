import React from 'react';
import type { EquipmentItem } from '../types/warehouse';
import { inventoryTotals, money } from '../utils/operations';
import { DollarSign, TrendingUp, ShieldCheck, FileCheck, Award, CheckCircle2 } from 'lucide-react';

export const FinancialROI: React.FC<{ materials: EquipmentItem[] }> = ({ materials }) => {
  const { value } = inventoryTotals(materials);
  const currentLoss = value * 0.045;
  const projectedLoss = value * 0.0038;
  const paperCost = 14400;
  const projectedPaper = 960;
  const savings = currentLoss - projectedLoss + paperCost - projectedPaper;
  return (
    <div className="space-y-8">
      {/* Editorial Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Análisis Financiero, Costos y Retorno de Inversión (ROI)
        </h1>
        <p className="mt-1 text-xs text-slate-600 max-w-3xl leading-relaxed">
          Proyección del caso de estudio sobre un inventario valuado en {money(value)} MXN. Las tasas de pérdida, la papelería y las horas recuperadas son supuestos de la simulación.
        </p>
      </div>

      {/* Main KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
            <span>Ahorro Directo Anual</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-3xl font-extrabold font-mono text-emerald-700 tabular-nums">
            {money(savings)} MXN
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Ahorro anual estimado
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
            <span>Costo de Implementación</span>
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-3xl font-extrabold font-mono text-slate-900 tabular-nums">
            $0 MXN
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Aprovecha Wi-Fi, PC y smartphones existentes
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
            <span>Horas-Alumno Proyectadas</span>
            <Award className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-3xl font-extrabold font-mono text-indigo-700 tabular-nums">
            14,200 hrs / año
          </div>
          <p className="mt-1 text-xs text-slate-600">
            +31 min de práctica de laboratorio por sesión
          </p>
        </div>
      </div>

      {/* Detailed Economic Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <h2 className="text-base font-bold text-slate-900">
            Balance Cuantitativo de Costos: Situación Actual vs. Propuesta
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Desglose de partidas económicas directas e indirectas del caso de estudio.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/70 text-slate-600 border-b border-slate-200 uppercase tracking-wider font-semibold">
                <th className="py-3 px-6">Concepto Operativo / Financiero</th>
                <th className="py-3 px-4 text-right">Situación Actual</th>
                <th className="py-3 px-4 text-right">Situación Optimizada</th>
                <th className="py-3 px-4 text-right text-emerald-700 font-bold">Ahorro Anual Neto</th>
                <th className="py-3 px-6">Mecanismo Logístico de Ahorro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-3.5 px-6 font-semibold text-slate-900">
                  Extravío y Daño de Activos sin Responsable
                </td>
                <td className="py-3.5 px-4 font-mono text-right text-rose-600 tabular-nums">
                  {money(currentLoss)} MXN (4.5%)
                </td>
                <td className="py-3.5 px-4 font-mono text-right text-slate-800 tabular-nums">
                  {money(projectedLoss)} MXN (0.38%)
                </td>
                <td className="py-3.5 px-4 font-mono text-right font-bold text-emerald-700 bg-emerald-50/50 tabular-nums">
                  +{money(currentLoss - projectedLoss)} MXN
                </td>
                <td className="py-3.5 px-6 text-slate-600">
                  Trazabilidad digital: el vale QR se liga a la matrícula y correo institucional del alumno. Checklist de 20s en retorno.
                </td>
              </tr>

              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-3.5 px-6 font-semibold text-slate-900">
                  Papelería, Vales Impresos y Archivo Físico
                </td>
                <td className="py-3.5 px-4 font-mono text-right text-rose-600 tabular-nums">
                  $14,400 MXN (28k vales)
                </td>
                <td className="py-3.5 px-4 font-mono text-right text-slate-800 tabular-nums">
                  $960 MXN
                </td>
                <td className="py-3.5 px-4 font-mono text-right font-bold text-emerald-700 bg-emerald-50/50 tabular-nums">
                  +$13,440 MXN
                </td>
                <td className="py-3.5 px-6 text-slate-600">
                  Digitalización completa de solicitudes con interfaz web responsiva; solo el 2% de contingencias usa papel.
                </td>
              </tr>

              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-3.5 px-6 font-semibold text-slate-900">
                  Gasto en Nómina Adicional (Personal Técnico)
                </td>
                <td className="py-3.5 px-4 font-mono text-right text-slate-700 tabular-nums">
                  $0 MXN (2 técnicos)
                </td>
                <td className="py-3.5 px-4 font-mono text-right text-slate-700 tabular-nums">
                  $0 MXN (2 técnicos)
                </td>
                <td className="py-3.5 px-4 font-mono text-right font-bold text-slate-900 bg-slate-50 tabular-nums">
                  $0 MXN (Supuesto de personal)
                </td>
                <td className="py-3.5 px-6 text-slate-600">
                  Reingeniería de puestos: Técnico 1 en Ventanilla 1 (diagnóstico) y Técnico 2 en Ventanilla 2 (carril rápido).
                </td>
              </tr>

              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-3.5 px-6 font-semibold text-slate-900">
                  Equipos con Falla Oculta (Sin Diagnóstico)
                </td>
                <td className="py-3.5 px-4 font-mono text-right text-rose-600 tabular-nums">
                  14.0% de catálogo
                </td>
                <td className="py-3.5 px-4 font-mono text-right text-emerald-700 tabular-nums">
                  1.8% de catálogo
                </td>
                <td className="py-3.5 px-4 font-mono text-right font-bold text-emerald-700 bg-emerald-50/50 tabular-nums">
                  -87% Equipos Dañados
                </td>
                <td className="py-3.5 px-6 text-slate-600">
                  Al devolver en Ventanilla 1, el Técnico 1 realiza prueba de continuidad y encendido (20s) antes de reintegrar al anaquel.
                </td>
              </tr>

              <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                <td className="py-4 px-6 text-slate-900">
                  TOTAL AHORROS DIRECTOS ANUALES
                </td>
                <td className="py-4 px-4 font-mono text-right text-slate-700 tabular-nums">
                  {money(currentLoss + paperCost)} MXN
                </td>
                <td className="py-4 px-4 font-mono text-right text-slate-700 tabular-nums">
                  {money(projectedLoss + projectedPaper)} MXN
                </td>
                <td className="py-4 px-4 font-mono text-right text-emerald-800 text-sm bg-emerald-100/60 tabular-nums">
                  +{money(savings)} MXN / año
                </td>
                <td className="py-4 px-6 text-slate-800">
                  Retorno de inversión inmediato desde el primer mes de operación.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Academic Impact Rigor Box */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          <span>Impacto Pedagógico e Institucional (Recuperación de Tiempo Lectivo)</span>
        </h3>
        
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-600">
          <div className="p-3 bg-slate-50 rounded-lg">
            <span className="font-semibold text-slate-900 block mb-1">Duración Práctica Oficial</span>
            <p>100 minutos programados por bloque en el plan de estudios.</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-900 rounded-lg">
            <span className="font-semibold text-rose-950 block mb-1">Pérdida en Fila Anterior</span>
            <p>28 a 35 min perdidos en la fila. Práctica real reducida a solo ~65 min (35% de tiempo de clase desperdiciado).</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-900 rounded-lg">
            <span className="font-semibold text-emerald-950 block mb-1">Práctica Efectiva con Reingeniería</span>
            <p>Fila reducida a 2.4 min. Práctica real aumentada a <strong>96.5 minutos netos</strong> (aprovechamiento óptimo).</p>
          </div>
        </div>
      </div>
    </div>
  );
};
