'use client';
import { useEffect, useState } from 'react';

export function OfflineConsultation({ revision }: { revision?: unknown }) {
  const [status, setStatus] = useState('');
  useEffect(() => {
    let stopped = false, busy = false;
    async function prepare() {
      if (busy || !navigator.onLine || document.hidden) return;
      busy = true;
      try {
        if (!window.isSecureContext || !('serviceWorker' in navigator)) throw new Error('El acceso sin conexión requiere HTTPS.');
        await Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => setTimeout(() => reject(new Error('Preparando acceso sin conexión…')), 15000))]);
        const moduleUrl = '/offline-vault.js';
        const vault = await import(/* webpackIgnore: true */ moduleUrl);
        if (typeof vault.getDeviceAccess !== 'function') throw new Error('Cerrá y reabrí la app para actualizar el acceso sin conexión.');
        const password = await vault.getDeviceAccess();
        const exists = await vault.hasOperations();
        if (exists && !password) throw new Error('Hay datos anteriores protegidos: abrilos una vez con tu frase para conservarlos.');
        const previous = exists ? await vault.openOperations(password) : null;
        if (previous?.state.pending.length) { setStatus('Hay movimientos por sincronizar.'); return; }
        let deviceId = localStorage.getItem('parking-contingency-device');
        if (!deviceId) { deviceId = crypto.randomUUID(); localStorage.setItem('parking-contingency-device', deviceId); }
        const response = await fetch('/api/offline/prepare', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceId, refresh: true }), signal: AbortSignal.timeout(25000) });
        if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('No se pudo actualizar el acceso sin conexión.');
        const snapshot = await response.json();
        if (!response.ok) throw new Error(snapshot.message || 'No se pudo preparar el acceso sin conexión.');
        if (stopped) return;
        const access = password || crypto.randomUUID() + crypto.randomUUID();
        if (!password) await vault.rememberDeviceAccess(access);
        const sameScope = previous?.state.userId === snapshot.userId && previous?.state.playaId === snapshot.playaId;
        await vault.saveOperations({ ...snapshot, deviceId, pending: [], syncedCount: 0, receipts: sameScope ? previous?.state.receipts || [] : [] }, access, previous?.revision || 0);
        setStatus('');
      } catch (error) { if (!stopped) setStatus(error instanceof Error ? error.message : 'No se pudo preparar el acceso sin conexión.'); }
      finally { busy = false; }
    }
    const refresh = () => {
      if (navigator.locks) void navigator.locks.request('parking-auto-prepare', { ifAvailable: true }, lock => lock ? prepare() : undefined);
      else setStatus('Este navegador no permite preparar de forma segura el acceso automático.');
    };
    refresh();
    const interval = setInterval(refresh, 60000);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { stopped = true; clearInterval(interval); window.removeEventListener('online', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [revision]);
  if (!status) return null;
  return <p role="status" className="text-xs text-muted-foreground">{status} <a href="/offline.html" className="underline">Ver datos locales</a></p>;
}
