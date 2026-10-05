"use client";

// Reconocimiento de patentes por playa. Cada cliente contrata su propio plan de Plate Recognizer
// y el super admin pega acá el token de esa cuenta: cada foto que lee el operador descuenta de ese
// plan. Una playa sin token no tiene cámara para la patente; el operador la escribe.
//
// El token nunca vuelve del servidor: la sección ve sus últimos cuatro caracteres, el consumo que
// informa Plate Recognizer en este momento y si otra playa de la empresa usa la misma cuenta.

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";
import { EJE } from "@/components/plataforma/mono";
import { AMARILLO } from "@/components/plataforma/graficos";
import {
  configurarPatentesAction,
  getConsumoPatentesAction,
  quitarPatentesAction,
} from "@/actions/tenancy/tenancy.action";
import type { ConsumoPatentes } from "@/types/tenancy.type";

const botonChico =
  "h-8 rounded-[9px] border border-border px-3 text-[12.5px] font-semibold transition-colors hover:border-gm-line-strong hover:bg-gm-surface-2 disabled:opacity-50";
const botonPeligro =
  "h-8 rounded-[9px] px-2.5 text-[12.5px] font-semibold text-[#FF7A4D] transition-colors hover:bg-[#FF7A4D]/10 disabled:opacity-50";

const numero = (n: number) => n.toLocaleString("es-AR");
const diaMes = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
  });

function Consumo({ playa }: { playa: ConsumoPatentes }) {
  if (!playa.configurado)
    return (
      <p className="m-0 text-[12.5px]" style={{ color: EJE }}>
        Sin reconocimiento: el operador escribe la patente.
      </p>
    );
  if (playa.error || !playa.uso)
    return (
      <p className="m-0 text-[12.5px] text-[#FF7A4D]">
        {playa.error ?? "No se pudo consultar el consumo."}
      </p>
    );

  const { usadas, total, restantes, seRenueva } = playa.uso;
  const proporcion = total ? Math.min(1, usadas / total) : 1;
  // Con menos del 10 % del plan disponible se avisa: al agotarse, la cámara deja de leer.
  const poco = restantes <= total * 0.1;
  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[13px]">
        <span>
          <b className="font-semibold">{numero(usadas)}</b>
          <span style={{ color: EJE }}> de {numero(total)} fotos usadas</span>
        </span>
        <span className={poco ? "font-semibold text-[#FF7A4D]" : "text-muted-foreground"}>
          {restantes === 0 ? "Plan agotado" : `Quedan ${numero(restantes)}`}
          {seRenueva && <span style={{ color: EJE }}> · se renueva el {diaMes(seRenueva)}</span>}
        </span>
      </div>
      <span className="block h-[5px] overflow-hidden rounded-full bg-[#2B2620]" aria-hidden>
        <span
          className="block h-full rounded-full"
          style={{ width: `${Math.max(2, proporcion * 100)}%`, background: poco ? "#FF7A4D" : AMARILLO }}
        />
      </span>
      {playa.compartidaCon && (
        <p className="m-0 text-[11.5px]" style={{ color: EJE }}>
          Comparte el plan con {playa.compartidaCon.join(", ")}: el cupo es uno solo.
        </p>
      )}
    </div>
  );
}

export function PatentesPlayas({ empresaId }: { empresaId: string }) {
  const [consumo, setConsumo] = useState<ConsumoPatentes[] | null>(null);
  const [error, setError] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [errorToken, setErrorToken] = useState("");
  const [quitando, setQuitando] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const r = await getConsumoPatentesAction(empresaId);
    if ("error" in r && r.error) setError(r.error);
    else {
      setError("");
      setConsumo(r.consumo ?? []);
    }
  }, [empresaId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const abrirEditor = (playaId: string) => {
    setEditando(playaId);
    setToken("");
    setErrorToken("");
    setQuitando(null);
  };

  const guardar = async (playa: ConsumoPatentes) => {
    setOcupado(playa.playaId);
    setErrorToken("");
    const r = await configurarPatentesAction(playa.playaId, token);
    setOcupado(null);
    if (r.error) {
      setErrorToken(r.error);
      return;
    }
    toast.success(`Reconocimiento de patentes activo en ${playa.nombre}.`);
    setEditando(null);
    setToken("");
    await cargar();
  };

  const quitar = async (playa: ConsumoPatentes) => {
    setOcupado(playa.playaId);
    const r = await quitarPatentesAction(playa.playaId);
    setOcupado(null);
    setQuitando(null);
    if (r.error) {
      toast.error(r.error);
      return;
    }
    toast.success(`${playa.nombre} ya no tiene reconocimiento de patentes.`);
    await cargar();
  };

  return (
    <section className="mt-4 overflow-hidden rounded-[22px] border border-border bg-gm-surface">
      <div className="border-b border-[#2E2A23] px-5 py-4">
        <h2 className="flex items-center gap-2 font-display text-[20px] font-semibold">
          <Camera className="size-[18px] text-gm-yellow" />
          Reconocimiento de patentes
        </h2>
        <p className="mt-1 max-w-3xl text-[13px] text-muted-foreground">
          Cada playa usa su propia cuenta de Plate Recognizer. Cada foto que se lee descuenta del plan de esa
          playa, encuentre o no una patente. Sin plan, la cámara no aparece y el operador escribe la patente.
        </p>
      </div>

      {error ? (
        <p className="m-0 px-5 py-6 text-[13px] text-[#FF7A4D]">{error}</p>
      ) : !consumo ? (
        <p className="m-0 flex items-center gap-2 px-5 py-6 text-[13px]" style={{ color: EJE }}>
          <Loader2 className="size-4 animate-spin" />
          Consultando el consumo en Plate Recognizer…
        </p>
      ) : (
        <ul className="m-0 list-none p-0">
          {consumo.map((playa) => (
            <li key={playa.playaId} className="border-t border-[#2B2620] px-5 py-4 first:border-t-0">
              <div className="grid items-center gap-x-6 gap-y-3 md:grid-cols-[minmax(0,200px)_minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <span className="block truncate font-semibold">{playa.nombre}</span>
                  {playa.terminaEn && (
                    <span className="mt-[3px] block font-mono text-[11px]" style={{ color: EJE }}>
                      token …{playa.terminaEn}
                    </span>
                  )}
                </div>
                <Consumo playa={playa} />
                <div className="flex justify-end gap-1.5">
                  {quitando === playa.playaId ? (
                    <>
                      <span className="self-center text-[12.5px] text-muted-foreground">¿Quitar?</span>
                      <button
                        type="button"
                        className={botonPeligro}
                        disabled={ocupado === playa.playaId}
                        onClick={() => void quitar(playa)}
                      >
                        Sí, quitar
                      </button>
                      <button type="button" className={botonChico} onClick={() => setQuitando(null)}>
                        No
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" className={botonChico} onClick={() => abrirEditor(playa.playaId)}>
                        {playa.configurado ? "Cambiar token" : "Cargar token"}
                      </button>
                      {playa.configurado && (
                        <button
                          type="button"
                          className={botonPeligro}
                          onClick={() => {
                            setQuitando(playa.playaId);
                            setEditando(null);
                          }}
                        >
                          Quitar
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {editando === playa.playaId && (
                <form
                  className="mt-3 grid gap-2 rounded-[14px] border border-[#26221C] bg-background p-3.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void guardar(playa);
                  }}
                >
                  <label htmlFor={`token-${playa.playaId}`} className="text-[12.5px] font-semibold">
                    API Token de Plate Recognizer
                  </label>
                  <p className="m-0 text-[12px]" style={{ color: EJE }}>
                    Está en la cuenta del cliente, en app.platerecognizer.com → API Token. Se verifica con Plate
                    Recognizer antes de guardarlo.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <input
                      id={`token-${playa.playaId}`}
                      type="password"
                      autoComplete="off"
                      spellCheck={false}
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="Pegá el token"
                      className="h-9 min-w-0 flex-1 rounded-[9px] border border-border bg-gm-surface px-3 font-mono text-[13px] outline-none focus:border-gm-yellow"
                    />
                    <button
                      type="submit"
                      disabled={!token.trim() || ocupado === playa.playaId}
                      className="h-9 rounded-[9px] bg-gm-yellow px-4 text-[13px] font-bold text-gm-ink transition-colors hover:bg-[#FFD23A] disabled:opacity-50"
                    >
                      {ocupado === playa.playaId ? "Verificando…" : "Guardar"}
                    </button>
                    <button type="button" className={`${botonChico} h-9`} onClick={() => setEditando(null)}>
                      Cancelar
                    </button>
                  </div>
                  {errorToken && <p className="m-0 text-[12.5px] text-[#FF7A4D]">{errorToken}</p>}
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
