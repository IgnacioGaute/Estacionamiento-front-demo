"use client";

// Borrar una empresa o una playa no es un botón más: el backend lo rechaza mientras queden
// playas, usuarios o registros de operación, y antes ese rechazo aparecía recién después de
// confirmar. Acá se consultan los bloqueos primero, se ofrece suspender como salida y, cuando
// de verdad se puede borrar, se pide escribir el nombre.

import { useEffect, useState } from "react";
import { AlertTriangle, Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ResumenEliminacion } from "@/types/tenancy.type";
import { getResumenEliminacionAction } from "@/actions/tenancy/tenancy.action";

export type Borrado = {
  tipo: "empresa" | "playa";
  id: string;
  nombre: string;
  // Solo las empresas se pueden suspender; una playa no tiene estado propio.
  suspender?: () => Promise<{ error?: string }>;
  ejecutar: () => Promise<{ error?: string }>;
};

type Requisito = { ok: boolean; titulo: string; detalle: string };

function requisitosDe(
  tipo: "empresa" | "playa",
  resumen: ResumenEliminacion,
): Requisito[] {
  if (tipo === "empresa")
    return [
      {
        ok: (resumen.playas ?? 0) === 0,
        titulo: resumen.playas
          ? `Todavía tiene ${resumen.playas} playa(s)`
          : "No tiene playas",
        detalle: resumen.registros
          ? `Con ${resumen.registros.toLocaleString("es-AR")} registros de operación entre todas. Esos datos no se borran.`
          : "Hay que eliminar cada playa antes que la empresa.",
      },
      {
        ok: resumen.usuarios === 0,
        titulo: resumen.usuarios
          ? `Todavía tiene ${resumen.usuarios} usuario(s)`
          : "No tiene usuarios",
        detalle:
          "Incluye las cuentas dadas de baja: se conservan porque firman movimientos de caja.",
      },
    ];
  return [
    {
      ok: resumen.registros === 0,
      titulo: resumen.registros
        ? `Tiene ${resumen.registros.toLocaleString("es-AR")} registros de operación`
        : "Sin registros de operación",
      detalle:
        "Tickets, tarifas, caja, turnos y movimientos de esta playa. No se pueden borrar.",
    },
    {
      ok: true,
      titulo: `${resumen.usuarios} usuario(s) asignados`,
      detalle:
        "Al eliminar la playa se les quita la asignación; las cuentas siguen existiendo.",
    },
  ];
}

export function BorradoDialog({
  borrado,
  cerrar,
  hecho,
}: {
  borrado: Borrado | null;
  cerrar: () => void;
  hecho: () => void;
}) {
  const [resumen, setResumen] = useState<ResumenEliminacion | null>(null);
  const [error, setError] = useState("");
  const [texto, setTexto] = useState("");
  const [entendido, setEntendido] = useState(false);
  const [trabajando, setTrabajando] = useState(false);

  useEffect(() => {
    let activo = true;
    setResumen(null);
    setError("");
    setTexto("");
    setEntendido(false);
    if (!borrado) return;
    getResumenEliminacionAction(borrado.tipo, borrado.id).then((r) => {
      if (!activo) return;
      if (r.resumen) setResumen(r.resumen);
      else setError(r.error ?? "No se pudo consultar el estado del borrado.");
    });
    return () => {
      activo = false;
    };
  }, [borrado]);

  async function correr(accion: () => Promise<{ error?: string }>) {
    if (trabajando) return;
    setTrabajando(true);
    try {
      const r = await accion();
      if (r.error) setError(r.error);
      else hecho();
    } finally {
      setTrabajando(false);
    }
  }

  const requisitos = resumen ? requisitosDe(borrado!.tipo, resumen) : [];
  const bloqueado = !!resumen && !resumen.puedeEliminar;
  const habilitado =
    !!resumen &&
    resumen.puedeEliminar &&
    texto.trim() === borrado?.nombre.trim() &&
    entendido;

  return (
    <Dialog
      open={!!borrado}
      onOpenChange={(open) => {
        if (!open && !trabajando) cerrar();
      }}
    >
      <DialogContent className="w-[calc(100vw-2rem)] max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/15 text-destructive">
              <AlertTriangle className="size-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="break-words">
                Eliminar «{borrado?.nombre}»
              </DialogTitle>
              <DialogDescription className="mt-1">
                {borrado?.tipo === "empresa"
                  ? "Se borra la ficha de la empresa para siempre. No borra su historial operativo: por eso solo se puede eliminar una empresa que ya no tiene nada."
                  : "Se borra la playa y se quitan las asignaciones de sus usuarios. Solo es posible si no tiene operación cargada."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {!resumen && !error && (
          <p
            role="status"
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <Loader2 className="size-4 animate-spin" />
            Revisando qué queda asociado…
          </p>
        )}

        {resumen && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Antes de eliminar
            </p>
            {requisitos.map((req) => (
              <div
                key={req.titulo}
                className="flex items-start gap-3 rounded-lg border border-border bg-gm-surface-2 p-3"
              >
                <span
                  className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${
                    req.ok
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-destructive/15 text-destructive"
                  }`}
                >
                  {req.ok ? (
                    <Check className="size-3.5" />
                  ) : (
                    <X className="size-3.5" />
                  )}
                </span>
                <div className="min-w-0">
                  <p
                    className={`text-sm font-medium ${req.ok ? "" : "text-destructive"}`}
                  >
                    {req.titulo}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {req.detalle}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {bloqueado && borrado?.suspender && (
          <div className="rounded-lg border border-border border-l-4 border-l-gm-yellow bg-gm-surface-2 p-4">
            <p className="text-sm font-medium">
              Lo que probablemente quieras es suspenderla
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Deja a la empresa sin acceso desde ahora, conserva todo y se
              revierte cuando corresponda.
            </p>
            <Button
              className="mt-3"
              disabled={trabajando}
              onClick={() => correr(borrado.suspender!)}
            >
              {trabajando ? "Guardando…" : "Suspender la empresa"}
            </Button>
          </div>
        )}

        {resumen?.puedeEliminar && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="confirmar-nombre" className="text-sm font-medium">
                Escribí{" "}
                <span className="font-mono text-gm-yellow">
                  {borrado?.nombre}
                </span>{" "}
                para confirmar
              </label>
              <Input
                id="confirmar-nombre"
                autoComplete="off"
                placeholder="Nombre exacto"
                value={texto}
                disabled={trabajando}
                onChange={(e) => setTexto(e.target.value)}
              />
            </div>
            <label className="flex cursor-pointer items-start gap-3 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={entendido}
                disabled={trabajando}
                onChange={(e) => setEntendido(e.target.checked)}
                className="mt-0.5 size-4 accent-destructive"
              />
              <span>
                Entiendo que {borrado?.tipo === "empresa" ? "la ficha de la empresa y sus accesos se borran" : "la playa y sus tipos de vehículo se borran"}, y que
                la acción no se puede deshacer.
              </span>
            </label>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" disabled={trabajando} onClick={cerrar}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={!habilitado || trabajando}
            onClick={() => borrado && correr(borrado.ejecutar)}
          >
            {trabajando ? "Eliminando…" : "Eliminar definitivamente"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
