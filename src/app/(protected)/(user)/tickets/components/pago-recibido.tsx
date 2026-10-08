'use client';

// La confirmación de un cobro que ya registró la salida (transferencia al alias o QR): queda en
// el mismo cuadro de cobro y el diálogo se cierra solo en unos segundos, o antes con «Listo». El
// aviso de abajo es el de siempre, «Salida registrada exitosamente», y lo dispara cada pantalla.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { ActionDialogFooterPortal, ActionDialogPrimaryButton } from '@/components/ui/action-dialog';
import { formatImporte } from '@/components/pricing-breakdown';

const SEGUNDOS_PARA_CERRAR = 4;

export function ConfirmacionDePago({
  importe,
  detalle,
  nota,
  onCerrar,
}: {
  importe: number;
  // Quién pagó o cómo, y debajo, en chico, de dónde sale la confirmación.
  detalle: string;
  nota: string;
  onCerrar: () => void;
}) {
  const [restante, setRestante] = useState(SEGUNDOS_PARA_CERRAR * 1000);
  const cerrado = useRef(false);
  const alCerrar = useRef(onCerrar);
  alCerrar.current = onCerrar;

  const cerrar = useCallback(() => {
    if (cerrado.current) return;
    cerrado.current = true;
    alCerrar.current();
  }, []);

  useEffect(() => {
    const desde = Date.now();
    const reloj = setInterval(() => {
      const falta = Math.max(0, SEGUNDOS_PARA_CERRAR * 1000 - (Date.now() - desde));
      setRestante(falta);
      if (falta === 0) {
        clearInterval(reloj);
        cerrar();
      }
    }, 100);
    return () => clearInterval(reloj);
  }, [cerrar]);

  return (
    <>
      <div role="status" className="flex flex-col items-center gap-1.5 rounded-[20px] border-[1.5px] border-emerald-500/50 bg-emerald-500/10 px-5 pb-5 pt-6 text-center">
        <span className="grid size-[72px] place-items-center rounded-full border-2 border-emerald-400/50 bg-emerald-400/15 text-emerald-400">
          <Check className="size-10" strokeWidth={2.4} />
        </span>
        <p className="gm-display mt-2 text-[26px] font-bold tracking-wide text-emerald-400">Pago recibido</p>
        <p className="gm-mono text-3xl font-semibold text-foreground">{formatImporte(importe)}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{detalle}</p>
        <p className="text-xs text-muted-foreground">{nota}</p>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-emerald-400/15" aria-hidden>
          <div
            className="h-full rounded-full bg-emerald-400 transition-[width] duration-100 ease-linear"
            style={{ width: `${(restante / (SEGUNDOS_PARA_CERRAR * 1000)) * 100}%` }}
          />
        </div>
      </div>
      <ActionDialogFooterPortal>
        <ActionDialogPrimaryButton onClick={cerrar} detail={`Se cierra sola en ${Math.ceil(restante / 1000)} s`}>
          Listo
        </ActionDialogPrimaryButton>
      </ActionDialogFooterPortal>
    </>
  );
}
