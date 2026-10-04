'use client';
import LatticeLoader from '@/components/ui/lattice-loader';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
  Info,
  Lock,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  activarDebitoAction,
  desactivarDebitoAction,
  pagarConMercadoPagoAction,
  verificarPagosAction,
} from '@/actions/suscripciones/suscripciones.action';
import { fechaLarga, pesos } from '@/components/plataforma/cuenta';
import type { ResumenCuenta } from '@/types/suscripcion.type';
import { FormularioTarjeta } from './formulario-tarjeta';

const VERDE = '#4ADE9B';
const AMARILLO = '#F5C219';

const botonPrincipal =
  'inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] bg-gm-yellow px-5 text-[15.5px] font-bold text-gm-ink transition-colors hover:bg-[#FFD23A] disabled:cursor-wait disabled:opacity-70';
const botonSecundario =
  'inline-flex h-[46px] items-center justify-center gap-2 rounded-[13px] border border-[#3A342B] px-4 text-[14.5px] font-semibold text-[#F6F0E6] transition-colors hover:bg-white/[0.04] disabled:cursor-wait disabled:opacity-60';
const enlaceDiscreto =
  'w-fit text-[13.5px] font-semibold text-[#A79E8F] underline-offset-4 hover:text-[#F6F0E6] hover:underline';

function MensajeError({ texto }: { texto: string | null }) {
  if (!texto) return null;
  return (
    <p role="alert" className="m-0 text-[13.5px] leading-relaxed text-[#FF8A8D]">
      {texto}
    </p>
  );
}

/**
 * Las formas de pago de la plataforma, como opciones para elegir: débito automático (recomendado)
 * y pagar una vez con MercadoPago. La plata nunca pasa por acá: el formulario de tarjeta y el link
 * son de MercadoPago, y el pago se asienta solo cuando MercadoPago avisa (o al volver de pagar).
 */
export function FormasDePago({
  cuenta,
  importe,
  debe,
  email,
  clavePublica,
}: {
  cuenta: ResumenCuenta;
  // Lo que se paga ahora: lo pendiente o, si está al día, el mes que viene.
  importe: number;
  // Tiene algo vencido sin pagar: el débito recién se puede activar después.
  debe: boolean;
  // El email de la sesión: a donde MercadoPago manda los avisos de cada cobro.
  email: string;
  // Con la clave pública, el débito se activa cargando la tarjeta acá (sin cuenta de MercadoPago).
  clavePublica: string | null;
}) {
  const debitoActivo = cuenta.debito?.estado === 'authorized';
  // Con el débito activo o algo vencido queda una sola opción para elegir: pagar una vez.
  const soloPagar = debe || debitoActivo;
  const [metodo, setMetodo] = useState<'debito' | 'unaVez'>(soloPagar ? 'unaVez' : 'debito');
  // Con débito activo y nada vencido no hace falta pagar a mano: se cobra solo.
  const ofrecerPago = importe > 0 && (debe || !debitoActivo);

  return (
    <section className="flex min-w-0 flex-[3_1_480px] flex-col gap-3.5">
      <h2 className="m-0 mb-1 text-xl font-semibold text-[#F6F0E6]">
        {debitoActivo && !debe ? 'Tu forma de pago' : 'Elegí cómo pagar'}
      </h2>

      {debitoActivo ? (
        <DebitoActivo cuenta={cuenta} debe={debe} />
      ) : debe ? (
        <div className="flex items-start gap-4 rounded-[20px] border border-dashed border-[#3A342B] bg-[#15120E] px-[22px] py-5">
          <span aria-hidden className="mt-px size-[22px] shrink-0 rounded-full border-2 border-[#3A342B]" />
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-[16.5px] font-semibold text-[#A79E8F]">Débito automático</span>
            <span className="text-sm leading-normal text-[#8F8676]">
              Lo activás apenas pagues lo pendiente, y arranca con el mes que sigue.
            </span>
          </span>
          <Lock aria-hidden className="mt-0.5 size-[18px] shrink-0 text-[#6E6457]" strokeWidth={1.9} />
        </div>
      ) : (
        <Opcion
          activa={metodo === 'debito'}
          onElegir={() => setMetodo('debito')}
          titulo="Débito automático"
          etiqueta="Recomendado"
          descripcion="Se cobra solo de tu tarjeta, el día que vence. Lo das de baja cuando quieras."
          Icono={RefreshCw}
        >
          <ActivarDebito cuenta={cuenta} email={email} clavePublica={clavePublica} />
        </Opcion>
      )}

      {ofrecerPago && (
        <Opcion
          activa={soloPagar || metodo === 'unaVez'}
          onElegir={() => setMetodo('unaVez')}
          titulo="Pagar una vez con MercadoPago"
          descripcion="Con tarjeta, dinero en tu cuenta o en efectivo en un local."
          Icono={Wallet}
        >
          <PagarUnaVez importe={importe} debe={debe} />
        </Opcion>
      )}
    </section>
  );
}

// Una forma de pago para elegir: el encabezado se toca para abrirla y adentro va lo suyo.
function Opcion({
  activa,
  onElegir,
  titulo,
  etiqueta,
  descripcion,
  Icono,
  children,
}: {
  activa: boolean;
  onElegir: () => void;
  titulo: string;
  etiqueta?: string;
  descripcion: string;
  Icono: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div
      className="overflow-hidden rounded-[20px] border transition-colors"
      style={{ borderColor: activa ? AMARILLO : '#2E2A23', background: activa ? '#1E1A14' : '#1B1915' }}
    >
      <button
        type="button"
        onClick={onElegir}
        aria-expanded={activa}
        className="flex w-full items-start gap-4 px-[22px] py-5 text-left"
      >
        <span
          aria-hidden
          className="mt-px flex size-[22px] shrink-0 items-center justify-center rounded-full border-2"
          style={{ borderColor: activa ? AMARILLO : '#53493C' }}
        >
          {activa && <span className="size-2.5 rounded-full bg-gm-yellow" />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2.5">
            <span className="text-[16.5px] font-semibold text-[#F6F0E6]">{titulo}</span>
            {etiqueta && (
              <span className="rounded-full bg-[#F5C21924] px-2 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.1em] text-gm-yellow">
                {etiqueta}
              </span>
            )}
          </span>
          <span className="text-sm leading-normal text-[#A79E8F]">{descripcion}</span>
        </span>
        <Icono aria-hidden className="mt-0.5 size-5 shrink-0 text-[#8F8676]" strokeWidth={1.8} />
      </button>
      {activa && children}
    </div>
  );
}

function PagarUnaVez({ importe, debe }: { importe: number; debe: boolean }) {
  const [abriendo, setAbriendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pagar = async () => {
    setAbriendo(true);
    setError(null);
    const { data, error } = await pagarConMercadoPagoAction();
    if (!data) {
      setError(error ?? 'No pudimos armar el link de pago. Probá de nuevo en un momento.');
      setAbriendo(false);
      return;
    }
    // Se queda "abriendo" hasta que el navegador cambie de página.
    window.location.href = data.url;
  };

  return (
    <div className="flex flex-col gap-4 px-[22px] pb-[22px] sm:pl-[60px]">
      <p className="m-0 text-[14.5px] leading-relaxed text-[#BDB4A6]">
        Te llevamos a MercadoPago para pagar {pesos(importe)}. Apenas se acredita, tu cuenta queda al día sola: no hace
        falta que nos avises.
      </p>
      <button type="button" onClick={pagar} disabled={abriendo} className={botonPrincipal}>
        {abriendo ? (
          <>
            <LatticeLoader compact label="Procesando…" showTimer={false} cellSize={4} gap={1} />
            Abriendo MercadoPago…
          </>
        ) : (
          <>
            {debe ? `Pagar ${pesos(importe)}` : `Adelantar ${pesos(importe)}`}
            <ArrowRight aria-hidden className="size-4" />
          </>
        )}
      </button>
      <MensajeError texto={error} />
    </div>
  );
}

// Lo de adentro de «Débito automático» cuando todavía no está activo.
function ActivarDebito({
  cuenta,
  email,
  clavePublica,
}: {
  cuenta: ResumenCuenta;
  email: string;
  clavePublica: string | null;
}) {
  const router = useRouter();
  const debito = cuenta.debito;
  const [cambiarEmail, setCambiarEmail] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mail, setMail] = useState(debito?.email ?? email);
  const primerDebito = cuenta.proximoVencimiento ? fechaLarga(cuenta.proximoVencimiento) : null;

  // Con la tarjeta del formulario de MercadoPago: queda activo en el acto.
  const activarConTarjeta = async (token: string, mailTarjeta: string) => {
    setError(null);
    const { data, error } = await activarDebitoAction(mailTarjeta.trim() || email, token);
    if (!data) {
      setError(error ?? 'No pudimos activar el débito automático. Probá de nuevo en un momento.');
      return false;
    }
    toast.success('¡Listo! Activaste el débito automático.');
    router.refresh();
    return true;
  };

  // Sin la clave pública: se confirma en MercadoPago, con la cuenta de ese email.
  const activarEnMercadoPago = async (e: React.FormEvent) => {
    e.preventDefault();
    setOcupado(true);
    setError(null);
    const { data, error } = await activarDebitoAction(mail.trim());
    if (!data) {
      setError(error ?? 'No pudimos activar el débito automático. Probá de nuevo en un momento.');
      setOcupado(false);
      return;
    }
    if (data.url) window.location.href = data.url;
    else router.refresh();
  };

  const aviso =
    debito?.estado === 'paused'
      ? 'Lo pausaste desde MercadoPago. Cargá la tarjeta de nuevo para volver a activarlo.'
      : debito?.estado === 'pending'
        ? 'Te quedó a medio activar: falta confirmar la tarjeta.'
        : null;

  if (clavePublica)
    return (
      <div className="flex flex-col gap-4 px-[22px] pb-[22px]">
        {aviso && <p className="m-0 text-sm leading-relaxed text-[#E3DBCE]">{aviso}</p>}
        <div className="overflow-hidden rounded-2xl border border-[#2E2A23] bg-[#14110D]">
          <FormularioTarjeta
            clavePublica={clavePublica}
            importe={cuenta.importePeriodo}
            email={email}
            alConfirmar={activarConTarjeta}
          />
        </div>
        <MensajeError texto={error} />
        <p className="m-0 flex gap-2.5 text-[13px] leading-relaxed text-[#8F8676]">
          <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={1.9} />
          <span>
            Los datos de tu tarjeta los recibe MercadoPago directamente: nosotros no los vemos. No hace falta tener cuenta
            de MercadoPago.{primerDebito && ` El primer débito es el ${primerDebito};`} MercadoPago puede hacer un cobro
            mínimo para validar la tarjeta, que después devuelve.
          </span>
        </p>
      </div>
    );

  if (debito?.estado === 'pending' && debito.url && !cambiarEmail)
    return (
      <div className="flex flex-col gap-3.5 px-[22px] pb-[22px] sm:pl-[60px]">
        <p className="m-0 text-[14.5px] leading-relaxed text-[#BDB4A6]">
          Ya casi está. Falta un paso: entrá a MercadoPago y confirmalo con tu tarjeta.
          {debito.email && (
            <>
              {' '}
              Lo pediste con <span className="text-[#E3DBCE]">{debito.email}</span>.
            </>
          )}
        </p>
        <a href={debito.url} className={botonPrincipal}>
          <CreditCard aria-hidden className="size-4" />
          Continuar en MercadoPago
        </a>
        <button type="button" onClick={() => setCambiarEmail(true)} className={enlaceDiscreto}>
          Usar otra cuenta de MercadoPago
        </button>
      </div>
    );

  return (
    <form onSubmit={activarEnMercadoPago} className="flex flex-col gap-3.5 px-[22px] pb-[22px] sm:pl-[60px]">
      {aviso && <p className="m-0 text-sm leading-relaxed text-[#E3DBCE]">{aviso}</p>}
      <label className="flex flex-col gap-2">
        <span className="text-[13.5px] font-semibold text-[#E3DBCE]">Email de tu cuenta de MercadoPago</span>
        <input
          type="email"
          required
          value={mail}
          onChange={(e) => setMail(e.target.value)}
          autoComplete="email"
          className="h-[46px] w-full rounded-[12px] border border-[#3A342B] bg-[#14110D] px-3.5 text-[15px] text-[#F6F0E6] placeholder:text-[#6E6457] focus:border-gm-yellow focus:outline-none"
        />
      </label>
      <button type="submit" disabled={ocupado} className={botonPrincipal}>
        {ocupado ? (
          <>
            <LatticeLoader compact label="Procesando…" showTimer={false} cellSize={4} gap={1} />
            Abriendo MercadoPago…
          </>
        ) : (
          'Activar débito automático'
        )}
      </button>
      <MensajeError texto={error} />
      <p className="m-0 text-[13px] leading-relaxed text-[#8F8676]">
        Te llevamos a MercadoPago para que lo confirmes con tu tarjeta.
        {primerDebito && ` El primer débito es el ${primerDebito}.`}
      </p>
    </form>
  );
}

// El débito automático ya activo: cuándo cobra, cuánto, a dónde avisa, y darlo de baja.
function DebitoActivo({ cuenta, debe }: { cuenta: ResumenCuenta; debe: boolean }) {
  const router = useRouter();
  const debito = cuenta.debito;
  const [confirmarBaja, setConfirmarBaja] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const darDeBaja = async () => {
    setOcupado(true);
    setError(null);
    const { error } = await desactivarDebitoAction();
    setOcupado(false);
    if (error) {
      setError(error);
      return;
    }
    setConfirmarBaja(false);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4 rounded-[20px] border border-[#2E2A23] bg-[#1B1915] p-[22px]">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[#4ADE9B1f] text-[#4ADE9B]">
          <RefreshCw aria-hidden className="size-5" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[16.5px] font-semibold text-[#F6F0E6]">Débito automático</div>
          <div className="text-[13px] text-[#8F8676]">Con tu tarjeta, por MercadoPago</div>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ background: `${VERDE}24`, color: VERDE }}
        >
          <span aria-hidden className="size-1.5 rounded-full" style={{ background: VERDE }} />
          Activo
        </span>
      </div>
      <p className="m-0 text-[15px] leading-relaxed text-[#BDB4A6]">
        {cuenta.periodo.meses === 1 ? 'Cada mes' : cuenta.periodo.meses === 12 ? 'Cada año' : `Cada ${cuenta.periodo.meses} meses`}, el día
        que vence, se cobra solo de tu tarjeta. No tenés que hacer nada.
      </p>
      <dl className="m-0 grid gap-2.5 rounded-xl border border-[#2E2A23] bg-[#14110D] p-4 text-sm">
        {cuenta.proximoVencimiento && (
          <div className="flex justify-between gap-3">
            <dt className="text-[#A79E8F]">Próximo débito</dt>
            <dd className="m-0 text-right font-semibold text-[#F6F0E6]">
              {fechaLarga(cuenta.proximoVencimiento)} · <span className="font-mono">{pesos(cuenta.importePeriodo)}</span>
            </dd>
          </div>
        )}
        {debito?.email && (
          <div className="flex justify-between gap-3">
            <dt className="shrink-0 text-[#A79E8F]">Avisos de cada cobro a</dt>
            <dd className="m-0 min-w-0 truncate text-right text-[#E3DBCE]">{debito.email}</dd>
          </div>
        )}
      </dl>
      {debe && (
        <p className="m-0 text-[13.5px] leading-relaxed text-[#BDB4A6]">
          MercadoPago todavía no pudo cobrar este mes y lo va a volver a intentar estos días. Si preferís, podés pagarlo
          ahora y listo.
        </p>
      )}
      {confirmarBaja ? (
        <div className="flex flex-col gap-3 rounded-xl border border-[#3A342B] p-4">
          <p className="m-0 text-sm leading-relaxed text-[#E3DBCE]">
            ¿Lo damos de baja? Desde el próximo mes vas a tener que pagar desde acá.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={darDeBaja} disabled={ocupado} className={botonSecundario}>
              {ocupado && <LatticeLoader compact label="Procesando…" showTimer={false} cellSize={4} gap={1} />}
              Sí, darlo de baja
            </button>
            <button
              type="button"
              onClick={() => setConfirmarBaja(false)}
              disabled={ocupado}
              className="h-[46px] px-3 text-[14.5px] font-semibold text-[#A79E8F] hover:text-[#F6F0E6]"
            >
              Mejor no
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirmarBaja(true)} className={enlaceDiscreto}>
          Dar de baja el débito automático
        </button>
      )}
      <MensajeError texto={error} />
    </div>
  );
}

type Vuelta = 'verificando' | 'listo' | 'demora' | 'pendiente' | 'sin-pagar';

// Cuántas veces se pregunta al volver, y cada cuánto. El pago con tarjeta se aprueba al instante;
// el aviso de MercadoPago a veces tarda unos segundos más que el cliente en volver.
const INTENTOS = 5;
const ESPERA_MS = 2500;

/**
 * El cliente vuelve de MercadoPago a esta pantalla (?mp=pago o ?mp=debito). Se le pregunta a
 * MercadoPago por los pagos de la empresa hasta ver el pago (por su id) o el débito activo, y se
 * recarga la pantalla con lo nuevo. `estado` es el que MercadoPago agrega a la dirección de vuelta:
 * solo sirve para elegir el mensaje, lo que vale es lo que responde el servidor.
 */
export function VueltaDeMercadoPago({
  motivo,
  estado,
  pagoId,
}: {
  motivo: 'pago' | 'debito';
  estado: string | null;
  pagoId: string | null;
}) {
  const router = useRouter();
  const pagoSinTerminar = motivo === 'pago' && estado !== 'approved';
  const [vuelta, setVuelta] = useState<Vuelta>(
    pagoSinTerminar ? (estado === 'pending' || estado === 'in_process' ? 'pendiente' : 'sin-pagar') : 'verificando',
  );
  useEffect(() => {
    if (pagoSinTerminar) return;
    // Si React lo monta dos veces (modo estricto), la primera vuelta se cancela y sigue la segunda;
    // verificar dos veces no asienta nada dos veces.
    let cancelado = false;
    (async () => {
      for (let i = 0; i < INTENTOS && !cancelado; i++) {
        if (i) await new Promise((r) => setTimeout(r, ESPERA_MS));
        const { data } = await verificarPagosAction();
        const listo =
          motivo === 'debito'
            ? data?.debito === 'authorized'
            : !!data && (pagoId ? data.pagos.includes(pagoId) : data.acreditados > 0);
        if (listo) {
          if (!cancelado) {
            setVuelta('listo');
            router.refresh();
          }
          return;
        }
      }
      if (!cancelado) setVuelta('demora');
    })();
    return () => {
      cancelado = true;
    };
  }, [motivo, pagoId, pagoSinTerminar, router]);

  const mensajes: Record<Vuelta, { color: string; titulo: string; texto: string }> = {
    verificando: {
      color: AMARILLO,
      titulo: motivo === 'debito' ? 'Estamos confirmando tu débito automático…' : 'Estamos confirmando tu pago…',
      texto: 'Es un momento. No hace falta que hagas nada.',
    },
    listo: {
      color: VERDE,
      titulo: motivo === 'debito' ? '¡Listo! Activaste el débito automático' : '¡Listo! Recibimos tu pago',
      texto:
        motivo === 'debito'
          ? 'Desde ahora el plan se cobra solo, el día que vence. Gracias.'
          : 'Tu cuenta ya está al día. Gracias por confiarnos tu playa.',
    },
    demora: {
      color: AMARILLO,
      titulo:
        motivo === 'debito' ? 'MercadoPago todavía no nos confirmó el débito' : 'MercadoPago todavía no nos confirmó el pago',
      texto:
        motivo === 'debito'
          ? 'Si ya cargaste tu tarjeta, en unos minutos lo vas a ver activo acá. No hace falta que lo hagas de nuevo.'
          : 'Si ya pagaste, en unos minutos lo vas a ver acá. No hace falta que pagues de nuevo.',
    },
    pendiente: {
      color: AMARILLO,
      titulo: 'Tu pago quedó pendiente en MercadoPago',
      texto:
        'Si elegiste pagar en efectivo, se acredita cuando lo pagues en el local. Apenas pase, tu cuenta se actualiza sola.',
    },
    'sin-pagar': {
      color: '#A79E8F',
      titulo: 'El pago no se completó',
      texto: 'No se te cobró nada. Podés intentarlo de nuevo cuando quieras.',
    },
  };
  const m = mensajes[vuelta];

  return (
    <div
      role="status"
      className="flex gap-3.5 rounded-[18px] border p-5"
      style={{ borderColor: `${m.color}55`, background: `${m.color}12` }}
    >
      <span className="mt-0.5 shrink-0" style={{ color: m.color }}>
        {vuelta === 'verificando' ? (
          <LatticeLoader compact label="Procesando…" showTimer={false} cellSize={4} gap={1} />
        ) : vuelta === 'listo' ? (
          <CheckCircle2 aria-hidden className="size-5" />
        ) : vuelta === 'sin-pagar' ? (
          <Info aria-hidden className="size-5" />
        ) : (
          <Clock aria-hidden className="size-5" />
        )}
      </span>
      <div className="min-w-0">
        <p className="m-0 text-[15.5px] font-semibold text-[#F6F0E6]">{m.titulo}</p>
        <p className="m-0 mt-1 text-[14px] leading-relaxed text-[#BDB4A6]">{m.texto}</p>
      </div>
    </div>
  );
}
