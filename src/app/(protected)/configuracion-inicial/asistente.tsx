'use client';

import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, LogOut } from 'lucide-react';
import { AppIcon } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { logoutAction } from '@/actions/auth/logout.action';
import { avanzarConfiguracionAction, comprobarPasoAction, guardarPlayaConfiguracionAction } from '@/actions/tenancy/configuracion-inicial.action';
import { EVENTO_PASO_TERMINADO, PASOS_CONFIGURACION, PASOS_OMITIBLES, type EstadoConfiguracionInicial, type PasoConfiguracion } from '@/types/configuracion-inicial.type';

type Pantalla = 'inicio' | PasoConfiguracion | 'fin';
type Contenido = Record<Exclude<PasoConfiguracion, 'nombre' | 'ubicacion'>, ReactNode>;

// Llegada rápida que se asienta larga (la misma curva del video de presentación) y salida con
// anticipación. Sin rebotes ni fundidos: las cosas entran y salen por máscaras.
const LLEGADA = [0.16, 1, 0.3, 1] as const;
const SALIDA = [0.6, 0, 0.9, 0.4] as const;

const TEXTOS: Record<Pantalla, { ojo: string; titulo: string; bajada: string }> = {
  inicio: { ojo: 'Configuración inicial', titulo: 'Configuremos tu playa.', bajada: 'Son siete pasos cortos. Lo que cargues se guarda al instante: si tenés que irte, seguís después desde donde quedaste.' },
  nombre: { ojo: 'Nombre', titulo: '¿Cómo se llama tu playa?', bajada: 'Es el nombre que ven tu equipo y tus clientes.' },
  ubicacion: { ojo: 'Ubicación', titulo: '¿Dónde queda?', bajada: 'Calle y número, y la ciudad.' },
  vehiculos: { ojo: 'Vehículos', titulo: '¿Qué vehículos recibís?', bajada: 'Empezás con Auto. Sumá los que necesites, como camioneta o moto.' },
  tarifas: { ojo: 'Tarifas', titulo: 'Tus precios, tus reglas.', bajada: 'Con una lista de precios o por hora y fracción, de día y de noche. Aplicalas para seguir.' },
  turnos: { ojo: 'Turnos', titulo: '¿Trabajan por turnos?', bajada: 'Cada operador abre su turno y la caja cierra con sus totales. Si no los usás, dejalo para después.' },
  mercadopago: { ojo: 'Mercado Pago', titulo: 'Cobrá con QR.', bajada: 'Conectá tu cuenta y los pagos con QR se acreditan solos. Podés hacerlo después.' },
  usuarios: { ojo: 'Usuarios', titulo: 'Sumá a tu equipo.', bajada: 'Creá las cuentas de tus operadores. Cada uno entra con su usuario.' },
  fin: { ojo: 'Listo', titulo: 'Tu playa está lista.', bajada: 'Ya podés registrar entradas y cobrar. Lo que dejaste para después lo encontrás en Configuración.' },
};

const NOMBRES: Record<PasoConfiguracion, string> = {
  nombre: 'Nombre', ubicacion: 'Ubicación', vehiculos: 'Vehículos', tarifas: 'Tarifas', turnos: 'Turnos de caja', mercadopago: 'Mercado Pago', usuarios: 'Usuarios',
};

const indice = (pantalla: Pantalla) => (pantalla === 'inicio' ? -1 : pantalla === 'fin' ? PASOS_CONFIGURACION.length : PASOS_CONFIGURACION.indexOf(pantalla));

// Titular cinético: cada palabra sube desde su máscara, una detrás de otra, y sale hacia arriba.
function Titular({ texto, grande }: { texto: string; grande?: boolean }) {
  const quieto = useReducedMotion();
  return (
    <h1 aria-label={texto} className={cn('m-0 font-sans font-extrabold leading-[1.02] tracking-[-0.035em] text-foreground', grande ? 'text-[44px] sm:text-[64px] lg:text-[80px]' : 'text-[36px] sm:text-[48px] lg:text-[58px]')}>
      {texto.split(' ').map((palabra, i) => (
        <span key={`${palabra}-${i}`} aria-hidden className="-mb-[0.14em] mr-[0.22em] inline-block overflow-hidden pb-[0.14em] align-top last:mr-0">
          <motion.span
            className="inline-block"
            initial={{ y: quieto ? 0 : '110%' }}
            animate={{ y: 0, transition: { duration: quieto ? 0 : 0.75, ease: LLEGADA, delay: quieto ? 0 : 0.08 + i * 0.055 } }}
            exit={{ y: quieto ? 0 : '-110%', transition: { duration: quieto ? 0 : 0.3, ease: SALIDA, delay: quieto ? 0 : i * 0.025 } }}
          >
            {palabra}
          </motion.span>
        </span>
      ))}
    </h1>
  );
}

// La franja de obra de la marca. En el inicio es la barrera bajo el titular; al empezar se estira
// hasta ser la barra de avance (mismo layoutId: framer-motion la lleva de un lugar al otro).
function Franja({ className }: { className?: string }) {
  return (
    <motion.div
      layoutId="franja"
      transition={{ type: 'spring', stiffness: 170, damping: 26 }}
      className={cn('rounded-full bg-[repeating-linear-gradient(135deg,hsl(var(--gm-ink))_0_9px,hsl(var(--gm-yellow))_9px_18px)]', className)}
    />
  );
}

export function AsistenteConfiguracion({ estado, contenido }: { estado: EstadoConfiguracionInicial; contenido: Contenido }) {
  const router = useRouter();
  const quieto = useReducedMotion();
  const [hechos, setHechos] = useState<PasoConfiguracion[]>(estado.configuracion.hechos ?? []);
  const [omitidos, setOmitidos] = useState<PasoConfiguracion[]>(estado.configuracion.omitidos ?? []);
  const [pantalla, setPantalla] = useState<Pantalla>(() => estado.configuracion.paso ?? (hechos.length ? PASOS_CONFIGURACION.find((p) => !hechos.includes(p)) ?? 'usuarios' : 'inicio'));
  const [sentido, setSentido] = useState(1);
  const [nombre, setNombre] = useState(estado.playa.nombre);
  const [direccion, setDireccion] = useState(estado.playa.direccion ?? '');
  const [error, setError] = useState('');
  const [guardado, setGuardado] = useState(false);
  const [pendiente, startTransition] = useTransition();

  const actual = indice(pantalla);
  const siguiente = (paso: PasoConfiguracion): PasoConfiguracion | 'fin' => PASOS_CONFIGURACION[PASOS_CONFIGURACION.indexOf(paso) + 1] ?? 'fin';
  const ir = (destino: Pantalla) => {
    setSentido(indice(destino) >= actual ? 1 : -1);
    setError('');
    setPantalla(destino);
  };
  // El avance que devuelve el servidor es la referencia: así lo que se ve coincide con lo guardado.
  const aplicar = (resultado: { estado?: EstadoConfiguracionInicial; error?: string }) => {
    if (resultado.error || !resultado.estado) {
      setError(resultado.error ?? 'No se pudo guardar.');
      return false;
    }
    setHechos(resultado.estado.configuracion.hechos ?? []);
    setOmitidos(resultado.estado.configuracion.omitidos ?? []);
    setGuardado(true);
    return true;
  };

  const continuar = () => {
    // Empezar no espera al servidor: el recorrido arranca enseguida y el paso se guarda de fondo.
    if (pantalla === 'inicio') {
      void avanzarConfiguracionAction({ paso: 'nombre' });
      ir('nombre');
      return;
    }
    guardarYSeguir();
  };

  const guardarYSeguir = () => startTransition(async () => {
    setError('');
    if (pantalla === 'inicio') return;
    if (pantalla === 'fin') {
      const resultado = await avanzarConfiguracionAction({ terminar: true });
      if (!aplicar(resultado)) return;
      router.replace('/tickets');
      router.refresh();
      return;
    }
    if (pantalla === 'nombre' || pantalla === 'ubicacion') {
      const datos = pantalla === 'nombre' ? { nombre: nombre.trim() } : { direccion: direccion.trim() };
      if (!Object.values(datos)[0]) {
        setError(pantalla === 'nombre' ? 'Escribí el nombre de la playa.' : 'Escribí la dirección de la playa.');
        return;
      }
      const proximo = siguiente(pantalla);
      if (!aplicar(await guardarPlayaConfiguracionAction(datos, proximo === 'fin' ? undefined : proximo))) return;
      ir(siguiente(pantalla));
      return;
    }
    const comprobado = await comprobarPasoAction(pantalla);
    if (comprobado.error) {
      setError(comprobado.error);
      return;
    }
    const proximo = siguiente(pantalla);
    if (!aplicar(await avanzarConfiguracionAction({ hecho: pantalla, ...(proximo === 'fin' ? {} : { paso: proximo }) }))) return;
    router.refresh();
    ir(proximo);
  });

  const omitir = () => startTransition(async () => {
    if (pantalla === 'inicio' || pantalla === 'fin') return;
    const proximo = siguiente(pantalla);
    if (!aplicar(await avanzarConfiguracionAction({ omitido: pantalla, ...(proximo === 'fin' ? {} : { paso: proximo }) }))) return;
    ir(proximo);
  });

  // Turnos y MercadoPago tienen su propio asistente: su botón final sigue con el paso siguiente.
  const continuarActual = useRef(continuar);
  useEffect(() => { continuarActual.current = continuar; });
  useEffect(() => {
    const alTerminarPaso = () => continuarActual.current();
    window.addEventListener(EVENTO_PASO_TERMINADO, alTerminarPaso);
    return () => window.removeEventListener(EVENTO_PASO_TERMINADO, alTerminarPaso);
  }, []);

  const atras = () => {
    const previo: Pantalla = actual <= 0 ? 'inicio' : PASOS_CONFIGURACION[actual - 1];
    if (previo !== 'inicio') void avanzarConfiguracionAction({ paso: previo });
    ir(previo);
  };

  const texto = TEXTOS[pantalla];
  const omitible = pantalla !== 'inicio' && pantalla !== 'fin' && PASOS_OMITIBLES.includes(pantalla);
  const faltan = PASOS_CONFIGURACION.filter((p) => !PASOS_OMITIBLES.includes(p) && !hechos.includes(p));
  const enPaso = pantalla !== 'inicio' && pantalla !== 'fin';
  const avance = (Math.min(actual + 1, PASOS_CONFIGURACION.length) / PASOS_CONFIGURACION.length) * 100;

  return (
    <LayoutGroup>
      <main className="relative flex min-h-[100dvh] flex-col overflow-x-clip bg-[#100f0d] text-foreground">
        {/* Luz naranja tenue desde lados opuestos, como en la presentación. */}
        <div aria-hidden className="pointer-events-none fixed inset-0 bg-[radial-gradient(900px_700px_at_8%_10%,rgba(243,107,43,0.11),transparent_70%),radial-gradient(1000px_760px_at_96%_92%,rgba(243,107,43,0.08),transparent_70%)]" />

        <header className="relative z-10 flex items-center gap-3 px-4 pb-3 pt-4 sm:px-8 sm:pt-6">
          <AppIcon className="size-9 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Configuración inicial</p>
            <p className="truncate text-sm font-semibold">{nombre.trim() || estado.playa.nombre}</p>
          </div>
          <span aria-live="polite" className={cn('hidden items-center gap-1.5 text-[13px] text-muted-foreground transition-opacity sm:inline-flex', guardado ? 'opacity-100' : 'opacity-0')}>
            <Check className="size-4 text-emerald-400" aria-hidden />Guardado
          </span>
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="sm" className="gap-1.5 text-muted-foreground"><LogOut className="size-4" aria-hidden />Salir</Button>
          </form>
        </header>

        {/* Avance: la franja crece paso a paso. */}
        <div className="relative z-10 px-4 sm:px-8">
          <div className="relative h-2.5 overflow-hidden rounded-full bg-white/[0.06]" role="progressbar" aria-label="Avance de la configuración" aria-valuemin={0} aria-valuemax={PASOS_CONFIGURACION.length} aria-valuenow={Math.max(0, Math.min(actual + 1, PASOS_CONFIGURACION.length))}>
            {pantalla !== 'inicio' && (
              <motion.div className="h-full" initial={false} animate={{ width: `${avance}%` }} transition={quieto ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 24 }}>
                <Franja className="h-full w-full" />
              </motion.div>
            )}
          </div>
          {enPaso && <p className="mt-2 text-[13px] font-medium text-muted-foreground">Paso {actual + 1} de {PASOS_CONFIGURACION.length}</p>}
        </div>

        <div className={cn('relative z-10 mx-auto grid w-full max-w-7xl flex-1 gap-8 px-4 pb-36 pt-8 sm:px-8 lg:gap-14 lg:pt-14', pantalla === 'inicio' || pantalla === 'fin' ? 'lg:grid-cols-1' : 'lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]')}>
          <section aria-live="polite" className={cn('min-w-0', (pantalla === 'inicio' || pantalla === 'fin') && 'max-w-4xl')}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={pantalla} className="space-y-5">
                <p className="overflow-hidden text-[13px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                  <motion.span
                    className="inline-block"
                    initial={{ y: quieto ? 0 : '110%' }}
                    animate={{ y: 0, transition: { duration: quieto ? 0 : 0.6, ease: LLEGADA } }}
                    exit={{ y: quieto ? 0 : '-110%', transition: { duration: quieto ? 0 : 0.25, ease: SALIDA } }}
                  >
                    {enPaso && <span className="mr-2 text-gm-yellow">{String(actual + 1).padStart(2, '0')}</span>}
                    {texto.ojo}
                  </motion.span>
                </p>
                <Titular texto={texto.titulo} grande={pantalla === 'inicio' || pantalla === 'fin'} />
                <motion.p
                  className="max-w-xl text-base leading-relaxed text-[#C9C0B2] sm:text-lg"
                  initial={{ y: quieto ? 0 : 14, clipPath: quieto ? 'inset(0 0 0 0)' : 'inset(0 0 100% 0)' }}
                  animate={{ y: 0, clipPath: 'inset(0 0 0% 0)', transition: { duration: quieto ? 0 : 0.6, ease: LLEGADA, delay: quieto ? 0 : 0.3 } }}
                  exit={{ y: quieto ? 0 : -10, clipPath: quieto ? 'inset(0 0 0 0)' : 'inset(100% 0 0 0)', transition: { duration: quieto ? 0 : 0.25, ease: SALIDA } }}
                >
                  {texto.bajada}
                </motion.p>
              </motion.div>
            </AnimatePresence>
            {/* Fuera del bloque que sale: al empezar se va enseguida a la barra de avance. */}
            {pantalla === 'inicio' && <Franja className="mt-10 h-4 w-full max-w-xl" />}

            {/* El recorrido completo, con lo hecho y lo que quedó para después. */}
            {enPaso && (
              <ol className="mt-10 hidden space-y-1.5 lg:block">
                {PASOS_CONFIGURACION.map((paso, i) => {
                  const hecho = hechos.includes(paso), omitido = omitidos.includes(paso), activo = paso === pantalla;
                  return (
                    <li key={paso} className={cn('flex items-center gap-3 text-sm', activo ? 'text-foreground' : 'text-muted-foreground')}>
                      <span className={cn('grid size-6 shrink-0 place-items-center rounded-full border text-[11px] font-bold', activo ? 'border-gm-yellow text-gm-yellow' : hecho ? 'border-gm-yellow bg-gm-yellow text-gm-ink' : 'border-gm-line-strong')}>
                        {hecho && !activo ? <Check className="size-3.5" aria-hidden /> : i + 1}
                      </span>
                      <span className={cn(activo && 'font-semibold')}>{NOMBRES[paso]}</span>
                      {omitido && !activo && <span className="text-xs text-muted-foreground/80">· para después</span>}
                      {PASOS_OMITIBLES.includes(paso) && !hecho && !omitido && <span className="text-xs text-muted-foreground/60">· opcional</span>}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {pantalla !== 'inicio' && (
            <section className="min-w-0">
              <AnimatePresence mode="wait" initial={false} custom={sentido}>
                <motion.div
                  key={pantalla}
                  custom={sentido}
                  variants={{
                    entra: (s: number) => ({ x: quieto ? 0 : s * 56, clipPath: quieto ? 'none' : s > 0 ? 'inset(0% 0% 0% 100%)' : 'inset(0% 100% 0% 0%)' }),
                    queda: { x: 0, clipPath: 'inset(0% 0% 0% 0%)', transition: { duration: quieto ? 0 : 0.7, ease: LLEGADA, delay: quieto ? 0 : 0.12 }, transitionEnd: { clipPath: 'none' } },
                    sale: (s: number) => ({ x: quieto ? 0 : -s * 56, clipPath: quieto ? 'none' : s > 0 ? 'inset(0% 100% 0% 0%)' : 'inset(0% 0% 0% 100%)', transition: { duration: quieto ? 0 : 0.32, ease: SALIDA } }),
                  }}
                  initial="entra"
                  animate="queda"
                  exit="sale"
                >
                  {pantalla === 'nombre' && (
                    <form id="paso-form" onSubmit={(e) => { e.preventDefault(); continuar(); }} className="space-y-3 rounded-2xl border border-gm-line bg-gm-surface p-5 sm:p-7">
                      <Label htmlFor="playa-nombre" className="text-sm">Nombre de la playa</Label>
                      <Input id="playa-nombre" autoFocus value={nombre} maxLength={255} onChange={(e) => { setNombre(e.target.value); setGuardado(false); }} placeholder="Por ejemplo: Playa Centro" className="h-14 text-xl font-semibold" />
                    </form>
                  )}
                  {pantalla === 'ubicacion' && (
                    <form id="paso-form" onSubmit={(e) => { e.preventDefault(); continuar(); }} className="space-y-3 rounded-2xl border border-gm-line bg-gm-surface p-5 sm:p-7">
                      <Label htmlFor="playa-direccion" className="text-sm">Dirección</Label>
                      <Input id="playa-direccion" autoFocus value={direccion} maxLength={255} onChange={(e) => { setDireccion(e.target.value); setGuardado(false); }} placeholder="Por ejemplo: Av. San Martín 1234, Mendoza" className="h-14 text-xl font-semibold" autoComplete="street-address" />
                    </form>
                  )}
                  {pantalla !== 'nombre' && pantalla !== 'ubicacion' && pantalla !== 'fin' && contenido[pantalla]}
                  {pantalla === 'fin' && (
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {PASOS_CONFIGURACION.map((paso) => {
                        const hecho = hechos.includes(paso);
                        return (
                          <li key={paso} className="flex items-center gap-3 rounded-xl border border-gm-line bg-gm-surface px-4 py-3 text-sm">
                            <span className={cn('grid size-6 place-items-center rounded-full', hecho ? 'bg-gm-yellow text-gm-ink' : 'border border-gm-line-strong text-muted-foreground')}>{hecho ? <Check className="size-3.5" aria-hidden /> : '–'}</span>
                            <span className="font-semibold">{NOMBRES[paso]}</span>
                            <span className="ml-auto text-xs text-muted-foreground">{hecho ? 'Listo' : omitidos.includes(paso) ? 'Para después' : 'Falta'}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </motion.div>
              </AnimatePresence>
            </section>
          )}
        </div>

        {/* Acciones fijas abajo: siempre a mano, también en el celular. */}
        <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-white/[0.06] bg-[#100f0d]/95 px-4 py-3 backdrop-blur sm:px-8 sm:py-4">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
            {error && <p role="alert" className="w-full text-sm font-medium text-gm-orange sm:order-last sm:w-auto sm:flex-1 sm:text-right">{error}</p>}
            {pantalla !== 'inicio' && (
              <Button type="button" variant="ghost" onClick={atras} disabled={pendiente} className="gap-1.5"><ArrowLeft className="size-4" aria-hidden />Atrás</Button>
            )}
            <div className="ml-auto flex items-center gap-2">
              {omitible && <Button type="button" variant="ghost" onClick={omitir} disabled={pendiente}>Omitir por ahora</Button>}
              {pantalla === 'fin' && faltan.length > 0 ? (
                <Button type="button" onClick={() => ir(faltan[0])} className="h-12 gap-2 px-6 text-base">Completar {NOMBRES[faltan[0]].toLowerCase()}<ArrowRight className="size-4" aria-hidden /></Button>
              ) : (
                <Button type={pantalla === 'nombre' || pantalla === 'ubicacion' ? 'submit' : 'button'} form={pantalla === 'nombre' || pantalla === 'ubicacion' ? 'paso-form' : undefined} onClick={pantalla === 'nombre' || pantalla === 'ubicacion' ? undefined : continuar} disabled={pendiente} className="h-12 gap-2 px-6 text-base">
                  {pantalla === 'inicio' ? 'Empezar' : pantalla === 'fin' ? 'Entrar a trabajar' : pendiente ? 'Guardando…' : 'Continuar'}
                  <ArrowRight className="size-4" aria-hidden />
                </Button>
              )}
            </div>
          </div>
        </footer>
      </main>
    </LayoutGroup>
  );
}
