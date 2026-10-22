'use client';
import { useEffect, useRef } from 'react';

// Android puede limitar los timers ocultos, pero no dependemos de esa suspensión para ahorrar.
// Al volver a la app se recupera lo ocurrido antes de reiniciar el intervalo.
export function useForegroundPoll(callback: () => void, intervalMs: number, { immediate = true, onlineOnly = true, enabled = true } = {}) {
  const fn = useRef(callback);
  useEffect(() => { fn.current = callback; });
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const stop = () => { clearInterval(timer); timer = undefined; };
    const available = () => !document.hidden && (!onlineOnly || navigator.onLine);
    const run = () => { if (available()) fn.current(); };
    const start = (runNow = true) => {
      stop();
      if (!available()) return;
      if (runNow) run();
      timer = setInterval(run, intervalMs);
    };
    const resume = () => start();
    start(immediate);
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('pageshow', resume);
    window.addEventListener('pagehide', stop);
    if (onlineOnly) { window.addEventListener('online', resume); window.addEventListener('offline', stop); }
    return () => {
      stop();
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('pageshow', resume);
      window.removeEventListener('pagehide', stop);
      window.removeEventListener('online', resume);
      window.removeEventListener('offline', stop);
    };
  }, [intervalMs, immediate, onlineOnly, enabled]);
}
