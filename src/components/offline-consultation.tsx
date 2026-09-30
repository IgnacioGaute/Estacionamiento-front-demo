'use client';
import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

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
        if (!window.isSecureContext || !('serviceWorker' in navigator)) throw new Error('El acceso sin conexión requiere HTTPS.');
        await Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => setTimeout(() => reject(new Error('Preparando acceso sin conexión…')), 15000))]);
        const moduleUrl = '/offline-vault.js';
        const vault = await import(/* webpackIgnore: true */ moduleUrl);
        if (typeof vault.getDeviceAccess !== 'function') throw new Error('Cerrá y reabrí la app para actualizar el acceso sin conexión.');
        const password = await vault.getDeviceAccess();
        const exists = await vault.hasOperations();
        if (exists && !password) throw new Error('Hay datos anteriores protegidos: abrilos una vez con tu frase para conservarlos.');
        const previous = exists ? await vault.openOperations(password) : null;
        if (previous?.state.pending.length) { setReady(true); setStatus(''); return; }
        let deviceId = localStorage.getItem('parking-contingency-device');
        if (!deviceId) { deviceId = crypto.randomUUID(); localStorage.setItem('parking-contingency-device', deviceId); }
        const response = await fetch('/api/offline/prepare', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Parking-Offline': '1' }, body: JSON.stringify({ deviceId, refresh: true }), signal: AbortSignal.timeout(25000) });
        if (!response.headers.get('content-type')?.includes('application/json')) {
          throw new Error(response.redirected || response.status === 401
            ? 'Tu sesión venció. Volvé a iniciar sesión para preparar este teléfono.'
            : `No se pudo preparar este teléfono (respuesta ${response.status}).`);
        }
        const snapshot = await response.json();
        if (!response.ok) {
          throw new Error(snapshot.message || 'No se pudo preparar el acceso sin conexión.');
        }
        if (stopped) return;
        const access = password || crypto.randomUUID() + crypto.randomUUID();
        if (!password) await vault.rememberDeviceAccess(access);
        const sameScope = previous?.state.userId === snapshot.userId && previous?.state.playaId === snapshot.playaId;
        const freshReceipts = Array.isArray(snapshot.receipts) ? snapshot.receipts : [];
        const freshKeys = new Set(freshReceipts.map((receipt: { registrationId: string; kind: string }) => `${receipt.registrationId}:${receipt.kind}`));
        const keptReceipts = sameScope ? (previous?.state.receipts || []).filter((receipt: { registrationId?: string; kind: string }) => !receipt.registrationId || !freshKeys.has(`${receipt.registrationId}:${receipt.kind}`)).slice(-150) : [];
        await vault.saveOperations({ ...snapshot, receiptBase: process.env.NEXT_PUBLIC_RECEIPTS_URL?.replace(/\/+$/, '') || '', deviceId, pending: [], syncedCount: 0, receipts: [...freshReceipts, ...keptReceipts] }, access, previous?.revision || 0);
        setReady(true);
        setStatus('');
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
    window.addEventListener('parking-shift-changed', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { stopped = true; clearInterval(interval); window.removeEventListener('online', refresh); window.removeEventListener('parking-shift-changed', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [revision, retry]);
  if (ready) return <a href="/offline.html" className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border/70 bg-secondary/30 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-gm-yellow/40 hover:bg-secondary/60 hover:text-foreground"><WifiOff className="size-3.5" />Abrir modo sin conexión</a>;
  if (!status) return null;
  return <div role="status" className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>{status}</span><button type="button" className="underline" onClick={() => setRetry(value => value + 1)}>Reintentar</button></div>;
}
