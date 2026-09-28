'use client';

// Las cocheras de un inquilino: número y precio mensual, nada más. El abono mensual es la suma
// de los precios. No hay «propietario»: eso es de Particulares, que alquilan la cochera de un
// dueño real. Un precio cambiado rige desde el próximo abono (los cargos hechos no se tocan).

import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { plata } from '@/components/plataforma/formato';
import { CampoImporte } from './cuenta/campo-importe';
import { leerImporte } from './cuenta/util';

type Cochera = { id?: string; garageNumber?: string; amount?: number };

// El importe se escribe como texto (con o sin puntos de miles) y al formulario llega el número;
// si el texto no es un importe válido llega 0 (el campo ya muestra por qué) y al confirmar se marca.
function PrecioCochera({
  valor,
  onValor,
  ariaLabel,
  disabled,
}: {
  valor: number | undefined;
  onValor: (n: number) => void;
  ariaLabel: string;
  disabled?: boolean;
}) {
  const [texto, setTexto] = useState(valor && valor > 0 ? String(valor) : '');
  return (
    <fieldset disabled={disabled}>
      <CampoImporte
        ariaLabel={ariaLabel}
        placeholder="Ej.: 45.000"
        texto={texto}
        onTexto={(t) => {
          setTexto(t);
          const l = leerImporte(t);
          onValor(l.error ? 0 : l.valor);
        }}
      />
    </fieldset>
  );
}

export const precioValido = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 1;

// Marca las cocheras sin precio. Devuelve true si están todas bien.
export function validarCocheras(form: UseFormReturn<any>): boolean {
  const cocheras: Cochera[] = form.getValues('parkingRenters') ?? [];
  let ok = true;
  cocheras.forEach((c, i) => {
    if (!precioValido(c?.amount)) {
      ok = false;
      form.setError(`parkingRenters.${i}.amount`, { message: 'Poné el precio mensual de esta cochera.' });
    }
  });
  return ok;
}

// Lo que se manda al servidor: sin `owner`, así la cochera queda con el precio escrito.
export const cocherasParaGuardar = (cocheras: Cochera[] | undefined) =>
  (cocheras ?? []).map((c) => ({ garageNumber: c.garageNumber?.trim() ?? '', amount: c.amount }));

export function CocherasInquilino({
  form,
  fields,
  isPending,
}: {
  form: UseFormReturn<any>;
  fields: { id: string }[];
  isPending?: boolean;
}) {
  const cocheras: Cochera[] = form.watch('parkingRenters') ?? [];
  const abono = cocheras.reduce((s, c) => s + (precioValido(c?.amount) ? c.amount : 0), 0);
  const faltan = cocheras.filter((c) => !precioValido(c?.amount)).length;

  return (
    <div className="space-y-3">
      {fields.map((field, index) => (
        <article key={field.id} className="overflow-hidden rounded-md border border-border bg-gm-surface-2">
          <header className="flex items-center gap-2.5 border-b border-border bg-gm-surface px-4 py-2.5">
            <span className="gm-display gm-tnum grid size-7 place-items-center rounded-sm bg-gm-yellow text-[11px] font-bold text-gm-ink">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="gm-display text-[12px] font-bold tracking-[0.06em] text-foreground">COCHERA {index + 1}</span>
          </header>

          <div className="grid gap-3 p-4 sm:grid-cols-2">
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
                      className="gm-mono h-11 uppercase tracking-[0.05em]"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`parkingRenters.${index}.amount`}
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>Precio mensual</FormLabel>
                  <PrecioCochera
                    ariaLabel={`Precio mensual de la cochera ${index + 1}`}
                    valor={field.value}
                    disabled={isPending}
                    onValor={(n) => {
                      field.onChange(n);
                      if (precioValido(n)) form.clearErrors(`parkingRenters.${index}.amount`);
                    }}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </article>
      ))}

      <div className="flex items-baseline justify-between gap-3 rounded-xl bg-gm-surface-2/60 px-4 py-3">
        <span className="text-sm font-semibold">Abono mensual</span>
        <span className="text-right">
          <span className="font-display text-xl font-semibold tabular-nums">{plata(abono)}</span>
          {faltan > 0 && fields.length > 1 && (
            <span className="block text-xs text-muted-foreground">
              Falta el precio de {faltan} {faltan === 1 ? 'cochera' : 'cocheras'}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
