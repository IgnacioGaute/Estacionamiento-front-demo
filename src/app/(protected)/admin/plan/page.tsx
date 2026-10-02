export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  CalendarCheck,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Gift,
  MessageCircle,
  PauseCircle,
  Receipt,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { currentUser } from '@/lib/auth';
import { getMiPlanAction } from '@/actions/suscripciones/suscripciones.action';
import { TarjetasPlan } from '@/components/plataforma/tarjetas-plan';
import {
  DIAS_DE_GRACIA,
  MEDIOS_PAGO,
  agruparPlanes,
  diaMesCorto,
  diasEntreAR,
  fechaLarga,
  hoyAR,
  pesos,
  sumarDiasAR,
  sumarMesesAR,
} from '@/components/plataforma/cuenta';
import type { FacturaSaas, MiPlan, ResumenCuenta } from '@/types/suscripcion.type';

// El plan de la empresa visto por su administrador, ordenado como un panel de facturación: arriba
// en qué está su cuenta y qué sigue, contado como lo diría una persona; después su plan con las
// tarjetas de la landing (solo la modalidad que tiene) y lo que incluye, la forma de pago y sus
// pagos. El uso de la playa contra el límite del plan no se muestra: eso lo mira la plataforma.
export default async function MiPlanPage() {
  const user = await currentUser();
  if (user?.role?.toUpperCase() !== 'ADMIN') redirect('/tickets');
  const { data, error } = await getMiPlanAction();

  return (
    <div className="px-4 pb-16 pt-6 sm:px-10 sm:pt-12">
      <main className="mx-auto flex max-w-[1160px] flex-col gap-7">
        {error || !data ? (
          <p role="alert" className="rounded-2xl border border-destructive p-6 text-sm">
            {error ?? 'No pudimos cargar tu plan. Probá de nuevo en un ratito.'}
          </p>
        ) : (
          <Contenido plan={data} />
        )}
      </main>
    </div>
  );
}

const AMARILLO = '#F5C219';
const NARANJA = '#FF8A5C';
const VERDE = '#4ADE9B';
const ROJO = '#FF7B7F';
const LAVANDA = '#A9AFFF';
const GRIS = '#A79E8F';

const tarjeta = 'rounded-[24px] border border-[#2E2A23] bg-[#1B1915]';
const rotulo = 'font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#8F8676]';

// Lo que incluye cualquier plan, con las palabras de la landing.
const INCLUIDO = [
  'Entradas y salidas, con lectura de patentes',
  'Tarifas por hora y fracción, calculadas solas',
  'Caja y turnos, con quién cobró cada cosa',
  'Comprobantes por QR, WhatsApp o impresora',
  'Reportes de lo que entró',
  'Asistente con inteligencia artificial',
  'Soporte directo por WhatsApp',
  'Sin contrato de permanencia',
];
const INCLUIDO_COCHERAS = 'Alquileres mensuales: inquilinos, cargos y recibos';

type Relato = {
  acento: string;
  Icono: LucideIcon;
  pastilla: string;
  titulo: string;
  texto: string;
  barra?: { titulo: string; fraccion: number; desde: string; hasta: string };
  monto?: { etiqueta: string; valor: string; sufijo?: string; detalle: string | null };
  boton?: { texto: string; href: string; principal: boolean };
  nota?: string;
};

// Lo que la tarjeta de arriba cuenta en cada momento de la cuenta. Tono de persona: qué pasa, qué
// sigue y qué puede hacer, sin amenazas.
function relatoDe(cuenta: ResumenCuenta, plan: string | null, mercadoPago: boolean): Relato {
  const hoy = hoyAR();
  const nuncaPago = !cuenta.pagadoHasta;
  const proximo = cuenta.proximoVencimiento;
  const ultimoDia = cuenta.suspendeEl ? sumarDiasAR(cuenta.suspendeEl, -1) : null;
  const pendiente = cuenta.facturaPendiente && cuenta.facturaPendiente.desde <= hoy ? cuenta.facturaPendiente : null;
  const aPagar = pendiente?.importe ?? cuenta.mensual;
  const atraso = cuenta.diasDeAtraso;
  // Con débito automático son 10: MercadoPago reintenta la tarjeta varios días.
  const gracia = cuenta.diasDeGracia ?? DIAS_DE_GRACIA;
  const debito = cuenta.debito?.estado === 'authorized';
  const conPlan = (texto: string) => (plan ? `${texto} · ${plan}` : texto);
  const verFormas = { texto: mercadoPago ? 'Ver formas de pago' : 'Ver cómo pagar', href: '/admin/plan/pagar', principal: false };
  const pagarAhora = { texto: 'Pagar ahora', href: '/admin/plan/pagar', principal: true };

  switch (cuenta.estado) {
    case 'PRUEBA': {
      const total = diasEntreAR(cuenta.alta, cuenta.pruebaHasta ?? hoy) + 1;
      const dia = Math.min(total, Math.max(1, diasEntreAR(cuenta.alta, hoy) + 1));
      const quedan = diasEntreAR(hoy, cuenta.pruebaHasta ?? hoy);
      return {
        acento: AMARILLO,
        Icono: Gift,
        pastilla: total === 7 ? 'Semana de prueba' : 'Prueba gratis',
        titulo: total === 7 ? 'Estás en tu semana de prueba' : 'Estás en tu prueba gratis',
        texto:
          quedan <= 0
            ? `Hoy es tu último día de prueba. Tu primer mes arranca mañana, ${fechaLarga(proximo)}.`
            : `Usá todo el sistema con tranquilidad: te ${quedan === 1 ? 'queda 1 día' : `quedan ${quedan} días`}. Tu primer mes recién arranca el ${fechaLarga(proximo)}.`,
        barra: {
          titulo: `Día ${dia} de ${total}`,
          fraccion: dia / total,
          desde: fechaLarga(cuenta.alta),
          hasta: fechaLarga(cuenta.pruebaHasta),
        },
        monto: cuenta.mensual
          ? { etiqueta: `Tu plan desde el ${fechaLarga(proximo)}`, valor: pesos(cuenta.mensual), sufijo: '/mes', detalle: plan }
          : undefined,
        boton: cuenta.mensual ? verFormas : undefined,
        nota: !cuenta.mensual
          ? 'Antes de que termine, elegimos juntos el plan que mejor te quede.'
          : debito
            ? `El ${fechaLarga(proximo)} se cobra solo de tu tarjeta, con el débito automático.`
            : mercadoPago
              ? 'Si querés, dejá el débito automático listo antes de que termine la prueba.'
              : 'Si querés, podés pagar antes de que termine la prueba.',
      };
    }
    case 'VENCIDA': {
      const monto = {
        etiqueta: atraso ? 'A pagar' : nuncaPago ? 'Tu primer mes' : 'Tu próximo mes',
        valor: pesos(aPagar),
        detalle: pendiente ? `Del ${fechaLarga(pendiente.desde)} al ${fechaLarga(pendiente.hasta)}` : plan,
      };
      if (!atraso)
        return {
          acento: AMARILLO,
          Icono: CalendarCheck,
          pastilla: nuncaPago ? 'Terminó la prueba' : 'Vence hoy',
          titulo: nuncaPago ? 'Terminó tu prueba gratis' : 'Hoy vence tu próximo mes',
          texto: debito
            ? `${nuncaPago ? 'Ojalá te haya servido. ' : ''}Hoy se cobra solo de tu tarjeta. Apenas MercadoPago nos confirme, tu cuenta queda al día.`
            : nuncaPago
              ? 'Ojalá te haya servido. Para seguir usando el sistema sin cortes, hoy vence tu primer mes.'
              : 'Para seguir sin cortes, hoy vence el próximo mes de tu plan.',
          barra: {
            titulo: debito
              ? `Si no se puede cobrar hoy, hay ${gracia} días de margen`
              : `Tenés ${gracia} días para pagarlo con calma`,
            fraccion: 0.04,
            desde: 'Hoy',
            hasta: fechaLarga(ultimoDia),
          },
          monto,
          boton: debito ? verFormas : pagarAhora,
          nota: debito ? 'No tenés que hacer nada.' : 'Apenas se acredita el pago, tu cuenta queda al día sola.',
        };
      return {
        acento: NARANJA,
        Icono: Clock,
        pastilla: 'Pago pendiente',
        titulo: 'Tenés un pago pendiente',
        texto: `${nuncaPago ? 'Tu primer mes' : 'Tu último mes'} venció el ${fechaLarga(proximo)}.${
          debito ? ' MercadoPago todavía no pudo cobrarlo de tu tarjeta y lo vuelve a intentar estos días.' : ''
        } ${
          cuenta.debeSuspenderse
            ? 'Ya pasaron los días de margen, así que la cuenta va a quedar en pausa hasta que se registre el pago.'
            : `Seguís trabajando normal hasta el ${fechaLarga(ultimoDia)}.`
        } ${debito ? 'Si preferís, podés pagarlo ahora.' : 'Si ya pagaste, en un rato lo vas a ver acá.'}`,
        barra: {
          titulo: `Pasaron ${Math.min(atraso, gracia)} de los ${gracia} días de margen`,
          fraccion: Math.min(1, atraso / gracia),
          desde: fechaLarga(proximo),
          hasta: fechaLarga(ultimoDia),
        },
        monto,
        boton: pagarAhora,
        nota: cuenta.debeSuspenderse
          ? 'Apenas se acredita el pago, todo sigue como siempre.'
          : `Si el ${fechaLarga(cuenta.suspendeEl)} todavía no está registrado, la cuenta queda en pausa hasta que se pague.`,
      };
    }
    case 'AL_DIA': {
      const pagado = cuenta.pagadoHasta ?? hoy;
      const inicio = sumarDiasAR(sumarMesesAR(pagado, -1), 1);
      const total = diasEntreAR(inicio, pagado) + 1;
      const transcurridos = Math.min(total, Math.max(0, diasEntreAR(inicio, hoy) + 1));
      const faltan = diasEntreAR(hoy, proximo ?? hoy);
      return {
        acento: VERDE,
        Icono: CheckCircle2,
        pastilla: 'Al día',
        titulo: 'Todo en orden',
        texto: debito
          ? `Tu plan está pago hasta el ${fechaLarga(cuenta.pagadoHasta)}. El ${fechaLarga(proximo)} se cobra solo de tu tarjeta, con el débito automático. Gracias por confiarnos tu playa.`
          : `Tu plan está pago hasta el ${fechaLarga(cuenta.pagadoHasta)}. Gracias por confiarnos tu playa.`,
        barra: {
          titulo: faltan <= 1 ? 'Mañana arranca tu próximo mes' : `Faltan ${faltan} días para tu próximo mes`,
          fraccion: transcurridos / total,
          desde: fechaLarga(inicio),
          hasta: fechaLarga(cuenta.pagadoHasta),
        },
        monto: {
          etiqueta: debito ? 'Próximo débito' : 'Tu próximo mes',
          valor: pesos(cuenta.mensual),
          detalle: conPlan(fechaLarga(proximo)),
        },
        boton: verFormas,
        nota: debito ? 'Se cobra solo: no tenés que hacer nada.' : 'Unos días antes te vamos a avisar acá.',
      };
    }
    case 'SUSPENDIDA':
      return cuenta.motivoSuspension === 'MANUAL'
        ? {
            acento: ROJO,
            Icono: PauseCircle,
            pastilla: 'En pausa',
            titulo: 'Tu cuenta está en pausa',
            texto: 'Por ahora solo se pueden cobrar las salidas y cerrar el turno. Escribinos y lo resolvemos juntos.',
          }
        : {
            acento: ROJO,
            Icono: PauseCircle,
            pastilla: 'En pausa',
            titulo: 'Tu cuenta está en pausa',
            texto:
              'Por ahora solo se pueden cobrar las salidas de los autos que quedaron adentro y cerrar el turno. Apenas se acredite el pago, vuelve todo a la normalidad.',
            monto: {
              etiqueta: 'Para volver a la normalidad',
              valor: pesos(aPagar),
              detalle: pendiente
                ? `${nuncaPago ? 'Primer mes' : 'Último mes'} · venció el ${fechaLarga(pendiente.desde)}`
                : plan,
            },
            boton: { texto: 'Pagar y reactivar', href: '/admin/plan/pagar', principal: true },
            nota: 'No perdés nada: tus tickets, tu caja y tus clientes siguen guardados.',
          };
    case 'BONIFICADA':
      return {
        acento: LAVANDA,
        Icono: CheckCircle2,
        pastilla: 'Bonificada',
        titulo: 'Tu cuenta está bonificada',
        texto: 'No tenés que pagar nada por el sistema. Que lo disfrutes.',
      };
    default:
      return {
        acento: GRIS,
        Icono: Sparkles,
        pastilla: 'Por arrancar',
        titulo: 'Tu cuenta está casi lista',
        texto: 'Apenas arranque tu prueba gratis o tu primer mes, vas a ver acá todo lo de tu plan.',
      };
  }
}

function Contenido({ plan }: { plan: MiPlan }) {
  const { cuenta } = plan;
  const grupos = agruparPlanes(plan.catalogo);
  const conPlan = plan.playas.filter((p) => p.plan);
  const variasPlayas = plan.playas.length > 1;
  const nombrePlan =
    conPlan.length === 1
      ? conPlan[0].plan!.plan.replace(/\s*\+.*$/, '')
      : conPlan.length
        ? `${conPlan.length} playas`
        : null;
  const r = relatoDe(cuenta, nombrePlan, plan.mercadoPago);
  const whatsapp = plan.contacto
    ? `https://wa.me/${plan.contacto.replace(/\D/g, '')}?text=${encodeURIComponent('Hola, te escribo por el plan del sistema de estacionamiento.')}`
    : null;
  const subtitulo = [
    plan.playas.length === 1 ? plan.playas[0].nombre : null,
    cuenta.estado !== 'SIN_ACTIVAR' ? `cliente desde el ${fechaLarga(cuenta.alta)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const conFormaDePago = !['BONIFICADA', 'SIN_ACTIVAR', 'BAJA'].includes(cuenta.estado);
  const modalidad = (cocheras: boolean) => (cocheras ? 'Con alquileres mensuales' : 'Solo tickets · rotación');
  const incluido = conPlan.some((p) => p.plan!.incluyeCocheras) ? [...INCLUIDO, INCLUIDO_COCHERAS] : INCLUIDO;

  return (
    <>
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="h-px w-6 bg-gm-yellow" />
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-gm-yellow">Mi plan</span>
        </div>
        <h1 className="m-0 font-display text-[36px] font-semibold uppercase leading-none tracking-[0.01em] text-[#F6F0E6] sm:text-[50px]">
          Tu plan
        </h1>
        {subtitulo && <p className="m-0 text-[15px] text-[#A79E8F]">{subtitulo}</p>}
      </header>

      <Estado r={r} />

      {cuenta.estado !== 'SIN_ACTIVAR' && (
        <div className="flex flex-wrap items-start gap-6">
          <section className={`flex min-w-0 flex-[1_1_560px] flex-col gap-6 p-[22px] sm:p-8 ${tarjeta}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="m-0 text-[21px] font-semibold text-[#F6F0E6]">{variasPlayas ? 'Tus planes' : 'Tu plan'}</h2>
              {!variasPlayas && conPlan[0] && <Modalidad texto={modalidad(conPlan[0].plan!.incluyeCocheras)} />}
            </div>
            {plan.playas.map((p) => (
              <div key={p.playaId} className="flex flex-col gap-3">
                {variasPlayas && (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-[14.5px] font-semibold text-[#C9BFB1]">{p.nombre}</span>
                    {p.plan && <Modalidad texto={modalidad(p.plan.incluyeCocheras)} />}
                  </div>
                )}
                <div className="pt-3">
                  <TarjetasPlan
                    grupos={grupos}
                    actual={p.plan?.planId ?? null}
                    precioActual={p.plan?.precio ?? null}
                    etiquetaActual="Tu plan"
                    variante={p.plan ? (p.plan.incluyeCocheras ? 'alquileres' : 'base') : undefined}
                    etiquetaPrecio={(precio) => `Vos pagás ${precio}/mes`}
                  />
                </div>
              </div>
            ))}
            <div className="flex flex-col gap-4 border-t border-[#2B2620] pt-[22px]">
              <div className={rotulo}>Incluido en tu plan</div>
              <ul className="m-0 grid list-none gap-x-7 gap-y-3 p-0 [grid-template-columns:repeat(auto-fit,minmax(230px,1fr))]">
                {incluido.map((texto) => (
                  <li key={texto} className="flex items-start gap-2.5 text-[14.5px] leading-snug text-[#D9D0C2]">
                    <Check aria-hidden className="mt-px size-[18px] shrink-0 text-gm-yellow" strokeWidth={2.2} />
                    {texto}
                  </li>
                ))}
              </ul>
            </div>
            <p className="m-0 border-t border-[#2B2620] pt-[18px] text-[14.5px] text-[#A79E8F]">
              ¿Tu playa creció?{' '}
              {whatsapp ? (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-gm-yellow hover:text-[#FFD84D]"
                >
                  Escribinos y lo vemos juntos
                </a>
              ) : (
                'Escribinos y lo vemos juntos'
              )}
              .
            </p>
          </section>

          {conFormaDePago && (
            <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-6 lg:max-w-[340px]">
              <FormaDePago plan={plan} whatsapp={whatsapp} />
            </aside>
          )}
        </div>
      )}

      <Pagos facturas={plan.facturas} />
    </>
  );
}

function Modalidad({ texto }: { texto: string }) {
  return (
    <span className="rounded-full border border-[#3A342B] px-3 py-1.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#C9BFB1]">
      {texto}
    </span>
  );
}

// Arriba: en qué está la cuenta (con una barra de cuánto falta) y, al costado, lo que se paga y cuándo.
function Estado({ r }: { r: Relato }) {
  const suave = `${r.acento}24`;
  return (
    <section className={`flex flex-wrap gap-7 p-[22px] sm:p-9 ${tarjeta}`}>
      <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-[22px]">
        <div className="flex items-center gap-3">
          <span
            className="flex size-[46px] shrink-0 items-center justify-center rounded-[14px]"
            style={{ background: suave, color: r.acento }}
          >
            <r.Icono aria-hidden className="size-[22px]" strokeWidth={1.8} />
          </span>
          <span
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-semibold"
            style={{ background: suave, color: r.acento }}
          >
            <span aria-hidden className="size-1.5 rounded-full" style={{ background: r.acento }} />
            {r.pastilla}
          </span>
        </div>
        <div className="flex flex-col gap-2.5">
          <h2 className="m-0 text-[27px] font-semibold leading-[1.12] tracking-[-0.01em] text-[#F6F0E6] sm:text-[36px]">
            {r.titulo}
          </h2>
          <p className="m-0 max-w-[580px] text-base leading-relaxed text-[#BDB4A6]">{r.texto}</p>
        </div>
        {r.barra && (
          <div className="flex max-w-[540px] flex-col gap-2.5">
            <div className="text-sm font-semibold text-[#E3DBCE]">{r.barra.titulo}</div>
            <div
              className="h-2 overflow-hidden rounded-full bg-[#2B2620]"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(r.barra.fraccion * 100)}
              aria-label={r.barra.titulo}
            >
              <div
                className="h-2 rounded-full"
                style={{ width: `${Math.max(3, r.barra.fraccion * 100)}%`, background: r.acento }}
              />
            </div>
            <div className="flex justify-between gap-3 text-[12.5px] text-[#8F8676]">
              <span>{r.barra.desde}</span>
              <span>{r.barra.hasta}</span>
            </div>
          </div>
        )}
      </div>

      {(r.monto || r.boton) && (
        <div className="flex min-w-0 flex-[1_1_300px] flex-col justify-between gap-6 rounded-[18px] border border-[#2E2A23] bg-[#15120E] p-[26px] lg:max-w-[360px]">
          {r.monto && (
            <div className="flex flex-col gap-2">
              <div className={rotulo}>{r.monto.etiqueta}</div>
              <div
                className="font-mono text-[38px] font-bold leading-none tracking-[-0.02em] sm:text-[46px]"
                style={{ color: r.boton?.principal ? AMARILLO : '#F6F0E6' }}
              >
                {r.monto.valor}
                {r.monto.sufijo && <span className="ml-1 text-sm font-medium text-[#8F8676]">{r.monto.sufijo}</span>}
              </div>
              {r.monto.detalle && <div className="text-sm text-[#A79E8F]">{r.monto.detalle}</div>}
            </div>
          )}
          <div className="flex flex-col gap-3">
            {r.boton && (
              <Link
                href={r.boton.href}
                className={
                  r.boton.principal
                    ? 'flex h-[50px] items-center justify-center rounded-[14px] bg-gm-yellow text-[15px] font-bold text-gm-ink transition-colors hover:bg-[#FFD23A]'
                    : 'flex h-[50px] items-center justify-center rounded-[14px] border border-[#3A342B] text-[15px] font-semibold text-[#F6F0E6] transition-colors hover:bg-white/[0.04]'
                }
              >
                {r.boton.texto}
              </Link>
            )}
            {r.nota && <p className="m-0 text-[13px] leading-relaxed text-[#8F8676]">{r.nota}</p>}
          </div>
        </div>
      )}
    </section>
  );
}

// La forma de pago: el débito automático (activo, a medio activar, en pausa o sin activar) o, si la
// plataforma no cobra con MercadoPago, la transferencia.
function FormaDePago({ plan, whatsapp }: { plan: MiPlan; whatsapp: string | null }) {
  const { cuenta } = plan;
  const debito = cuenta.debito;
  const caja = `flex flex-col gap-[18px] p-[26px] ${tarjeta}`;
  const texto = 'm-0 text-[13.5px] leading-relaxed text-[#A79E8F]';

  if (!plan.mercadoPago)
    return (
      <section id="como-pagar" className={`scroll-mt-24 ${caja}`}>
        <h2 className="m-0 text-[19px] font-semibold text-[#F6F0E6]">Cómo pagar</h2>
        {plan.comoPagar ? (
          <>
            <p className={texto}>
              Transferí con estos datos y avisanos. Apenas nos llega, lo anotamos y tu cuenta queda al día en el momento.
            </p>
            <p className="m-0 whitespace-pre-line rounded-xl border border-[#2E2A23] bg-[#14110D] p-4 font-mono text-[13px] leading-relaxed text-[#E3DBCE]">
              {plan.comoPagar}
            </p>
          </>
        ) : (
          <p className={texto}>
            Por ahora el pago es por transferencia. Escribinos por WhatsApp, te pasamos los datos y, apenas nos llega, lo
            anotamos. Tu cuenta queda al día en el momento.
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
    );

  if (debito?.estado === 'authorized')
    return (
      <section className={caja}>
        <h2 className="m-0 text-[19px] font-semibold text-[#F6F0E6]">Forma de pago</h2>
        <div className="flex flex-col gap-4 rounded-2xl border border-[#2E2A23] bg-[#15120E] p-[18px]">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#4ADE9B1f] text-[#4ADE9B]">
              <RefreshCw aria-hidden className="size-[19px]" strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold text-[#F6F0E6]">Débito automático</div>
              <div className="text-[13px] text-[#8F8676]">Con tu tarjeta, por MercadoPago</div>
            </div>
            <span className="rounded-full bg-[#4ADE9B24] px-2.5 py-1 text-xs font-semibold text-[#4ADE9B]">Activo</span>
          </div>
          <dl className="m-0 flex flex-col gap-2.5 border-t border-[#2B2620] pt-3.5 text-sm">
            {cuenta.proximoVencimiento && (
              <div className="flex justify-between gap-3">
                <dt className="text-[#8F8676]">Próximo débito</dt>
                <dd className="m-0 text-right font-semibold text-[#F6F0E6]">{fechaLarga(cuenta.proximoVencimiento)}</dd>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <dt className="text-[#8F8676]">Importe</dt>
              <dd className="m-0 text-right font-mono font-bold text-[#F6F0E6]">{pesos(cuenta.mensual)}</dd>
            </div>
            {debito.email && (
              <div className="flex justify-between gap-3">
                <dt className="shrink-0 text-[#8F8676]">Avisos a</dt>
                <dd className="m-0 min-w-0 truncate text-right text-[#E3DBCE]">{debito.email}</dd>
              </div>
            )}
          </dl>
        </div>
        <p className={texto}>MercadoPago lo cobra el día que vence. Si un mes no puede, lo vuelve a intentar durante unos días.</p>
        <Link
          href="/admin/plan/pagar"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-gm-yellow hover:text-[#FFD84D]"
        >
          Administrar el débito
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      </section>
    );

  const info =
    debito?.estado === 'pending'
      ? {
          titulo: 'Débito automático',
          sub: 'Falta confirmar la tarjeta',
          texto: 'Te quedó a medio activar. Terminalo y el plan se cobra solo, el día que vence.',
          boton: 'Terminar de activarlo',
        }
      : debito?.estado === 'paused'
        ? {
            titulo: 'Débito en pausa',
            sub: 'Lo pausaste desde MercadoPago',
            texto: 'Mientras esté en pausa, el plan se paga desde acá. Lo podés volver a activar cuando quieras.',
            boton: 'Volver a activarlo',
          }
        : {
            titulo: 'Sin débito automático',
            sub: 'Pagás cada mes desde acá',
            texto: plan.mercadoPagoClavePublica
              ? 'Activalo y el plan se cobra solo de tu tarjeta, el día que vence. No hace falta tener cuenta de MercadoPago.'
              : 'Activalo y el plan se cobra solo de tu tarjeta, el día que vence.',
            boton: 'Activar débito automático',
          };

  return (
    <section className={caja}>
      <h2 className="m-0 text-[19px] font-semibold text-[#F6F0E6]">Forma de pago</h2>
      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-[#3A342B] p-[18px]">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#F5C2191f] text-gm-yellow">
          <CreditCard aria-hidden className="size-[19px]" strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-[#F6F0E6]">{info.titulo}</div>
          <div className="text-[13px] text-[#8F8676]">{info.sub}</div>
        </div>
      </div>
      <p className={texto}>{info.texto}</p>
      <Link
        href="/admin/plan/pagar"
        className="flex h-[46px] items-center justify-center rounded-[13px] border border-[#3A342B] text-[14.5px] font-semibold text-[#F6F0E6] transition-colors hover:bg-white/[0.04]"
      >
        {info.boton}
      </Link>
    </section>
  );
}

// Los pagos como una lista de períodos: qué cubrió, cuándo y cómo se pagó, y en qué está.
function Pagos({ facturas }: { facturas: FacturaSaas[] }) {
  const hoy = hoyAR();
  return (
    <section className={`flex flex-col p-[22px] sm:p-8 ${tarjeta}`}>
      <h2 className="m-0 mb-2 text-[21px] font-semibold text-[#F6F0E6]">Tus pagos</h2>
      {!facturas.length ? (
        <p className="m-0 border-t border-[#2B2620] pb-1 pt-[18px] text-[15px] leading-relaxed text-[#A79E8F]">
          Todavía no hay pagos. Cada mes que pagues va a aparecer acá.
        </p>
      ) : (
        <ul className="m-0 list-none p-0">
          {facturas.map((f) => {
            const pendiente = f.estado === 'PENDIENTE';
            const anulado = f.estado === 'ANULADA';
            const vencido = pendiente && f.desde < hoy;
            const color = pendiente ? (vencido ? NARANJA : AMARILLO) : anulado ? GRIS : VERDE;
            const estado = pendiente ? (vencido ? 'Vencido' : 'Pendiente') : anulado ? 'Anulado' : 'Pagado';
            const detalle = pendiente
              ? f.desde > hoy
                ? `Vence el ${fechaLarga(f.desde)}`
                : f.desde === hoy
                  ? 'Vence hoy'
                  : `Venció el ${fechaLarga(f.desde)}`
              : anulado
                ? 'Pago anulado'
                : `Pagado el ${fechaLarga(f.pagadaEl)}${f.medio ? ` · ${MEDIOS_PAGO[f.medio]}` : ''}`;
            return (
              <li
                key={f.id}
                className={`flex flex-wrap items-center justify-between gap-x-5 gap-y-3 border-t border-[#2B2620] py-[18px] ${anulado ? 'opacity-60' : ''}`}
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <span className="flex size-[42px] shrink-0 items-center justify-center rounded-xl border border-[#2E2A23] bg-[#15120E] text-[#A79E8F]">
                    <Receipt aria-hidden className="size-[18px]" strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold text-[#F6F0E6]">
                      {diaMesCorto(f.desde)} – {diaMesCorto(f.hasta)}
                      {f.meses > 1 && <span className="font-normal text-[#8F8676]"> · {f.meses} meses</span>}
                    </div>
                    <div className="mt-0.5 text-[13px]" style={{ color: pendiente ? color : '#8F8676' }}>
                      {detalle}
                    </div>
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-4">
                  <span
                    className="rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{ background: `${color}1f`, color }}
                  >
                    {estado}
                  </span>
                  <span
                    className={`min-w-[92px] text-right font-mono text-base font-bold text-[#F6F0E6] ${anulado ? 'line-through' : ''}`}
                  >
                    {pesos(f.importe)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
