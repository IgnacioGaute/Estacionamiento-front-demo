'use client';

import { useId, useState } from 'react';
import { MoreHorizontal, CalendarDays } from 'lucide-react';
import type { ticketPrice } from '@/types/ticket-price';
import { VehicleTariffTabs } from './tariff-summary-controls';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/components/pricing-breakdown';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UpdateTicketPriceDialog } from '../tickets/components/ticket-price/update-ticket-price-dialog';
import { DeleteTicketPriceDialog } from '../tickets/components/ticket-price/delete-ticket-price-dialog';
import { CreateTicketPriceDialog } from '../tickets/components/ticket-price/create-ticket-price-dialog';

const unassigned = '__UNASSIGNED__';
const durationNames: Record<string, string> = { DIA: 'Día', SEMANA: 'Semana', SEMANA_Y_DIA: 'Semana y día', MES: 'Mes', MES_Y_DIA: 'Mes y día' };
const durationOrder: Record<string, number> = { DIA: 0, SEMANA: 1, SEMANA_Y_DIA: 2, MES: 3, MES_Y_DIA: 4 };
export function TariffPasses({ prices, vehicles }: { prices: ticketPrice[]; vehicles: { code: string; name: string; enabled: boolean }[] }) {
  const [selected, setSelected] = useState('');
  const panelId = useId();
  const codes = [...new Set([...vehicles.filter(v => v.enabled).map(v => v.code), ...prices.map(price => price.vehicleType ?? unassigned)])];
  const tabs = codes.map(code => ({ code, name: code === unassigned ? 'Sin vehículo' : vehicles.find(v => v.code === code)?.name ?? code }));
  const vehicle = codes.includes(selected) ? selected : codes[0] ?? '';
  const name = tabs.find(tab => tab.code === vehicle)?.name ?? '';
  const canCreate = vehicles.some(v => v.code === vehicle && v.enabled);
  const visiblePrices = prices.filter(price => (price.vehicleType ?? unassigned) === vehicle).sort((a,b) => (durationOrder[a.ticketTimeType ?? ''] ?? 99) - (durationOrder[b.ticketTimeType ?? ''] ?? 99));
  return <section data-tariff-passes className="space-y-5 rounded-2xl border bg-card p-4 sm:p-6">
    <div><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pases</span><h2 className="mt-1 text-xl font-semibold">Precios por día, semana o mes</h2><p className="mt-2 text-sm text-muted-foreground">Elegí el vehículo para consultar o editar sus pases. El precio por unidad se multiplica por la cantidad contratada.</p></div>
    {codes.length ? <>
      <div className="space-y-2 rounded-xl border bg-background/40 p-3 sm:p-4"><p className="text-xs font-medium text-muted-foreground">Tipo de vehículo</p><VehicleTariffTabs vehicles={tabs} value={vehicle} onChange={setSelected} panelId={panelId} label="Tipo de vehículo de los pases" /></div>
      <div id={panelId} role="tabpanel" aria-labelledby={panelId + '-tab-' + vehicle} tabIndex={0} className="space-y-4 outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-gradient-to-r from-white/[0.07] to-transparent p-4">
          <div className="flex items-center gap-3"><CalendarDays className="size-5 shrink-0 text-neutral-300" aria-hidden="true" /><div><h3 className="font-semibold">Pases de {name}</h3><p className="mt-1 text-xs text-muted-foreground">Día · Semana · Mes</p></div></div>
          {canCreate && <CreateTicketPriceDialog key={vehicle} defaultVehicleType={vehicle} />}
        </div>
        {!canCreate && <p className="text-sm text-muted-foreground">{vehicle === unassigned ? 'Estas tarifas todavía no tienen un vehículo asignado. Podés corregirlas desde sus acciones.' : 'Este tipo de vehículo no está habilitado. Sus tarifas se conservan.'}</p>}
        <div className="rounded-2xl border bg-background/20 p-3 sm:p-5">
          {visiblePrices.length ? <table data-pass-rows className="w-full border-separate border-spacing-y-2 text-sm">
            <caption className="sr-only">Precios de pases de {name}</caption>
            <thead><tr className="text-left text-muted-foreground"><th scope="col" className="px-3 pb-1 text-xs font-medium uppercase tracking-wide">Duración</th><th scope="col" className="px-2 pb-1 text-right text-xs font-medium uppercase tracking-wide">Importe</th><th scope="col" className="w-10"><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody>{visiblePrices.map(price => <tr key={price.id} className="bg-background/40 transition-colors hover:bg-white/[0.04] motion-reduce:transition-none">
              <th scope="row" className="rounded-l-xl border-y border-l-[3px] border-y-white/[0.06] border-l-neutral-500/60 px-3 py-4 text-left font-medium">
                {durationNames[price.ticketTimeType ?? ''] ?? price.ticketTimeType ?? 'Sin duración'}
                <span className="mt-1 block text-xs font-normal text-muted-foreground">Precio por unidad</span>
              </th>
              <td className="whitespace-nowrap border-y border-white/[0.06] px-2 py-4 text-right font-bold tabular-nums sm:px-3 sm:text-base">{formatPrice(price.ticketTimePrice)}</td>
              <td className="rounded-r-xl border-y border-r border-white/[0.06] pr-1 sm:pr-2">
                <DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon" className="size-9" aria-label={'Acciones de pase ' + (durationNames[price.ticketTimeType ?? ''] ?? price.ticketTimeType ?? '') + ' de ' + name}><MoreHorizontal className="size-4" aria-hidden="true" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44"><UpdateTicketPriceDialog ticketPrice={price} /><DeleteTicketPriceDialog ticketPrice={price} /></DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>)}</tbody>
          </table> : <p data-pass-rows className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">Todavía no hay pases para {name}.</p>}
        </div>
      </div>
    </> : <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Habilitá un tipo de vehículo en Configuración → Operación para cargar sus pases.</p>}
    <div className="space-y-1 border-t pt-4 text-xs leading-relaxed text-muted-foreground"><p>Un vehículo que permanece 24 horas con cobro por tiempo no tiene automáticamente un pase de un día.</p><p>Cada alta, edición o eliminación se guarda desde su ventana y se usa al crear próximos pases.</p></div>
  </section>;
}
