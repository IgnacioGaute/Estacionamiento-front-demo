'use client';

// Conectar la cuenta de MercadoPago de la empresa. Esta misma pantalla es la URL de retorno
// registrada en MercadoPago: cuando el admin autoriza, vuelve acá con `code` y `state` en la
// dirección, y desde acá —ya con la sesión iniciada— se canjean por los tokens. Por eso el canje
// no necesita ninguna ruta sin autenticación en el backend.

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, ExternalLink, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/lib/toast';
import { CondicionesMercadoPago, EstadoMercadoPago } from '@/types/mercadopago.type';
import {
  aceptarCondicionesMercadoPagoAction,
  conectarMercadoPagoAction,
  desconectarMercadoPagoAction,
  iniciarConexionMercadoPagoAction,
} from '@/actions/mercadopago/mercadopago.action';
import { VerificacionAliasConfig } from './verificacion-alias';
import { CajasQrConfig } from './cajas-qr';
import { ConfiguracionAlias } from '@/types/verificacion-alias.type';

// Lo que el sistema puede hacer con la cuenta, tal cual lo manda el backend. Conectar la cuenta
// es aceptarlo; el backend guarda qué versión se aceptó, quién y cuándo.
function TextoCondiciones({ condiciones }: { condiciones: CondicionesMercadoPago }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <ShieldCheck className="size-4 shrink-0 text-emerald-400" />
        {condiciones.titulo}
      </p>
      <ul className="mt-2.5 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
        {condiciones.puntos.map((punto) => (
          <li key={punto} className="flex gap-2">
            <span aria-hidden>·</span>
            <span>{punto}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Acepto({ valor, onChange, disabled }: { valor: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm">
      <Checkbox
        checked={valor}
        onCheckedChange={(v) => onChange(v === true)}
        disabled={disabled}
        className="mt-0.5"
      />
      <span>Leí lo que el sistema puede hacer con la cuenta y lo acepto.</span>
    </label>
  );
}

const fecha = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—';

export function ConexionMercadoPago({
  inicial,
  verificacionAlias,
}: {
  inicial: EstadoMercadoPago;
  // null si no se pudo leer: la sección no se muestra.
  verificacionAlias: ConfiguracionAlias | null;
}) {
  const [estado, setEstado] = useState(inicial);
  const [pendiente, startTransition] = useTransition();
  const [canjeando, setCanjeando] = useState(false);
  const [acepto, setAcepto] = useState(false);
  const router = useRouter();
  const condiciones = estado.condicionesVigentes;
  // Ya aceptó las vigentes: conectar otra cuenta no vuelve a pedir la casilla.
  const condicionesAlDia = estado.conectada && !!estado.condicionesAceptadas?.alDia;
  const parametros = useSearchParams();
  const code = parametros.get('code');
  const state = parametros.get('state');
  const yaCanjeado = useRef(false);

  // La vuelta de MercadoPago. El `state` sirve una sola vez, así que esto tiene que dispararse
  // una sola vez aunque React vuelva a montar el componente en desarrollo.
  useEffect(() => {
    if (!code || !state || yaCanjeado.current) return;
    yaCanjeado.current = true;
    setCanjeando(true);
    void conectarMercadoPagoAction(code, state).then((r) => {
      setCanjeando(false);
      // La dirección se limpia igual: dejar el código a la vista no aporta y se reenvía al recargar.
      router.replace('/admin/configuracion/mercadopago');
      if (r.error) {
        toast.error(r.error);
        return;
      }
      if (r.estado) setEstado(r.estado);
      toast.success('Cuenta de MercadoPago conectada.');
      router.refresh();
    });
  }, [code, state, router]);

  function conectar() {
    startTransition(async () => {
      const r = await iniciarConexionMercadoPagoAction(condiciones.version);
      if (r.error || !r.url) {
        toast.error(r.error ?? 'No se pudo iniciar la conexión.');
        return;
      }
      // Sale del sistema hacia MercadoPago; vuelve a esta misma pantalla.
      window.location.assign(r.url);
    });
  }

  function aceptarCondiciones() {
    startTransition(async () => {
      const r = await aceptarCondicionesMercadoPagoAction(condiciones.version);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      if (r.estado) setEstado(r.estado);
      setAcepto(false);
      toast.success('Condiciones aceptadas.');
    });
  }

  function desconectar() {
    startTransition(async () => {
      const r = await desconectarMercadoPagoAction();
      if (r.error) {
        toast.error(r.error);
        return;
      }
      if (r.estado) setEstado(r.estado);
      toast.success('Cuenta desconectada. Ya no se puede cobrar por QR.');
      router.refresh();
    });
  }

  if (canjeando)
    return (
      <div
        role="status"
        className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground"
      >
        Conectando la cuenta con MercadoPago…
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="space-y-4 p-5 sm:p-6">
          {estado.conectada ? (
            <>
              <div className="flex items-start gap-3">
                {estado.estado === 'ACTIVA' ? (
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-400" />
                ) : (
                  <TriangleAlert className="mt-0.5 size-5 shrink-0 text-gm-orange" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {estado.estado === 'ACTIVA'
                      ? 'Cuenta conectada'
                      : 'La conexión dejó de funcionar'}
                  </p>
                  <p className="mt-1 break-words text-sm text-muted-foreground">
                    {estado.nickname ?? estado.email ?? `Usuario ${estado.mpUserId}`}
                    {estado.email && estado.nickname ? ` · ${estado.email}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Conectada el {fecha(estado.conectadaEl)} · el permiso vence el{' '}
                    {fecha(estado.expiraEl)} y se renueva solo.
                  </p>
                </div>
              </div>

              {/* Verificar la cuenta importa: si el navegador tenía abierta la sesión de otra
                  persona, MercadoPago no vuelve a pedir la contraseña y se conecta la equivocada. */}
              <p className="rounded-lg border border-border bg-secondary/30 p-3 text-sm text-muted-foreground">
                Revisá que sea la cuenta donde querés recibir el dinero. Los cobros
                entran ahí directamente, sin pasar por ninguna otra cuenta.
              </p>

              {estado.estado === 'ERROR' && estado.ultimoError && (
                <p
                  role="alert"
                  className="rounded-lg border border-gm-orange/40 bg-gm-orange/10 p-3 text-sm"
                >
                  {estado.ultimoError} Volvé a conectar la cuenta para seguir
                  cobrando por QR. Mientras tanto se puede cobrar en efectivo con
                  normalidad.
                </p>
              )}

              {condicionesAlDia ? (
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground">
                    Aceptaste las condiciones de uso el {fecha(estado.condicionesAceptadas?.el ?? null)} · Ver
                  </summary>
                  <div className="mt-3">
                    <TextoCondiciones condiciones={condiciones} />
                  </div>
                </details>
              ) : (
                // Cuenta conectada antes de que existieran las condiciones, o cambió el texto. El
                // cobro con QR sigue; lo que pide aceptar es consultar los pagos que entran.
                <div className="space-y-3 rounded-lg border border-gm-yellow/40 bg-gm-yellow/[0.06] p-4">
                  <p className="text-sm font-semibold">
                    {estado.condicionesAceptadas
                      ? 'Cambiaron las condiciones de uso de la cuenta'
                      : 'Falta aceptar las condiciones de uso de la cuenta'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    El cobro con QR sigue funcionando. Para que el sistema pueda comprobar transferencias que
                    entran a la cuenta, un administrador tiene que aceptarlas.
                  </p>
                  <TextoCondiciones condiciones={condiciones} />
                  <Acepto valor={acepto} onChange={setAcepto} disabled={pendiente} />
                  <div className="flex justify-end">
                    <Button disabled={pendiente || !acepto} onClick={aceptarCondiciones}>
                      Aceptar condiciones
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="font-semibold">Todavía no hay una cuenta conectada</p>
              <p className="text-sm text-muted-foreground">
                Conectá la cuenta de MercadoPago de la empresa para poder cobrar
                las estadías con QR. El dinero entra directo a esa cuenta.
              </p>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li>· Te va a llevar a MercadoPago para que inicies sesión y autorices.</li>
                <li>· Tenés que entrar con la cuenta que va a recibir el dinero.</li>
                <li>· Se puede desconectar cuando quieras.</li>
              </ul>
              <TextoCondiciones condiciones={condiciones} />
              <Acepto valor={acepto} onChange={setAcepto} disabled={pendiente} />
            </>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-border bg-secondary/30 p-4">
          {estado.conectada && (
            <Button variant="ghost" className="text-destructive" disabled={pendiente} onClick={desconectar}>
              Desconectar
            </Button>
          )}
          {/* Conectar es aceptar las condiciones: sin la casilla (o sin haberlas aceptado ya) no se sale. */}
          <Button disabled={pendiente || (!condicionesAlDia && !acepto)} onClick={conectar}>
            {pendiente
              ? 'Abriendo MercadoPago…'
              : estado.conectada
                ? 'Conectar otra cuenta'
                : 'Conectar con MercadoPago'}
            <ExternalLink className="ml-2 size-4" />
          </Button>
        </div>
      </div>

      {/* El QR para cualquier banco: con la cuenta activa (crea sucursal y caja por playa). */}
      {estado.conectada && estado.estado === 'ACTIVA' && <CajasQrConfig />}

      {/* La verificación por alias: solo con la cuenta activa y las condiciones
          aceptadas (el backend lo vuelve a exigir). */}
      {estado.conectada && estado.estado === 'ACTIVA' && condicionesAlDia && verificacionAlias && (
        <VerificacionAliasConfig inicial={verificacionAlias} />
      )}
    </div>
  );
}
