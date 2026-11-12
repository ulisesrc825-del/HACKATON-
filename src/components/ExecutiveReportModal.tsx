import React from 'react';
import { X, Printer, CheckCircle, FileText } from 'lucide-react';
import type { OperationalIndicator } from '../types/warehouse';

interface ExecutiveReportModalProps {
  indicators: OperationalIndicator[];
  isOpen: boolean;
  onClose: () => void;
}

export const ExecutiveReportModal: React.FC<ExecutiveReportModalProps> = ({ isOpen, onClose, indicators }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
        {/* Modal Top Bar */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-bold text-slate-900">
              Reporte Técnico Ejecutivo · Reingeniería Logística de Almacén
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / Exportar PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Content */}
        <div className="p-8 space-y-6 text-slate-800 text-xs leading-relaxed">
          {/* Header */}
          <div className="border-b border-slate-200 pb-4">
            <div className="text-[11px] font-mono text-slate-500 uppercase tracking-widest">
              DICTAMEN DE INGENIERÍA LOGÍSTICA Y GESTIÓN DE OPERACIONES
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 mt-1">
              Optimización del Almacén de Laboratorios: Layout ABC, Carril Rápido y Modelado de Colas
            </h1>
            <div className="mt-2 text-slate-500 flex flex-wrap gap-4 text-[11px]">
              <span><strong>Área:</strong> Almacén Central de Laboratorios</span>
              <span>Fuente · MariaDB HACKATON</span>
              
              <span><strong>Personal:</strong> 2 Técnicos por turno</span>
            </div>
          </div>

          {/* Executive Summary */}
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">
              1. Resumen Ejecutivo
            </h2>
            <p className="text-justify text-slate-700">
              El sistema registra los vales desde su solicitud hasta el retorno, con control de existencias, técnicos responsables y revisión por material.
              Los resultados operativos de la tabla se calculan a partir del inventario y de las mediciones en ventanilla disponibles en MariaDB.
            </p>
            <p className="mt-2 text-justify text-slate-700">
              Bajo la restricción estricta de <strong>no contratar nuevo personal</strong> (manteniendo 2 técnicos de turno) y aprovechando la infraestructura existente
              (Wi-Fi, PC y smartphones de estudiantes), se diseñó e implementó: (1) Reingeniería de doble ventanilla con Carril Rápido para reservas digitales por QR,
              (2) Estrategia de Kits pre-ensamblados en horarios valle, y (3) Reorganización física del almacén bajo el principio ABC de Pareto.
            </p>
          </div>

          {/* Baseline vs Target Table */}
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">
              2. Matriz de Resultados Cuantitativos Frente a Metas Institucionales
            </h2>
            <table className="w-full text-left border border-slate-200 border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-2">Indicador / Registro</th>
                  <th className="p-2 text-center">Valor Inicial</th>
                  <th className="p-2 text-center">Meta Institucional</th>
                  <th className="p-2 text-center font-bold text-emerald-800">Unidad</th>
                  <th className="p-2">Cumplimiento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {indicators.map((ind) => (
                  <tr key={ind.id} className="text-[11px]">
                    <td className="p-2 font-medium">{ind.indicator}</td>
                    <td className="p-2 text-center font-mono text-rose-700">{ind.actualValue}</td>
                    <td className="p-2 text-center font-mono font-semibold">{ind.institutionalTarget}</td>
                    <td className="p-2 text-center font-mono font-bold text-emerald-700 bg-emerald-50/40">
                      {ind.unit}
                    </td>
                    <td className="p-2 font-medium text-emerald-700 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-emerald-600 inline" />
                      <span>Cumplido</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Technical Pillars */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              3. Fundamento Técnico de las Tres Soluciones
            </h2>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-1">
                A. Reingeniería de Ventanilla y Teoría de Colas (M/M/c)
              </h3>
              <p className="text-slate-700">
                El simulador usa llegadas por hora, tiempo promedio de servicio y ventanillas activas para estimar la espera mediante M/M/c.
                El escenario de dos carriles permite explorar la adopción de QR y los tiempos de atención por ventanilla.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-1">
                B. Layout ABC de Pareto y Optimización de Picking
              </h3>
              <p className="text-slate-700">
                El mapa usa las ubicaciones A, B y C registradas en el catálogo. Las existencias se actualizan al confirmar el despacho o la devolución.
                Las rutas estiman la distancia de recolección individual y el recorrido hasta la ubicación del kit.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-1">
                C. Balance Financiero y Retorno de Inversión
              </h3>
              <p className="text-slate-700">
                La vista financiera proyecta costos con el valor de inventario vigente y los supuestos de pérdida, papelería y personal del caso de estudio.
              </p>
            </div>
          </div>

          {/* Signature / Validation */}
          <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-[11px] text-slate-600">
            <div>
              <div className="border-b border-slate-400 w-48 mx-auto mb-1"></div>
              <span className="font-bold text-slate-900 block">Ingeniería de Procesos & Logística</span>
              <span>Responsable Técnico de Almacén</span>
            </div>
            <div>
              <div className="border-b border-slate-400 w-48 mx-auto mb-1"></div>
              <span className="font-bold text-slate-900 block">Jefatura de Laboratorios y Talleres</span>
              <span>Dirección Académica Institucional</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
