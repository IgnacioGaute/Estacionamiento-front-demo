"use client";

// Métricas → cómo se cargaron las entradas y las salidas de cada playa: con el escáner de
// patentes, con el escáner pero corrigiendo la lectura, escrita a mano o con la tarjeta física.
// Sirve para ver quién usa el escáner y qué tan bien lee la cámara de cada playa (muchas corregidas:
// mala luz, cámara mala, patentes sucias). Lo cargado antes de medirlo figura «sin dato».

import { Pastilla, Tarjeta } from "@/components/plataforma/mono";
import { numero, plural } from "@/components/plataforma/formato";
import type { MetricsDetalle } from "@/types/tenancy.type";

type Conteo = MetricsDetalle["origenes"][number]["entradas"];

const ORIGENES: { clave: keyof Conteo; label: string; color: string }[] = [
  { clave: "ESCANER", label: "Escáner", color: "#4ADE9B" },
  { clave: "CORREGIDA", label: "Escáner corregida", color: "#F5C219" },
  { clave: "MANUAL", label: "A mano", color: "#A79E8F" },
  { clave: "TARJETA", label: "Tarjeta", color: "#6FA8FF" },
  { clave: "SIN_DATO", label: "Sin dato", color: "#3A342B" },
];

const total = (c: Conteo) => ORIGENES.reduce((n, o) => n + c[o.clave], 0);
// Sobre lo medido: «sin dato» es de antes de medirlo y no dice nada del escáner.
const conEscaner = (c: Conteo) => {
  const medido = total(c) - c.SIN_DATO;
  return medido ? (c.ESCANER + c.CORREGIDA) / medido : null;
};
const porcentaje = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);
const sumar = (filas: Conteo[]) =>
  filas.reduce<Conteo>(
    (s, c) => ({
      ESCANER: s.ESCANER + c.ESCANER,
      CORREGIDA: s.CORREGIDA + c.CORREGIDA,
      MANUAL: s.MANUAL + c.MANUAL,
      TARJETA: s.TARJETA + c.TARJETA,
      SIN_DATO: s.SIN_DATO + c.SIN_DATO,
    }),
    { ESCANER: 0, CORREGIDA: 0, MANUAL: 0, TARJETA: 0, SIN_DATO: 0 },
  );

function Barra({ conteo, etiqueta }: { conteo: Conteo; etiqueta: string }) {
  const n = total(conteo);
  return (
    <div
      role="img"
      aria-label={`${etiqueta}: ${ORIGENES.filter((o) => conteo[o.clave]).map((o) => `${o.label.toLowerCase()} ${conteo[o.clave]}`).join(", ") || "ninguna"}`}
      className="flex h-2 w-full overflow-hidden rounded-full bg-[#211E19]"
    >
      {n > 0 &&
        ORIGENES.map((o) =>
          conteo[o.clave] ? (
            <span key={o.clave} style={{ width: `${(conteo[o.clave] / n) * 100}%`, background: o.color }} />
          ) : null,
        )}
    </div>
  );
}

function Resumen({ titulo, conteo }: { titulo: string; conteo: Conteo }) {
  const medido = total(conteo) - conteo.SIN_DATO;
  return (
    <div className="min-w-0 flex-1">
      <div className="text-xs text-muted-foreground">{titulo} con escáner</div>
      <div className="mt-1 flex flex-wrap items-baseline gap-2">
        <span className="font-mono text-[24px] font-medium leading-none tracking-[-0.03em] tabular-nums">
          {porcentaje(conEscaner(conteo))}
        </span>
        <span className="text-xs text-muted-foreground">
          {medido
            ? `${numero(conteo.ESCANER + conteo.CORREGIDA)} de ${numero(medido)} · ${plural(conteo.CORREGIDA, "corregida", "corregidas")}`
            : "sin datos todavía"}
        </span>
      </div>
      <div className="mt-2.5">
        <Barra conteo={conteo} etiqueta={titulo} />
      </div>
    </div>
  );
}

export function OrigenesCard({
  origenes,
  nombreEmpresa,
  dias,
}: {
  origenes: MetricsDetalle["origenes"];
  nombreEmpresa: Map<string, string>;
  dias: number;
}) {
  const filas = [...origenes].sort((a, b) => total(b.entradas) + total(b.salidas) - (total(a.entradas) + total(a.salidas)));
  const entradas = sumar(filas.map((f) => f.entradas));
  const salidas = sumar(filas.map((f) => f.salidas));

  return (
    <Tarjeta>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-[14px] font-semibold">Escáner de patentes</h2>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            Cómo se cargaron las entradas y las salidas de cada playa en los últimos {dias} días.
          </p>
        </div>
        <Pastilla>{plural(filas.length, "playa", "playas")}</Pastilla>
      </div>

      <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:gap-8">
        <Resumen titulo="Entradas" conteo={entradas} />
        <Resumen titulo="Salidas" conteo={salidas} />
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-muted-foreground" aria-label="Referencias">
        {ORIGENES.map((o) => (
          <li key={o.clave} className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: o.color }} />
            {o.label}
          </li>
        ))}
      </ul>

      {filas.length ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-[13px]">
            <thead>
              <tr className="text-left text-[11.5px] text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Playa</th>
                <th className="w-[32%] px-3 py-2 font-medium">Entradas</th>
                <th className="w-[32%] py-2 pl-3 font-medium">Salidas</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.playaId} className="border-t border-[#26231E] align-top">
                  <td className="py-2.5 pr-3">
                    <span className="font-medium">{f.playa}</span>
                    <span className="block text-[12px] text-muted-foreground">{nombreEmpresa.get(f.empresaId) ?? ""}</span>
                  </td>
                  {([["Entradas", f.entradas], ["Salidas", f.salidas]] as const).map(([titulo, c]) => (
                    <td key={titulo} className={titulo === "Entradas" ? "px-3 py-2.5" : "py-2.5 pl-3"}>
                      <Barra conteo={c} etiqueta={`${titulo} de ${f.playa}`} />
                      <span className="mt-1.5 block text-[12px] text-muted-foreground">
                        <span className="font-mono text-[#E3DBCE]">{porcentaje(conEscaner(c))}</span> con escáner ·{" "}
                        {numero(c.CORREGIDA)} corr. · {numero(c.MANUAL)} a mano
                        {c.TARJETA ? ` · ${numero(c.TARJETA)} tarjeta` : ""}
                        {c.SIN_DATO ? ` · ${numero(c.SIN_DATO)} sin dato` : ""}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">Sin entradas ni salidas en el período.</p>
      )}

      <p className="mt-3 text-[12px] text-muted-foreground">
        «Corregida»: el escáner leyó la patente y el operador la cambió, o eligió una patente parecida. Lo cargado
        antes de empezar a medirlo figura «sin dato».
      </p>
    </Tarjeta>
  );
}
