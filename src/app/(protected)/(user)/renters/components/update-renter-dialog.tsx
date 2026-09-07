'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Edit3 } from 'lucide-react';
import { updateCustomerAction } from '@/actions/customers/update-customer.action';
import {
  updateCustomerSchema,
  UpdateCustomerSchemaType,
} from '@/schemas/customer.schema';
import { Customer } from '@/types/cutomer.type';
import { ParkingOwner } from '@/types/parking-owner.type';
import { RenterParkingType } from '@/types/renter-parking-type';
import { CustomerStepperShell } from '@/components/customer-stepper-shell';
import { RenterPhase2 } from '@/components/renter-phase-2';

export function UpdateRenterDialog({
  customer,
  customersRenters,
  renterParkingTypes,
}: {
  customer: Customer;
  customersRenters: ParkingOwner[];
  renterParkingTypes: RenterParkingType[];
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
        customer.parkingRenters?.map((vr) => ({
          id: vr.id ?? '',
          owner: vr.owner ?? '',
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
          owner: '',
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
    setIsPending(true);
    try {
      const data = await updateCustomerAction(customer.id, values);
      if (!data || data.error) {
        toast.error(data?.error?.message ?? 'Error desconocido');
      } else {
        toast.success('Inquilino actualizado exitosamente');
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
      vehiclesPhase={
        <RenterPhase2
          form={form}
          customersRenters={customersRenters}
          renterParkingTypes={renterParkingTypes}
          fields={fields}
          isPending={isPending}
        />
      }
    />
  );
}
