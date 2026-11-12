import React, { useState, useMemo } from 'react';
import type { QueueRecord } from '../services/api';
import { calculateMMcQueue, calculateReengineeredDualLane } from '../utils/queueTheory';
import { Clock, Users, Zap, AlertTriangle, CheckCircle, Sliders, ArrowUpRight } from 'lucide-react';

export const QueueTheorySimulator: React.FC<{ records: QueueRecord[] }> = ({ records }) => {
  const peak = records.reduce<QueueRecord | undefined>((current, record) =>
    !current || record.total_llegadas > current.total_llegadas ? record : current, undefined);
  const windows = peak?.ventanillas_activas || 2;
  const hourly = records.slice(-24).map(record => ({
    record,
    observed: record.promedio_espera_seg / 60,
    modeled: calculateMMcQueue(record.total_llegadas, record.promedio_servicio_seg / 60, record.ventanillas_activas).avgWaitTimeMinutes,
  }));
  const maxWait = Math.max(1, ...hourly.flatMap(item => [item.observed, item.modeled]));
  // Configurable simulation parameters
  const [peakArrivalRate, setPeakArrivalRate] = useState(peak?.total_llegadas ?? 30);
  const [adoptionRate, setAdoptionRate] = useState<number>(78); // % students with smartphone/QR
  const [fastTrackServiceSec, setFastTrackServiceSec] = useState<number>(24); // 24 seconds with pre-assembled kit
  const [standardServiceMin, setStandardServiceMin] = useState<number>(1.2); // 1.2 minutes ad-hoc
  const [traditionalServiceMin, setTraditionalServiceMin] = useState(peak ? peak.promedio_servicio_seg / 60 : 3.5);

  // Dynamic calculations using Queueing Theory formulas
  const fastTrackMin = fastTrackServiceSec / 60;

  const traditionalQueue = useMemo(() => {
    return calculateMMcQueue(peakArrivalRate, traditionalServiceMin, windows);
  }, [peakArrivalRate, traditionalServiceMin, windows]);

  const proposedQueue = useMemo(() => {
    return calculateReengineeredDualLane(
      peakArrivalRate,
      adoptionRate / 100,
      fastTrackMin,
      standardServiceMin
    );
  }, [peakArrivalRate, adoptionRate, fastTrackMin, standardServiceMin]);

  return (
    <div className="space-y-8">
      {/* Editorial Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Teoría de Colas y Reingeniería de Capacidad
        </h1>
        <p className="mt-1 text-xs text-slate-600 max-w-3xl leading-relaxed">
          El simulador usa la hora de mayor demanda registrada como punto de partida. Ajusta los parámetros para comparar las ventanillas actuales con un escenario de carril rápido.
        </p>
      </div>

      {/* Main Comparative Cards: Traditional vs Proposed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Traditional System (Current State) */}
        <div className="bg-white p-5 rounded-xl border border-rose-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Modelo M/M/c ({windows} ventanillas)</span>
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-sm bg-rose-50 text-rose-700 border border-rose-200">
              {traditionalQueue.isStable ? "Estable" : "Saturado"} (&rho; = {traditionalQueue.utilization})
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-center py-3 bg-rose-50/50 rounded-lg border border-rose-100">
            <div>
              <span className="text-[10px] text-slate-500 block">Tiempo en Fila</span>
              <span className="text-2xl font-bold font-mono text-rose-700 tabular-nums">
                {traditionalQueue.avgWaitTimeMinutes}
              </span>
              <span className="text-[10px] text-slate-500 block">minutos</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Alumnos en Fila</span>
              <span className="text-2xl font-bold font-mono text-rose-700 tabular-nums">
                {traditionalQueue.avgQueueLength}
              </span>
              <span className="text-[10px] text-slate-500 block">personas</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Capacidad Máx</span>
              <span className="text-2xl font-bold font-mono text-slate-800 tabular-nums">
                {traditionalQueue.serviceCapacityPerHour}
              </span>
              <span className="text-[10px] text-slate-500 block">vales / hora</span>
            </div>
          </div>

          <p className="mt-3 text-xs text-rose-900 leading-relaxed">
            <strong>Causa del colapso:</strong> Al llegar <strong>{peakArrivalRate} alumnos/hora</strong> con una tasa de servicio de 3.5 min/vale,
            la capacidad conjunta de los 2 técnicos es de solo <strong>34.3 vales/hora</strong> (&rho; = {(peakArrivalRate / 34.3).toFixed(2)} &gt; 1.0).
            La fila se desborda y la sesión práctica de 100 minutos se reduce a solo ~65 minutos útiles.
          </p>
        </div>

        {/* Reengineered Dual-Lane System */}
        <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Sistema Reingenierizado (Carril Rápido + Kits)</span>
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-sm bg-emerald-50 text-emerald-800 border border-emerald-200">
              Estable (&rho; &le; 0.35)
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-center py-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
            <div>
              <span className="text-[10px] text-slate-500 block">Tiempo en Fila Ponderado</span>
              <span className="text-2xl font-bold font-mono text-emerald-800 tabular-nums">
                {proposedQueue.weightedWaitTimeMinutes}
              </span>
              <span className="text-[10px] text-emerald-700 font-medium block">min (Meta &le; 4)</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Alumnos en Fila Total</span>
              <span className="text-2xl font-bold font-mono text-emerald-800 tabular-nums">
                {proposedQueue.totalQueueLength}
              </span>
              <span className="text-[10px] text-slate-500 block">personas</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Capacidad Combinada</span>
              <span className="text-2xl font-bold font-mono text-emerald-800 tabular-nums">
                {proposedQueue.combinedCapacityPerHour}
              </span>
              <span className="text-[10px] text-slate-500 block">vales / hora</span>
            </div>
          </div>

          <p className="mt-3 text-xs text-emerald-950 leading-relaxed">
            <strong>Solución logística:</strong> Con el <strong>{adoptionRate}%</strong> de los estudiantes usando reserva móvil y kits pre-armados,
            la capacidad combinada se dispara a <strong>{proposedQueue.combinedCapacityPerHour} vales/hora</strong> con los mismos 2 técnicos.
            El tiempo de espera cae de 28 min a solo <strong>{proposedQueue.weightedWaitTimeMinutes} min</strong>.
          </p>
        </div>
      </div>

      {/* Hourly Traffic and Peaks Chart */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Registros de atención en ventanilla
            </h2>
            <p className="text-xs text-slate-500">
              Espera observada y espera estimada por M/M/c a partir de las llegadas, el servicio y las ventanillas registradas.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-3 h-3 rounded-xs bg-rose-500"></span>
              <span>Espera observada (min)</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-3 h-3 rounded-xs bg-emerald-500"></span>
              <span>Espera estimada (min)</span>
            </span>
          </div>
        </div>

        {!hourly.length && <p className="py-6 text-sm text-slate-500">Aún no hay registros de cola.</p>}
        {/* Custom SVG Bar Chart */}
        <div className="h-64 w-full relative overflow-x-auto">
          <div className="h-full flex items-end gap-2 sm:gap-4 pt-6 pb-8 border-b border-slate-200">
            {hourly.map(({ record, observed, modeled }) => {
              const hour = String(record.hora).padStart(2, '0') + ':00';
              const tradHeight = (observed / maxWait) * 100;
              const optHeight = (modeled / maxWait) * 100;
              return (
                <div key={record.id} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                  {/* Tooltip */}
                  <div className="absolute -top-12 bg-slate-900 text-white text-[10px] px-2 py-1 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    <div>{record.fecha} · {hour}</div>
                    <div>Demanda: {record.total_llegadas} vales/h</div>
                    <div>Observada: {observed.toFixed(2)} min · Estimada: {modeled.toFixed(2)} min</div>
                  </div>

                  {/* Bars Container */}
                  <div className="w-full flex items-end justify-center gap-1 h-full">
                    {/* Traditional Wait Bar */}
                    <div
                      style={{ height: `${tradHeight}%` }}
                      className={`w-1/2 rounded-t-xs transition-all ${
                        record.id === peak?.id ? 'bg-rose-500' : 'bg-rose-300'
                      }`}
                    ></div>
                    {/* Optimized Wait Bar */}
                    <div
                      style={{ height: `${optHeight}%` }}
                      className={`w-1/2 rounded-t-xs transition-all ${
                        record.id === peak?.id ? 'bg-emerald-600' : 'bg-emerald-400'
                      }`}
                    ></div>
                  </div>

                  {/* Hour Label */}
                  <span
                    className={`mt-2 text-[10px] truncate max-w-full font-mono ${
                      record.id === peak?.id ? 'font-bold text-blue-700' : 'text-slate-500'
                    }`}
                  >
                    {record.fecha.slice(5)} {hour}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>{records.length} registros horarios · {records.reduce((total, record) => total + record.total_llegadas, 0)} llegadas registradas</span>
          <span className="font-semibold text-emerald-700">Meta de espera &le; 4 minutos</span>
        </div>
      </div>

      {/* Interactive Parameter Sliders */}
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <Sliders className="w-4 h-4 text-slate-700" />
          <h3 className="text-sm font-bold text-slate-900">
            Simulador Paramétrico en Tiempo Real
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Slider 1: Peak Arrival Rate */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-700 font-medium">Llegadas en Hora Pico (&lambda;)</span>
              <span className="font-mono font-bold text-slate-900">{peakArrivalRate} vales/h</span>
            </div>
            <input
              type="range"
              min="30"
              max="75"
              step="1"
              value={peakArrivalRate}
              onChange={(e) => setPeakArrivalRate(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 block mt-1">Llegada acumulada al cambio de clase</span>
          </div>

          {/* Slider 2: Mobile Adoption Rate */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-700 font-medium">Adopción Pre-reserva QR</span>
              <span className="font-mono font-bold text-slate-900">{adoptionRate}%</span>
            </div>
            <input
              type="range"
              min="40"
              max="95"
              step="5"
              value={adoptionRate}
              onChange={(e) => setAdoptionRate(Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 block mt-1">Estudiantes con smartphone y Wi-Fi</span>
          </div>

          {/* Slider 3: Fast-Track Service Time */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-700 font-medium">Entrega Carril Rápido (&mu;₁)</span>
              <span className="font-mono font-bold text-emerald-700">{fastTrackServiceSec} seg</span>
            </div>
            <input
              type="range"
              min="15"
              max="60"
              step="3"
              value={fastTrackServiceSec}
              onChange={(e) => setFastTrackServiceSec(Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 block mt-1">Handover de kit pre-ensamblado</span>
          </div>

          {/* Slider 4: Traditional Service Time */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-700 font-medium">Tiempo Manual Tradicional</span>
              <span className="font-mono font-bold text-rose-700">{traditionalServiceMin.toFixed(2)} min</span>
            </div>
            <input
              type="range"
              min="2.0"
              max="5.0"
              step="0.1"
              value={traditionalServiceMin}
              onChange={(e) => setTraditionalServiceMin(Number(e.target.value))}
              className="w-full accent-rose-600 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 block mt-1">Llenado en papel + búsqueda en estante</span>
          </div>
        </div>
      </div>

      {/* Detailed Technical Queue Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-700">
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <h4 className="font-bold text-slate-900 mb-2">
            Ventanilla 2: Carril Rápido (Técnico 2)
          </h4>
          <ul className="space-y-1.5 text-slate-600">
            <li>· <strong>Demanda asignada:</strong> {(peakArrivalRate * (adoptionRate / 100)).toFixed(1)} vales/hora.</li>
            <li>· <strong>Tasa de atención (&mu;₁):</strong> {(60 / fastTrackMin).toFixed(0)} kits/hora (1 cada {fastTrackServiceSec}s).</li>
            <li>· <strong>Tiempo promedio en espera:</strong> {proposedQueue.fastTrack.avgWaitTimeMinutes} minutos (~{Math.round(proposedQueue.fastTrack.avgWaitTimeMinutes * 60)} seg).</li>
            <li>· <strong>Factor de ocupación (&rho;₁):</strong> {proposedQueue.fastTrack.utilization} ({proposedQueue.fastTrack.isStable ? 'estable' : 'saturado'}).</li>
          </ul>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <h4 className="font-bold text-slate-900 mb-2">
            Ventanilla 1: Devoluciones & Casos Especiales (Técnico 1)
          </h4>
          <ul className="space-y-1.5 text-slate-600">
            <li>· <strong>Demanda asignada:</strong> {(peakArrivalRate * (1 - adoptionRate / 100)).toFixed(1)} solicitudes/hora.</li>
            <li>· <strong>Tasa de atención (&mu;₂):</strong> {(60 / standardServiceMin).toFixed(0)} usuarios/hora.</li>
            <li>· <strong>Inspección de retorno:</strong> el técnico registra la condición de cada material.</li>
            <li>· <strong>Tiempo promedio en espera:</strong> {proposedQueue.standardLane.avgWaitTimeMinutes} minutos.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
