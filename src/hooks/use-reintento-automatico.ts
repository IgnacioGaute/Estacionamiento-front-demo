'use client';
import { useEffect, useRef, useState } from 'react';
import { esperaReintento } from '@/lib/reintentos';

/**
 * Reintentos automáticos de una LECTURA que falló. Recibe cuántos fallos seguidos lleva (0 = anda
 * bien) y programa el próximo intento con espera progresiva; después de `maxIntentos` deja de
 * insistir solo, pero vuelve a probar una vez al recuperar la conexión o al volver a la app
 * (celular desbloqueado, otra aplicación). Nunca mientras está oculta u offline, y nunca dos a la
 * vez: `reintentar` lo llama solo este hook o la persona, y quien lo implementa ignora el pedido si
 * ya hay uno en curso. No usar para escrituras: su resultado se consulta, no se repite.
 */
export function useReintentoAutomatico(
  fallosSeguidos: number,
  reintentar: () => void,
  { maxIntentos = 4, baseMs = 2_000, maxMs = 30_000, retryAfterMs = null as number | null } = {},
) {
  const fn = useRef(reintentar);
  useEffect(() => { fn.current = reintentar; });
  const [proximoEl, setProximoEl] = useState<number | null>(null);

  useEffect(() => {
    if (fallosSeguidos === 0 || fallosSeguidos > maxIntentos) { setProximoEl(null); return; }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const programar = () => {
      clearTimeout(timer);
      const espera = esperaReintento(fallosSeguidos, { baseMs, maxMs, retryAfterMs });
      setProximoEl(Date.now() + espera);
      timer = setTimeout(() => {
        // Oculta u offline: lo retoma el listener de abajo al volver.
        if (document.hidden || !navigator.onLine) return;
        setProximoEl(null);
        fn.current();
      }, espera);
    };
    programar();
    return () => clearTimeout(timer);
  }, [fallosSeguidos, maxIntentos, baseMs, maxMs, retryAfterMs]);

  // Al volver la red o la app: un intento ahora, también si ya se agotaron los automáticos.
  useEffect(() => {
    if (fallosSeguidos === 0) return;
    let ultimo = 0;
    const alVolver = () => {
      if (document.hidden || !navigator.onLine) return;
      // pageshow, visibilitychange y online suelen llegar juntos: uno solo.
      if (Date.now() - ultimo < 3_000) return;
      ultimo = Date.now();
      fn.current();
    };
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('online', alVolver);
    window.addEventListener('pageshow', alVolver);
    return () => {
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('online', alVolver);
      window.removeEventListener('pageshow', alVolver);
    };
  }, [fallosSeguidos]);

  return { proximoEl, agotado: fallosSeguidos > maxIntentos };
}
