"use client";

// El aviso de la cuenta con la plataforma: una franja fina bajo la barra superior, en todas las
// pantallas. Sutil (un punto de color, el fondo apenas teñido) pero se lee de un vistazo. Avisa
// cuando la prueba o el mes están por vencer, cuando terminó la prueba, cuando el pago tiene
// atraso y cuando la cuenta está suspendida. Al administrador, toda la franja lo lleva a pagar;
// el operador solo necesita saber qué pasa y a quién avisarle.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowRight, X } from "lucide-react";
import { useTenant } from "@/components/tenant-provider";
import { cuentaConAlerta, diaAR, pesos } from "@/components/plataforma/cuenta";
import type { SituacionCuenta } from "@/types/suscripcion.type";

const AMARILLO = "#F5C219";
const NARANJA = "#FF7A4D";
const ROJO = "#E5484D";

const enDias = (n: number) => (n === 1 ? "1 día" : `${n} días`);
const cuandoEs = (n: number) => (n <= 0 ? "hoy" : n === 1 ? "mañana" : `en ${enDias(n)}`);

type Aviso = {
  acento: string;
  titulo: string;
  // Para el celular, donde no entra el título completo con la acción.
  corto?: string;
  detalle: string;
  accion: string | null;
  destino: string;
  // Lo que todavía no venció se puede cerrar por esta sesión; lo vencido no.
  cerrable: boolean;
};

function avisoDe(c: SituacionCuenta): Aviso | null {
  if (!cuentaConAlerta(c)) return null;
  const importe = c.aPagar ? pesos(c.aPagar) : null;
  const corte = c.suspendeEl ? ` · se suspende el ${diaAR(c.suspendeEl, false)}` : "";
  switch (c.estado) {
    case "PRUEBA":
      return {
        acento: AMARILLO,
        titulo: `La prueba gratis termina ${cuandoEs((c.diasParaVencer ?? 1) - 1)}`,
        detalle: c.conDebito
          ? `después se cobra solo de tu tarjeta${importe ? `, ${importe} por mes` : ""}`
          : importe
            ? `después, ${importe} por mes`
            : "elegí tu plan para seguir",
        accion: "Ver planes",
        destino: "/admin/plan",
        cerrable: true,
      };
    case "AL_DIA":
      // Con débito automático no hay nada que recordar: se cobra solo.
      if (c.conDebito) return null;
      return {
        acento: AMARILLO,
        titulo: `El plan del sistema vence ${cuandoEs(c.diasParaVencer ?? 0)}`,
        detalle: importe ? `${importe} el ${diaAR(c.proximoVencimiento, false)}` : `el ${diaAR(c.proximoVencimiento, false)}`,
        accion: "Pagar",
        destino: "/admin/plan/pagar",
        cerrable: true,
      };
    case "VENCIDA": {
      if (c.conDebito) {
        // El día del vencimiento MercadoPago todavía está cobrando: no hay nada que avisar.
        if (!c.diasDeAtraso) return null;
        return {
          acento: NARANJA,
          titulo: "MercadoPago no pudo cobrar el plan de tu tarjeta",
          corto: "No se pudo cobrar el plan",
          detalle: `lo vuelve a intentar estos días${corte}`,
          accion: "Pagar ahora",
          destino: "/admin/plan/pagar",
          cerrable: false,
        };
      }
      // Terminó la prueba (nunca pagó) o venció un mes: mismo aviso, distinto título.
      const titulo = c.enPrueba
        ? "Terminó la prueba gratis"
        : c.diasDeAtraso
          ? `El pago del sistema tiene ${enDias(c.diasDeAtraso)} de atraso`
          : "Hoy vence el plan del sistema";
      const que = c.enPrueba ? "el primer mes" : "el mes";
      const detalle = c.enPrueba
        ? c.diasDeAtraso
          ? `${que}${importe ? ` (${importe})` : ""} tiene ${enDias(c.diasDeAtraso)} de atraso${corte}`
          : `${que}${importe ? ` (${importe})` : ""} vence hoy`
        : `${importe ?? "pago pendiente"}${c.diasDeAtraso ? corte : ""}`;
      return {
        acento: c.diasDeAtraso ? NARANJA : AMARILLO,
        titulo,
        corto: !c.enPrueba && c.diasDeAtraso ? `Pago con ${enDias(c.diasDeAtraso)} de atraso` : undefined,
        detalle,
        accion: "Pagar ahora",
        destino: "/admin/plan/pagar",
        cerrable: false,
      };
    }
    case "SUSPENDIDA":
      return c.motivoSuspension === "MANUAL"
        ? {
            acento: ROJO,
            titulo: "Cuenta suspendida",
            detalle: "solo se pueden registrar salidas y cerrar el turno",
            accion: "Ver detalle",
            destino: "/admin/plan",
            cerrable: false,
          }
        : {
            acento: ROJO,
            titulo: "Cuenta suspendida por falta de pago",
            corto: "Cuenta suspendida",
            detalle: `solo salidas y cierre de turno${importe ? ` · debe ${importe}` : ""}`,
            accion: "Pagar y reactivar",
            destino: "/admin/plan/pagar",
            cerrable: false,
          };
    default:
      return null;
  }
}

export function AvisoCuenta() {
  const { context } = useTenant();
  const { data: session } = useSession();
  const cuenta = context.cuenta;
  const admin = (session?.user?.role ?? "").toUpperCase() === "ADMIN";
  const clave = `aviso-cuenta:${cuenta?.estado}:${cuenta?.proximoVencimiento}`;
  const [oculto, setOculto] = useState(true);

  useEffect(() => {
    try {
      setOculto(sessionStorage.getItem(clave) === "1");
    } catch {
      setOculto(false);
    }
  }, [clave]);

  const aviso = cuenta ? avisoDe(cuenta) : null;
  if (!aviso || (aviso.cerrable && oculto)) return null;
  const urgente = !aviso.cerrable;

  const contenido = (
    <>
      <span aria-hidden className="relative flex size-2 shrink-0">
        {urgente && (
          <span
            className="absolute inline-flex size-full animate-ping rounded-full opacity-50"
            style={{ background: aviso.acento }}
          />
        )}
        <span className="relative inline-flex size-2 rounded-full" style={{ background: aviso.acento }} />
      </span>
      <span className="min-w-0 flex-1 truncate">
        <span className={`font-semibold text-foreground ${aviso.corto ? "hidden sm:inline" : ""}`}>{aviso.titulo}</span>
        {aviso.corto && <span className="font-semibold text-foreground sm:hidden">{aviso.corto}</span>}
        {/* En el celular solo el título: el detalle está a un toque, en la pantalla de pago. */}
        <span className="hidden text-muted-foreground sm:inline"> · {aviso.detalle}</span>
      </span>
      {admin && aviso.accion ? (
        <span
          className="flex shrink-0 items-center gap-1 text-[12.5px] font-bold transition-transform group-hover:translate-x-0.5"
          style={{ color: aviso.acento }}
        >
          {aviso.accion}
          <ArrowRight aria-hidden className="size-3.5" />
        </span>
      ) : (
        !admin && <span className="hidden shrink-0 text-[12px] text-muted-foreground sm:inline">Avisale al administrador</span>
      )}
    </>
  );
  const clases = "group flex min-h-10 min-w-0 flex-1 items-center gap-3 py-2 pl-4 pr-3 text-[13px] sm:pl-6";

  return (
    <div
      role={urgente ? "alert" : "status"}
      title={`${aviso.titulo} · ${aviso.detalle}`}
      className="relative flex items-center border-b border-border/60"
      // Apenas teñido desde la izquierda: se nota sin gritar.
      style={{ background: `linear-gradient(90deg, ${aviso.acento}1f, ${aviso.acento}08 45%, transparent 85%)` }}
    >
      <span aria-hidden className="absolute inset-y-0 left-0 w-[3px]" style={{ background: aviso.acento }} />
      {admin ? (
        <Link href={aviso.destino} className={clases}>
          {contenido}
        </Link>
      ) : (
        <div className={clases}>{contenido}</div>
      )}
      {aviso.cerrable && (
        <button
          type="button"
          aria-label="Cerrar aviso"
          onClick={() => {
            setOculto(true);
            try {
              sessionStorage.setItem(clave, "1");
            } catch {
              // Sin almacenamiento el aviso vuelve en la próxima carga; no es grave.
            }
          }}
          className="mr-3 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground sm:mr-4"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
