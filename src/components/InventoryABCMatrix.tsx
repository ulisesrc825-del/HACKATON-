import React, { useState } from 'react';
import { inventoryTotals, money } from '../utils/operations';
import { ABCCategory, EquipmentItem, EquipmentKit } from '../types/warehouse';
import { Search, Filter, Layers, Package, ShieldAlert, ArrowUpDown, CheckCircle2 } from 'lucide-react';

export const InventoryABCMatrix: React.FC<{ materials: EquipmentItem[]; kits: EquipmentKit[] }> = ({ materials, kits }) => {
  const [selectedClass, setSelectedClass] = useState<'ALL' | ABCCategory>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'kits' | 'pareto'>('pareto');

  // Filtered equipment list
  const filteredItems = materials.filter((item) => {
    const matchesClass = selectedClass === 'ALL' || item.categoryABC === selectedClass;
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.family.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesClass && matchesSearch;
  });

  const totals = inventoryTotals(materials);
  const classes: ABCCategory[] = ['A', 'B', 'C'];
  const color = {
    A: 'border-emerald-200 text-emerald-800 bg-emerald-50',
    B: 'border-amber-200 text-amber-800 bg-amber-50',
    C: 'border-indigo-200 text-indigo-800 bg-indigo-50',
  };
  const demandRank = [...materials].sort((a, b) => b.annualDemand - a.annualDemand);
  const pareto = [{ x: 40, y: 180 }];
  let demand = 0;
  demandRank.forEach((item, index) => {
    demand += item.annualDemand;
    pareto.push({ x: 40 + 440 * (index + 1) / demandRank.length, y: 180 - 160 * demand / (totals.demand || 1) });
  });

  return (
    <div className="space-y-8">
      {/* Editorial Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Matriz ABC y Catálogo de Inventario
          </h1>
          <p className="mt-1 text-xs text-slate-600 max-w-2xl">
            {totals.available} unidades disponibles de {totals.units} · {money(totals.value)} MXN en inventario.
          </p>
        </div>

        {/* Sub-tab segmented control */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
          <button
            onClick={() => setActiveSubTab('pareto')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeSubTab === 'pareto' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Curva de Pareto
          </button>
          <button
            onClick={() => setActiveSubTab('catalog')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeSubTab === 'catalog' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Catálogo
          </button>
          <button
            onClick={() => setActiveSubTab('kits')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeSubTab === 'kits' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Kits Pre-armados
          </button>
        </div>
      </div>

      {/* ABC Class Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {classes.map(category => {
          const items = materials.filter(item => item.categoryABC === category);
          const summary = inventoryTotals(items);
          return (
            <div key={category} className={'rounded-xl border bg-white p-5 shadow-xs ' + color[category].split(' ')[0]}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wider">Clase {category}</h2>
                <span className={'rounded border px-2 py-0.5 font-mono text-xs ' + color[category]}>
                  {Math.round(100 * summary.demand / (totals.demand || 1))}% de demanda
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 border-y border-slate-100 py-2 text-xs">
                <div><span className="block text-slate-500">Existencias</span><strong className="font-mono">{summary.available} / {summary.units}</strong></div>
                <div><span className="block text-slate-500">Valor estimado</span><strong className="font-mono">{money(summary.value)} MXN</strong></div>
              </div>
              <p className="mt-3 text-xs text-slate-600">{items.length} referencias de material</p>
            </div>
          );
        })}
      </div>

      {/* View 1: Pareto Curve */}
      {activeSubTab === 'pareto' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Curva de Pareto de Rotación de Inventarios (Regla 80/20)
              </h2>
              <p className="text-xs text-slate-500">
                Demanda anual acumulada por referencia de material, de mayor a menor demanda.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span className="flex items-center gap-1 font-mono">
                <span className="w-3 h-0.5 bg-blue-600"></span>
                <span>Curva Pareto Acumulada</span>
              </span>
              <span className="flex items-center gap-1 font-mono">
                <span className="w-3 h-0.5 bg-rose-500 border-dashed"></span>
                <span>Límite 80% Demanda</span>
              </span>
            </div>
          </div>

          {/* SVG Pareto Graph */}
          <div className="w-full h-64 relative bg-slate-50 rounded-lg p-4 border border-slate-100">
            <svg viewBox="0 0 500 200" className="w-full h-full">
              {/* Grid Lines */}
              <line x1="40" y1="20" x2="480" y2="20" stroke="#e2e8f0" strokeDasharray="3 3" />
              <line x1="40" y1="60" x2="480" y2="60" stroke="#e2e8f0" strokeDasharray="3 3" />
              <line x1="40" y1="100" x2="480" y2="100" stroke="#e2e8f0" strokeDasharray="3 3" />
              <line x1="40" y1="140" x2="480" y2="140" stroke="#e2e8f0" strokeDasharray="3 3" />
              <line x1="40" y1="180" x2="480" y2="180" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="40" y1="20" x2="40" y2="180" stroke="#94a3b8" strokeWidth="1.5" />

              {/* Y Axis Labels */}
              <text x="32" y="24" textAnchor="end" className="text-[9px] fill-slate-500 font-mono">100%</text>
              <text x="32" y="64" textAnchor="end" className="text-[9px] fill-slate-500 font-mono">75%</text>
              <text x="32" y="104" textAnchor="end" className="text-[9px] fill-slate-500 font-mono">50%</text>
              <text x="32" y="144" textAnchor="end" className="text-[9px] fill-slate-500 font-mono">25%</text>
              <text x="32" y="184" textAnchor="end" className="text-[9px] fill-slate-500 font-mono">0%</text>

              {/* 80% Horizontal Reference Line */}
              <line x1="40" y1="52" x2="480" y2="52" stroke="#ef4444" strokeWidth="1" strokeDasharray="4 2" />
              <text x="475" y="48" textAnchor="end" className="text-[8px] fill-rose-600 font-mono">Umbral Pareto 80%</text>

              <polyline points={pareto.map(point => point.x + ',' + point.y).join(' ')} fill="none" stroke="#2563eb" strokeWidth="3" />
              {pareto.slice(1).map(point => <circle key={point.x} cx={point.x} cy={point.y} r="3.5" fill="#2563eb" />)}
              {/* X Axis Labels */}
              <text x="40" y="194" textAnchor="middle" className="text-[9px] fill-slate-500 font-mono">0%</text>
              <text x="480" y="194" textAnchor="middle" className="text-[9px] fill-slate-500 font-mono">100% SKUs</text>
            </svg>
          </div>

          <div className="mt-4 p-3 bg-blue-50/70 rounded-lg text-xs text-blue-900 border border-blue-100 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p>
              {totals.demand > 0 ? 'Demanda anual registrada: ' + totals.demand.toLocaleString('es-MX') : 'No hay demanda anual registrada.'}
            </p>
          </div>
        </div>
      )}

      {/* View 2: Equipment Catalog */}
      {activeSubTab === 'catalog' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          {/* Filters Bar */}
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por equipo, código o familia..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Class Filter Buttons */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium">Clase:</span>
              <button
                onClick={() => setSelectedClass('ALL')}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                  selectedClass === 'ALL' ? 'bg-slate-900 text-white font-semibold' : 'bg-white border text-slate-600'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setSelectedClass('A')}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                  selectedClass === 'A' ? 'bg-emerald-700 text-white font-semibold' : 'bg-white border text-slate-600'
                }`}
              >
                Clase A
              </button>
              <button
                onClick={() => setSelectedClass('B')}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                  selectedClass === 'B' ? 'bg-amber-700 text-white font-semibold' : 'bg-white border text-slate-600'
                }`}
              >
                Clase B
              </button>
              <button
                onClick={() => setSelectedClass('C')}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                  selectedClass === 'C' ? 'bg-indigo-700 text-white font-semibold' : 'bg-white border text-slate-600'
                }`}
              >
                Clase C
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/70 text-slate-600 border-b border-slate-200 uppercase tracking-wider font-semibold">
                  <th className="py-2.5 px-4">Código</th>
                  <th className="py-2.5 px-4">Equipo / Instrumento</th>
                  <th className="py-2.5 px-3 text-center">Clase ABC</th>
                  <th className="py-2.5 px-4 text-right">Costo Unitario</th>
                  <th className="py-2.5 px-4 text-right">Demanda Anual</th>
                  <th className="py-2.5 px-4">Ubicación Anaquel</th>
                  <th className="py-2.5 px-3 text-center">Disponibles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">
                      {item.code}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-900">
                      <div>{item.name}</div>
                      <div className="text-[10px] text-slate-400">{item.family}</div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-sm font-bold font-mono text-[11px] ${
                          item.categoryABC === 'A'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : item.categoryABC === 'B'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                        }`}
                      >
                        {item.categoryABC}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-right font-medium text-slate-900 tabular-nums">
                      ${item.unitCostMXN.toLocaleString('es-MX')} MXN
                    </td>
                    <td className="py-2.5 px-4 font-mono text-right font-bold text-slate-800 tabular-nums">
                      {item.annualDemand.toLocaleString("es-MX")}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      <div className="font-medium text-slate-800">{item.shelfLocation}</div>
                      <div className="text-[10px] text-slate-400">{item.accessDistanceMeters}m de ventanilla</div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="font-semibold font-mono">{item.availableQuantity} / {item.totalQuantity}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View 3: Pre-assembled Kits */}
      {activeSubTab === 'kits' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Contenido y ubicación de los kits registrados en el inventario.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {kits.map((kit) => (
              <div key={kit.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-sm">
                      {kit.preAssembledLocation}
                    </span>
                    <h3 className="mt-1 text-sm font-bold text-slate-900">{kit.name}</h3>
                    <p className="text-xs text-slate-500">{kit.targetPractice}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-emerald-700 block">
                      {kit.code}
                    </span>
                    <span className="text-[10px] text-slate-400">{kit.active ? 'Activo' : 'Inactivo'}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                  <span className="text-xs font-semibold text-slate-700 block">Componentes Integrados en Bandeja:</span>
                  {kit.items.map((subItem, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-sm">
                      <span>{subItem.name}</span>
                      <span className="font-mono font-semibold text-slate-800">x{subItem.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
