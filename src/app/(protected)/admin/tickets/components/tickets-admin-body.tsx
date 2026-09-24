'use client';

import { PricingOptionsCard } from './pricing-options-card';
import { ReceiptDeliveryCard } from './receipt-delivery-card';
import { VehicleTypesCard } from './vehicle-types-card';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FileSpreadsheet, PauseCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { JellyRadio } from '@/components/ui/jelly-radio';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { PageHeader } from '@/components/page-header';
import { PageTour, PageTourStep } from '@/components/page-tour';
import { ExportTicketsExcel } from '../../components/export-ticket-excel';
import { TicketScheduleCard } from './ticket-schedule-card';
import { TicketsTable } from './tickets-table';
import { ticketColumns } from './ticket-columns';
import { TicketsPriceBracketTable } from './ticket-price-bracket/tickets-price-bracket-table';
import { ticketPriceBracketColumns } from './ticket-price-bracket/ticket-price-bracket-columns';
import { PricingPreview } from './ticket-price-bracket/pricing-preview';
import { TicketPriceBracketMap } from './ticket-price-bracket/ticket-price-bracket-map';
import { TicketsPriceTable } from './ticket-price/tickets-price-table';
import { ticketPriceColumns } from './ticket-price/ticket-price-columns';
import { CreateTicketPriceDialog } from './ticket-price/create-ticket-price-dialog';
import { Ticket } from '@/types/ticket.type';
import { TicketPriceBracket } from '@/types/ticket-price-bracket.type';
import { ticketPrice } from '@/types/ticket-price';
import { TicketSchedule } from '@/services/tickets.service';

interface Props {
  sortedTickets: Ticket[];
  ticketSchedule: TicketSchedule | null;
  priceBrackets: TicketPriceBracket[];
  dayWeekMonthPrices: ticketPrice[];
  isAdmin: boolean;
}

type TabValue = 'tickets' | 'tarifas' | 'mapaTarifas' | 'tarifasDiaSemanaMes' | 'opciones' | 'vehiculos' | 'comprobantes';

export function TicketsAdminBody({
  sortedTickets,
  ticketSchedule,
  priceBrackets,
  dayWeekMonthPrices,
  isAdmin,
}: Props) {
  const [tab, setTab] = useState<TabValue>('tickets');
  const searchParams = useSearchParams();
  useEffect(() => {
    if (isAdmin && searchParams.get('tab') === 'tarifasDiaSemanaMes') setTab('tarifasDiaSemanaMes');
  }, [isAdmin, searchParams]);
  const [chargingActive, setChargingActive] = useState(!!ticketSchedule?.pricingOptions?.charging.enabled);
  useEffect(() => setChargingActive(!!ticketSchedule?.pricingOptions?.charging.enabled), [ticketSchedule?.pricingOptions?.charging.enabled]);

  const goTo = (value: TabValue) => () => setTab(value);

  const baseSteps: PageTourStep[] = [
    {
      key: 'create',
      selector: '[data-tour="tickets-create"]',
      title: 'Crear ticket',
      desc: 'Registrá un ticket nuevo (código de barras físico) indicando el tipo de vehículo. El precio y si es tarifa diurna o nocturna se calculan solos.',
      radius: 6,
      onEnter: goTo('tickets'),
    },
    {
      key: 'table',
      selector: '[data-tour="tickets-table"]',
      title: 'Tickets registrados',
      desc: 'Cada fila es un ticket físico. Al escanear su código de barras en el mostrador se registra automáticamente la entrada y, al volver a escanearlo, el resumen para confirmar el cobro y la salida.',
      radius: 10,
      onEnter: goTo('tickets'),
    },
    {
      key: 'export',
      selector: '[data-tour="tickets-export"]',
      title: 'Exportar a Excel',
      desc: 'Descargá el listado de tickets registrados en un archivo Excel.',
      radius: 6,
    },
  ];

  const adminSteps: PageTourStep[] = [
    {
      key: 'tabs',
      selector: '[data-tour="tickets-tabs"]',
      title: 'Tickets y tarifas',
      desc: 'Además de los tickets, como admin manejás acá las franjas de precio: desde minutos hasta varios días, todo con la misma tarjeta.',
      radius: 8,
      onEnter: goTo('tickets'),
    },
    baseSteps[0],
    baseSteps[1],
    {
      key: 'schedule',
      selector: '[data-tour="tickets-schedule"]',
      title: 'Horario diurno/nocturno y tolerancia',
      desc: 'Definí a qué hora empieza y termina la tarifa diurna, y cuántos minutos de tolerancia hay antes de saltar a cobrar la franja siguiente.',
      radius: 8,
      onEnter: goTo('tarifas'),
    },
    {
      key: 'bracket-create',
      selector: '[data-tour="tickets-price-create"]',
      title: 'Franjas de precio',
      desc: 'Armá la escalera completa de precios: desde "hasta 15 minutos" hasta "3 días" o lo que necesites. El sistema elige sola la franja que corresponde según cuánto estuvo el vehículo, sin que nadie tenga que elegir nada.',
      radius: 6,
      onEnter: goTo('tarifas'),
    },
    baseSteps[2],
  ];

  return (
    <>
      <PageHeader
        breadcrumb={['Estacionamiento', 'Administración', 'Tickets']}
        title="Administrar Tickets"
        description="Gestiona todos los tickets registrados."
        actions={
          <div className="flex items-center gap-2">
            <PageTour steps={isAdmin ? adminSteps : baseSteps} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2" data-tour="tickets-export">
                  <FileSpreadsheet className="w-4 h-4" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <ExportTicketsExcel tickets={sortedTickets} />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {isAdmin ? (
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
          <div data-tour="tickets-tabs">
            <JellyRadio
              aria-label="Secciones de tickets"
              size="lg"
              value={tab}
              onChange={(v) => setTab(v as TabValue)}
              items={[
                { value: 'tickets', label: 'Tickets' },
                {
                  value: 'tarifas',
                  label: (
                    <span className={chargingActive ? 'line-through opacity-60' : undefined}>
                      Precios por duración
                    </span>
                  ),
                  // Cuando cobrás por períodos, esta lista queda guardada pero no se usa.
                  badge: chargingActive ? 'En pausa' : undefined,
                },
                { value: 'opciones', label: 'Cómo cobrar' },
                { value: 'comprobantes', label: 'Comprobantes' },
                { value: 'vehiculos', label: 'Tipos de vehículo' },
                { value: 'mapaTarifas', label: 'Consultar precios' },
                { value: 'tarifasDiaSemanaMes', label: 'Día / semana / mes' },
              ]}
            />
          </div>

          {/* Sin forceMount: montado y oculto desde el arranque, el Select de esta tarjeta
              portea el texto del ítem elegido hacia un trigger que todavía no está en pantalla
              y React termina fallando con removeChild en SelectItemText. */}
          <TabsContent value="opciones" className="mt-4">{ticketSchedule && <PricingOptionsCard schedule={ticketSchedule} onSaved={options => setChargingActive(options.charging.enabled)} />}</TabsContent>
          <TabsContent value="vehiculos" className="mt-4"><VehicleTypesCard /></TabsContent>
          <TabsContent value="comprobantes" className="mt-4"><ReceiptDeliveryCard initial={ticketSchedule?.receiptDelivery} /></TabsContent>

          <TabsContent value="tickets" className="mt-4">
            <div className="mb-4 space-y-2 rounded-xl border border-gm-yellow/25 bg-gm-yellow/5 p-4">
              <h3 className="font-semibold">Tus tarjetas físicas de estacionamiento</h3>
              <p className="text-sm text-muted-foreground">Cada ticket es una tarjeta que le entregás al conductor cuando entra. Cargá el número de su código de barras tal como está impreso en la tarjeta.</p>
              <p className="text-sm text-muted-foreground">Al ingresar el auto, escaneá el código o escribilo manualmente. Al devolver la tarjeta, buscá o escaneá el mismo código para ver el importe y confirmar la salida. Después podés volver a usar esa tarjeta.</p>
            </div>
            <TicketsTable columns={ticketColumns} data={sortedTickets} />
          </TabsContent>

          <TabsContent value="tarifas" className="mt-4 space-y-4">
            <div className="rounded-xl border border-gm-yellow/25 bg-gm-yellow/5 p-4 text-sm">
              <p className="font-semibold">Precios para empezar</p>
              <p className="mt-1 text-muted-foreground">Las playas nuevas incluyen tarifas de ejemplo para Auto, identificadas con “Ejemplo”. Podés editarlas o eliminarlas y crear las tuyas. Revisá los importes antes de registrar el primer ingreso: son precios reales que el sistema usará para cobrar.</p>
            </div>
            {ticketSchedule && (
              <Accordion type="single" collapsible className="rounded-xl border bg-background px-4" data-tour="tickets-schedule">
                <AccordionItem value="schedule" className="border-none">
                  <AccordionTrigger className="text-base font-semibold">
                    Horario diurno/nocturno y tolerancia
                  </AccordionTrigger>
                  <AccordionContent>
                    <TicketScheduleCard schedule={ticketSchedule} />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
            {chargingActive ? (
              <>
                <div role="status" className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-5 sm:p-6">
                  <div className="flex items-start gap-3">
                    <PauseCircle aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-amber-500" />
                    <div className="space-y-2">
                      <h2 className="text-lg font-semibold">Forma de cobro activada</h2>
                      <p className="text-sm text-muted-foreground">Los precios por duración están guardados, pero no se usan para los nuevos ingresos. Se cobran los precios configurados en «Cómo cobrar».</p>
                      <Button type="button" size="sm" variant="outline" onClick={() => setTab('opciones')}>Ver forma de cobro activa</Button>
                    </div>
                  </div>
                </div>
                <details className="rounded-xl border bg-background/50">
                  <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Ver o editar los precios por duración guardados</summary>
                  <div className="space-y-3 border-t p-4">
                    <p className="text-sm text-muted-foreground">Estos precios volverán a usarse para nuevos ingresos si desactivás «Forma de cobro».</p>
                    <TicketsPriceBracketTable columns={ticketPriceBracketColumns} data={priceBrackets} />
                  </div>
                </details>
              </>
            ) : <TicketsPriceBracketTable columns={ticketPriceBracketColumns} data={priceBrackets} />}
            <PricingPreview />
          </TabsContent>

          <TabsContent value="mapaTarifas" className="mt-4">
            {ticketSchedule ? (
              <div className="rounded-xl border bg-background p-4 sm:p-6">
                <TicketPriceBracketMap brackets={priceBrackets} schedule={ticketSchedule} embedded />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No se pudo cargar el horario diurno/nocturno.
              </p>
            )}
          </TabsContent>

          <TabsContent value="tarifasDiaSemanaMes" className="mt-4 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12.5px] text-muted-foreground">
                Precio por unidad para los tickets de día, semana o mes — se aplica solo al crear un
                ticket nuevo de ese tipo.
              </p>
              <CreateTicketPriceDialog />
            </div>
            <TicketsPriceTable columns={ticketPriceColumns} data={dayWeekMonthPrices} />
          </TabsContent>
        </Tabs>
      ) : (
        <section className="w-full space-y-2">
          <TicketsTable columns={ticketColumns} data={sortedTickets} />
        </section>
      )}
    </>
  );
}
