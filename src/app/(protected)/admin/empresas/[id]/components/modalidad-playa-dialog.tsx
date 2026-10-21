"use client";

// Cambiar la modalidad de una playa (Con cobro / Gratuito) no es un interruptor más: cambia lo que
// ven sus usuarios y, para dejar de cobrar, no puede quedar dinero en curso. Como el borrado, se
// consultan primero los bloqueos y los avisos; recién sin bloqueos se puede confirmar. El backend
// los vuelve a verificar dentro de la misma transacción del cambio.

import { useEffect, useState } from "react";
import { AlertTriangle, Check, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataLoading } from "@/components/ui/data-loading";
import { NOMBRE_MODALIDAD, type Modalidad } from "@/lib/modalidad";
import type { PendienteModalidad, PrevisualizacionModalidad } from "@/services/tenancy.service";
import { cambiarModalidadAction, previsualizarModalidadAction } from "@/actions/tenancy/tenancy.action";

export type CambioModalidad = { playaId: string; nombre: string };

const ALCANCE: Record<Modalidad, { oculta: string[]; conserva: string[] }> = {
  GRATUITO: {
    oculta: [
      "Tarifas, simuladores y estadías por día, semana o mes",
      "Cobros, anticipos, medios de pago, descuentos y devoluciones",
      "Caja, planilla de caja, turnos de caja, arqueos y el historial de cobros",
      "Recaudación, comisiones, Inquilinos, clientes mensuales y cobros con MercadoPago",
      "Comprobantes de entrada y salida y el Centro de aprendizaje",
    ],
    conserva: [
      "Entradas por patente y por tarjeta, tipos de vehículo y controles de patentes repetidas",
      "Modo sin conexión con entradas por patente y salidas sin cobro",
      "Vehículos adentro, búsquedas, historial y la planilla de vehículos con permanencia y operador",
      "Los registros anteriores (cobros, caja, turnos) se guardan sin cambios y vuelven a verse si la playa vuelve a cobrar",
    ],
  },
  CON_COBRO: {
    oculta: [],
    conserva: [
      "Vuelven Tarifas, cobros, caja, turnos y el resto de la operación con dinero, con la configuración que tenían",
      "Los vehículos que entraron gratis siguen saliendo sin cargo",
    ],
  },
};

function Fila({ item, tipo }: { item: PendienteModalidad; tipo: "bloqueo" | "aviso" }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-gm-surface-2 p-3">
      <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${tipo === "bloqueo" ? "bg-destructive/15 text-destructive" : "bg-gm-yellow/15 text-gm-yellow"}`}>
        {tipo === "bloqueo" ? <X className="size-3.5" /> : <Info className="size-3.5" />}
      </span>
      <div className="min-w-0">
        <p className={`text-sm font-medium ${tipo === "bloqueo" ? "text-destructive" : ""}`}>{item.cantidad.toLocaleString("es-AR")} pendiente(s)</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{item.mensaje}</p>
      </div>
    </div>
  );
}

export function ModalidadPlayaDialog({ cambio, cerrar, hecho }: { cambio: CambioModalidad | null; cerrar: () => void; hecho: (modalidad: Modalidad) => void }) {
  const [datos, setDatos] = useState<PrevisualizacionModalidad | null>(null);
  const [error, setError] = useState("");
  const [bloqueos, setBloqueos] = useState<PendienteModalidad[] | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  useEffect(() => {
    setDatos(null); setError(""); setBloqueos(null);
    if (!cambio) return;
    let vivo = true;
    void previsualizarModalidadAction(cambio.playaId).then((r) => {
      if (!vivo) return;
      if (r.error || !r.datos) setError(r.error ?? "No se pudo consultar la modalidad.");
      else setDatos(r.datos);
    });
    return () => { vivo = false; };
  }, [cambio]);

  const pendientes = bloqueos ?? datos?.bloqueos ?? [];
  const bloqueado = pendientes.length > 0;
  const destino = datos?.destino;

  async function confirmar() {
    if (!cambio || !destino) return;
    setTrabajando(true);
    const r = await cambiarModalidadAction(cambio.playaId, destino);
    setTrabajando(false);
    if (r.error) {
      // Algo cambió entre la consulta y la confirmación (un turno abierto, un auto que entró).
      if (r.bloqueos?.length) setBloqueos(r.bloqueos);
      setError(r.error);
      return;
    }
    hecho(destino);
  }

  return (
    <Dialog open={!!cambio} onOpenChange={(o) => { if (!o && !trabajando) cerrar(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modalidad de operación</DialogTitle>
          <DialogDescription>
            {cambio?.nombre}
            {datos ? ` · hoy: ${NOMBRE_MODALIDAD[datos.modalidad]}` : ""}
          </DialogDescription>
        </DialogHeader>

        {!datos && !error ? <DataLoading label="Revisando la playa…" /> : null}
        {error && <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}

        {datos && destino && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed">
              Pasar a <strong>{NOMBRE_MODALIDAD[destino]}</strong>.{" "}
              {destino === "GRATUITO"
                ? "La playa registra y controla vehículos sin tarifas ni dinero. No cambia el plan ni lo que la empresa paga por el sistema."
                : "La playa vuelve a cobrar con sus tarifas y su configuración de caja."}{" "}
              Cada estadía conserva la modalidad con la que entró; no se borra ni se modifica ningún registro anterior.
            </p>
            {ALCANCE[destino].oculta.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Se deja de usar</p>
                <ul className="mt-2 space-y-1 text-sm">{ALCANCE[destino].oculta.map((t) => <li key={t} className="flex gap-2"><X className="mt-0.5 size-4 shrink-0 text-muted-foreground" />{t}</li>)}</ul>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Se mantiene</p>
              <ul className="mt-2 space-y-1 text-sm">{ALCANCE[destino].conserva.map((t) => <li key={t} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-emerald-400" />{t}</li>)}</ul>
            </div>

            {bloqueado && (
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-sm font-semibold text-destructive"><AlertTriangle className="size-4" />No se puede cambiar todavía</p>
                <p className="text-sm text-muted-foreground">La playa tiene que resolver esto antes. El sistema no cierra turnos ni crea ajustes por su cuenta.</p>
                {pendientes.map((b) => <Fila key={b.code} item={b} tipo="bloqueo" />)}
              </div>
            )}
            {datos.avisos.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Para tener en cuenta</p>
                {datos.avisos.map((a) => <Fila key={a.code} item={a} tipo="aviso" />)}
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" disabled={trabajando} onClick={cerrar}>Cancelar</Button>
              <Button type="button" disabled={trabajando || bloqueado} onClick={() => void confirmar()}>
                {trabajando ? "Cambiando…" : `Pasar a ${NOMBRE_MODALIDAD[destino]}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
