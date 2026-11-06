'use client';

import { Fragment, forwardRef, useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, LayoutGroup, motion, useMotionTemplate, useReducedMotion, useSpring, useTransform, useVelocity, type Variants } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Clock3, Lock, LogOut } from 'lucide-react';
import { AppIcon } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useVehicleTypes } from '@/components/vehicle-type-options';
import { cn } from '@/lib/utils';
import { logoutAction } from '@/actions/auth/logout.action';
import { avanzarConfiguracionAction, comprobarPasoAction, guardarPlayaConfiguracionAction } from '@/actions/tenancy/configuracion-inicial.action';
import { EVENTO_PASO_LISTO, EVENTO_PASO_TERMINADO, PASOS_CONFIGURACION, PASOS_OMITIBLES, type DetallePasoListo, type EstadoConfiguracionInicial, type PasoConfiguracion } from '@/types/configuracion-inicial.type';

type Pantalla = 'inicio' | PasoConfiguracion | 'fin';
type Modo = 'inicio' | 'paso' | 'fin';
type Contenido = Record<Exclude<PasoConfiguracion, 'nombre' | 'ubicacion'>, ReactNode>;
// Lo que el servidor ya sabe de cada paso al cargar la página (tarifas con precios, algún pase,
// MercadoPago conectado, otra cuenta además de la del administrador).
export type PasosListos = Partial<Record<PasoConfiguracion, boolean>>;

// Llegada exponencial que se asienta larga y salida que acelera; los resortes, sin rebote. Nada
// aparece ni se va con un fundido: entra y sale por máscaras, con desenfoque mientras se mueve.
const EXPO = [0.16, 1, 0.3, 1] as const;
const EXPO_SALIDA = [0.7, 0, 0.84, 0] as const;
const RESORTE_VALORES = { stiffness: 260, damping: 32, mass: 0.9 };
const RESORTE = { type: 'spring', ...RESORTE_VALORES } as const;
const TOTAL = PASOS_CONFIGURACION.length;
const OBLIGATORIOS = PASOS_CONFIGURACION.filter((p) => !PASOS_OMITIBLES.includes(p));

const TEXTOS: Record<Pantalla, { ojo: string; titulo: string; bajada: string }> = {
  inicio: { ojo: 'Playa nueva', titulo: 'Configuremos tu playa.', bajada: 'Unos pasos cortos y quedás listo para cobrar. Todo se guarda a medida que avanzás: si tenés que irte, seguís después desde donde quedaste.' },
  nombre: { ojo: 'Nombre', titulo: '¿Cómo se llama tu playa?', bajada: 'Es el nombre que ven tu equipo y tus clientes.' },
  ubicacion: { ojo: 'Ubicación', titulo: '¿Dónde queda?', bajada: 'La calle y el número. Si querés, también la ciudad.' },
  vehiculos: { ojo: 'Vehículos', titulo: '¿Qué vehículos recibís?', bajada: 'Empezás con Auto. Sumá los que necesites y pausá los que no recibas.' },
  tarifas: { ojo: 'Tarifas', titulo: 'Tus precios, tus reglas.', bajada: 'Con lista de precios o por hora y fracción, de día y de noche. Aplicalas para seguir.' },
  pases: { ojo: 'Día, semana y mes', titulo: 'Estadías largas.', bajada: 'Un precio fijo para quien deja el vehículo un día, una semana o un mes. Si no los usás, dejalo para después.' },
  turnos: { ojo: 'Turnos de caja', titulo: '¿Trabajan por turnos?', bajada: 'Cada operador abre su turno y la caja cierra con sus totales. Si no los usás, dejalo para después.' },
  mercadopago: { ojo: 'Mercado Pago', titulo: 'Cobrá con QR.', bajada: 'Conectá tu cuenta y los pagos con QR se acreditan solos. Podés hacerlo después.' },
  usuarios: { ojo: 'Equipo', titulo: 'Sumá a tu equipo.', bajada: 'Cada persona entra con su usuario y sus cobros quedan a su nombre.' },
  fin: { ojo: 'Listo', titulo: 'Tu playa está lista.', bajada: 'Ya podés registrar entradas y cobrar. Lo que dejaste para después lo encontrás en Configuración.' },
};
const FIN_INCOMPLETO = { ojo: 'Casi', titulo: 'Te falta poco.', bajada: 'Completá lo obligatorio para empezar a trabajar.' };

const NOMBRES: Record<PasoConfiguracion, string> = {
  nombre: 'Nombre', ubicacion: 'Ubicación', vehiculos: 'Vehículos', tarifas: 'Tarifas', pases: 'Día, semana y mes', turnos: 'Turnos de caja', mercadopago: 'Mercado Pago', usuarios: 'Equipo',
};
// Por qué «Continuar» todavía no se habilita.
const FALTA: Record<PasoConfiguracion, string> = {
  nombre: 'Escribí el nombre de la playa para seguir.',
  ubicacion: 'Escribí la calle y el número para seguir.',
  vehiculos: 'Activá al menos un tipo de vehículo para seguir.',
  tarifas: 'Aplicá tus tarifas para seguir: sin precios no se puede cobrar.',
  pases: 'Cargá un pase o dejalo para después.',
  turnos: 'Completá los pasos de turnos o dejalo para después.',
  mercadopago: 'Conectá tu cuenta o dejalo para después.',
  usuarios: 'Creá una cuenta o dejalo para después.',
};

const indice = (pantalla: Pantalla) => (pantalla === 'inicio' ? -1 : pantalla === 'fin' ? TOTAL : PASOS_CONFIGURACION.indexOf(pantalla));
const siguiente = (paso: PasoConfiguracion): PasoConfiguracion | 'fin' => PASOS_CONFIGURACION[PASOS_CONFIGURACION.indexOf(paso) + 1] ?? 'fin';
const dos = (n: number) => String(n).padStart(2, '0');
// La dirección se guarda en un solo campo: «calle y número, ciudad».
const partirDireccion = (direccion: string | null) => {
  const texto = direccion?.trim() ?? '';
  const coma = texto.lastIndexOf(',');
  return coma > 0 ? { calle: texto.slice(0, coma).trim(), ciudad: texto.slice(coma + 1).trim() } : { calle: texto, ciudad: '' };
};

// ── Texto cinético ─────────────────────────────────────────────────────────────────────────────
// Cada palabra sube desde su máscara, una detrás de otra; al irse sigue subiendo mientras la nueva
// entra desde abajo (las dos conviven: la escena siguiente se arma sobre la anterior).
const palabra: Variants = {
  entra: { y: '108%', filter: 'blur(10px)' },
  queda: (i: number) => ({ y: '0%', filter: 'blur(0px)', transition: { duration: 0.85, ease: EXPO, delay: 0.12 + i * 0.05 } }),
  sale: (i: number) => ({ y: '-108%', filter: 'blur(10px)', transition: { duration: 0.42, ease: EXPO_SALIDA, delay: i * 0.025 } }),
};
const renglon: Variants = {
  entra: { y: '110%', filter: 'blur(8px)' },
  queda: (retraso: number) => ({ y: '0%', filter: 'blur(0px)', transition: { duration: 0.8, ease: EXPO, delay: retraso } }),
  sale: { y: '-110%', filter: 'blur(8px)', transition: { duration: 0.36, ease: EXPO_SALIDA } },
};

// AnimatePresence con popLayout necesita la ref del bloque para sacarlo del flujo mientras sale.
const Encabezado = forwardRef<HTMLDivElement, { ojo: string; titulo: string; bajada: string; grande: boolean; quieto: boolean }>(function Encabezado({ ojo, titulo, bajada, grande, quieto }, ref) {
  const v = (variantes: Variants) => (quieto ? undefined : variantes);
  return (
    <motion.div ref={ref} initial="entra" animate="queda" exit="sale" className="min-w-0">
      <p className="overflow-hidden text-[13px] font-bold uppercase tracking-[0.22em] text-gm-yellow">
        <motion.span variants={v(renglon)} custom={0} className="inline-block">{ojo}</motion.span>
      </p>
      {/* Palabras en fila flexible: el alto de cada renglón lo da la palabra. El interlineado va
          después del tamaño: cn (tailwind-merge) descarta un leading anterior a un text-[…]. */}
      <h1 aria-label={titulo} className={cn('mt-4 flex flex-wrap gap-x-[0.24em] font-sans font-extrabold tracking-[-0.04em] text-foreground', grande ? 'text-[46px] sm:text-[72px] xl:text-[92px]' : 'text-[34px] sm:text-[46px] xl:text-[58px]', 'leading-[0.98]')}>
        {titulo.split(' ').map((p, i) => (
          <span key={`${p}-${i}`} aria-hidden className="-mb-[0.06em] block overflow-hidden pb-[0.1em]">
            <motion.span variants={v(palabra)} custom={i} className="inline-block">{p}</motion.span>
          </span>
        ))}
      </h1>
      <p className={cn('overflow-hidden', grande ? 'mt-7' : 'mt-5')}>
        <motion.span variants={v(renglon)} custom={0.32} className={cn('block max-w-2xl leading-relaxed text-gm-texto-2', grande ? 'text-lg sm:text-xl' : 'text-base sm:text-lg')}>{bajada}</motion.span>
      </p>
    </motion.div>
  );
});

// ── Odómetro ───────────────────────────────────────────────────────────────────────────────────
// El número del paso rueda hasta el siguiente con un resorte; el desenfoque crece con la velocidad.
function Digito({ valor, quieto }: { valor: number; quieto: boolean }) {
  const y = useSpring(-valor * 10, RESORTE_VALORES);
  useEffect(() => { if (quieto) y.jump(-valor * 10); else y.set(-valor * 10); }, [valor, quieto, y]);
  const desenfoque = useTransform(useVelocity(y), [-70, 0, 70], [4, 0, 4]);
  const filter = useMotionTemplate`blur(${desenfoque}px)`;
  const translate = useTransform(y, (n) => `${n}%`);
  return (
    <span className="inline-block h-[1.1em] overflow-hidden">
      <motion.span style={{ y: translate, filter }} className="flex flex-col">
        {Array.from({ length: 10 }, (_, n) => <span key={n} className="block h-[1.1em] leading-[1.1em]">{n}</span>)}
      </motion.span>
    </span>
  );
}
function Odometro({ valor, quieto, className }: { valor: number; quieto: boolean; className?: string }) {
  return (
    <span aria-label={dos(valor)} className={cn('inline-flex tabular-nums', className)}>
      {dos(valor).split('').map((d, i) => <Digito key={i} valor={Number(d)} quieto={quieto} />)}
    </span>
  );
}

// La franja de obra de la marca. En la bienvenida y al final subraya el titular; en los pasos se
// transforma en el marcador del paso activo (mismo layoutId).
function Franja({ quieto }: { quieto: boolean }) {
  return (
    <motion.div
      layoutId="marcador"
      transition={quieto ? { duration: 0 } : RESORTE}
      className="h-3.5 w-full max-w-md rounded-full bg-[repeating-linear-gradient(135deg,hsl(var(--gm-ink))_0_9px,hsl(var(--gm-yellow))_9px_18px)]"
    />
  );
}

// ── Recorrido ──────────────────────────────────────────────────────────────────────────────────
// La misma lista en las tres escenas: en la bienvenida anticipa los pasos, durante el recorrido es
// la columna de la izquierda y al final es el resumen. Al cambiar de escena las filas viajan.
function ListaPasos({ modo, pantalla, hechos, omitidos, alcanzable, onIr, quieto }: {
  modo: Modo; pantalla: Pantalla; hechos: PasoConfiguracion[]; omitidos: PasoConfiguracion[];
  alcanzable: (paso: PasoConfiguracion) => boolean; onIr: (paso: PasoConfiguracion) => void; quieto: boolean;
}) {
  const actual = indice(pantalla);
  return (
    <ol className="relative space-y-1">
      {modo === 'paso' && (
        <span aria-hidden className="absolute bottom-6 left-[26px] top-6 w-px bg-white/[0.08]">
          <motion.span className="block h-full w-full origin-top bg-gm-yellow/70" initial={false} animate={{ scaleY: Math.max(0, actual) / (TOTAL - 1) }} transition={quieto ? { duration: 0 } : RESORTE} />
        </span>
      )}
      {PASOS_CONFIGURACION.map((paso, i) => {
        const hecho = hechos.includes(paso), omitido = omitidos.includes(paso) && !hecho, activo = paso === pantalla;
        const opcional = PASOS_OMITIBLES.includes(paso);
        const puede = modo === 'paso' && !activo && alcanzable(paso);
        const etiqueta = modo === 'fin'
          ? (hecho ? 'Listo' : omitido ? 'Para después' : opcional ? 'Opcional' : 'Falta')
          : modo === 'paso' ? (omitido && !activo ? 'Después' : opcional && !hecho ? 'Opcional' : '')
          : opcional ? 'Opcional' : '';
        return (
          <motion.li key={paso} layout={quieto ? false : 'position'} transition={RESORTE}>
            <button
              type="button"
              disabled={!puede}
              aria-current={activo ? 'step' : undefined}
              onClick={() => onIr(paso)}
              className={cn(
                'relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors disabled:cursor-default',
                activo ? 'text-foreground' : hecho || modo !== 'paso' ? 'text-gm-texto-2' : 'text-muted-foreground',
                puede && 'hover:bg-white/[0.04] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow',
              )}
            >
              {activo && (
                <motion.span layoutId="marcador" transition={quieto ? { duration: 0 } : RESORTE} className="absolute inset-0 rounded-xl border border-gm-yellow/25 bg-gm-yellow/[0.07]">
                  <span className="absolute inset-y-2.5 left-0 w-[3px] rounded-full bg-gm-yellow" />
                </motion.span>
              )}
              <span className={cn(
                'relative grid size-7 shrink-0 place-items-center rounded-full font-display text-[12px] tabular-nums transition-colors duration-300',
                hecho ? 'bg-gm-yellow text-gm-ink' : activo ? 'bg-gm-hondo text-gm-yellow ring-[1.5px] ring-gm-yellow' : omitido ? 'border border-dashed border-white/30 bg-gm-hondo text-muted-foreground' : 'bg-gm-hondo ring-1 ring-white/15',
              )}>
                {hecho ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : omitido && !activo ? <Clock3 className="size-3.5" aria-hidden /> : dos(i + 1)}
              </span>
              <span className={cn('relative min-w-0 flex-1 truncate', activo ? 'font-semibold' : 'font-medium')}>{NOMBRES[paso]}</span>
              {etiqueta && (
                <span className={cn('relative shrink-0 text-[11px] font-semibold uppercase tracking-[0.12em]', etiqueta === 'Listo' ? 'text-gm-yellow' : etiqueta === 'Falta' ? 'text-gm-orange' : 'text-muted-foreground/70')}>{etiqueta}</span>
              )}
            </button>
          </motion.li>
        );
      })}
    </ol>
  );
}

// ── Transición del contenido ───────────────────────────────────────────────────────────────────
// Una cortina: el paso que se va se recorta desde un lado mientras el nuevo se descubre desde el
// otro, con el mismo tiempo, así el corte entre los dos es una sola línea que cruza (y se ve).
const panel: Variants = {
  entra: (s: number) => ({ x: s * 56, filter: 'blur(12px)', clipPath: s > 0 ? 'inset(0% 0% 0% 100%)' : 'inset(0% 100% 0% 0%)' }),
  queda: { x: 0, filter: 'blur(0px)', clipPath: 'inset(0% 0% 0% 0%)', transition: { duration: 0.75, ease: EXPO }, transitionEnd: { filter: 'none', clipPath: 'none' } },
  sale: (s: number) => ({ x: -s * 56, filter: 'blur(12px)', clipPath: s > 0 ? 'inset(0% 100% 0% 0%)' : 'inset(0% 0% 0% 100%)', transition: { duration: 0.75, ease: EXPO } }),
};
const costura: Variants = {
  entra: (s: number) => ({ x: s > 0 ? '100%' : '0%', scaleY: 1 }),
  queda: (s: number) => ({ x: s > 0 ? '0%' : '100%', scaleY: 0, transition: { x: { duration: 0.75, ease: EXPO }, scaleY: { duration: 0.3, delay: 0.55, ease: EXPO_SALIDA } } }),
  sale: { scaleY: 0, transition: { duration: 0.1 } },
};

// Vista previa del comprobante mientras se cargan el nombre y la dirección: sigue en pantalla entre
// los dos pasos y se completa a medida que escriben.
function Comprobante({ nombre, direccion, quieto }: { nombre: string; direccion: string; quieto: boolean }) {
  return (
    <motion.aside
      aria-label="Vista previa del comprobante"
      initial={quieto ? false : { y: 28, filter: 'blur(12px)', clipPath: 'inset(0% -8% 100% -8%)' }}
      animate={{ y: 0, filter: 'blur(0px)', clipPath: 'inset(0% -8% -8% -8%)', transition: { duration: 0.85, ease: EXPO, delay: 0.25 }, transitionEnd: { filter: 'none', clipPath: 'none' } }}
      exit={quieto ? undefined : { y: -20, filter: 'blur(12px)', clipPath: 'inset(100% -8% -8% -8%)', transition: { duration: 0.45, ease: EXPO_SALIDA } }}
      className="hidden xl:block"
    >
      <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Vista previa</p>
      <div className="rotate-[1.5deg] rounded-2xl bg-[#f4efe6] p-5 text-[#1a1712] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)]">
        <div className="flex items-center gap-3">
          <AppIcon className="size-9 shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-base font-extrabold leading-tight">{nombre.trim() || 'Tu playa'}</p>
            <p className={cn('truncate text-xs', direccion ? 'text-[#5f574c]' : 'text-[#a59c8e]')}>{direccion || 'Calle y número'}</p>
          </div>
        </div>
        <div className="my-4 border-t border-dashed border-[#cfc6b8]" />
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8a8174]">Comprobante de entrada</p>
        <dl className="mt-2 space-y-1.5 text-sm">
          <div className="flex justify-between"><dt className="text-[#6b6358]">Patente</dt><dd className="font-mono font-bold">AB 123 CD</dd></div>
          <div className="flex justify-between"><dt className="text-[#6b6358]">Vehículo</dt><dd className="font-semibold">Auto</dd></div>
          <div className="flex justify-between"><dt className="text-[#6b6358]">Entrada</dt><dd className="font-semibold tabular-nums">10:42</dd></div>
        </dl>
        <div aria-hidden className="mt-5 h-11 rounded-sm bg-[repeating-linear-gradient(90deg,#1a1712_0_2px,transparent_2px_4px,#1a1712_4px_5px,transparent_5px_8px)] opacity-85" />
      </div>
    </motion.aside>
  );
}

export function AsistenteConfiguracion({ estado, contenido, listos: listosServidor }: { estado: EstadoConfiguracionInicial; contenido: Contenido; listos: PasosListos }) {
  const router = useRouter();
  const quieto = !!useReducedMotion();
  const { types: vehiculos } = useVehicleTypes();
  const [hechos, setHechos] = useState<PasoConfiguracion[]>(estado.configuracion.hechos ?? []);
  const [omitidos, setOmitidos] = useState<PasoConfiguracion[]>(estado.configuracion.omitidos ?? []);
  const [pantalla, setPantalla] = useState<Pantalla>(() => estado.configuracion.paso ?? (hechos.length ? PASOS_CONFIGURACION.find((p) => !hechos.includes(p)) ?? 'usuarios' : 'inicio'));
  const [sentido, setSentido] = useState(1);
  const [nombre, setNombre] = useState(estado.playa.nombre);
  const [calle, setCalle] = useState(() => partirDireccion(estado.playa.direccion).calle);
  const [ciudad, setCiudad] = useState(() => partirDireccion(estado.playa.direccion).ciudad);
  const [listosEvento, setListosEvento] = useState<PasosListos>({});
  const [error, setError] = useState('');
  const [guardados, setGuardados] = useState(0);
  const [pendiente, startTransition] = useTransition();
  // Aparte: guardar el último paso refresca la página y no tiene que verse como «Entrando…».
  const [terminando, startTerminar] = useTransition();

  const actual = indice(pantalla);
  const modo: Modo = pantalla === 'inicio' ? 'inicio' : pantalla === 'fin' ? 'fin' : 'paso';
  const direccion = [calle.trim(), ciudad.trim()].filter(Boolean).join(', ');
  // Lo mínimo de cada paso para habilitar «Continuar». El servidor lo vuelve a comprobar al guardar.
  const listo = (paso: PasoConfiguracion) => {
    if (paso === 'nombre') return !!nombre.trim();
    if (paso === 'ubicacion') return !!calle.trim();
    if (paso === 'vehiculos') return vehiculos.some((v) => v.enabled);
    if (paso === 'turnos') return hechos.includes('turnos');
    return !!(listosServidor[paso] || listosEvento[paso]);
  };
  const frontera = PASOS_CONFIGURACION.findIndex((p) => !hechos.includes(p) && !omitidos.includes(p));
  const alcanzable = (paso: PasoConfiguracion) => PASOS_CONFIGURACION.indexOf(paso) <= (frontera === -1 ? TOTAL - 1 : frontera);
  const faltan = OBLIGATORIOS.filter((p) => !hechos.includes(p));

  const ir = (destino: Pantalla) => {
    if (destino === pantalla) return;
    setSentido(indice(destino) >= actual ? 1 : -1);
    setError('');
    setPantalla(destino);
    window.scrollTo({ top: 0, behavior: quieto ? 'auto' : 'smooth' });
  };
  // El avance que devuelve el servidor es la referencia: así lo que se ve coincide con lo guardado.
  const aplicar = (resultado: { estado?: EstadoConfiguracionInicial; error?: string }) => {
    if (resultado.error || !resultado.estado) {
      setError(resultado.error ?? 'No se pudo guardar.');
      return false;
    }
    setHechos(resultado.estado.configuracion.hechos ?? []);
    setOmitidos(resultado.estado.configuracion.omitidos ?? []);
    setGuardados((n) => n + 1);
    return true;
  };

  // Empezar no espera al servidor: el recorrido arranca enseguida y el paso se guarda de fondo.
  const empezar = () => {
    void avanzarConfiguracionAction({ paso: 'nombre' });
    ir('nombre');
  };
  // Volver a un paso ya recorrido desde la lista (o con «Atrás»): se recuerda dónde quedó.
  const saltar = (destino: Pantalla) => {
    if (destino !== 'inicio' && destino !== 'fin') void avanzarConfiguracionAction({ paso: destino });
    ir(destino);
  };

  const guardarYSeguir = () => startTransition(async () => {
    if (pantalla === 'inicio' || pantalla === 'fin') return;
    setError('');
    const proximo = siguiente(pantalla);
    const paso = proximo === 'fin' ? {} : { paso: proximo };
    if (pantalla === 'nombre' || pantalla === 'ubicacion') {
      const datos = pantalla === 'nombre' ? { nombre: nombre.trim() } : { direccion };
      if (!Object.values(datos)[0]) {
        setError(FALTA[pantalla]);
        return;
      }
      if (!aplicar(await guardarPlayaConfiguracionAction(datos, proximo === 'fin' ? undefined : proximo))) return;
      ir(proximo);
      return;
    }
    const comprobado = await comprobarPasoAction(pantalla);
    if (comprobado.error) {
      setError(comprobado.error);
      return;
    }
    if (!aplicar(await avanzarConfiguracionAction({ hecho: pantalla, ...paso }))) return;
    router.refresh();
    ir(proximo);
  });

  const omitir = () => startTransition(async () => {
    if (pantalla === 'inicio' || pantalla === 'fin') return;
    const proximo = siguiente(pantalla);
    if (!aplicar(await avanzarConfiguracionAction({ omitido: pantalla, ...(proximo === 'fin' ? {} : { paso: proximo }) }))) return;
    ir(proximo);
  });

  const terminar = () => startTerminar(async () => {
    const resultado = await avanzarConfiguracionAction({ terminar: true });
    if (!aplicar(resultado)) return;
    router.replace('/tickets');
    router.refresh();
  });

  // Turnos y MercadoPago tienen su propio asistente: su botón final sigue con el paso siguiente.
  // Las tarifas avisan cuando quedan aplicadas, para habilitar «Continuar» sin recargar.
  const guardarActual = useRef(guardarYSeguir);
  useEffect(() => { guardarActual.current = guardarYSeguir; });
  useEffect(() => {
    const alTerminarPaso = () => guardarActual.current();
    const alQuedarListo = (evento: Event) => {
      const { paso, listo: estaListo } = (evento as CustomEvent<DetallePasoListo>).detail;
      setListosEvento((previos) => ({ ...previos, [paso]: estaListo }));
    };
    window.addEventListener(EVENTO_PASO_TERMINADO, alTerminarPaso);
    window.addEventListener(EVENTO_PASO_LISTO, alQuedarListo);
    return () => {
      window.removeEventListener(EVENTO_PASO_TERMINADO, alTerminarPaso);
      window.removeEventListener(EVENTO_PASO_LISTO, alQuedarListo);
    };
  }, []);

  const atras = () => saltar(actual <= 0 ? 'inicio' : PASOS_CONFIGURACION[actual - 1]);

  const texto = pantalla === 'fin' && faltan.length ? FIN_INCOMPLETO : TEXTOS[pantalla];
  const paso = modo === 'paso' ? (pantalla as PasoConfiguracion) : null;
  const opcional = !!paso && PASOS_OMITIBLES.includes(paso);
  const listoActual = !!paso && listo(paso);
  const datosPlaya = pantalla === 'nombre' || pantalla === 'ubicacion';
  const aviso = error || (paso && !listoActual ? FALTA[paso] : '');

  return (
    <LayoutGroup>
      <main className="relative min-h-[100dvh] bg-gm-hondo text-foreground">
        {/* Luz cálida desde esquinas opuestas y una grilla que se pierde hacia los bordes. */}
        <div aria-hidden className="pointer-events-none fixed inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(900px_650px_at_0%_0%,rgba(243,107,43,0.10),transparent_70%),radial-gradient(1000px_760px_at_100%_100%,rgba(245,197,24,0.06),transparent_70%)]" />
          <div className="absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.028)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.028)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_50%_40%,black_20%,transparent_75%)]" />
        </div>

        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-white/[0.06] bg-gm-hondo/80 px-4 backdrop-blur-md sm:px-8">
          <AppIcon className="size-8 shrink-0" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Configuración inicial</p>
            <p className="truncate text-sm font-semibold">{nombre.trim() || estado.playa.nombre}</p>
          </div>
          <span aria-live="polite" className="hidden overflow-hidden sm:block">
            {guardados > 0 && (
              <motion.span key={guardados} initial={quieto ? false : { y: '100%', filter: 'blur(4px)' }} animate={{ y: '0%', filter: 'blur(0px)' }} transition={{ duration: 0.5, ease: EXPO }} className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                <Check className="size-4 text-gm-ok" aria-hidden />Guardado
              </motion.span>
            )}
          </span>
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="sm" className="gap-1.5 text-muted-foreground"><LogOut className="size-4" aria-hidden />Salir</Button>
          </form>
        </header>

        {/* En el celular la lista no entra al costado: una barra por paso. */}
        {modo === 'paso' && (
          <div className="relative z-10 flex gap-1 px-4 pt-4 sm:px-8 lg:hidden" aria-hidden>
            {PASOS_CONFIGURACION.map((p, i) => {
              const omitido = omitidos.includes(p) && !hechos.includes(p) && i !== actual;
              return (
                <span key={p} className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                  <motion.span className={cn('block h-full origin-left', omitido ? 'bg-white/30' : 'bg-gm-yellow')} initial={false} animate={{ scaleX: hechos.includes(p) || omitidos.includes(p) || i === actual ? 1 : 0 }} transition={quieto ? { duration: 0 } : RESORTE} />
                </span>
              );
            })}
          </div>
        )}

        {/* La grilla no cambia de lugar entre escenas: lo que sale queda donde estaba mientras se va. */}
        <div className={cn(
          'relative z-10 grid w-full',
          modo === 'paso'
            ? 'lg:grid-cols-[312px_minmax(0,1fr)]'
            : 'items-center gap-12 px-5 pb-16 pt-10 sm:px-10 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-20 lg:px-[max(2.5rem,calc((100vw-80rem)/2))] lg:py-12',
        )}>
          {modo === 'paso' && (
            <span aria-hidden className="pointer-events-none absolute right-10 top-6 hidden font-display text-[200px] leading-none text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.07)] 2xl:block">
              <Odometro valor={actual + 1} quieto={quieto} />
            </span>
          )}

          <motion.aside
            layout={quieto ? false : true}
            transition={RESORTE}
            className={cn(
              modo === 'paso'
                ? 'hidden border-r border-white/[0.06] lg:sticky lg:top-16 lg:flex lg:h-[calc(100dvh-4rem)] lg:flex-col lg:gap-6 lg:overflow-y-auto lg:px-5 lg:py-10'
                : 'order-2 rounded-3xl border border-white/[0.07] bg-white/[0.025] p-3 backdrop-blur-sm sm:p-4',
            )}
          >
            <motion.p layout="position" className="px-3 pt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {modo === 'inicio' ? `${TOTAL} pasos · ${OBLIGATORIOS.length} obligatorios` : modo === 'fin' ? 'Resumen' : 'Tu recorrido'}
            </motion.p>
            <ListaPasos modo={modo} pantalla={pantalla} hechos={hechos} omitidos={omitidos} alcanzable={alcanzable} onIr={saltar} quieto={quieto} />
            {modo === 'paso' && (
              <p className="mt-auto px-3 text-xs leading-relaxed text-muted-foreground">Se guarda a medida que avanzás. Lo opcional lo podés hacer después desde Configuración.</p>
            )}
          </motion.aside>

          <section className={cn('min-w-0', modo === 'paso' ? 'px-4 pb-40 pt-8 sm:px-10 lg:pb-0 lg:pt-14 xl:px-14' : 'order-1')}>
            {paso && (
              <div className="mb-6 flex items-center gap-3 text-[13px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                <span className="flex items-center gap-1.5 font-display text-base tracking-[0.06em]">
                  <Odometro valor={actual + 1} quieto={quieto} className="text-foreground" />
                  <span>/ {dos(TOTAL)}</span>
                </span>
                <span aria-hidden className="h-px w-8 bg-white/15" />
                <span className="overflow-hidden">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span key={opcional ? 'opcional' : 'obligatorio'} initial={quieto ? false : { y: '110%' }} animate={{ y: '0%' }} exit={quieto ? undefined : { y: '-110%' }} transition={{ duration: 0.5, ease: EXPO }} className={cn('inline-block', !opcional && 'text-gm-orange')}>
                      {opcional ? 'Opcional' : 'Obligatorio'}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </div>
            )}

            <AnimatePresence mode="popLayout" initial={false}>
              <Encabezado key={pantalla === 'fin' && faltan.length ? 'fin-incompleto' : pantalla} ojo={texto.ojo} titulo={texto.titulo} bajada={texto.bajada} grande={modo !== 'paso'} quieto={quieto} />
            </AnimatePresence>

            {modo === 'inicio' && (
              <div className="mt-10 space-y-10">
                <Franja quieto={quieto} />
                <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
                  <Button type="button" onClick={(e) => { e.preventDefault(); empezar(); }} className="h-14 gap-2.5 rounded-xl px-8 text-base font-bold">
                    Empezar<ArrowRight className="size-5" aria-hidden />
                  </Button>
                  <p className="text-sm text-muted-foreground">Te lleva unos minutos.</p>
                </div>
              </div>
            )}
            {modo === 'fin' && (
              <div className="mt-10 space-y-10">
                <Franja quieto={quieto} />
                {error && <p role="alert" className="text-sm font-medium text-gm-orange">{error}</p>}
                {faltan.length > 0 ? (
                  <Button type="button" onClick={() => saltar(faltan[0])} className="h-14 gap-2.5 rounded-xl px-8 text-base font-bold">Completar {NOMBRES[faltan[0]].toLowerCase()}<ArrowRight className="size-5" aria-hidden /></Button>
                ) : (
                  <Button type="button" onClick={terminar} disabled={terminando} className="h-14 gap-2.5 rounded-xl px-8 text-base font-bold">{terminando ? 'Entrando…' : 'Entrar a trabajar'}<ArrowRight className="size-5" aria-hidden /></Button>
                )}
              </div>
            )}

            <div className={cn('grid gap-8', paso && 'mt-10', datosPlaya && 'xl:grid-cols-[minmax(0,1fr)_300px]')}>
              <div className="min-w-0">
                <AnimatePresence mode="popLayout" initial={false} custom={sentido}>
                  {paso && (
                    <motion.div key={paso} custom={sentido} variants={quieto ? undefined : panel} initial="entra" animate="queda" exit="sale" className="relative">
                      {!quieto && (
                        <motion.span aria-hidden custom={sentido} variants={costura} className="pointer-events-none absolute inset-0 z-10 origin-center">
                          <span className="absolute inset-y-0 left-0 w-[2px] bg-gm-yellow" />
                        </motion.span>
                      )}
                      {paso === 'nombre' && (
                        <form id="paso-form" onSubmit={(e) => { e.preventDefault(); if (listo('nombre')) guardarYSeguir(); }} className="space-y-3">
                          <Label htmlFor="playa-nombre">Nombre de la playa</Label>
                          <Input id="playa-nombre" autoFocus value={nombre} maxLength={255} onChange={(e) => setNombre(e.target.value)} placeholder="Por ejemplo: Playa Centro" className="h-16 rounded-2xl border-white/10 bg-white/[0.03] px-5 text-2xl font-bold focus-visible:border-gm-yellow/60" />
                          <p className="text-sm text-muted-foreground">Lo podés cambiar cuando quieras desde Configuración.</p>
                        </form>
                      )}
                      {paso === 'ubicacion' && (
                        <form id="paso-form" onSubmit={(e) => { e.preventDefault(); if (listo('ubicacion')) guardarYSeguir(); }} className="grid gap-5 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                          <div className="space-y-3">
                            <Label htmlFor="playa-calle">Calle y número</Label>
                            <Input id="playa-calle" autoFocus value={calle} maxLength={200} onChange={(e) => setCalle(e.target.value)} placeholder="Av. San Martín 1234" autoComplete="street-address" className="h-16 rounded-2xl border-white/10 bg-white/[0.03] px-5 text-xl font-bold focus-visible:border-gm-yellow/60" />
                          </div>
                          <div className="space-y-3">
                            <Label htmlFor="playa-ciudad">Ciudad <span className="font-medium normal-case tracking-normal">· opcional</span></Label>
                            <Input id="playa-ciudad" value={ciudad} maxLength={50} onChange={(e) => setCiudad(e.target.value.replace(/,/g, ''))} placeholder="Mendoza" autoComplete="address-level2" className="h-16 rounded-2xl border-white/10 bg-white/[0.03] px-5 text-xl font-bold focus-visible:border-gm-yellow/60" />
                          </div>
                          {/* Enter en cualquiera de los dos campos sigue. */}
                          <button type="submit" hidden aria-hidden tabIndex={-1} />
                        </form>
                      )}
                      {/* Con key propia: React marca sin key a un elemento del servidor que llega entre hermanos. */}
                      {paso !== 'nombre' && paso !== 'ubicacion' && <Fragment key={paso}>{contenido[paso]}</Fragment>}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <AnimatePresence>
                {datosPlaya && <Comprobante key="comprobante" nombre={nombre} direccion={direccion} quieto={quieto} />}
              </AnimatePresence>
            </div>

            {/* Acciones: fijas abajo en el celular y pegadas al pie del contenido en la computadora. */}
            {paso && (
              <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.06] bg-gm-hondo/90 backdrop-blur-md lg:sticky lg:-mx-10 lg:mt-14 xl:-mx-14">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-8 lg:px-10 lg:py-4 xl:px-14">
                  <p aria-live="polite" className={cn('order-first flex w-full items-center gap-2 text-sm sm:order-none sm:w-auto sm:flex-1 sm:justify-end', error ? 'font-medium text-gm-orange' : 'text-muted-foreground', !aviso && 'hidden sm:flex')}>
                    {aviso && !error && <Lock className="size-3.5 shrink-0" aria-hidden />}{aviso}
                  </p>
                  <Button type="button" variant="ghost" onClick={atras} disabled={pendiente} className="gap-1.5 sm:order-first"><ArrowLeft className="size-4" aria-hidden />Atrás</Button>
                  <div className="ml-auto flex items-center gap-2">
                    {opcional && !listoActual && <Button type="button" variant="outline" onClick={omitir} disabled={pendiente} className="h-12 px-5">Omitir por ahora</Button>}
                    {/* Un botón por pantalla (key): si el mismo elemento pasara a ser el submit de otro
                        formulario durante un clic, el navegador lo enviaría sin que lo completen. */}
                    <Button
                      key={paso}
                      type={datosPlaya ? 'submit' : 'button'}
                      form={datosPlaya ? 'paso-form' : undefined}
                      onClick={datosPlaya ? undefined : (e) => { e.preventDefault(); guardarYSeguir(); }}
                      disabled={pendiente || !listoActual}
                      className="h-12 gap-2 rounded-xl px-6 text-base font-bold"
                    >
                      {pendiente ? 'Guardando…' : 'Continuar'}<ArrowRight className="size-4" aria-hidden />
                    </Button>
                  </div>
                </div>
              </footer>
            )}
          </section>
        </div>
      </main>
    </LayoutGroup>
  );
}
