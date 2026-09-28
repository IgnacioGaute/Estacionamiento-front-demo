'use client';

import { useState, useTransition } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleDollarSign, Plus } from 'lucide-react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { createCustomerAction } from '@/actions/customers/create-customer.action';
import { customerSchema, CustomerSchemaType } from '@/schemas/customer.schema';
import { SaldoInicial } from '@/types/cuenta.type';
import { CustomerStepperShell } from '@/components/customer-stepper-shell';
import { CocherasInquilino, cocherasParaGuardar, precioValido, validarCocheras } from './cocheras-inquilino';
import { EditorSaldoInicial, SALDO_AL_DIA, erroresSaldoInicial } from './cuenta/saldo-inicial';

export function CreateRenterDialog({ onCreado }: { onCreado?: () => void }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  // El saldo inicial va con el alta, en la misma transacción: no queda un inquilino a medio cargar.
  const [saldo, setSaldo] = useState<SaldoInicial>(SALDO_AL_DIA);

  const form = useForm<CustomerSchemaType>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      comments: '',
      customerNumber: undefined,
      numberOfVehicles: 1,
      customerType: 'RENTER',
      hasDebt: false,
      monthsDebt: [],
      parkingRenters: [],
      credit: 0,
    },
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: 'parkingRenters',
  });

  // El abono (suma de los precios de las cocheras) se propone en los meses adeudados.
  const abono = (form.watch('parkingRenters') ?? []).reduce((s, r) => s + (precioValido(r?.amount) ? r.amount : 0), 0);

  const handleNext = (values: CustomerSchemaType) => {
    const n = values.numberOfVehicles;
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

  const handleConfirm = (values: CustomerSchemaType) => {
    if (!validarCocheras(form)) {
      toast.error('Falta el precio mensual de alguna cochera.');
      return;
    }
    const error = erroresSaldoInicial(saldo);
    if (error) {
      toast.error(error);
      return;
    }
    startTransition(async () => {
      const data = await createCustomerAction({
        ...values,
        parkingRenters: cocherasParaGuardar(values.parkingRenters),
        saldoInicial:
          saldo.tipo === 'AL_DIA'
            ? undefined
            : {
                ...saldo,
                nota: saldo.nota?.trim() || undefined,
                ...(saldo.modo === 'POR_MES' ? { importe: undefined, fecha: undefined } : { meses: undefined }),
              },
      });
      if (!data || data.error) {
        const msg =
          typeof data?.error === 'string' ? data.error : data?.error?.message;
        toast.error(msg ?? 'No se pudo crear el inquilino');
      } else {
        toast.success('Inquilino creado. Su cuenta corriente ya está abierta.');
        form.reset();
        setSaldo(SALDO_AL_DIA);
        setOpen(false);
        onCreado?.();
      }
    });
  };

  return (
    <CustomerStepperShell
      open={open}
      setOpen={setOpen}
      trigger={
        <Button size="sm" className="gap-1.5">
          <Plus className="size-4" />
          Nuevo inquilino
        </Button>
      }
      form={form}
      isPending={isPending}
      title="Nuevo inquilino"
      entityLabel="inquilino"
      mode="create"
      vehiclesCount={fields.length}
      vehiclesStepLabel="Cocheras y saldo"
      onNextFromCustomer={handleNext}
      onConfirm={handleConfirm}
      sinDeudaLegacy
      vehiclesPhase={
        <>
          <CocherasInquilino form={form} fields={fields} isPending={isPending} />
          <div className="rounded-xl border border-border bg-gm-surface-2/40 p-4">
            <div className="mb-3 flex items-center gap-2">
              <CircleDollarSign className="size-4 text-gm-yellow" />
              <div>
                <div className="text-sm font-semibold">¿Cómo está su cuenta hoy?</div>
                <div className="text-xs text-muted-foreground">
                  Si trae deuda o saldo a favor de antes, cargalo acá. Después se corrige con ajustes.
                </div>
              </div>
            </div>
            <EditorSaldoInicial valor={saldo} onChange={setSaldo} abono={abono} />
          </div>
        </>
      }
    />
  );
}
