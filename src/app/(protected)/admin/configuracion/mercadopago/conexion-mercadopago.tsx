'use client';

// Conectar la cuenta de MercadoPago de la empresa. Esta misma pantalla es la URL de retorno
// registrada en MercadoPago: cuando el admin autoriza, vuelve acá con `code` y `state` en la
// dirección, y desde acá —ya con la sesión iniciada— se canjean por los tokens. Por eso el canje
// no necesita ninguna ruta sin autenticación en el backend.

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, ExternalLink, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/lib/toast';
import { CajasQr, CondicionesMercadoPago, EstadoMercadoPago } from '@/types/mercadopago.type';
import {
  aceptarCondicionesMercadoPagoAction,
  conectarMercadoPagoAction,
  desconectarMercadoPagoAction,
  iniciarConexionMercadoPagoAction,
} from '@/actions/mercadopago/mercadopago.action';
import { VerificacionAliasConfig } from './verificacion-alias';
import { CajasQrConfig } from './cajas-qr';
import { ConfiguracionAlias } from '@/types/verificacion-alias.type';
import type { ComisionesCaja, ConfiguracionComisiones } from '@/types/box-list.type';
import { ComisionesCajaForm } from '@/components/comisiones-caja-form';
import { SetupStepHeading, SetupStepper, Step } from '@/components/setup-stepper/setup-stepper';

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
  comisiones = null,
  cajasQr = null,
}: {
  inicial: EstadoMercadoPago;
  // null si no se pudo leer: la sección no se muestra.
  verificacionAlias: ConfiguracionAlias | null;
  // null sin cuenta vinculada o si no se pudo leer: el paso ofrece ir a la pantalla de comisiones.
  comisiones?: ConfiguracionComisiones | null;
  // Las cajas QR de cada playa, si la página ya las trajo.
  cajasQr?: CajasQr | null;
}) {
  const [estado, setEstado] = useState(inicial);
  const [paso, setPaso] = useState(1);
  // Lo ya configurado de cada sección: el asistente muestra el estado real de cada paso, no
  // «pendiente» por no haberlo recorrido.
  const [qr, setQr] = useState(cajasQr);
  const [alias, setAlias] = useState(verificacionAlias);
  const [tasas, setTasas] = useState(comisiones?.tasas ?? null);
  const [formComisiones, setFormComisiones] = useState({ cambios: false, valido: true, guardando: false });
  const estadoComisiones = useCallback(({ cambios, valido, guardando, guardado }: { cambios: boolean; valido: boolean; guardando: boolean; guardado: ComisionesCaja | null }) => {
    setFormComisiones({ cambios, valido, guardando });
    if (guardado) setTasas(guardado);
  }, []);
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

  const activa = estado.conectada && estado.estado === 'ACTIVA';
  // Sólo la cuenta es obligatoria: sin ella no hay QR, alias ni comisiones que configurar.
  const irA = (paso: number) => { if (activa || paso === 1) setPaso(paso); };
  const playasConQr = qr?.playas.filter((p) => p.caja).length ?? 0;
  const playas = qr?.playas.length ?? 0;
  const listo = [activa, playas > 0 && playasConQr === playas, !!alias?.activa, !!tasas && Object.values(tasas).some((v) => v !== 0)];
  const estadoPaso = (numero: number) =>
    numero === 1 ? (activa ? 'Vinculada' : 'Sin vincular')
      : numero === 2 ? (!qr ? 'Opcional' : listo[1] ? 'Listo' : playasConQr ? `${playasConQr} de ${playas} playas` : 'Sin activar')
        : numero === 3 ? (!alias?.adicionalHabilitado ? 'No incluida' : listo[2] ? 'Activa' : 'Apagada')
          : listo[3] ? 'Configuradas' : 'En 0%';
  // En Comisiones el botón final guarda el formulario si hay cambios; si no, termina.
  const terminar = () => {
    if (formComisiones.cambios) (document.getElementById('comisiones-mp') as HTMLFormElement | null)?.requestSubmit();
    else router.push('/admin/configuracion');
  };

  return (
    <SetupStepper
      titles={['Cuenta', 'QR', 'Alias', 'Comisiones']}
      step={paso}
      onStepChange={irA}
      onComplete={terminar}
      completeLabel={formComisiones.cambios ? (formComisiones.guardando ? 'Guardando…' : 'Guardar y terminar') : 'Listo'}
      nextDisabled={!activa || (paso === 4 && formComisiones.cambios && (!formComisiones.valido || formComisiones.guardando))}
      locked={(numero) => !activa && numero > 1}
      done={(numero) => listo[numero - 1]}
      stateLabel={(numero, status) => (status === 'active' ? undefined : estadoPaso(numero))}
    >
      <Step>
        <section className="space-y-4">
          <SetupStepHeading number={1} total={4} title="Vinculá la cuenta de Mercado Pago">
            Es la cuenta donde entra el dinero de los cobros con QR. Una por empresa: vale para todas sus playas.
          </SetupStepHeading>
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
              <Button
                variant={activa ? 'outline' : 'default'}
                disabled={pendiente || (!condicionesAlDia && !acepto)}
                onClick={conectar}
              >
                {pendiente
                  ? 'Abriendo MercadoPago…'
                  : estado.conectada
                    ? 'Conectar otra cuenta'
                    : 'Conectar con MercadoPago'}
                <ExternalLink className="ml-2 size-4" />
              </Button>
            </div>
          </div>
          {!activa && (
            <p className="text-xs text-muted-foreground">
              Los siguientes pasos (QR, alias y comisiones) se habilitan con la cuenta vinculada.
            </p>
          )}
        </section>
      </Step>

      <Step>
        <section className="space-y-4">
          <SetupStepHeading number={2} total={4} title="QR para cualquier banco o billetera" optional>
            Sin esto, el QR se paga sólo con la app de Mercado Pago. Podés activarlo ahora o más adelante.
          </SetupStepHeading>
          {/* El QR para cualquier banco: con la cuenta activa (crea sucursal y caja por playa). */}
          {activa && <CajasQrConfig inicial={qr} alCambiar={setQr} />}
        </section>
      </Step>

      <Step>
        <section className="space-y-4">
          <SetupStepHeading number={3} total={4} title="Transferencias al alias" optional>
            Comprueba solo las transferencias que entran a tu alias y registra la salida.
          </SetupStepHeading>
          {/* La verificación por alias: solo con la cuenta activa y las condiciones aceptadas
              (el backend lo vuelve a exigir). */}
          {activa && condicionesAlDia && verificacionAlias ? (
            <VerificacionAliasConfig inicial={verificacionAlias} alCambiar={setAlias} />
          ) : !condicionesAlDia ? (
            <div className="space-y-3 rounded-2xl border border-gm-yellow/30 bg-gm-yellow/[0.05] p-4 text-sm">
              <p className="font-semibold">Falta aceptar las condiciones de uso</p>
              <p className="text-muted-foreground">Para comprobar las transferencias que entran a la cuenta, aceptá las condiciones en el paso 1.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => setPaso(1)}>Ir a la cuenta</Button>
            </div>
          ) : (
            <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
              No se pudo consultar la verificación por alias. Recargá la página para intentar de nuevo.
            </p>
          )}
        </section>
      </Step>

      <Step>
        <section className="space-y-4">
          <SetupStepHeading number={4} total={4} title="Comisiones de Mercado Pago" optional>
            Porcentajes por medio de pago para calcular el neto de caja. Arrancan en 0%.
          </SetupStepHeading>
          {comisiones ? (
            <ComisionesCajaForm id="comisiones-mp" inicial={comisiones.tasas} referencia={comisiones.referencia} onEstado={estadoComisiones} />
          ) : (
            <Link href="/admin/configuracion/mercadopago/comisiones" className="group flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-3 transition-colors hover:bg-secondary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <div><p className="text-sm font-medium">Comisiones de Mercado Pago</p><p className="mt-1 text-xs text-muted-foreground">Porcentajes por medio de pago para el neto de caja.</p></div>
              <span className="text-xs text-muted-foreground group-hover:text-foreground">Configurar →</span>
            </Link>
          )}
        </section>
      </Step>
    </SetupStepper>
  );
}
