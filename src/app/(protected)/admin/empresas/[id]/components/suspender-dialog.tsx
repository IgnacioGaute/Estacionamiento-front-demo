"use client";

// Suspender o reactivar una empresa. Antes era un botón de un clic: cortaba el acceso de todos sus
// usuarios al instante. Ahora dice el impacto con las cifras de ese momento y pide el motivo, que
// queda en la actividad de la empresa junto al cambio.

import { useState } from "react";
import { PauseCircle, PlayCircle } from "lucide-react";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

export function SuspenderDialog({
  activa,
  nombre,
  usuarios,
  turnosAbiertos,
  estadiasAbiertas,
  avisoReactivar,
  onConfirm,
}: {
  activa: boolean;
  nombre: string;
  usuarios: number;
  turnosAbiertos: number;
  estadiasAbiertas: number;
  // Lo que conviene saber antes de reactivar (por ejemplo, que la revisión diaria la vuelve a cortar).
  avisoReactivar?: string;
  onConfirm: (motivo: string) => Promise<boolean>;
}) {
  const [motivo, setMotivo] = useState("");
  return (
    <ConfirmActionDialog
      trigger={
        <button
          type="button"
          className={activa
            ? "h-10 shrink-0 rounded-[10px] border border-gm-peligro/50 px-3.5 text-[13px] font-bold text-gm-peligro transition-colors hover:bg-gm-peligro/10"
            : "h-10 shrink-0 rounded-[10px] border border-gm-line-strong px-3.5 text-[13px] font-bold transition-colors hover:bg-gm-surface-2"}
        >
          {activa ? "Suspender" : "Reactivar"}
        </button>
      }
      icon={activa ? PauseCircle : PlayCircle}
      tone="warning"
      title={activa ? `Suspender ${nombre}` : `Reactivar ${nombre}`}
      description={activa ? "Sus usuarios dejan de operar en este momento." : "Sus usuarios vuelven a entrar al sistema."}
      actionLabel={activa ? "Suspender" : "Reactivar"}
      actionVariant={activa ? "destructive" : "default"}
      disabled={activa && motivo.trim().length < 3}
      onOpenChange={(abierto) => { if (!abierto) setMotivo(""); }}
      onConfirm={() => onConfirm(motivo.trim())}
    >
      {activa ? (
        <div className="space-y-4">
          <ul className="space-y-1.5">
            <li><strong className="text-foreground">{plural(usuarios, "usuario", "usuarios")}</strong> solo van a ver el aviso de la suspensión.</li>
            {turnosAbiertos > 0 && <li><strong className="text-foreground">{plural(turnosAbiertos, "turno abierto", "turnos abiertos")}</strong>: los pueden cerrar.</li>}
            {estadiasAbiertas > 0 && <li><strong className="text-foreground">{plural(estadiasAbiertas, "vehículo adentro", "vehículos adentro")}</strong>: pueden cobrarles la salida.</li>}
            <li>No se borra nada y se puede reactivar.</li>
          </ul>
          <div className="space-y-1.5">
            <Label htmlFor="motivo-suspension">Motivo</Label>
            <Input id="motivo-suspension" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={255} placeholder="Ej.: pidió dar de baja el servicio" autoFocus />
            <p className="text-xs">Queda en la actividad de la empresa.</p>
          </div>
        </div>
      ) : (
        <p>{avisoReactivar ?? "Vuelven a poder registrar entradas, cobrar y abrir turnos."}</p>
      )}
    </ConfirmActionDialog>
  );
}
