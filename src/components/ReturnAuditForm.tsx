import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { LoanUpdate } from '../services/api';
import { errorMessage } from '../services/api';
import type { LoanRequest, ReturnCondition } from '../types/warehouse';

const conditionLabels: Record<ReturnCondition, string> = {
  buen_estado: 'Buen estado', danado: 'Dañado', perdido: 'Perdido', consumido: 'Consumido',
};

export function ReturnAuditForm({ loan, onUpdate }: {
  loan: LoanRequest;
  onUpdate: (id: number, input: LoanUpdate) => Promise<LoanRequest>;
}) {
  const lines = loan.items.filter(line => line.delivered > 0);
  const [conditions, setConditions] = useState<Record<number, ReturnCondition>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function conditionFor(line: LoanRequest['items'][number]) {
    return conditions[line.id] ?? (line.type === 'consumible' ? 'consumido' : 'buen_estado');
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    const details = lines.map(line => {
      const condition = conditionFor(line);
      return {
        id: line.id,
        estado_devolucion: condition,
        cantidad_devuelta: condition === 'perdido' || condition === 'consumido' ? 0 : line.delivered,
        nota_revision: notes[line.id],
      };
    });
    try {
      await onUpdate(loan.recordId, {
        estado: details.some(line => line.estado_devolucion === 'danado' || line.estado_devolucion === 'perdido')
          ? 'con_incidencia' : 'devuelto',
        detalle_prestamos: details,
      });
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  if (!lines.length) return <p className="text-xs text-amber-800">El vale no tiene renglones entregados.</p>;
  return (
    <form onSubmit={submit} className="space-y-3 text-xs" aria-label="Auditoría de devolución">
      <fieldset disabled={busy} className="space-y-2">
        <legend className="mb-2 font-bold">Revisión por material</legend>
        {lines.map(line => (
          <div key={line.id} className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex justify-between gap-2 font-semibold"><span>{line.name}</span><span>×{line.delivered}</span></div>
            <select aria-label={`Estado de ${line.name}`} value={conditionFor(line)}
              onChange={event => setConditions(previous => ({ ...previous, [line.id]: event.target.value as ReturnCondition }))}
              className="w-full rounded-lg border border-slate-200 bg-white p-2">
              {(Object.keys(conditionLabels) as ReturnCondition[]).filter(condition => condition !== 'consumido' || line.type === 'consumible')
                .map(condition => <option key={condition} value={condition}>{conditionLabels[condition]}</option>)}
            </select>
            <input aria-label={`Nota de ${line.name}`} maxLength={255} value={notes[line.id] ?? ''}
              placeholder="Nota de revisión (opcional)"
              onChange={event => setNotes(previous => ({ ...previous, [line.id]: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 bg-white p-2" />
          </div>
        ))}
      </fieldset>
      {error && <p role="alert" className="text-rose-800">{error}</p>}
      <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 p-2.5 font-bold text-white hover:bg-emerald-800 disabled:opacity-60 cursor-pointer">
        <CheckCircle2 size={16} /> {busy ? 'Guardando devolución…' : 'Confirmar devolución'}
      </button>
    </form>
  );
}
