'use client';

// Conectar la cuenta de MercadoPago de la empresa. Esta misma pantalla es la URL de retorno
// registrada en MercadoPago: cuando el admin autoriza, vuelve acá con `code` y `state` en la
// dirección, y desde acá —ya con la sesión iniciada— se canjean por los tokens. Por eso el canje
// no necesita ninguna ruta sin autenticación en el backend.

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, ExternalLink, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { EstadoMercadoPago } from '@/types/mercadopago.type';
import {
  conectarMercadoPagoAction,
  desconectarMercadoPagoAction,
  iniciarConexionMercadoPagoAction,
} from '@/actions/mercadopago/mercadopago.action';

const fecha = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—';

export function ConexionMercadoPago({ inicial }: { inicial: EstadoMercadoPago }) {
  const [estado, setEstado] = useState(inicial);
  const [pendiente, startTransition] = useTransition();
  const [canjeando, setCanjeando] = useState(false);
  const router = useRouter();
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
      const r = await iniciarConexionMercadoPagoAction();
      if (r.error || !r.url) {
        toast.error(r.error ?? 'No se pudo iniciar la conexión.');
        return;
      }
      // Sale del sistema hacia MercadoPago; vuelve a esta misma pantalla.
      window.location.assign(r.url);
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
          </>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-border bg-secondary/30 p-4">
        {estado.conectada && (
          <Button variant="ghost" className="text-destructive" disabled={pendiente} onClick={desconectar}>
            Desconectar
          </Button>
        )}
        <Button disabled={pendiente} onClick={conectar}>
          {pendiente
            ? 'Abriendo MercadoPago…'
            : estado.conectada
              ? 'Conectar otra cuenta'
              : 'Conectar con MercadoPago'}
          <ExternalLink className="ml-2 size-4" />
        </Button>
      </div>
    </div>
  );
}
