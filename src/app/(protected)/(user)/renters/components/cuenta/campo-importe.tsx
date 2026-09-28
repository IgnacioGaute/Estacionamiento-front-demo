'use client';

// Campo de importe en pesos enteros. Mientras se escribe muestra lo tecleado tal cual; al salir,
// lo formatea con puntos de miles. Si el texto trae centavos o no es un número, lo dice en vez de
// interpretarlo: nunca un «1.000,50» se convierte solo en otra cosa.

import { useState } from 'react';
import { leerImporte } from './util';

export function CampoImporte({
  texto,
  onTexto,
  ariaLabel,
  autoFocus,
  grande,
  sinPegar,
  bien,
  placeholder = '0',
  className = '',
}: {
  texto: string;
  onTexto: (t: string) => void;
  ariaLabel: string;
  autoFocus?: boolean;
  grande?: boolean;
  // Para confirmaciones que tienen que escribirse a mano.
  sinPegar?: boolean;
  // Resalta en verde (por ejemplo, cuando el importe confirmado coincide).
  bien?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [enfocado, setEnfocado] = useState(false);
  const { valor, error, completo } = leerImporte(texto);
  const mostrarError = !!error && (completo || !enfocado);
  const visible = !enfocado && !error && valor ? valor.toLocaleString('es-AR') : texto;

  return (
    <span className={`block ${className}`}>
      <span
        className={`flex h-11 items-center gap-2 rounded-xl border bg-background px-3 ${
          mostrarError
            ? 'border-destructive'
            : bien
              ? 'border-emerald-400/60'
              : 'border-border focus-within:border-gm-yellow'
        }`}
      >
        <span className="text-muted-foreground">$</span>
        <input
          inputMode="numeric"
          aria-label={ariaLabel}
          aria-invalid={mostrarError}
          autoFocus={autoFocus}
          value={visible}
          onFocus={(e) => {
            setEnfocado(true);
            // Para editar, sin los puntos que se agregaron al formatear. Queda seleccionado: si
            // venía un importe sugerido, escribir otro lo reemplaza sin tener que borrarlo.
            if (!error && valor) onTexto(String(valor));
            const campo = e.currentTarget;
            requestAnimationFrame(() => campo.select());
          }}
          onBlur={() => setEnfocado(false)}
          onChange={(e) => onTexto(e.target.value)}
          onPaste={sinPegar ? (e) => e.preventDefault() : undefined}
          placeholder={placeholder}
          className={`min-w-0 flex-1 bg-transparent font-semibold tabular-nums outline-none placeholder:font-normal placeholder:text-muted-foreground/60 ${
            grande ? 'font-display text-xl' : 'text-sm'
          }`}
        />
      </span>
      {mostrarError && (
        <span role="alert" className="mt-1 block text-xs text-destructive">
          {error}
        </span>
      )}
    </span>
  );
}
