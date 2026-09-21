'use client';

import { useEffect, useState } from 'react';
import { getRecurringPriceReferences } from '@/actions/tickets/recurring-price-reference.action';
import type { TicketPriceBracket } from '@/types/ticket-price-bracket.type';
import { effectiveBrackets, formatMinutesLabel, formatRecurringUnitLabel, resolveRecurringUnitPrice, minutesToAmountUnit } from '@/utils/ticket-price-bracket.utils';

const money = (value: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 4 }).format(value);
export function RecurringPriceExplanation({ vehicle, day, unitMinutes, price, derived, ignoreId }: { vehicle?: string; day?: string | null; unitMinutes: number; price?: number; derived: boolean; ignoreId?: string }) {
  const [rows, setRows] = useState<TicketPriceBracket[] | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    getRecurringPriceReferences().then(data => { if (alive) setRows(data); }).catch(() => {}).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  if (loading) return <p role="status" className="text-sm text-muted-foreground">Buscando las tarifas para mostrarte la cuenta…</p>;
  if (!rows) return <p role="alert" className="text-sm text-destructive">No pudimos cargar las tarifas. Cerrá y volvé a abrir esta ventana para ver el cálculo.</p>;
  if (!Number.isFinite(unitMinutes) || unitMinutes <= 0) return <p className="text-sm text-muted-foreground">Ingresá una duración mayor a cero.</p>;
  return <div className="space-y-3 rounded-xl border border-gm-yellow/30 bg-gm-yellow/5 p-4" aria-live="polite">
    <h4 className="font-semibold">Así se cobrará el tiempo adicional</h4>
    {(['DAY', 'NIGHT'] as const).filter(period => !day || period === day).map(period => {
      const finite = effectiveBrackets(rows.filter(row => row.id !== ignoreId), vehicle ?? 'AUTO', period).filter(row => row.uptoMinutes !== null).sort((a, b) => a.uptoMinutes! - b.uptoMinutes!);
      const last = finite.at(-1);
      const resolved = derived ? resolveRecurringUnitPrice(unitMinutes, finite) : null;
      const exact = finite.find(row => row.uptoMinutes === unitMinutes);
      const tier = minutesToAmountUnit(unitMinutes).unit;
      const tiers = tier === 'MIN' ? ['HOUR', 'DAY'] : tier === 'HOUR' ? ['DAY'] : [];
      const anchor = exact ?? tiers.map(scale => finite.find(row => minutesToAmountUnit(row.uptoMinutes!).unit === scale)).find(Boolean);
      const amount = resolved?.price ?? Number(price);
      return <div key={period} className="space-y-2 border-t border-gm-yellow/20 pt-3 text-sm">
        <p className="font-semibold">{period === 'DAY' ? 'De día' : 'De noche'}</p>
        <p className="text-muted-foreground">{last ? `Empieza después de ${formatMinutesLabel(last.uptoMinutes).replace('Hasta ', '')}, más la tolerancia configurada. El precio hasta ahí es ${money(last.price)}.` : 'No hay una duración anterior: este cobro empieza desde el ingreso.'}</p>
        {derived && resolved && anchor && <><p>Se toma «{anchor.label}»: {money(anchor.price)} por {anchor.uptoMinutes} minutos.</p><p className="rounded-lg bg-background p-3 font-medium">{money(anchor.price)} ÷ {anchor.uptoMinutes} min × {unitMinutes} min = <strong>{money(amount)}</strong></p></>}
        {derived && !resolved && <p className="text-amber-500">No hay otra tarifa de la que se pueda calcular el precio. Se usará el precio de respaldo que ingreses abajo.</p>}
        {Number.isFinite(amount) ? <><p className="text-base font-semibold text-gm-yellow">Se agrega {money(amount)} {formatRecurringUnitLabel(unitMinutes)} adicional.</p><p className="text-xs text-muted-foreground">Cada bloque que empieza se cobra completo. 1 bloque: +{money(amount)} · 2 bloques: +{money(amount * 2)} · 3 bloques: +{money(amount * 3)}. Estos importes se suman al precio anterior; el total se redondea al finalizar.</p></> : <p>Completá el precio para ver cuánto se sumará.</p>}
      </div>;
    })}
  </div>;
}
