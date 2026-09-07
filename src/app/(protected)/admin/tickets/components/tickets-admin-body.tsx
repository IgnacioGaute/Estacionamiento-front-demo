'use client';

import { useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { PageHeader } from '@/components/page-header';
import { PageTour, PageTourStep } from '@/components/page-tour';
import { ExportTicketsExcel } from '../../components/export-ticket-excel';
import { TicketScheduleCard } from './ticket-schedule-card';
import { TicketsTable } from './tickets-table';
import { ticketColumns } from './ticket-columns';
import { TicketsPriceBracketTable } from './ticket-price-bracket/tickets-price-bracket-table';
import { ticketPriceBracketColumns } from './ticket-price-bracket/ticket-price-bracket-columns';
import { Ticket } from '@/types/ticket.type';
import { TicketPriceBracket } from '@/types/ticket-price-bracket.type';
import { TicketSchedule } from '@/services/tickets.service';

interface Props {
  sortedTickets: Ticket[];
  ticketSchedule: TicketSchedule | null;
  priceBrackets: TicketPriceBracket[];
  isAdmin: boolean;
}

type TabValue = 'tickets' | 'tarifas';

export function TicketsAdminBody({
  sortedTickets,
  ticketSchedule,
  priceBrackets,
  isAdmin,
}: Props) {
  const [tab, setTab] = useState<TabValue>('tickets');

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
      desc: 'Cada fila es un ticket físico. Al escanear su código de barras en el mostrador se registra automáticamente la entrada y, al volver a escanearlo, la salida con su precio.',
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
          <TabsList data-tour="tickets-tabs">
            <TabsTrigger value="tickets">Tickets</TabsTrigger>
            <TabsTrigger value="tarifas">Tarifas</TabsTrigger>
          </TabsList>

          <TabsContent value="tickets" className="mt-4">
            <TicketsTable columns={ticketColumns} data={sortedTickets} />
          </TabsContent>

          <TabsContent value="tarifas" className="mt-4 space-y-4">
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
            <TicketsPriceBracketTable
              columns={ticketPriceBracketColumns}
              data={priceBrackets}
            />
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
