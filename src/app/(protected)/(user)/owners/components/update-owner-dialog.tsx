'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Car, Edit3 } from 'lucide-react';
import { updateCustomerAction } from '@/actions/customers/update-customer.action';
import {
  updateCustomerSchema,
  UpdateCustomerSchemaType,
} from '@/schemas/customer.schema';
import { Customer } from '@/types/cutomer.type';
import { OwnerParkingType } from '@/types/owner-parking-type';
import {
  CustomerStepperShell,
  YesNo,
} from '@/components/customer-stepper-shell';

export function UpdateOwnerDialog({ customer, ownerParkingTypes }: { customer: Customer; ownerParkingTypes: OwnerParkingType[] }) {
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
      customerType: customer.customerType ?? 'OWNER',
      hasDebt: customer.hasDebt || false,
      monthsDebt: customer.monthsDebt || [],
      credit: customer.credit || 0,
      parkingOwners:
        customer.parkingOwners?.map((v) => ({
          id: v.id ?? '',
          garageNumber: v.garageNumber ?? '',
          ownerParkingTypeId: v.parkingType?.id ?? '',
          rent: v.rent,
          amountRenter: v.amountRenter || 0,
        })) ?? [],
    },
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: 'parkingOwners',
  });

  const handleNext = (values: Partial<UpdateCustomerSchemaType>) => {
    const n = values.numberOfVehicles ?? 0;
    const current = form.getValues('parkingOwners') ?? [];
    if (current.length < n) {
      replace([
        ...current,
        ...Array.from({ length: n - current.length }, () => ({
          rent: false,
          garageNumber: '',
          ownerParkingTypeId: '',
          amountRenter: 0,
        })),
      ]);
    } else if (current.length > n) {
      replace(current.slice(0, n));
    }
  };

  const handleConfirm = async (values: Partial<UpdateCustomerSchemaType>) => {
    if (!values.hasDebt) values.monthsDebt = [];
    setIsPending(true);
    try {
      const data = await updateCustomerAction(customer.id, values);
      if (!data || data.error) {
        toast.error(data?.error?.message ?? 'Error desconocido');
      } else {
        toast.success('Propietario y vehículos actualizados exitosamente');
        setOpen(false);
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
          Editar propietario
        </Button>
      }
      form={form as any}
      isPending={isPending}
      title={`Editar — ${customer.firstName} ${customer.lastName}`}
      entityLabel="propietario"
      mode="update"
      vehiclesCount={fields.length}
      onNextFromCustomer={handleNext as any}
      onConfirm={handleConfirm as any}
      vehiclesPhase={
        <>
          <div className="flex items-start gap-3 rounded-md border border-gm-yellow/30 bg-gm-yellow/10 p-3 text-[12.5px]">
            <Car className="size-4 mt-px text-gm-yellow shrink-0" />
            <div>
              <div className="font-semibold text-foreground">
                {fields.length}{' '}
                {fields.length === 1 ? 'cochera asignada' : 'cocheras asignadas'}
              </div>
              <div className="text-muted-foreground">
                Editá número, tipo de expensas o estado de alquiler.
              </div>
            </div>
          </div>

          {fields.map((field, index) => {
            const isRent = form.watch(`parkingOwners.${index}.rent`) === true;
            return (
              <article
                key={field.id}
                className="rounded-md border border-border bg-gm-surface-2 overflow-hidden"
              >
                <header className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-gm-surface">
                  <div className="flex items-center gap-2.5">
                    <span className="gm-display gm-tnum grid size-7 place-items-center rounded-sm bg-gm-yellow text-gm-ink text-[11px] font-bold">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="gm-display text-[12px] font-bold tracking-[0.06em] text-foreground">
                      COCHERA {index + 1}
                    </span>
                  </div>
                  {isRent && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-gm-orange/40 bg-gm-orange/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#FF8458]">
                      <AlertTriangle className="size-3" />
                      Alquilada
                    </span>
                  )}
                </header>

                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name={`parkingOwners.${index}.garageNumber`}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel>N° de cochera</FormLabel>
                          <FormControl>
                            <Input
                              disabled={isPending}
                              placeholder="B-12"
                              className="gm-mono tracking-[0.05em] uppercase"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`parkingOwners.${index}.ownerParkingTypeId`}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel>Tipo de expensas</FormLabel>
                          <FormControl>
                            <Select
                              disabled={isPending}
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar..." />
                              </SelectTrigger>
                              <SelectContent>
                                {ownerParkingTypes.length === 0 ? (
                                  <div className="px-2 py-1.5 text-[12px] text-muted-foreground">
                                    No hay tipos creados. Cargalos en Administrar.
                                  </div>
                                ) : (
                                  ownerParkingTypes.map((type) => (
                                    <SelectItem key={type.id} value={type.id}>
                                      {type.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name={`parkingOwners.${index}.rent`}
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel>¿Usa esta cochera para alquilar?</FormLabel>
                        <div className="flex gap-1.5">
                          <YesNo
                            value={field.value === true}
                            onClick={() => field.onChange(true)}
                            label="Sí"
                            tone="orange"
                            disabled={isPending}
                          />
                          <YesNo
                            value={field.value === false}
                            onClick={() => field.onChange(false)}
                            label="No"
                            tone="green"
                            disabled={isPending}
                          />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isRent && (
                    <FormField
                      control={form.control}
                      name={`parkingOwners.${index}.amountRenter`}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel>Monto de alquiler mensual</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm gm-mono">
                                $
                              </span>
                              <Input
                                type="number"
                                placeholder="38000"
                                disabled={isPending}
                                className="pl-7 gm-mono gm-tnum"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </article>
            );
          })}
        </>
      }
    />
  );
}
