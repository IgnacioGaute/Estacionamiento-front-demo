'use client';
import { useCallback, useEffect, useRef } from 'react';

// Los avisos en vivo no se reenvían: lo que pasa mientras el socket está caído (equipo
// suspendido, pestaña congelada, corte de red, reinicio del backend) se pierde. Por eso la
// pantalla vuelve a pedir todo al volver a verse, al recuperar la red, cada `cadaMs` mientras se
// ve, y cuando el socket se (re)conecta (con la función que devuelve este hook). Llamadas muy
// seguidas se juntan en una al final de la ventana, para no perder la que llega después de que
// el socket ya volvió.
const VENTANA_MS = 3000;

export function useResincronizar(resincronizar: () => void, cadaMs = 60_000) {
  const fn = useRef(resincronizar);
  useEffect(() => { fn.current = resincronizar; });
  const ultima = useRef(0);
  const pendiente = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pedir = useCallback(() => {
    if (pendiente.current) return;
    const espera = ultima.current + VENTANA_MS - Date.now();
    const correr = () => {
      pendiente.current = null;
      ultima.current = Date.now();
      fn.current();
    };
    if (espera <= 0) correr();
    else pendiente.current = setTimeout(correr, espera);
  }, []);

  useEffect(() => {
    const siSeVe = () => { if (document.visibilityState === 'visible') pedir(); };
    const id = setInterval(siSeVe, cadaMs);
    document.addEventListener('visibilitychange', siSeVe);
    window.addEventListener('online', siSeVe);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', siSeVe);
      window.removeEventListener('online', siSeVe);
      if (pendiente.current) clearTimeout(pendiente.current);
      pendiente.current = null;
    };
  }, [cadaMs, pedir]);

  return pedir;
}
