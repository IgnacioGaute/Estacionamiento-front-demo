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
  QrCode,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  activarDebitoAction,
  desactivarDebitoAction,
  pagarConMercadoPagoAction,
  pagarConQrAction,
  verificarPagosAction,
  verificarQrAction,
} from '@/actions/suscripciones/suscripciones.action';
import { fechaLarga, pesos } from '@/components/plataforma/cuenta';
import type { QrDelPlan, ResumenCuenta } from '@/types/suscripcion.type';
import { QRCodeSVG } from 'qrcode.react';
import { FormularioTarjeta } from './formulario-tarjeta';
import { tinte } from '@/lib/utils';

// Los colores de estado del sistema. Para teñir, tinte(): pegarle «24» al final solo sirve con hex.
const VERDE = 'hsl(var(--gm-ok))';
const AMARILLO = 'hsl(var(--gm-yellow))';

const botonPrincipal =
  'inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] bg-gm-yellow px-5 text-[16px] font-bold text-gm-ink transition-colors hover:bg-gm-yellow-deep disabled:cursor-wait disabled:opacity-70';
const botonSecundario =
  'inline-flex h-[46px] items-center justify-center gap-2 rounded-[13px] border border-gm-line-strong px-4 text-[15px] font-semibold text-foreground transition-colors hover:bg-white/[0.04] disabled:cursor-wait disabled:opacity-60';
const enlaceDiscreto =
  'w-fit text-[14px] font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline';

function MensajeError({ texto }: { texto: string | null }) {
  if (!texto) return null;
  return (
    <p role="alert" className="m-0 text-[14px] leading-relaxed text-gm-peligro">
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
  qr,
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
  // La plataforma tiene su caja de MercadoPago: se puede pagar con QR desde cualquier banco.
  qr: boolean;
}) {
  const debitoActivo = cuenta.debito?.estado === 'authorized';
  // El débito cobra siempre lo mismo el día 1: se activa después del primer pago, que es
  // proporcional (lo que queda del mes cuando termina la prueba).
  const sinPrimerPago = !cuenta.pagadoHasta && !debitoActivo;
  // Con el débito activo, algo vencido o sin el primer pago queda una sola opción: pagar una vez.
  const soloPagar = debe || debitoActivo || sinPrimerPago;
  const [metodo, setMetodo] = useState<'debito' | 'unaVez' | 'qr'>(soloPagar ? 'unaVez' : 'debito');
  // Con débito activo y nada vencido no hace falta pagar a mano: se cobra solo.
  const ofrecerPago = importe > 0 && (debe || !debitoActivo);

  return (
    <section className="flex min-w-0 flex-[3_1_480px] flex-col gap-3.5">
      <h2 className="m-0 mb-1 text-xl font-semibold text-foreground">
        {debitoActivo && !debe ? 'Tu forma de pago' : 'Elegí cómo pagar'}
      </h2>

      {debitoActivo ? (
        <DebitoActivo cuenta={cuenta} debe={debe} />
      ) : debe || sinPrimerPago ? (
        <div className="flex items-start gap-4 rounded-[20px] border border-dashed border-gm-line-strong bg-background px-[22px] py-5">
          <span aria-hidden className="mt-px size-[22px] shrink-0 rounded-full border-2 border-gm-line-strong" />
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-[17px] font-semibold text-muted-foreground">Débito automático</span>
            <span className="text-sm leading-normal text-gm-texto-tenue">
              {debe
                ? 'Lo activás apenas pagues lo pendiente, y arranca con el mes que sigue.'
                : 'Lo activás después de tu primer pago, y desde ahí se cobra solo el día 1 de cada mes.'}
            </span>
          </span>
          <Lock aria-hidden className="mt-0.5 size-[18px] shrink-0 text-gm-texto-tenue" strokeWidth={1.9} />
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
          activa={metodo === 'unaVez' || (soloPagar && metodo !== 'qr')}
          onElegir={() => setMetodo('unaVez')}
          titulo="Pagar una vez con MercadoPago"
          descripcion="Con tarjeta, dinero en tu cuenta o en efectivo en un local."
          Icono={Wallet}
        >
          <PagarUnaVez importe={importe} debe={debe} />
        </Opcion>
      )}

      {ofrecerPago && qr && (
        <Opcion
          activa={metodo === 'qr'}
          onElegir={() => setMetodo('qr')}
          titulo="Pagar con QR"
          descripcion="Escaneás con la app de tu banco o billetera, desde el celular."
          Icono={QrCode}
        >
          <PagarConQr importe={importe} />
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
      style={{ borderColor: activa ? AMARILLO : 'hsl(var(--gm-line))', background: activa ? 'hsl(var(--muted))' : 'hsl(var(--gm-surface))' }}
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
          style={{ borderColor: activa ? AMARILLO : 'hsl(var(--gm-line-strong))' }}
        >
          {activa && <span className="size-2.5 rounded-full bg-gm-yellow" />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2.5">
            <span className="text-[17px] font-semibold text-foreground">{titulo}</span>
            {etiqueta && (
              <span className="rounded-full bg-[#F5C21924] px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-gm-yellow">
                {etiqueta}
              </span>
            )}
          </span>
          <span className="text-sm leading-normal text-muted-foreground">{descripcion}</span>
        </span>
        <Icono aria-hidden className="mt-0.5 size-5 shrink-0 text-gm-texto-tenue" strokeWidth={1.8} />
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
      <p className="m-0 text-[15px] leading-relaxed text-gm-texto-2">
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

// Cada cuánto se pregunta si ya se pagó mientras está el QR en pantalla.
const REVISAR_QR_MS = 4000;

/**
 * Un QR estándar que se paga desde cualquier banco o billetera y cobra en la cuenta de MercadoPago
 * de la plataforma. Mientras está en pantalla se pregunta si ya se pagó; al pagarse, el servidor
 * lo asienta y la pantalla se actualiza. Si se cierra antes, la revisión periódica lo asienta igual.
 */
function PagarConQr({ importe }: { importe: number }) {
  const router = useRouter();
  const [qr, setQr] = useState<QrDelPlan | null>(null);
  const [generando, setGenerando] = useState(false);
  const [estado, setEstado] = useState<'esperando' | 'pagado' | 'vencido'>('esperando');
  const [error, setError] = useState<string | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());

  const generar = async () => {
    setGenerando(true);
    setError(null);
    const { data, error } = await pagarConQrAction();
    setGenerando(false);
    if (!data) {
      setError(error ?? 'No pudimos generar el QR. Probá de nuevo en un momento.');
      return;
    }
    setEstado('esperando');
    setQr(data);
  };

  useEffect(() => {
    if (!qr || estado !== 'esperando') return;
    let cancelado = false;
    const reloj = setInterval(() => setAhora(Date.now()), 1000);
    const revisar = setInterval(async () => {
      const { data } = await verificarQrAction(qr.ordenId);
      if (cancelado || !data) return;
      if (data.pagada) {
        setEstado('pagado');
        toast.success('¡Listo! Recibimos tu pago.');
        router.refresh();
      } else if (data.vencida) setEstado('vencido');
    }, REVISAR_QR_MS);
    return () => {
      cancelado = true;
      clearInterval(reloj);
      clearInterval(revisar);
    };
  }, [qr, estado, router]);

  const restante = qr ? Math.max(0, new Date(qr.vence).getTime() - ahora) : 0;
  const vencido = estado === 'vencido' || (!!qr && restante === 0);
  const reloj = `${Math.floor(restante / 60000)}:${String(Math.floor((restante % 60000) / 1000)).padStart(2, '0')}`;

  if (!qr)
    return (
      <div className="flex flex-col gap-4 px-[22px] pb-[22px] sm:pl-[60px]">
        <p className="m-0 text-[15px] leading-relaxed text-gm-texto-2">
          Generamos un QR por {pesos(importe)}. Lo escaneás con la app de tu banco, MercadoPago o cualquier billetera, y
          apenas se acredita tu cuenta queda al día sola.
        </p>
        <button type="button" onClick={generar} disabled={generando} className={botonPrincipal}>
          {generando ? (
            <>
              <LatticeLoader compact label="Procesando…" showTimer={false} cellSize={4} gap={1} />
              Generando el QR…
            </>
          ) : (
            <>
              <QrCode aria-hidden className="size-4" />
              Mostrar QR
            </>
          )}
        </button>
        <MensajeError texto={error} />
      </div>
    );

  if (estado === 'pagado')
    return (
      <div role="status" className="mx-[22px] mb-[22px] flex gap-3.5 rounded-[18px] border p-5" style={{ borderColor: tinte(VERDE, 33), background: tinte(VERDE, 7) }}>
        <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0" style={{ color: VERDE }} />
        <div className="min-w-0">
          <p className="m-0 text-[16px] font-semibold text-foreground">¡Listo! Recibimos tu pago</p>
          <p className="m-0 mt-1 text-[14px] leading-relaxed text-gm-texto-2">Tu cuenta ya está al día. Gracias por confiarnos tu playa.</p>
        </div>
      </div>
    );

  return (
    <div className="flex flex-col items-center gap-4 px-[22px] pb-[22px]">
      {/* Fondo blanco siempre: un QR sobre fondo oscuro no lo lee ningún celular. */}
      <div className="flex w-full max-w-[300px] flex-col items-center gap-2 rounded-[22px] bg-[#F7F5EF] px-4 pb-4 pt-3.5 text-[#1A1814]">
        <p className="m-0 text-[12px] font-bold uppercase tracking-[0.1em] text-[#4A443B]">Escaneá para pagar</p>
        <p className="m-0 font-mono text-[28px] font-bold leading-none text-[#111]">{pesos(qr.importe)}</p>
        <div className={vencido ? 'opacity-20 blur-[2px]' : undefined}>
          <QRCodeSVG value={qr.qrData} size={224} marginSize={2} className="h-auto w-full max-w-[220px]" title="Escaneá con cualquier banco o billetera" />
        </div>
        <p className="m-0 text-center text-[13px] text-[#4A443B]">Con la app de cualquier banco o billetera</p>
      </div>
      {vencido ? (
        <div className="flex w-full flex-col gap-3">
          <p role="alert" className="m-0 text-center text-[14px] leading-relaxed text-foreground">
            El QR venció sin pagarse. Generá uno nuevo para pagar.
          </p>
          <button type="button" onClick={generar} disabled={generando} className={botonSecundario}>
            {generando ? <LatticeLoader compact label="Procesando…" showTimer={false} cellSize={4} gap={1} /> : <RefreshCw aria-hidden className="size-4" />}
            Generar otro QR
          </button>
        </div>
      ) : (
        <div role="status" className="flex w-full items-center gap-3.5 rounded-2xl border border-gm-yellow/40 bg-gm-yellow/[0.07] px-4 py-3">
          <span className="relative grid size-3 shrink-0" aria-hidden>
            <span className="absolute inset-0 animate-ping rounded-full bg-gm-yellow/70" />
            <span className="relative size-3 rounded-full bg-gm-yellow" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-foreground">Esperando el pago</span>
            <span className="block text-[13px] text-muted-foreground">Se acredita solo. El QR vale por</span>
          </span>
          <span className="font-mono text-[15px] font-semibold text-muted-foreground">{reloj}</span>
        </div>
      )}
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
        {aviso && <p className="m-0 text-sm leading-relaxed text-foreground">{aviso}</p>}
        <div className="overflow-hidden rounded-2xl border border-gm-line bg-background">
          <FormularioTarjeta
            clavePublica={clavePublica}
            importe={cuenta.importePeriodo}
            email={email}
            alConfirmar={activarConTarjeta}
          />
        </div>
        <MensajeError texto={error} />
        <p className="m-0 flex gap-2.5 text-[13px] leading-relaxed text-gm-texto-tenue">
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
        <p className="m-0 text-[15px] leading-relaxed text-gm-texto-2">
          Ya casi está. Falta un paso: entrá a MercadoPago y confirmalo con tu tarjeta.
          {debito.email && (
            <>
              {' '}
              Lo pediste con <span className="text-foreground">{debito.email}</span>.
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
      {aviso && <p className="m-0 text-sm leading-relaxed text-foreground">{aviso}</p>}
      <label className="flex flex-col gap-2">
        <span className="text-[14px] font-semibold text-foreground">Email de tu cuenta de MercadoPago</span>
        <input
          type="email"
          required
          value={mail}
          onChange={(e) => setMail(e.target.value)}
          autoComplete="email"
          className="h-[46px] w-full rounded-[12px] border border-gm-line-strong bg-background px-3.5 text-[15px] text-foreground placeholder:text-gm-texto-tenue focus:border-gm-yellow focus:outline-none"
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
      <p className="m-0 text-[13px] leading-relaxed text-gm-texto-tenue">
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
    <div className="flex flex-col gap-4 rounded-[20px] border border-gm-line bg-gm-surface p-[22px]">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[#4ADE9B1f] text-gm-ok">
          <RefreshCw aria-hidden className="size-5" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[17px] font-semibold text-foreground">Débito automático</div>
          <div className="text-[13px] text-gm-texto-tenue">Con tu tarjeta, por MercadoPago</div>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ background: tinte(VERDE, 14), color: VERDE }}
        >
          <span aria-hidden className="size-1.5 rounded-full" style={{ background: VERDE }} />
          Activo
        </span>
      </div>
      <p className="m-0 text-[15px] leading-relaxed text-gm-texto-2">
        {cuenta.periodo.meses === 1 ? 'Cada mes' : cuenta.periodo.meses === 12 ? 'Cada año' : `Cada ${cuenta.periodo.meses} meses`}, el día
        que vence, se cobra solo de tu tarjeta. No tenés que hacer nada.
      </p>
      <dl className="m-0 grid gap-2.5 rounded-xl border border-gm-line bg-background p-4 text-sm">
        {cuenta.proximoVencimiento && (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Próximo débito</dt>
            <dd className="m-0 text-right font-semibold text-foreground">
              {fechaLarga(cuenta.proximoVencimiento)} · <span className="font-mono">{pesos(cuenta.importePeriodo)}</span>
            </dd>
          </div>
        )}
        {debito?.email && (
          <div className="flex justify-between gap-3">
            <dt className="shrink-0 text-muted-foreground">Avisos de cada cobro a</dt>
            <dd className="m-0 min-w-0 truncate text-right text-foreground">{debito.email}</dd>
          </div>
        )}
      </dl>
      {debe && (
        <p className="m-0 text-[14px] leading-relaxed text-gm-texto-2">
          MercadoPago todavía no pudo cobrar este mes y lo va a volver a intentar estos días. Si preferís, podés pagarlo
          ahora y listo.
        </p>
      )}
      {confirmarBaja ? (
        <div className="flex flex-col gap-3 rounded-xl border border-gm-line-strong p-4">
          <p className="m-0 text-sm leading-relaxed text-foreground">
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
              className="h-[46px] px-3 text-[15px] font-semibold text-muted-foreground hover:text-foreground"
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
      color: 'hsl(var(--muted-foreground))',
      titulo: 'El pago no se completó',
      texto: 'No se te cobró nada. Podés intentarlo de nuevo cuando quieras.',
    },
  };
  const m = mensajes[vuelta];

  return (
    <div
      role="status"
      className="flex gap-3.5 rounded-[18px] border p-5"
      style={{ borderColor: tinte(m.color, 33), background: tinte(m.color, 7) }}
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
        <p className="m-0 text-[16px] font-semibold text-foreground">{m.titulo}</p>
        <p className="m-0 mt-1 text-[14px] leading-relaxed text-gm-texto-2">{m.texto}</p>
      </div>
    </div>
  );
}
