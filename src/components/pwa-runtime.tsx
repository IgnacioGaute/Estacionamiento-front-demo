'use client';
import { useEffect, useState } from 'react';
import { setInstallPrompt, type InstallPrompt } from '@/lib/pwa-install';
import { WifiOff } from 'lucide-react';
import { VERSION_APP, esDeOtraVersion, recargarUnaVez } from '@/lib/version-app';
import { avisarVersionNueva } from '@/lib/aviso-version';

export function PwaRuntime() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => {
      setOffline(!navigator.onLine);
      const path = window.location.pathname;
      if (!navigator.onLine && path !== '/offline.html' && !path.startsWith('/auth/')) {
        const moduleUrl = '/offline-vault.js';
        void import(/* webpackIgnore: true */ moduleUrl).then(async vault => {
          if (!navigator.onLine && await vault.hasOperations()) window.location.replace('/offline.html');
        }).catch(() => { /* Keep the recovery link if this device is not prepared. */ });
      }
    };
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    const install = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPrompt); };
    const installed = () => setInstallPrompt(null);
    window.addEventListener('beforeinstallprompt', install);
    window.addEventListener('appinstalled', installed);
    // Al volver a la app (celular apagado, otra aplicación, pestaña restaurada) se pregunta si hay
    // un despliegue nuevo: la página vieja pide JavaScript y acciones que ya no existen y termina
    // en «Application error». Recargar antes de tocar nada lo evita. Una consulta por minuto como
    // mucho, y nunca sin conexión (ahí manda el modo sin conexión).
    //
    // Con la app abierta y en pantalla durante un despliegue no hay «volver»: se consulta además
    // cada 5 minutos. Ahí sí se cuida no cortar un trabajo: solo recarga si no hay un diálogo
    // abierto ni un campo en uso; si no, espera a la consulta siguiente.
    let ultimaConsulta = 0;
    // Con un diálogo abierto (un cobro esperando la transferencia, una entrada a medio cargar) o un
    // campo en uso, nunca se recarga sola: se avisa y la persona elige cuándo.
    const trabajando = () => {
      const activo = document.activeElement;
      return !!document.querySelector('[role="dialog"], [role="alertdialog"]')
        || activo instanceof HTMLInputElement || activo instanceof HTMLTextAreaElement || activo instanceof HTMLSelectElement;
    };
    const versionNueva = (accionRechazada: boolean) => {
      // Sin nada a medio hacer, recarga sola (una vez por minuto como mucho: sin bucles).
      if (!accionRechazada && !trabajando() && recargarUnaVez()) return;
      avisarVersionNueva(accionRechazada);
    };
    const revisarVersion = async () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return;
      if (Date.now() - ultimaConsulta < 60_000) return;
      ultimaConsulta = Date.now();
      try {
        const respuesta = await fetch('/api/version', { cache: 'no-store' });
        if (!respuesta.ok) return;
        const { version } = (await respuesta.json()) as { version?: string };
        if (version && version !== VERSION_APP) versionNueva(false);
      } catch {
        // Sin respuesta no se sabe nada: se sigue con la página como está.
      }
    };
    const alVolver = () => void revisarVersion();
    const periodica = window.setInterval(() => void revisarVersion(), 5 * 60_000);
    // Una acción de servidor de otra versión: Next contesta con este encabezado y la acción NO se
    // ejecutó. Muchos formularios atrapan el error y muestran un aviso genérico («No se pudo
    // guardar»), así que nunca llega a la pantalla de error: se detecta acá, para todos.
    const fetchOriginal = window.fetch;
    // Con bind: fetch llamado sin `this` falla en algunos navegadores (Illegal invocation).
    const llamar = fetchOriginal.bind(window);
    const fetchObservado: typeof window.fetch = async (...args) => {
      const respuesta = await llamar(...args);
      if (respuesta.headers.get('x-nextjs-action-not-found') === '1') versionNueva(true);
      return respuesta;
    };
    window.fetch = fetchObservado;
    // Un módulo de la versión anterior que ya no existe, pedido desde un manejador (no un render).
    const rechazoSinAtender = (event: PromiseRejectionEvent) => { if (esDeOtraVersion(event.reason)) versionNueva(true); };
    window.addEventListener('unhandledrejection', rechazoSinAtender);
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('pageshow', alVolver);
    window.addEventListener('online', alVolver);
    if ('serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {
        // Preparation checks registration separately and reports failure to the user.
      });
    }
    return () => { if (window.fetch === fetchObservado) window.fetch = fetchOriginal; window.removeEventListener('unhandledrejection', rechazoSinAtender); window.clearInterval(periodica); document.removeEventListener('visibilitychange', alVolver); window.removeEventListener('pageshow', alVolver); window.removeEventListener('online', alVolver); window.removeEventListener('online', update); window.removeEventListener('offline', update); window.removeEventListener('beforeinstallprompt', install); window.removeEventListener('appinstalled', installed); };
  }, []);
  if (!offline) return null;
  // Sin red es la salida principal: en el color de aviso y con 44 px para el pulgar. Antes era una
  // píldora gris de 12 px que se confundía con un detalle.
  return <div role="status" className="px-4 py-2"><a className="inline-flex min-h-11 items-center gap-2 rounded-full border border-gm-aviso/40 bg-gm-aviso/10 px-4 text-sm font-semibold text-gm-aviso transition-colors hover:bg-gm-aviso/15" href="/offline.html"><WifiOff className="size-4" aria-hidden />Abrir modo sin conexión</a></div>;
}
