'use client';
import { useEffect, useState } from 'react';
import { setInstallPrompt, type InstallPrompt } from '@/lib/pwa-install';

export function PwaRuntime() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    const install = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPrompt); };
    const installed = () => setInstallPrompt(null);
    window.addEventListener('beforeinstallprompt', install);
    window.addEventListener('appinstalled', installed);
    if ('serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {
        // Preparation checks registration separately and reports failure to the user.
      });
    }
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); window.removeEventListener('beforeinstallprompt', install); window.removeEventListener('appinstalled', installed); };
  }, []);
  if (!offline) return null;
  return <div role="status" className="border-b border-gm-yellow/30 bg-gm-yellow/10 px-4 py-3 text-center text-sm">Sin conexión. No confirmes operaciones hasta recuperar el acceso. <a className="font-semibold text-gm-yellow underline" href="/offline.html">Abrir consulta guardada</a></div>;
}
