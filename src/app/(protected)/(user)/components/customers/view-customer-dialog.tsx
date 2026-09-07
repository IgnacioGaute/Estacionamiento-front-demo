'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Eye, Phone, User } from 'lucide-react';
import { Customer } from '@/types/cutomer.type';

const ars = (n: number | undefined | null) =>
  n != null
    ? new Intl.NumberFormat('es-AR', {
        style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
      }).format(n)
    : '—';

export function ViewCustomerDialog({ customer }: { customer: Customer }) {
  const [open, setOpen] = useState(false);
  const vehicles = customer.parkingOwners ?? [];
  const hasPendingReceipts = customer.receipts?.some(
    (r) => r.status === 'PENDING',
  );
  const hasDebt = hasPendingReceipts || customer.hasDebt;
  const initials =
    `${customer.firstName?.[0] ?? ''}${customer.lastName?.[0] ?? ''}`.toUpperCase() ||
    'GM';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start">
          <Eye className="size-4" />
          Ver detalles
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 pr-8">
            <div className="grid size-12 place-items-center rounded-md bg-gm-orange text-white font-display font-bold text-base">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <DialogTitle>
                  {customer.firstName} {customer.lastName}
                </DialogTitle>
                <Badge variant={customer.deletedAt ? 'default' : 'green'}>
                  {customer.deletedAt ? 'Inactivo' : 'Activo'}
                </Badge>
              </div>
              <DialogDescription className="mt-0.5 flex flex-wrap items-center gap-3 text-[12.5px]">
                <span className="inline-flex items-center gap-1.5">
                  <User className="size-3.5" /> Propietario
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="size-3.5" /> {customer.phone || '—'}
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Quick facts */}
        <dl className="grid grid-cols-3 gap-2">
          <Fact label="Cocheras"  value={customer.numberOfVehicles?.toString() ?? '0'} />
          <Fact label="Crédito"   value={ars(customer.credit ?? 0)} accent="yellow" />
          <Fact
            label="Estado de cuenta"
            value={hasDebt ? 'Con deuda' : 'Al día'}
            accent={hasDebt ? 'orange' : 'green'}
          />
        </dl>

        <section>
          <h3 className="gm-display text-[12px] font-bold tracking-[0.08em] text-muted-foreground mb-2">
            Vehículos registrados
          </h3>

          {vehicles.length > 0 ? (
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° de cochera</TableHead>
                    {customer.customerType !== 'OWNER' && (
                      <TableHead>Propietario</TableHead>
                    )}
                    <TableHead>Monto</TableHead>
                    <TableHead>Tipo</TableHead>
                    {customer.customerType === 'OWNER' && (
                      <TableHead>¿Alquilada?</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((v, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <span className="gm-spot-tag">{v.garageNumber}</span>
                      </TableCell>
                      {customer.customerType !== 'OWNER' && (
                        <TableCell className="text-muted-foreground">
                          {v.customer
                            ? `${v.customer.firstName} ${v.customer.lastName}`
                            : 'Garage Mitre'}
                        </TableCell>
                      )}
                      <TableCell className="gm-mono gm-tnum font-semibold">
                        {ars(v.amount)}
                      </TableCell>
                      <TableCell>
                        {v.parkingType ? (
                          <Badge variant="default">
                            {v.parkingType?.name}
                          </Badge>
                        ) : (
                          <Badge variant="orange">Alquiler</Badge>
                        )}
                      </TableCell>
                      {customer.customerType === 'OWNER' && (
                        <TableCell>
                          {v.rent ? (
                            <Badge variant="orange">Sí</Badge>
                          ) : (
                            <Badge variant="default">No</Badge>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border bg-gm-surface-2/50 p-6 text-center text-[13px] text-muted-foreground">
              No hay vehículos registrados.
            </div>
          )}
        </section>

      </DialogContent>
    </Dialog>
  );
}

function Fact({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: 'yellow' | 'orange' | 'green';
}) {
  const c =
    accent === 'yellow'
      ? 'text-gm-yellow'
      : accent === 'orange'
      ? 'text-[#FF8458]'
      : accent === 'green'
      ? 'text-[#9AD588]'
      : 'text-foreground';
  return (
    <div className="rounded-md border border-border bg-gm-surface-2 p-3">
      <dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </dt>
      <dd className={`gm-display gm-tnum mt-1 text-[20px] font-bold ${c}`}>
        {value}
      </dd>
    </div>
  );
}
