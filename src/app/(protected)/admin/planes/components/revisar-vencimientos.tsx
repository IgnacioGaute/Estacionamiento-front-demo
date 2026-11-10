"use client";

// «Revisar vencimientos» corre ahora la revisión de cada noche: emite facturas, suspende lo que
// pasó la gracia y da de baja lo que lleva mucho suspendido. Era un botón de un clic con ícono de
// refrescar; ahora primero muestra qué va a hacer, con los nombres (la misma revisión, simulada en
// el servidor y deshecha), y recién al confirmar la corre.

import { useState } from "react";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { Cargando, Hueso } from "@/components/esqueletos";
import { previaRevisionAction, revisarVencimientosAction } from "@/actions/suscripciones/suscripciones.action";
import type { ResultadoRevision } from "@/services/suscripciones.service";

function Grupo({ titulo, nombres, tono }: { titulo: string; nombres: string[]; tono: "peligro" | "normal" }) {
  if (!nombres.length) return null;
  const visibles = nombres.slice(0, 6);
  return (
    <div className="space-y-1.5">
      <p className={tono === "peligro" ? "font-semibold text-gm-peligro" : "font-semibold text-foreground"}>
        {titulo} ({nombres.length})
      </p>
      <ul className="space-y-0.5 text-[13px]">
        {visibles.map((n) => <li key={n} className="truncate" title={n}>{n}</li>)}
        {nombres.length > visibles.length && <li>y {nombres.length - visibles.length} más</li>}
      </ul>
    </div>
  );
}

export function RevisarVencimientos({ onRevisado }: { onRevisado: () => void }) {
  const [previa, setPrevia] = useState<ResultadoRevision | null>(null);
  const [error, setError] = useState("");

  async function cargarPrevia(abierto: boolean) {
    if (!abierto) return;
    setPrevia(null);
    setError("");
    const r = await previaRevisionAction();
    if (r.error) setError(r.error);
    else setPrevia(r.data ?? null);
  }

  const empresas = previa?.empresas ?? { suspende: [], baja: [], factura: [] };
  const nada = !!previa && !previa.suspendidas && !previa.bajas && !previa.facturas;
  const corta = !!previa && (previa.suspendidas > 0 || previa.bajas > 0);

  return (
    <ConfirmActionDialog
      trigger={
        <button
          type="button"
          className="flex h-10 items-center gap-2 rounded-lg border border-gm-line-strong bg-gm-surface px-3.5 text-[13px] font-medium transition-colors hover:border-gm-texto-tenue max-sm:h-11"
        >
          <CalendarClock className="size-4" aria-hidden />
          Revisar vencimientos
        </button>
      }
      icon={CalendarClock}
      tone="warning"
      title="Revisar vencimientos ahora"
      description="Es la misma revisión que corre cada noche. Esto es lo que va a hacer hoy."
      actionLabel={nada ? "Revisar igual" : "Revisar y aplicar"}
      actionVariant={corta ? "destructive" : "default"}
      disabled={!previa && !error}
      onOpenChange={(abierto) => void cargarPrevia(abierto)}
      onConfirm={async () => {
        const r = await revisarVencimientosAction();
        if (r.error) {
          toast.error(r.error);
          return false;
        }
        const { suspendidas = 0, facturas = 0, bajas = 0 } = r.data ?? {};
        toast.success(
          suspendidas || facturas || bajas
            ? `Revisado: ${facturas} facturas emitidas, ${suspendidas} suspendidas, ${bajas} bajas.`
            : "Revisado: no había nada que hacer.",
        );
        onRevisado();
      }}
    >
      {error ? (
        <p role="alert" className="text-gm-peligro">{error}</p>
      ) : !previa ? (
        <Cargando texto="Calculando qué va a hacer la revisión…" className="block space-y-2">
          <Hueso className="h-4 w-48" /><Hueso className="h-3 w-40" /><Hueso className="h-3 w-36" />
        </Cargando>
      ) : nada ? (
        <p>No hay nada para hacer hoy: ninguna factura para emitir ni cuentas para suspender.</p>
      ) : (
        <div className="space-y-4">
          <Grupo titulo="Va a suspender" nombres={empresas.suspende} tono="peligro" />
          <Grupo titulo="Va a dar de baja" nombres={empresas.baja} tono="peligro" />
          <Grupo titulo="Va a emitir la factura de" nombres={empresas.factura} tono="normal" />
        </div>
      )}
      <p className="mt-4 text-[13px]">También asienta los pagos de MercadoPago que ya se acreditaron; esos pueden evitar alguna suspensión.</p>
    </ConfirmActionDialog>
  );
}
