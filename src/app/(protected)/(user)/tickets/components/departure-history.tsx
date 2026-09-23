'use client';

import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { TicketRegistration } from '@/types/ticket-registration.type';
import type { TicketRegistrationForDay } from '@/types/ticket-registration-for-day.type';

const normalize = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '');
const PAGE_SIZE = 20;

export function DepartureHistory({ registrations, dailyRegistrations, deliveryEnabled, onReceipt }: {
  registrations: TicketRegistration[];
  dailyRegistrations: TicketRegistrationForDay[];
  deliveryEnabled: boolean;
  onReceipt: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [date, setDate] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const rows = useMemo(() => {
    const hourly = registrations.filter(r => r.departureDay || r.departureTime).map(r => ({
      id: r.id,
      identification: r.licensePlateOriginal || r.vehiclePlateCustomer || r.codeBarTicket || r.lastNameCustomer || 'Sin patente',
      search: [r.licensePlateOriginal, r.vehiclePlateCustomer, r.codeBarTicket, r.lastNameCustomer].filter(Boolean).join(' '),
      date: r.departureDay ?? '', time: r.departureTime?.slice(0, 5) ?? '',
      type: 'Por hora',
    }));
    const daily = dailyRegistrations.filter(r => r.retired).map(r => {
      const departure = r.retiredAt ? dayjs(r.retiredAt).tz('America/Argentina/Buenos_Aires') : null;
      return {
        id: r.id, identification: r.vehiclePlateCustomer || r.lastNameCustomer || 'Sin patente',
        search: [r.vehiclePlateCustomer, r.lastNameCustomer].filter(Boolean).join(' '),
        date: departure?.format('YYYY-MM-DD') ?? '', time: departure?.format('HH:mm') ?? '',
        type: 'Día / semana / mes',
      };
    });
    return [...hourly, ...daily].filter(row => (!date || row.date === date) && (!query.trim() || normalize(row.search).includes(normalize(query))))
      .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  }, [registrations, dailyRegistrations, query, date]);

  return <details className="mx-auto mt-6 max-w-[1180px] rounded-2xl border border-border bg-card">
    <summary className="cursor-pointer px-5 py-4 font-semibold">Historial de salidas</summary>
    <div className="space-y-4 border-t border-border p-4 sm:p-5">
      <p className="text-sm text-muted-foreground">Buscá una salida anterior para volver a mostrar el QR, enviar WhatsApp o imprimir su comprobante.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm"><span>Patente, ticket o apellido</span><Input value={query} placeholder="Buscar una salida…" onChange={e => { setQuery(e.target.value); setLimit(PAGE_SIZE); }} /></label>
        <label className="space-y-1 text-sm"><span>Fecha de salida (opcional)</span><Input type="date" value={date} onChange={e => { setDate(e.target.value); setLimit(PAGE_SIZE); }} /></label>
      </div>
      {!deliveryEnabled && <p className="text-sm text-muted-foreground">Activá un medio de entrega en administración para abrir los comprobantes.</p>}
      <p role="status" className="text-xs text-muted-foreground">{rows.length} salidas encontradas</p>
      <ul className="divide-y divide-border">
        {rows.slice(0, limit).map(row => <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div><p className="font-semibold">{row.identification}</p><p className="text-sm text-muted-foreground">{row.date ? `${row.date.split('-').reverse().join('/')} ${row.time}` : 'Salida sin fecha registrada'} · {row.type}</p></div>
          {deliveryEnabled && <Button variant="outline" onClick={() => onReceipt(row.id)} aria-label={`Abrir comprobante de salida de ${row.identification}`}>Abrir comprobante</Button>}
        </li>)}
      </ul>
      {rows.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No hay salidas para esta búsqueda.</p>}
      {rows.length > limit && <Button variant="outline" onClick={() => setLimit(value => value + PAGE_SIZE)}>Mostrar más salidas</Button>}
    </div>
  </details>;
}
