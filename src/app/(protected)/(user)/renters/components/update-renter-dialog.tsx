'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Edit3 } from 'lucide-react';
import { updateCustomerAction } from '@/actions/customers/update-customer.action';
import {
  updateCustomerSchema,
  UpdateCustomerSchemaType,
} from '@/schemas/customer.schema';
import { Customer } from '@/types/cutomer.type';
import { CustomerStepperShell } from '@/components/customer-stepper-shell';
import { CocherasInquilino, cocherasParaGuardar, validarCocheras } from './cocheras-inquilino';
import { mesLargo } from './cuenta/util';

export function UpdateRenterDialog({
  customer,
  nuevoImporteDesde,
  onGuardado,
}: {
  customer: Customer;
  // Primer mes sin abono cargado (AAAA-MM): desde ahí rige un cambio en el importe.
  nuevoImporteDesde?: string;
  onGuardado?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<Partial<UpdateCustomerSchemaType>>({
    resolver: zodResolver(updateCustomerSchema),
    defaultValues: {
      firstName: customer.firstName ?? '',
      lastName: customer.lastName ?? '',
      phone: customer.phone ?? '',
      numberOfVehicles: customer.numberOfVehicles ?? 0,
      comments: customer.comments ?? '',
      customerType: customer.customerType ?? 'RENTER',
      hasDebt: customer.hasDebt || false,
      monthsDebt: customer.monthsDebt || [],
      credit: customer.credit || 0,
      parkingRenters:
        // Sin el «propietario» de antes: al guardar, cada cochera queda con el precio escrito.
        customer.parkingRenters?.map((vr) => ({
          id: vr.id ?? '',
          garageNumber: vr.garageNumber ?? '',
          amount: vr.amount ?? 0,
        })) ?? [],
    },
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: 'parkingRenters',
  });

  const handleNext = (values: Partial<UpdateCustomerSchemaType>) => {
    const n = values.numberOfVehicles ?? 0;
    const current = form.getValues('parkingRenters') ?? [];
    if (current.length < n) {
      replace([
        ...current,
        ...Array.from({ length: n - current.length }, () => ({
          garageNumber: '',
          amount: 0,
        })),
      ]);
    } else if (current.length > n) {
      replace(current.slice(0, n));
    }
  };

  const handleConfirm = async (values: Partial<UpdateCustomerSchemaType>) => {
    if (!values.hasDebt) values.monthsDebt = [];
    if (!validarCocheras(form)) {
      toast.error('Falta el precio mensual de alguna cochera.');
      return;
    }
    setIsPending(true);
    try {
      const data = await updateCustomerAction(customer.id, {
        ...values,
        parkingRenters: cocherasParaGuardar(values.parkingRenters),
      });
      if (!data || data.error) {
        toast.error(data?.error?.message ?? 'Error desconocido');
      } else {
        toast.success('Inquilino actualizado exitosamente');
        setOpen(false);
        onGuardado?.();
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <CustomerStepperShell
      open={open}
      setOpen={setOpen}
      trigger={
        <Button variant="ghost" size="sm" className="w-full justify-start">
          <Edit3 className="size-4" />
          Editar inquilino
        </Button>
      }
      form={form}
      isPending={isPending}
      title={`Editar — ${customer.firstName} ${customer.lastName}`}
      entityLabel="inquilino"
      mode="update"
      vehiclesCount={fields.length}
      vehiclesStepLabel="Cocheras"
      onNextFromCustomer={handleNext}
      onConfirm={handleConfirm}
      // El saldo del inquilino se toca sólo desde su cuenta corriente (saldo inicial y ajustes).
      sinDeudaLegacy
      vehiclesPhase={
        <>
          <CocherasInquilino form={form} fields={fields} isPending={isPending} />
          {/* Un cambio de cocheras o de precio no reescribe lo ya cargado: rige desde el próximo abono. */}
          <p className="rounded-xl border border-gm-yellow/40 bg-gm-yellow/[0.06] px-4 py-3 text-sm">
            {nuevoImporteDesde ? (
              <>
                Si cambia un precio, el abono nuevo rige <strong>desde {mesLargo(nuevoImporteDesde)}</strong>.
              </>
            ) : (
              <>Si cambia un precio, el abono nuevo rige desde el próximo que se cargue.</>
            )}{' '}
            Los cargos ya registrados conservan su importe; si hace falta corregir alguno, cargá un ajuste desde su cuenta.
          </p>
        </>
      }
    />
  );
}
