"use client";

// Lo que el super admin habilita a una empresa por fuera del plan: por ahora, la verificación de
// transferencias al alias, con su precio pactado. Habilitar no activa nada: la empresa la activa
// en su configuración, con su alias. Desde acá no se ve ningún movimiento de su cuenta.
//
// El precio todavía no entra en facturas ni débitos: se guarda hasta definir cómo se cobra.

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeftRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EJE, Rotulo, Tarjeta } from "@/components/plataforma/mono";
import { AdicionalEmpresa } from "@/types/verificacion-alias.type";
import {
  adicionalesDeEmpresaAction,
  editarAdicionalDeEmpresaAction,
} from "@/actions/mercadopago/verificacion-alias.action";

const NOMBRES: Record<string, { titulo: string; detalle: string }> = {
  VERIFICACION_ALIAS: {
    titulo: "Verificación de transferencias al alias",
    detalle: "El sistema detecta la transferencia en la cuenta de MercadoPago de la empresa y registra la salida.",
  },
};

const fecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }) : null;

function FilaAdicional({
  empresaId,
  adicional,
  alGuardar,
}: {
  empresaId: string;
  adicional: AdicionalEmpresa;
  alGuardar: (lista: AdicionalEmpresa[]) => void;
}) {
  const [precio, setPrecio] = useState(String(adicional.precioMensual));
  const [guardando, setGuardando] = useState(false);
  useEffect(() => setPrecio(String(adicional.precioMensual)), [adicional.precioMensual]);
  const nombre = NOMBRES[adicional.codigo] ?? { titulo: adicional.codigo, detalle: "" };
  const precioOk = /^\d+$/.test(precio.trim());

  async function guardar(cambios: { habilitado?: boolean; precioMensual?: number }, aviso: string) {
    setGuardando(true);
    const r = await editarAdicionalDeEmpresaAction(empresaId, adicional.codigo, cambios);
    setGuardando(false);
    if (r.error || !r.datos) toast.error(r.error ?? "No se pudo guardar.");
    else {
      alGuardar(r.datos);
      toast.success(aviso);
    }
  }

  const desde = adicional.habilitado ? fecha(adicional.habilitadoEl) : fecha(adicional.deshabilitadoEl);

  return (
    <div className="space-y-3 rounded-xl border border-border px-3.5 py-3">
      <label className="flex cursor-pointer items-start justify-between gap-3 text-[13px]">
        <span className="flex gap-2.5">
          <ArrowLeftRight aria-hidden className="mt-0.5 size-4 shrink-0 text-gm-yellow" />
          <span>
            <span className="block font-semibold">{nombre.titulo}</span>
            <span className="block text-xs" style={{ color: EJE }}>
              {nombre.detalle}
              {desde && ` ${adicional.habilitado ? "Habilitada" : "Deshabilitada"} el ${desde}.`}
            </span>
          </span>
        </span>
        <Switch
          checked={adicional.habilitado}
          disabled={guardando}
          onCheckedChange={(v) =>
            void guardar({ habilitado: v }, v ? "Habilitada: la empresa ya la puede activar." : "Deshabilitada: se corta en el acto.")
          }
          className="data-[state=checked]:bg-gm-yellow"
        />
      </label>
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <span className="block text-xs" style={{ color: EJE }}>
            Precio por mes (todavía no se factura)
          </span>
          <Input
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            inputMode="numeric"
            className="gm-mono"
            disabled={guardando}
            aria-invalid={!precioOk}
          />
        </div>
        <Button
          variant="outline"
          disabled={guardando || !precioOk || Number(precio) === adicional.precioMensual}
          onClick={() => void guardar({ precioMensual: Number(precio) }, "Precio guardado.")}
        >
          Guardar precio
        </Button>
      </div>
    </div>
  );
}

export function AdicionalesEmpresa({ empresaId }: { empresaId: string }) {
  const [adicionales, setAdicionales] = useState<AdicionalEmpresa[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const r = await adicionalesDeEmpresaAction(empresaId);
    if (r.error) setError(r.error);
    else setAdicionales(r.datos ?? []);
  }, [empresaId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <Tarjeta className="gap-3 pb-5 pt-5">
      <Rotulo>Adicionales</Rotulo>
      {error ? (
        <p className="text-[13px] text-[#FF8A8D]">{error}</p>
      ) : !adicionales ? (
        <p className="text-[13px]" style={{ color: EJE }}>
          Cargando…
        </p>
      ) : (
        adicionales.map((a) => (
          <FilaAdicional key={a.codigo} empresaId={empresaId} adicional={a} alGuardar={setAdicionales} />
        ))
      )}
    </Tarjeta>
  );
}
