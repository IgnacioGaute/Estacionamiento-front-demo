'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

// Una barra fina arriba que confirma el toque al pasar de una pantalla a otra, hasta que llega la
// nueva. Sin ella, si el servidor tardaba (red lenta, el servidor de desarrollo compilando) no
// cambiaba nada y parecía que el botón no se había tocado. Reemplaza a la pantalla del auto en cada
// clic, que tapaba los esqueletos y duraba al menos 3,5 s. Aparece después de 120 ms, así una
// navegación instantánea no parpadea, y se completa apenas cambia la dirección.
const DEMORA_MS = 120;
const MAXIMO_MS = 20000;

function Barra() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [estado, setEstado] = useState<'quieta' | 'cargando' | 'terminando'>('quieta');
  const temporizadores = useRef<ReturnType<typeof setTimeout>[]>([]);
  const limpiar = () => { temporizadores.current.forEach(clearTimeout); temporizadores.current = []; };
  const direccion = pathname + '?' + searchParams.toString();

  // Llegó la pantalla nueva: completar y desaparecer.
  useEffect(() => {
    limpiar();
    setEstado((actual) => (actual === 'quieta' ? actual : 'terminando'));
    temporizadores.current.push(setTimeout(() => setEstado('quieta'), 350));
    return limpiar;
  }, [direccion]);

  useEffect(() => {
    const alTocar = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      const enlace = (e.target as HTMLElement).closest('a');
      if (!enlace?.href || enlace.target === '_blank' || enlace.hasAttribute('download')) return;
      try {
        const destino = new URL(enlace.href, window.location.href);
        if (destino.origin !== window.location.origin) return;
        if (destino.pathname === window.location.pathname && destino.search === window.location.search) return;
        // El modo sin conexión es una página aparte que se abre entera: no hace falta la barra.
        if (destino.pathname.startsWith('/offline')) return;
        limpiar();
        temporizadores.current.push(setTimeout(() => setEstado('cargando'), DEMORA_MS));
        temporizadores.current.push(setTimeout(() => setEstado('quieta'), MAXIMO_MS));
      } catch { /* una dirección rara no corta la navegación */ }
    };
    document.addEventListener('click', alTocar, true);
    return () => document.removeEventListener('click', alTocar, true);
  }, []);

  if (estado === 'quieta') return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]">
      <div
        className={estado === 'cargando'
          ? 'h-full w-[85%] origin-left animate-[barra-navegacion_8s_cubic-bezier(0.1,0.7,0.2,1)] bg-gm-yellow shadow-[0_1px_6px_hsl(var(--gm-yellow)/0.5)] motion-reduce:animate-none'
          : 'h-full w-full bg-gm-yellow opacity-0 transition-opacity duration-300'}
      />
      <span role="status" className="sr-only">{estado === 'cargando' ? 'Cargando la pantalla…' : ''}</span>
    </div>
  );
}

export function BarraNavegacion() {
  return (
    <Suspense fallback={null}>
      <Barra />
    </Suspense>
  );
}
