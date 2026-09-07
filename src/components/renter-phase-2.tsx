'use client';

import { UseFormReturn } from 'react-hook-form';
import { Card } from '@/components/ui/card';
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
import { ParkingOwner } from '@/types/parking-owner.type';
import { RenterParkingType } from '@/types/renter-parking-type';
import { Car, Info } from 'lucide-react';

interface RenterPhase2Props {
  /** RHF form instance — must contain a `parkingRenters` array. */
  form: UseFormReturn<any>;
  /** Cocheras existentes que se pueden alquilar. */
  customersRenters: ParkingOwner[];
  /** Tipos dinámicos que hacen de "dueño sin cochera real" (Aznar / Fontela, etc.). */
  renterParkingTypes: RenterParkingType[];
  fields: { id: string }[];
  isPending?: boolean;
}

/**
 * Phase-2 content for the renter / private wizards.
 * Lets the operator either link to an existing owner's cochera (auto-fills price)
 * or pick a dynamic "dueño sin cochera" type (amount auto-derived from the type).
 */
export function RenterPhase2({
  form,
  customersRenters,
  renterParkingTypes,
  fields,
  isPending,
}: RenterPhase2Props) {
  const manualTypeNames = renterParkingTypes.map((t) => t.name);

  const getAvailableVehicles = (selectedIds: string[]): ParkingOwner[] => {
    return customersRenters.filter((v) => !selectedIds.includes(v.id));
  };

  return (
    <>
      <div className="flex items-start gap-3 rounded-md border border-gm-yellow/30 bg-gm-yellow/10 p-3 text-[12.5px]">
        <Car className="size-4 mt-px text-gm-yellow shrink-0" />
        <div>
          <div className="font-semibold text-foreground">
            {fields.length}{' '}
            {fields.length === 1 ? 'cochera a alquilar' : 'cocheras a alquilar'}
          </div>
          <div className="text-muted-foreground">
            Vinculá una cochera de un propietario existente — o asigná un tipo
            de dueño sin cochera real (Aznar / Fontela / etc, gestionables en Administrar).
          </div>
        </div>
      </div>

      {fields.map((field, index) => {
        const selectedVehicleId = form.watch(
          `parkingRenters.${index}.owner`,
        ) as string | undefined;

        const selectedIds = (form.watch('parkingRenters') ?? [])
          .map((v: any, i: number) => (i !== index ? v?.owner : null))
          .filter(Boolean) as string[];

        const availableVehicles = getAvailableVehicles(selectedIds);
        const selectedVehicle = customersRenters.find(
          (v) => v.id === selectedVehicleId,
        );
        const isManualOwner = manualTypeNames.includes(selectedVehicleId ?? '');

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
            </header>

            <div className="p-4 space-y-3">
              <FormField
                control={form.control}
                name={`parkingRenters.${index}.owner`}
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>¿De qué propietario alquila?</FormLabel>
                    <FormControl>
                      <Select
                        disabled={isPending}
                        value={field.value as string | undefined}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar propietario..." />
                        </SelectTrigger>
                        <SelectContent>
                          {renterParkingTypes.map((t) => (
                            <SelectItem key={t.id} value={t.name}>
                              {t.name}
                            </SelectItem>
                          ))}
                          {availableVehicles.length > 0 && (
                            <>
                              {availableVehicles.map((v) => (
                                <SelectItem key={v.id} value={v.id}>
                                  Cochera {v.garageNumber} — $ {v.amountRenter}
                                </SelectItem>
                              ))}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* — Dueño-tipo — solo captura cochera; el monto sale del tipo elegido */}
              {isManualOwner ? (
                <FormField
                  control={form.control}
                  name={`parkingRenters.${index}.garageNumber`}
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
              ) : selectedVehicle ? (
                <Card className="border-gm-yellow/30 bg-gm-yellow/5 p-3">
                  <div className="flex items-start gap-3">
                    <Info className="size-4 mt-0.5 text-gm-yellow shrink-0" />
                    <div className="grid grid-cols-2 gap-3 text-[12.5px] flex-1">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                          Cochera
                        </div>
                        <div className="gm-mono mt-0.5 font-bold text-foreground">
                          {selectedVehicle.garageNumber}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                          Monto mensual
                        </div>
                        <div className="gm-mono gm-tnum mt-0.5 font-bold text-gm-yellow">
                          $ {selectedVehicle.amountRenter?.toLocaleString('es-AR')}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ) : null}
            </div>
          </article>
        );
      })}
    </>
  );
}
