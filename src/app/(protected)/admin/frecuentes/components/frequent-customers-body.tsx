'use client';

import { VehicleTypeOptions } from '@/components/vehicle-type-options';

import { useState, useTransition } from 'react';
import dayjs from 'dayjs';
import { Inbox } from 'lucide-react';

import { PageHeader } from '@/components/page-header';
import { PageTour, type PageTourStep } from '@/components/page-tour';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getFrequentCustomersAction } from '@/actions/tickets/get-frequent-customers.action';
import { FrequentCustomer } from '@/types/frequent-customer.type';
import { formatElapsed } from '@/utils/ticket-registration.utils';
import { PlateHistoryDialog } from './plate-history-dialog';

const TOUR_STEPS: PageTourStep[] = [
  {
    key: 'filtros',
    selector: '[data-tour="frecuentes-filtros"]',
    title: 'Período que se mira',
    desc: 'La lista se arma con los tickets ya cerrados entre estas dos fechas. Sin fechas, toma todo el historial.',
    radius: 10,
  },
  {
    key: 'tipo',
    selector: '[data-tour="frecuentes-tipo"]',
    title: 'Filtrar por tipo de vehículo',
    desc: 'Sirve para ver, por ejemplo, solo las camionetas que vuelven seguido.',
    radius: 10,
  },
  {
    key: 'visitas',
    selector: '[data-tour="frecuentes-visitas"]',
    title: 'Cuántas visitas cuentan',
    desc: 'Con 2 aparece todo el que volvió alguna vez. Subilo para quedarte solo con los que vienen muy seguido.',
    radius: 10,
  },
  {
    key: 'aplicar',
    selector: '[data-tour="frecuentes-aplicar"]',
    title: 'Aplicar filtros',
    desc: 'Los cambios no se aplican solos: tocá acá para rearmar la lista.',
    radius: 10,
  },
  {
    key: 'tabla',
    selector: '[data-tour="frecuentes-tabla"]',
    title: 'La lista',
    desc: 'Cada fila es una patente con sus visitas, el tipo de vehículo y cuándo vino la última vez. Tocá una para ver todo su historial.',
    radius: 10,
  },
];

interface FrequentCustomersBodyProps {
  initialCustomers: FrequentCustomer[];
}

const VEHICLE_TYPE_LABEL: Record<string, string> = {
  AUTO: 'Auto',
  CAMIONETA: 'Camioneta',
};

export function FrequentCustomersBody({ initialCustomers }: FrequentCustomersBodyProps) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [vehicleType, setVehicleType] = useState<string>('ALL');
  const [minVisits, setMinVisits] = useState('2');
  const [isPending, startTransition] = useTransition();

  const applyFilters = () => {
    startTransition(async () => {
      const data = await getFrequentCustomersAction({
        from: from || undefined,
        to: to || undefined,
        vehicleType: vehicleType === 'ALL' ? undefined : vehicleType,
        minVisits: minVisits ? Number(minVisits) : undefined,
      });
      setCustomers(data);
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={['Estacionamiento', 'Administración', 'Frecuentes']}
        title="Clientes frecuentes"
        description="Patentes con más de una visita, armado a partir del historial de tickets ya cerrados."
        actions={<PageTour steps={TOUR_STEPS} />}
      />

      <div data-tour="frecuentes-filtros" className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-gm-surface-2 p-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">Desde</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-[150px] text-[13px]" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">Hasta</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-[150px] text-[13px]" />
        </div>
        <div data-tour="frecuentes-tipo" className="flex flex-col gap-1.5">
          <Label className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">Tipo de vehículo</Label>
          <Select value={vehicleType} onValueChange={setVehicleType}>
            <SelectTrigger className="h-8 w-[150px] text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <VehicleTypeOptions />
            </SelectContent>
          </Select>
        </div>
        <div data-tour="frecuentes-visitas" className="flex flex-col gap-1.5">
          <Label className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">Mínimo de visitas</Label>
          <Input
            type="number"
            min={1}
            value={minVisits}
            onChange={(e) => setMinVisits(e.target.value)}
            className="h-8 w-[110px] text-[13px]"
          />
        </div>
        <Button data-tour="frecuentes-aplicar" type="button" onClick={applyFilters} disabled={isPending} className="h-8">
          {isPending ? 'Buscando...' : 'Aplicar filtros'}
        </Button>
      </div>

      <div data-tour="frecuentes-tabla" className="overflow-hidden rounded-lg border border-border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Patente</TableHead>
                <TableHead>Apellido</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Visitas</TableHead>
                <TableHead>Primera visita</TableHead>
                <TableHead>Última visita</TableHead>
                <TableHead>Prom. días entre visitas</TableHead>
                <TableHead>Duración típica</TableHead>
                <TableHead>Franja habitual</TableHead>
                <TableHead className="text-right">Gasto total</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-28 text-center">
                    <div className="flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
                      <Inbox className="size-5 opacity-50" />
                      <span className="text-[12.5px]">No hay clientes frecuentes para estos filtros.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer.licensePlateNormalized}>
                    <TableCell className="whitespace-nowrap font-bold">{customer.licensePlateOriginal}</TableCell>
                    <TableCell className="whitespace-nowrap">{customer.lastNameCustomer ?? '—'}</TableCell>
                    <TableCell className="whitespace-nowrap">{VEHICLE_TYPE_LABEL[customer.vehicleType] ?? customer.vehicleType}</TableCell>
                    <TableCell className="text-right">{customer.visits}</TableCell>
                    <TableCell className="whitespace-nowrap text-[12.5px]">
                      {dayjs(customer.firstVisit).format('DD/MM/YYYY')}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-[12.5px]">
                      {dayjs(customer.lastVisit).format('DD/MM/YYYY')}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-[12.5px]">
                      {customer.avgDaysBetweenVisits !== null ? `${customer.avgDaysBetweenVisits.toFixed(1)} días` : '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-[12.5px]">
                      {customer.medianDurationMinutes !== null ? formatElapsed(customer.medianDurationMinutes) : '—'}
                      {customer.minDurationMinutes !== null && customer.maxDurationMinutes !== null && (
                        <span className="ml-1 text-muted-foreground">
                          ({formatElapsed(customer.minDurationMinutes)} - {formatElapsed(customer.maxDurationMinutes)})
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-[12.5px] text-muted-foreground">
                      {customer.mostCommonBracket ?? '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right font-medium">
                      ${customer.totalSpent.toLocaleString('es-AR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <PlateHistoryDialog
                        licensePlateNormalized={customer.licensePlateNormalized}
                        licensePlateOriginal={customer.licensePlateOriginal}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
