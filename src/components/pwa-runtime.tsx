'use client';
import { useEffect, useState } from 'react';
import { setInstallPrompt, type InstallPrompt } from '@/lib/pwa-install';
import { WifiOff } from 'lucide-react';

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
    if ('serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {
        // Preparation checks registration separately and reports failure to the user.
      });
    }
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); window.removeEventListener('beforeinstallprompt', install); window.removeEventListener('appinstalled', installed); };
  }, []);
  if (!offline) return null;
  return <div role="status" className="px-4 py-2"><a className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-secondary/40 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground" href="/offline.html"><WifiOff className="size-3.5" />Abrir modo sin conexión</a></div>;
}
