'use client';

import { forwardRef, useEffect, useId, useMemo, useRef, useState, type InputHTMLAttributes, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { iconoTipoVehiculo } from '@/components/vehicle-type-badge';
import { buscarModelos, claseDeTipo, ejemploModelo, NOMBRE_CLASE, type ModeloVehiculo } from '@/utils/modelos-vehiculos';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value?: string;
  onChange: (valor: string) => void;
  tipoVehiculo?: string;
};

// Modelo del vehículo con sugerencias del catálogo. La lista va debajo del campo, dentro del
// formulario y no flotando: en el diálogo (que se desplaza) y con el teclado del celular abierto
// una capa flotante quedaba recortada o tapada.
export const ModeloVehiculoInput = forwardRef<HTMLInputElement, Props>(function ModeloVehiculoInput(
  { value = '', onChange, tipoVehiculo, className, onBlur, onFocus, placeholder, ...props },
  ref,
) {
  const base = useId();
  const listaRef = useRef<HTMLDivElement>(null);
  const [enfocado, setEnfocado] = useState(false);
  // Después de elegir una sugerencia la lista se cierra hasta que se vuelva a escribir.
  const [elegido, setElegido] = useState(false);
  const [activa, setActiva] = useState(0);
  const resultado = useMemo(() => buscarModelos(value, tipoVehiculo), [value, tipoVehiculo]);
  const clase = claseDeTipo(tipoVehiculo);
  const abierto = enfocado && !elegido && value.trim().length >= 2 && resultado.modelos.length > 0;

  useEffect(() => setActiva(0), [value, tipoVehiculo]);
  useEffect(() => {
    if (abierto) listaRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [abierto]);

  const elegir = (modelo: ModeloVehiculo) => {
    onChange(modelo.nombre);
    setElegido(true);
  };

  const alTeclear = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!abierto) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiva((i) => Math.min(resultado.modelos.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiva((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      // Enter elige la sugerencia en vez de registrar la entrada.
      e.preventDefault();
      elegir(resultado.modelos[activa]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setElegido(true);
    }
  };

  const Icono = iconoTipoVehiculo(tipoVehiculo);

  return (
    <div>
      {/* Distinto de los datos del cliente: es el vehículo, con el ícono del tipo elegido. */}
      <div className="relative">
        <span aria-hidden className="pointer-events-none absolute left-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg bg-gm-yellow/15 text-gm-yellow">
          <Icono className="size-[18px]" strokeWidth={1.9} />
        </span>
        <input
          ref={ref}
          {...props}
          role="combobox"
          aria-expanded={abierto}
          aria-controls={`${base}-modelos`}
          aria-activedescendant={abierto ? `${base}-m-${activa}` : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder ?? `Ej.: ${ejemploModelo(tipoVehiculo)}`}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setElegido(false);
          }}
          onFocus={(e) => {
            setEnfocado(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setEnfocado(false);
            onBlur?.(e);
          }}
          onKeyDown={alTeclear}
          className={cn(className, 'border-gm-yellow/30 bg-gm-yellow/[0.04] pl-12 font-medium')}
        />
      </div>
      {abierto && (
        <div
          ref={listaRef}
          id={`${base}-modelos`}
          role="listbox"
          aria-label="Modelos sugeridos"
          className="mt-1.5 rounded-[14px] border border-gm-line-strong bg-card p-1.5 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.7)] animate-in fade-in-0 slide-in-from-top-1 duration-150"
        >
          {resultado.parecidos && (
            <p className="px-2.5 pb-1 pt-1.5 text-xs text-muted-foreground">No está «{value.trim()}» en la lista. Parecidos:</p>
          )}
          {resultado.modelos.map((modelo, i) => (
            <div
              key={modelo.nombre}
              id={`${base}-m-${i}`}
              role="option"
              aria-selected={i === activa}
              // El foco se queda en el campo: así Enter y las flechas siguen funcionando.
              onMouseDown={(e) => e.preventDefault()}
              onMouseMove={() => setActiva(i)}
              onClick={() => elegir(modelo)}
              className={cn(
                'flex min-h-11 cursor-pointer items-center gap-3 rounded-[10px] border px-3 text-[15px]',
                i === activa ? 'border-gm-yellow/45 bg-gm-yellow/[0.08]' : 'border-transparent',
              )}
            >
              <span className="min-w-0 flex-1 truncate">
                <span className="text-muted-foreground">{modelo.marca}</span> <span className="font-semibold text-foreground">{modelo.modelo}</span>
              </span>
              {modelo.clase !== clase && (
                <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{NOMBRE_CLASE[modelo.clase]}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
