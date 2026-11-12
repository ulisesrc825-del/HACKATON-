import React, { useState } from 'react';
import { warehousePlan } from '../utils/operations';
import type { Location } from '../services/api';
import { WarehouseRack, EquipmentItem, EquipmentKit } from '../types/warehouse';
import { Compass, Footprints, Info, Sparkles, Box, Shield, Zap, X } from 'lucide-react';

export const WarehouseLayoutMap: React.FC<{ materials: EquipmentItem[]; locations: Location[]; kits: EquipmentKit[] }> = ({ materials, locations, kits }) => {
  const [visualMode, setVisualMode] = useState<'abc' | 'heatmap' | 'value' | 'picking'>('abc');
  const [rackId, setRackId] = useState<string | null>(null);
  const [routeIndex, setRouteIndex] = useState(0);
  const { racks, routes } = warehousePlan(locations, materials, kits);
  const selectedRack = rackId === null ? racks[0] : racks.find(rack => rack.id === rackId);
  const selectedRoute = routes[routeIndex];
  const zoneDistance = (zone: WarehouseRack['zone']) => {
    const distances = locations.filter(location => location.zona === zone).map(location => location.distancia_metros);
    if (!distances.length) return 'sin ubicaciones';
    const first = Math.min(...distances);
    const last = Math.max(...distances);
    return first === last ? `${first} m` : `${first}–${last} m`;
  };
  const [showTraditionalPath, setShowTraditionalPath] = useState<boolean>(true);
  const [showOptimizedPath, setShowOptimizedPath] = useState<boolean>(true);

  // Helper function to color racks based on mode
  const getRackFill = (rack: WarehouseRack) => {
    if (visualMode === 'abc') {
      if (rack.zone === 'A') return 'fill-emerald-500/20 stroke-emerald-600';
      if (rack.zone === 'B') return 'fill-amber-500/20 stroke-amber-600';
      return 'fill-indigo-500/20 stroke-indigo-600';
    }
    if (visualMode === 'heatmap') {
      // Pick frequency gradient
      if (rack.avgDailyPicks >= 30) return 'fill-rose-500/80 stroke-rose-600';
      if (rack.avgDailyPicks >= 15) return 'fill-orange-400/80 stroke-orange-500';
      if (rack.avgDailyPicks >= 8) return 'fill-amber-300/80 stroke-amber-500';
      return 'fill-blue-200/80 stroke-blue-400';
    }
    if (visualMode === 'value') {
      // Inventory value gradient
      if (rack.totalValueMXN >= 220000) return 'fill-purple-600/80 stroke-purple-700 text-white';
      if (rack.totalValueMXN >= 150000) return 'fill-purple-400/80 stroke-purple-600';
      return 'fill-slate-300/80 stroke-slate-500';
    }
    // Picking mode: default neutral
    return rack.zone === 'A' ? 'fill-emerald-50 stroke-emerald-400' : rack.zone === 'B' ? 'fill-amber-50 stroke-amber-400' : 'fill-slate-100 stroke-slate-400';
  };

  return (
    <div className="space-y-6">
      {/* Editorial Title & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Plano 2D del Almacén y Rutas de Despacho
          </h1>
          <p className="mt-1 text-xs text-slate-600 max-w-2xl">
            Ubicación de materiales, existencias disponibles y rutas estimadas desde la ventanilla de despacho.
          </p>
        </div>

        {/* Visual Mode Segmented Controls */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setVisualMode('abc')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              visualMode === 'abc' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Clasificación ABC
          </button>
          <button
            onClick={() => setVisualMode('heatmap')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              visualMode === 'heatmap' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Heatmap Rotación
          </button>
          <button
            onClick={() => setVisualMode('value')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              visualMode === 'value' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Valor de Activos
          </button>
          <button
            onClick={() => setVisualMode('picking')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              visualMode === 'picking' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Rutas de Picking
          </button>
        </div>
      </div>

      {/* Main Blueprint & Inspector Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive 2D Blueprint SVG */}
        <div className="lg:col-span-8 bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-xs">
          {/* Blueprint Header Indicators */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-700">Plano esquemático</span>
              <span aria-hidden="true">·</span>
              <span>{racks.length} ubicaciones en el plano</span>
              <span aria-hidden="true">·</span>
              <span>{racks.reduce((sum, rack) => sum + rack.itemCount, 0)} unidades disponibles</span>
            </div>
            <div className="flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-slate-400" />
              <span>Coordenadas de inventario</span>
            </div>
          </div>

          {/* SVG Map Canvas */}
          <div className="relative w-full overflow-hidden bg-slate-50 rounded-lg border border-slate-200">
            <svg
              viewBox="0 0 540 600"
              className="w-full h-auto select-none"
              style={{ maxHeight: '620px' }}
            >
              {/* Floor grid subtle pattern */}
              <defs>
                <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#e2e8f0" strokeWidth="0.75" />
                </pattern>
                {/* Marker for traditional path arrow */}
                <marker
                  id="arrow-red"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
                </marker>
                {/* Marker for optimized path arrow */}
                <marker
                  id="arrow-green"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
                </marker>
              </defs>

              <rect width="540" height="600" fill="url(#grid)" />

              {/* Warehouse Outer Wall */}
              <rect
                x="15"
                y="15"
                width="510"
                height="570"
                fill="none"
                stroke="#64748b"
                strokeWidth="3"
                rx="4"
              />

              {/* Top Service Zone: Reengineered Double Window */}
              {/* Ventanilla 1: Recepción & Devolución */}
              <rect
                x="80"
                y="15"
                width="140"
                height="32"
                className="fill-blue-50 stroke-blue-500"
                strokeWidth="2"
              />
              <text x="150" y="30" textAnchor="middle" className="text-[10px] font-bold fill-blue-900">
                Ventanilla 1: Retorno & Diagnóstico
              </text>
              <text x="150" y="42" textAnchor="middle" className="text-[8px] fill-blue-700">
                Técnico 1 (Check-in 20s)
              </text>

              {/* Ventanilla 2: Carril Rápido (Pre-reserva QR) */}
              <rect
                x="280"
                y="15"
                width="180"
                height="32"
                className="fill-emerald-100 stroke-emerald-600"
                strokeWidth="2.5"
              />
              <text x="370" y="29" textAnchor="middle" className="text-[10px] font-extrabold fill-emerald-950">
                ⚡ Ventanilla 2: Carril Rápido (QR)
              </text>
              <text x="370" y="42" textAnchor="middle" className="text-[8px] fill-emerald-800 font-medium">
                Técnico 2 (Kits pre-reservados &lt; 25s)
              </text>

              {/* Fast Track Kitting Buffer Table (Adjacent to Window 2) */}
              <rect
                x="290"
                y="55"
                width="160"
                height="28"
                className="fill-amber-100/90 stroke-amber-500"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />
              <text x="370" y="72" textAnchor="middle" className="text-[9px] font-bold fill-amber-900">
                Mesa de preparación de kits
              </text>

              {/* Diagnostic & Quarantine Bench (Left of Window 1) */}
              <rect
                x="25"
                y="55"
                width="110"
                height="34"
                className="fill-slate-200 stroke-slate-400"
                strokeWidth="1"
              />
              <text x="80" y="70" textAnchor="middle" className="text-[9px] font-semibold fill-slate-800">
                Mesa Diagnóstico
              </text>
              <text x="80" y="82" textAnchor="middle" className="text-[8px] fill-slate-600">
                Revisión de retornos
              </text>

              {/* Zone A Background Enclosure Box (Hot Zone) */}
              <rect
                x="140"
                y="95"
                width="360"
                height="150"
                fill="none"
                stroke="#10b981"
                strokeWidth="1"
                strokeDasharray="4 3"
                rx="6"
              />
              <text x="490" y="108" textAnchor="end" className="text-[10px] font-bold fill-emerald-700">
                ZONA A
              </text>

              {/* Zone B Background Enclosure Box */}
              <rect
                x="140"
                y="265"
                width="360"
                height="150"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1"
                strokeDasharray="4 3"
                rx="6"
              />
              <text x="490" y="278" textAnchor="end" className="text-[10px] font-bold fill-amber-700">
                ZONA B
              </text>

              {/* Zone C Background Enclosure Box */}
              <rect
                x="140"
                y="435"
                width="360"
                height="145"
                fill="none"
                stroke="#6366f1"
                strokeWidth="1"
                strokeDasharray="4 3"
                rx="6"
              />
              <text x="490" y="448" textAnchor="end" className="text-[10px] font-bold fill-indigo-700">
                ZONA C
              </text>

              {/* Racks Rendering */}
              {racks.map((rack) => {
                const isSelected = selectedRack?.id === rack.id;
                const fillClasses = getRackFill(rack);

                return (
                  <g
                    key={rack.id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={`${rack.code}, ${rack.itemCount} unidades disponibles`}
                    onClick={() => setRackId(rack.id)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setRackId(rack.id);
                      }
                    }}
                    className="cursor-pointer transition-all"
                  >
                    {/* Shadow / selection border */}
                    {isSelected && (
                      <rect
                        x={rack.x - 3}
                        y={rack.y - 3}
                        width={rack.width + 6}
                        height={rack.height + 6}
                        fill="none"
                        stroke="#0f172a"
                        strokeWidth="2.5"
                        rx="4"
                      />
                    )}

                    {/* Main Rack Box */}
                    <rect
                      x={rack.x}
                      y={rack.y}
                      width={rack.width}
                      height={rack.height}
                      className={`${fillClasses} transition-colors`}
                      strokeWidth="1.5"
                      rx="3"
                    />

                    {/* Shelf divider line inside rack */}
                    <line
                      x1={rack.x + 8}
                      y1={rack.y + rack.height / 2}
                      x2={rack.x + rack.width - 8}
                      y2={rack.y + rack.height / 2}
                      stroke="rgba(0,0,0,0.2)"
                      strokeWidth="1"
                    />

                    {/* Rack Code Label */}
                    <text
                      x={rack.x + 12}
                      y={rack.y + 18}
                      className="text-[10px] font-extrabold fill-slate-900"
                    >
                      {rack.code}
                    </text>

                    {/* Subtext according to mode */}
                    <text
                      x={rack.x + 12}
                      y={rack.y + 36}
                      className="text-[8px] font-mono fill-slate-700"
                    >
                      {visualMode === 'heatmap'
                        ? `${rack.avgDailyPicks} prést/día`
                        : visualMode === 'value'
                        ? `$${(rack.totalValueMXN / 1000).toFixed(0)}k MXN`
                        : `${rack.itemCount} unids`}
                    </text>

                    {/* Zone tag symbol */}
                    <text
                      x={rack.x + rack.width - 14}
                      y={rack.y + 18}
                      className={`text-[9px] font-bold ${
                        rack.zone === 'A' ? 'fill-emerald-800' : rack.zone === 'B' ? 'fill-amber-800' : 'fill-indigo-800'
                      }`}
                    >
                      [{rack.zone}]
                    </text>
                  </g>
                );
              })}

              {/* Picking Paths Overlay (Mode: picking) */}
              {visualMode === 'picking' && selectedRoute && (
                <>
                  {/* Traditional Chaotic Path (Red dashed) */}
                  {showTraditionalPath && (
                    <polyline
                      points={selectedRoute.pathTraditional.map((p) => `${p.x},${p.y}`).join(' ')}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2.5"
                      strokeDasharray="6 4"
                      markerEnd="url(#arrow-red)"
                      className="animate-pulse"
                    />
                  )}

                  {/* Optimized ABC / Kit Path (Green solid) */}
                  {showOptimizedPath && (
                    <polyline
                      points={selectedRoute.pathOptimized.map((p) => `${p.x},${p.y}`).join(' ')}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3.5"
                      markerEnd="url(#arrow-green)"
                    />
                  )}
                </>
              )}
            </svg>
          </div>

          {/* Blueprint Legend Bar */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                <span className="w-3 h-3 rounded-xs bg-emerald-500/40 border border-emerald-600"></span>
                <span>Zona A ({zoneDistance('A')})</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                <span className="w-3 h-3 rounded-xs bg-amber-500/40 border border-amber-600"></span>
                <span>Zona B ({zoneDistance('B')})</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                <span className="w-3 h-3 rounded-xs bg-indigo-500/40 border border-indigo-600"></span>
                <span>Zona C ({zoneDistance('C')})</span>
              </span>
            </div>

            <div className="text-slate-500 text-[11px]">
              Tip: Haz clic en cualquier estantería para inspeccionar inventario.
            </div>
          </div>
        </div>

        {/* Right: Shelf Inspector & Route Optimizer Control */}
        <div className="lg:col-span-4 space-y-6">
          {/* Rack Inspector Card */}
          {selectedRack && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-sm bg-slate-100 text-slate-800">
                      {selectedRack.code}
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        selectedRack.zone === 'A'
                          ? 'text-emerald-700'
                          : selectedRack.zone === 'B'
                          ? 'text-amber-700'
                          : 'text-indigo-700'
                      }`}
                    >
                      Zona {selectedRack.zone}
                    </span>
                  </div>
                  <h3 className="mt-1 text-sm font-bold text-slate-900">
                    {selectedRack.name}
                  </h3>
                </div>
                <button
                  onClick={() => setRackId('')}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                {selectedRack.description}
              </p>

              {/* Numerical Metrics Grid */}
              <div className="mt-4 grid grid-cols-3 gap-2 py-3 border-y border-slate-100 text-center">
                <div>
                  <span className="text-[10px] text-slate-500 block">Disponibles</span>
                  <span className="text-sm font-bold font-mono text-slate-900 tabular-nums">
                    {selectedRack.itemCount}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Demanda / día</span>
                  <span className="text-sm font-bold font-mono text-emerald-700 tabular-nums">
                    {selectedRack.avgDailyPicks}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Valor en Rack</span>
                  <span className="text-sm font-bold font-mono text-slate-900 tabular-nums">
                    ${(selectedRack.totalValueMXN / 1000).toFixed(0)}k
                  </span>
                </div>
              </div>

              {/* Levels Breakdown */}
              <div className="mt-4 space-y-2">
                <span className="text-xs font-semibold text-slate-700 block">
                  Distribución por Niveles de Anaquel:
                </span>
                {selectedRack.shelves.map((shelf) => (
                  <div
                    key={shelf.level}
                    className="p-2.5 bg-slate-50 rounded-lg text-xs border border-slate-100"
                  >
                    <div className="flex items-center justify-between font-medium text-slate-800">
                      <span>{shelf.level}</span>
                      <span className="text-slate-500 font-mono">{shelf.utilization}% disponible</span>
                    </div>
                    <div className="mt-1 text-slate-600 text-[11px]">
                      {shelf.items.join(' · ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Picking Comparison Controls */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Footprints className="w-4 h-4 text-blue-600" />
                <span>Simulador de Rutas de Picking</span>
              </h3>
              
            </div>

            <p className="mt-1 text-xs text-slate-600">
              Compara la recolección por material con la ubicación del kit preparado. Los tiempos estiman una velocidad de 1 m/s.
            </p>

            {/* Select Scenario */}
            <div className="mt-3 space-y-2">
              {routes.map((route, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setRouteIndex(idx);
                    setVisualMode('picking');
                  }}
                  className={`w-full text-left p-3 rounded-lg border text-xs transition-all cursor-pointer ${
                    routeIndex === idx
                      ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="font-semibold text-slate-900 truncate">
                    {route.orderName}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-slate-500">
                    <span>Kit preparado</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-emerald-700 font-bold">
                      {route.optimizedDistanceMeters}m ({route.optimizedTimeSeconds}s)
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Path Toggles */}
            {visualMode === 'picking' && selectedRoute && (
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-rose-700">
                  <input
                    type="checkbox"
                    checked={showTraditionalPath}
                    onChange={(e) => setShowTraditionalPath(e.target.checked)}
                    className="rounded-sm text-rose-600 focus:ring-rose-500"
                  />
                  <span>Ruta Tradicional ({selectedRoute.traditionalDistanceMeters}m · {selectedRoute.traditionalTimeSeconds}s)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-emerald-700">
                  <input
                    type="checkbox"
                    checked={showOptimizedPath}
                    onChange={(e) => setShowOptimizedPath(e.target.checked)}
                    className="rounded-sm text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Optimizada ({selectedRoute.optimizedDistanceMeters}m · {selectedRoute.optimizedTimeSeconds}s)</span>
                </label>
              </div>
            )}

            {!routes.length && <p className="mt-3 text-xs text-slate-500">No hay kits con coordenadas completas para calcular rutas.</p>}
            {selectedRoute && <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs">
              <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  Distancia estimada · {selectedRoute.traditionalDistanceMeters} m por material · {selectedRoute.optimizedDistanceMeters} m con kit
                </span>
              </div>
            </div>}
          </div>
        </div>
      </div>
    </div>
  );
};
