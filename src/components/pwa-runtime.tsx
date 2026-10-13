'use client';
import { useEffect, useState } from 'react';
import { setInstallPrompt, type InstallPrompt } from '@/lib/pwa-install';
import { WifiOff } from 'lucide-react';
import { VERSION_APP, recargarUnaVez } from '@/lib/version-app';

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
    let ultimaConsulta = 0;
    const revisarVersion = async () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return;
      if (Date.now() - ultimaConsulta < 60_000) return;
      ultimaConsulta = Date.now();
      try {
        const respuesta = await fetch('/api/version', { cache: 'no-store' });
        if (!respuesta.ok) return;
        const { version } = (await respuesta.json()) as { version?: string };
        if (version && version !== VERSION_APP) recargarUnaVez();
      } catch {
        // Sin respuesta no se sabe nada: se sigue con la página como está.
      }
    };
    const alVolver = () => void revisarVersion();
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('pageshow', alVolver);
    window.addEventListener('online', alVolver);
    if ('serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {
        // Preparation checks registration separately and reports failure to the user.
      });
    }
    return () => { document.removeEventListener('visibilitychange', alVolver); window.removeEventListener('pageshow', alVolver); window.removeEventListener('online', alVolver); window.removeEventListener('online', update); window.removeEventListener('offline', update); window.removeEventListener('beforeinstallprompt', install); window.removeEventListener('appinstalled', installed); };
  }, []);
  if (!offline) return null;
  return <div role="status" className="px-4 py-2"><a className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-secondary/40 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground" href="/offline.html"><WifiOff className="size-3.5" />Abrir modo sin conexión</a></div>;
}
