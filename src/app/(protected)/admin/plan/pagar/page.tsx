export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Lock, MessageCircle } from 'lucide-react';
import { currentUser } from '@/lib/auth';
import { getMiPlanAction } from '@/actions/suscripciones/suscripciones.action';
import {
  EstadoCuentaPill,
  fechaLarga,
  hoyAR,
  pesos,
  sumarDiasAR,
  sumarMesesAR,
} from '@/components/plataforma/cuenta';
import type { MiPlan } from '@/types/suscripcion.type';
import { FormasDePago, VueltaDeMercadoPago } from './formas-de-pago';

type Query = Record<string, string | string[] | undefined>;
const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

// A donde lleva el aviso del menú, armada como un checkout: a la derecha (arriba en el celular) qué
// se paga y por qué período; a la izquierda las formas de pago para elegir. Con MercadoPago
// configurado en la plataforma son el débito automático y pagar una vez, y no se ofrece
// transferencia (WhatsApp queda para consultas); sin MercadoPago, el pago es por transferencia.
// Sigue andando con la cuenta suspendida (las rutas de pago están en SUSPENDED_ENDPOINTS).
// MercadoPago vuelve acá con ?mp=pago|debito.
export default async function PagarPage({ searchParams }: { searchParams: Promise<Query> }) {
  const user = await currentUser();
  if (user?.role?.toUpperCase() !== 'ADMIN') redirect('/tickets');
  const query = await searchParams;
  const vuelta = uno(query.mp);
  const { data, error } = await getMiPlanAction();
  const subtitulo = data ? subtituloDe(data) : null;

  return (
    <div className="px-4 pb-16 pt-5 sm:px-10 sm:pt-10">
      <main className="mx-auto flex max-w-[1100px] flex-col gap-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/admin/plan"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#2E2A23] px-4 text-sm font-semibold text-[#E3DBCE] transition-colors hover:bg-white/[0.04]"
          >
            <ArrowLeft aria-hidden className="size-4" />
            Mi plan
          </Link>
          {data?.mercadoPago && (
            <span className="inline-flex items-center gap-2 text-[13px] text-[#8F8676]">
              <Lock aria-hidden className="size-[15px]" strokeWidth={1.9} />
              Pago seguro con MercadoPago
            </span>
          )}
        </div>

        <header className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <span aria-hidden className="h-px w-6 bg-gm-yellow" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-gm-yellow">Mi plan</span>
          </div>
          <h1 className="m-0 font-display text-[34px] font-semibold uppercase leading-none tracking-[0.01em] text-[#F6F0E6] sm:text-[48px]">
            Pagar tu plan
          </h1>
          {subtitulo && <p className="m-0 text-base leading-relaxed text-[#A79E8F]">{subtitulo}</p>}
        </header>

        {(vuelta === 'pago' || vuelta === 'debito') && (
          <VueltaDeMercadoPago
            motivo={vuelta}
            estado={uno(query.status) ?? uno(query.collection_status)}
            pagoId={uno(query.payment_id) ?? uno(query.collection_id)}
          />
        )}

        {error || !data ? (
          <p role="alert" className="rounded-2xl border border-destructive p-6 text-sm">
            {error ?? 'No pudimos cargar tu cuenta. Probá de nuevo en un ratito.'}
          </p>
        ) : (
          <Contenido plan={data} email={user?.email ?? ''} />
        )}
      </main>
    </div>
  );
}

// Qué hay para pagar ahora: lo vencido o, si está al día, su próximo período (mismo criterio que el
// backend). Con débito activo y nada vencido, eso es el próximo débito, no algo para pagar.
function aPagarDe(plan: MiPlan) {
  const { cuenta } = plan;
  const hoy = hoyAR();
  const pendiente = cuenta.facturaPendiente && cuenta.facturaPendiente.desde <= hoy ? cuenta.facturaPendiente : null;
  const adelanto = !pendiente && ['PRUEBA', 'AL_DIA'].includes(cuenta.estado) && cuenta.importePeriodo > 0;
  const importe = pendiente?.importe ?? (adelanto ? cuenta.importePeriodo : 0);
  const debe = !!pendiente || cuenta.estado === 'VENCIDA' || cuenta.estado === 'SUSPENDIDA';
  const debitara = cuenta.debito?.estado === 'authorized' && !debe;
  return { pendiente, importe, debe, debitara };
}

function subtituloDe(plan: MiPlan) {
  const { importe, debe, debitara } = aPagarDe(plan);
  if (!importe) return null;
  if (plan.cuenta.estado === 'SUSPENDIDA') return 'Pagá y tu cuenta vuelve a la normalidad apenas se acredita.';
  if (debe) return 'Tenés un pago pendiente. Pagalo y todo sigue como siempre.';
  if (debitara) return 'Tu plan se cobra solo con el débito automático.';
  const proximo = plan.cuenta.periodo.meses === 1 ? 'tu próximo mes' : 'tu próximo período';
  return plan.mercadoPago
    ? `Dejá el débito automático listo o adelantá ${proximo}.`
    : `Podés pagar por adelantado ${proximo}.`;
}

// «Playa mediana + alquileres» → «Playa mediana · con alquileres».
const descripcionPlan = (nombre: string) =>
  /\+/.test(nombre) ? `${nombre.replace(/\s*\+.*$/, '')} · con alquileres` : `${nombre} · solo tickets`;

function Contenido({ plan, email }: { plan: MiPlan; email: string }) {
  const { cuenta } = plan;
  const { pendiente, importe, debe, debitara } = aPagarDe(plan);
  const desde = pendiente?.desde ?? cuenta.proximoVencimiento;
  // Lo que cubre: el período de lo vencido o, por adelantado, el que sigue a lo cubierto (mismo
  // cálculo que el backend). Con sus meses y su descuento.
  const meses = pendiente?.meses ?? cuenta.periodo.meses;
  const descuento = pendiente?.descuento ?? cuenta.periodo.descuento;
  const hasta = pendiente?.hasta ?? (cuenta.venceEl ? sumarMesesAR(cuenta.venceEl, meses) : null);
  const ultimoDia = cuenta.suspendeEl ? sumarDiasAR(cuenta.suspendeEl, -1) : null;
  const whatsapp = plan.contacto
    ? `https://wa.me/${plan.contacto.replace(/\D/g, '')}?text=${encodeURIComponent(
        `Hola, te escribo por el pago del plan del sistema de estacionamiento${importe ? ` (${pesos(importe)})` : ''}.`,
      )}`
    : null;

  if (!importe)
    return (
      <section className="flex gap-4 rounded-[24px] border border-[#2E2A23] bg-[#1B1915] p-[26px]">
        <span className="flex size-[46px] shrink-0 items-center justify-center rounded-[14px] bg-[#4ADE9B24] text-[#4ADE9B]">
          <CheckCircle2 aria-hidden className="size-[22px]" strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <h2 className="m-0 text-[22px] font-semibold leading-tight text-[#F6F0E6]">Estás al día</h2>
          <p className="m-0 mt-1.5 text-[15px] leading-relaxed text-[#BDB4A6]">
            {cuenta.estado === 'BONIFICADA'
              ? 'Tu cuenta está bonificada: no tenés que pagar nada.'
              : cuenta.estado === 'SIN_ACTIVAR'
                ? 'Tu cuenta todavía no arrancó, así que no hay nada para pagar.'
                : cuenta.proximoVencimiento
                  ? `No tenés nada para pagar por ahora. Tu próximo ${cuenta.periodo.meses === 1 ? 'mes' : 'período'} arranca el ${fechaLarga(cuenta.proximoVencimiento)}.`
                  : 'No tenés nada para pagar por ahora.'}
          </p>
        </div>
      </section>
    );

  // Lo vencido se muestra como se facturó (precios de ese momento); lo que viene, con el plan de hoy.
  const factura = pendiente ? plan.facturas.find((f) => f.id === pendiente.id) : null;
  const lineas = factura?.detalle.length
    ? factura.detalle.map((l) => ({ id: l.playaId, nombre: l.playa, plan: l.plan, precio: l.precio }))
    : plan.playas
        .filter((p) => p.plan)
        .map((p) => ({ id: p.playaId, nombre: p.nombre, plan: p.plan!.plan, precio: p.plan!.precio }));
  const concepto =
    meses === 1
      ? !cuenta.pagadoHasta
        ? 'Tu primer mes'
        : pendiente && cuenta.diasDeAtraso
          ? 'Tu último mes'
          : 'Tu próximo mes'
      : !cuenta.pagadoHasta
        ? `Tus primeros ${meses} meses`
        : pendiente && cuenta.diasDeAtraso
          ? `Tus últimos ${meses} meses`
          : `Tus próximos ${meses} meses`;
  // Con un período largo: lo de lista por los meses, y el descuento aparte para que se vea el ahorro.
  const lista = lineas.reduce((n, l) => n + l.precio, 0) * meses;
  const ahorro = meses > 1 && descuento > 0 ? lista - importe : 0;
  const nota =
    cuenta.estado === 'SUSPENDIDA'
      ? 'Apenas se acredita el pago, vuelve todo a la normalidad. No perdés nada.'
      : debe
        ? cuenta.debeSuspenderse
          ? 'Ya pasaron los días de margen: apenas se acredita el pago, todo sigue como siempre.'
          : `${cuenta.diasDeAtraso ? `Venció el ${fechaLarga(desde)}` : 'Vence hoy'}. Tenés tiempo hasta el ${fechaLarga(ultimoDia)}: apenas se acredita el pago, todo sigue como siempre.`
        : debitara
          ? `Con el débito automático se cobra solo el ${fechaLarga(desde)}. No tenés que hacer nada.`
          : `Vence el ${fechaLarga(desde)}. ${
              plan.mercadoPago
                ? 'Si preferís, dejá el débito automático listo o adelantalo ahora.'
                : 'Si querés, podés pagarlo antes.'
            }`;

  return (
    <>
      {/* Al revés a propósito: en pantalla ancha el resumen va a la derecha; en el celular, arriba. */}
      <div className="flex flex-row-reverse flex-wrap items-start gap-6">
        <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-5 rounded-[24px] border border-[#2E2A23] bg-[#1B1915] p-[26px] lg:max-w-[400px]">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#8F8676]">Resumen</span>
            <EstadoCuentaPill cuenta={cuenta} />
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-sm text-[#A79E8F]">{concepto}</div>
            {desde && hasta && (
              <div className="text-[17px] font-semibold text-[#F6F0E6]">
                {fechaLarga(desde)} al {fechaLarga(hasta)}
              </div>
            )}
          </div>
          {lineas.length > 0 && (
            <ul className="m-0 flex list-none flex-col gap-3 border-y border-[#2B2620] px-0 py-4">
              {lineas.map((l) => (
                <li key={l.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold text-[#F6F0E6]">{l.nombre}</div>
                    <div className="mt-0.5 text-[13px] text-[#8F8676]">{descripcionPlan(l.plan)}</div>
                  </div>
                  <div className="text-right font-mono text-[15px] font-bold text-[#F6F0E6]">
                    {pesos(l.precio)}
                    {meses > 1 && <span className="block text-[11.5px] font-medium text-[#8F8676]">por mes</span>}
                  </div>
                </li>
              ))}
              {meses > 1 && (
                <li className="flex flex-col gap-2 border-t border-[#2B2620] pt-3 text-sm">
                  <span className="flex justify-between gap-3 text-[#A79E8F]">
                    <span>× {meses} meses</span>
                    <span className="font-mono">{pesos(lista)}</span>
                  </span>
                  {ahorro > 0 && (
                    <span className="flex justify-between gap-3 font-semibold text-[#4ADE9B]">
                      <span>
                        Pago {cuenta.periodo.nombre.toLowerCase()} −{descuento}%
                      </span>
                      <span className="font-mono">−{pesos(ahorro)}</span>
                    </span>
                  )}
                </li>
              )}
            </ul>
          )}
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[15px] font-semibold text-[#E3DBCE]">
              {debitara ? (meses === 1 ? 'Por mes' : meses === 12 ? 'Por año' : `Cada ${meses} meses`) : 'A pagar'}
            </span>
            <span
              className="font-mono text-[34px] font-bold tracking-[-0.02em]"
              style={{ color: debe ? '#F5C219' : '#F6F0E6' }}
            >
              {pesos(importe)}
            </span>
          </div>
          <p className="m-0 text-[13.5px] leading-relaxed text-[#A79E8F]">{nota}</p>
        </aside>

        {plan.mercadoPago ? (
          <FormasDePago
            cuenta={cuenta}
            importe={importe}
            debe={debe}
            email={email}
            clavePublica={plan.mercadoPagoClavePublica}
          />
        ) : (
          <section className="flex min-w-0 flex-[3_1_480px] flex-col gap-3.5 rounded-[24px] border border-[#2E2A23] bg-[#1B1915] p-[26px]">
            <h2 className="m-0 text-xl font-semibold text-[#F6F0E6]">Cómo pagar</h2>
            {plan.comoPagar ? (
              <>
                <p className="m-0 text-[15px] leading-relaxed text-[#BDB4A6]">
                  Transferí con estos datos y avisanos. Apenas nos llega, lo anotamos y tu cuenta queda al día en el
                  momento.
                </p>
                <p className="m-0 whitespace-pre-line rounded-xl border border-[#2E2A23] bg-[#14110D] p-4 font-mono text-[13px] leading-relaxed text-[#E3DBCE]">
                  {plan.comoPagar}
                </p>
              </>
            ) : (
              <p className="m-0 text-[15px] leading-relaxed text-[#BDB4A6]">
                Por ahora el pago es por transferencia. Escribinos por WhatsApp, te pasamos los datos y, apenas nos llega,
                lo anotamos. Tu cuenta queda al día en el momento.
              </p>
            )}
            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-[46px] w-fit items-center gap-2.5 rounded-[13px] bg-[#25D366] px-[18px] text-[14.5px] font-bold text-[#0B2E17] hover:opacity-90"
              >
                <MessageCircle aria-hidden className="size-[18px]" />
                Escribinos por WhatsApp
              </a>
            )}
          </section>
        )}
      </div>

      {/* Con MercadoPago no se ofrece transferencia; WhatsApp queda solo para consultas. */}
      {plan.mercadoPago && whatsapp && (
        <p className="m-0 text-center text-sm text-[#8F8676]">
          ¿Alguna duda con el pago?{' '}
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-gm-yellow hover:text-[#FFD84D]"
          >
            Escribinos por WhatsApp
          </a>
        </p>
      )}
    </>
  );
}
