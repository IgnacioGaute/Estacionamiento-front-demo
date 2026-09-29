'use client';
import { useEffect, useState } from 'react';

export function OfflineConsultation({ revision }: { revision?: unknown }) {
  const [status, setStatus] = useState('');
  const [ready, setReady] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let stopped = false, busy = false;
    async function prepare() {
      if (busy || !navigator.onLine || document.hidden) return;
      busy = true;
      try {
        setReady(false);
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
        const response = await fetch('/api/offline/prepare', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Parking-Offline': '1' }, body: JSON.stringify({ deviceId, refresh: true }), signal: AbortSignal.timeout(25000) });
        if (!response.headers.get('content-type')?.includes('application/json')) {
          throw new Error(response.redirected || response.status === 401
            ? 'Tu sesión venció. Volvé a iniciar sesión para preparar este teléfono.'
            : `No se pudo preparar este teléfono (respuesta ${response.status}).`);
        }
        const snapshot = await response.json();
        if (!response.ok) throw new Error(snapshot.message || 'No se pudo preparar el acceso sin conexión.');
        if (stopped) return;
        const access = password || crypto.randomUUID() + crypto.randomUUID();
        if (!password) await vault.rememberDeviceAccess(access);
        const sameScope = previous?.state.userId === snapshot.userId && previous?.state.playaId === snapshot.playaId;
        await vault.saveOperations({ ...snapshot, deviceId, pending: [], syncedCount: 0, receipts: sameScope ? previous?.state.receipts || [] : [] }, access, previous?.revision || 0);
        setReady(true);
        setStatus('Este teléfono está preparado para registrar entradas y salidas sin conexión.');
      } catch (error) { if (!stopped) { setReady(false); setStatus(error instanceof Error ? error.message : 'No se pudo preparar el acceso sin conexión.'); } }
      finally { busy = false; }
    }
    const refresh = () => {
      if (navigator.locks) void navigator.locks.request('parking-auto-prepare', { ifAvailable: true }, lock => lock ? prepare() : undefined);
      else void prepare();
    };
    refresh();
    const interval = setInterval(refresh, 60000);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { stopped = true; clearInterval(interval); window.removeEventListener('online', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [revision, retry]);
  if (!status) return null;
  return <div role="status" className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
    <span>{status}</span>
    {ready ? <a href="/offline.html" className="underline">Abrir modo sin conexión</a> : <button type="button" className="underline" onClick={() => setRetry(value => value + 1)}>Reintentar</button>}
  </div>;
}
