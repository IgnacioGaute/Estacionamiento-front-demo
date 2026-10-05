"use client";

// Una prueba para el super admin: qué le informa MercadoPago de la plata que entró a la cuenta
// conectada de la empresa. Sirve para averiguar si una transferencia al alias de la playa se ve
// desde el sistema (y con qué datos) antes de construir nada encima. Solo consulta: no guarda nada
// ni toca cobros. Muestra cada respuesta tal cual, también cuando MercadoPago contesta con error,
// porque lo que interesa es justamente qué devuelve.

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Segmentos } from "@/components/plataforma/mono";
import { diagnosticoIngresosMercadoPagoAction } from "@/actions/mercadopago/mercadopago.action";
import type { DiagnosticoIngresos, PagoDiagnostico } from "@/types/mercadopago.type";

const DIAS = [
  { id: "1", label: "24 h" },
  { id: "2", label: "2 días" },
  { id: "7", label: "7 días" },
];

const horaAR = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("es-AR", {
        timeZone: "America/Argentina/Buenos_Aires",
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const plata = (n: number | null) => (n === null ? "—" : `$${n.toLocaleString("es-AR")}`);

function Falla({ r }: { r: { estado: number | null; error: string } }) {
  return (
    <p className="m-0 rounded-[10px] bg-[#FF7A4D]/10 px-3 py-2 text-[12.5px] text-[#FF7A4D]">
      MercadoPago contestó {r.estado ?? "sin respuesta"}: {r.error}
    </p>
  );
}

function Datos({ valor }: { valor: unknown }) {
  return (
    <pre className="m-0 max-h-72 overflow-auto rounded-[10px] bg-[#15120E] p-3 text-[11.5px] leading-relaxed text-[#BDB4A6]">
      {JSON.stringify(valor, null, 2)}
    </pre>
  );
}

function FilaPago({ p }: { p: PagoDiagnostico }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <li className="border-t border-border first:border-t-0">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="grid w-full grid-cols-[88px_1fr_auto] items-center gap-3 px-4 py-3 text-left text-[13px] hover:bg-gm-surface-2"
      >
        <span className="text-muted-foreground">{horaAR(p.creado)}</span>
        <span className="min-w-0">
          <span className="block truncate font-semibold">
            {p.pagador.nombre ?? p.pagador.email ?? "Sin datos del que pagó"}
          </span>
          <span className="block truncate text-[12px] text-muted-foreground">
            {[p.operacion, p.tipo, p.medio, p.origen?.tipo].filter(Boolean).join(" · ")}
            {p.recibido === false && " · salió de esta cuenta"}
          </span>
        </span>
        <span className="text-right">
          <span className="block font-mono font-semibold">{plata(p.importe)}</span>
          <span
            className={cn(
              "block text-[11.5px]",
              p.estado === "approved" ? "text-emerald-400" : "text-muted-foreground",
            )}
          >
            {p.estado}
          </span>
        </span>
      </button>
      {abierto && (
        <div className="px-4 pb-3">
          <Datos valor={p} />
        </div>
      )}
    </li>
  );
}

export function DiagnosticoMercadoPago({ empresaId }: { empresaId: string }) {
  const [dias, setDias] = useState("1");
  const [cargando, setCargando] = useState(false);
  const [datos, setDatos] = useState<DiagnosticoIngresos | null>(null);

  const consultar = async () => {
    setCargando(true);
    const r = await diagnosticoIngresosMercadoPagoAction(empresaId, Number(dias));
    setCargando(false);
    if (r.error) toast.error(r.error);
    else setDatos(r.datos ?? null);
  };

  return (
    <section className="overflow-hidden rounded-[22px] border border-border bg-gm-surface">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold tracking-[0.12em] text-gm-yellow">PRUEBA</div>
          <h3 className="m-0 mt-1 text-[15px] font-semibold">Pagos que ve MercadoPago</h3>
          <p className="m-0 mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
            Mandá una transferencia chica al alias de la playa y consultá. Si aparece acá, el sistema puede
            detectarla. Solo lee la cuenta conectada; no guarda ni cobra nada.
          </p>
        </div>
        <Segmentos etiqueta="Período" claro opciones={DIAS} valor={dias} onChange={setDias} />
        <button
          type="button"
          onClick={() => void consultar()}
          disabled={cargando}
          className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-[#F6F0E6] px-4 text-[13px] font-semibold text-[#12100D] hover:bg-white disabled:opacity-60"
        >
          {cargando ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          Consultar
        </button>
      </div>

      {datos && (
        <div className="flex flex-col gap-5 px-5 py-4">
          <p className="m-0 text-[12.5px] text-muted-foreground">
            Cuenta {datos.cuenta.nickname ?? "—"} · {datos.cuenta.email ?? "sin email"} · id {datos.cuenta.mpUserId}
            {" · "}desde {horaAR(datos.desde)} hasta {horaAR(datos.hasta)}
          </p>

          <div className="flex flex-col gap-2">
            <h4 className="m-0 text-[13px] font-semibold">
              Pagos {datos.pagos.ok && <span className="text-muted-foreground">({datos.pagos.total ?? datos.pagos.items.length})</span>}
            </h4>
            {!datos.pagos.ok ? (
              <Falla r={datos.pagos} />
            ) : datos.pagos.items.length === 0 ? (
              <p className="m-0 text-[12.5px] text-muted-foreground">MercadoPago no informa pagos en ese período.</p>
            ) : (
              <ul className="m-0 list-none overflow-hidden rounded-[12px] border border-border p-0">
                {datos.pagos.items.map((p) => (
                  <FilaPago key={p.id} p={p} />
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <h4 className="m-0 text-[13px] font-semibold">Saldo de la cuenta</h4>
            {datos.saldo.ok ? <Datos valor={datos.saldo} /> : <Falla r={datos.saldo} />}
          </div>

          <div className="flex flex-col gap-2">
            <h4 className="m-0 text-[13px] font-semibold">Movimientos de la cuenta</h4>
            {!datos.movimientos.ok ? (
              <Falla r={datos.movimientos} />
            ) : datos.movimientos.items.length === 0 ? (
              <p className="m-0 text-[12.5px] text-muted-foreground">Sin movimientos.</p>
            ) : (
              <Datos valor={datos.movimientos.items} />
            )}
          </div>
        </div>
      )}
    </section>
  );
}
