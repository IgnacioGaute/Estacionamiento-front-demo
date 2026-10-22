'use client';
import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { WifiOff } from 'lucide-react';
import { useTenant } from './tenant-provider';
import { useForegroundPoll } from '@/hooks/use-foreground-poll';
import { loadOfflineVault } from '@/lib/offline-vault-client';

export function OfflineConsultation({ revision }: { revision?: unknown }) {
  const [status, setStatus] = useState('');
  const [ready, setReady] = useState(false);
  const [loginRequired, setLoginRequired] = useState(false);
  const [retry, setRetry] = useState(0);
  const { playaId } = useTenant();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const refreshRef = useRef<() => void>(() => {});
  const scheduleRef = useRef<() => void>(() => {});
  const lastRevision = useRef(revision);
  useEffect(() => {
    setReady(false); setStatus(''); setLoginRequired(false);
    if (!playaId || !userId) return;
    let stopped = false, busy = false, again = false;
    let debounce: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    // La lectura descifrada se conserva solo en este montaje y cuenta/playa. La revisión de
    // IndexedDB detecta cualquier cambio de otra pestaña antes de poder reutilizarla.
    let cached: { state: any; revision: number } | null = null;
    async function prepare() {
      if (stopped || !navigator.onLine || document.hidden) return;
      if (busy) { again = true; return; }
      busy = true;
      const request = new AbortController(); controller = request;
      let timedOut = false;
      const timeout = setTimeout(() => { timedOut = true; request.abort(); }, 25000);
      let swTimeout: ReturnType<typeof setTimeout> | undefined;
      try {
        if (!window.isSecureContext || !('serviceWorker' in navigator)) throw new Error('El acceso sin conexión requiere HTTPS.');
        try {
          await Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => { swTimeout = setTimeout(() => reject(new Error('Preparando acceso sin conexión…')), 15000); })]);
        } finally { clearTimeout(swTimeout); }
        if (stopped || request.signal.aborted) return;
        const vault = await loadOfflineVault();
        if (typeof vault.getDeviceAccess !== 'function') throw new Error('Cerrá y reabrí la app para actualizar el acceso sin conexión.');
        const password = await vault.getDeviceAccess();
        const storedRevision = typeof vault.getOperationsRevision === 'function' ? await vault.getOperationsRevision() : undefined;
        const exists = storedRevision === undefined ? await vault.hasOperations() : storedRevision !== null;
        if (exists && !password) throw new Error('Hay datos anteriores protegidos: abrilos una vez con tu frase para conservarlos.');
        const previous = exists ? (storedRevision !== undefined && cached?.revision === storedRevision ? cached : await vault.openOperations(password)) : null;
        cached = previous;
        if (stopped || request.signal.aborted) return;
        const sameAccount = previous?.state.userId === userId && previous?.state.playaId === playaId;
        if (previous?.state.pending.length) {
          if (!sameAccount) throw new Error('Hay operaciones pendientes de otra cuenta o playa. Volvé a esa cuenta para sincronizarlas.');
          setReady(true); setStatus(''); return;
        }
        let deviceId = localStorage.getItem('parking-contingency-device');
        if (!deviceId) { deviceId = crypto.randomUUID(); localStorage.setItem('parking-contingency-device', deviceId); }
        if (stopped || request.signal.aborted) return;
        const response = await fetch('/api/offline/prepare', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Parking-Offline': '1' }, body: JSON.stringify({ deviceId, refresh: true, knownSessionId: sameAccount ? previous?.state.sessionId : undefined }), signal: request.signal });
        if (response.status === 401 || response.redirected) {
          if (!stopped) setLoginRequired(true);
          throw new Error('Iniciá sesión con conexión para preparar o actualizar este equipo. Si ya tenías una copia, usá «Abrir modo sin conexión».');
        }
        if (!response.headers.get('content-type')?.includes('application/json')) {
          throw new Error(response.redirected || response.status === 401 ? 'Tu sesión venció. Volvé a iniciar sesión para preparar este teléfono.' : `No se pudo preparar este teléfono (respuesta ${response.status}).`);
        }
        const snapshot = await response.json();
        if (!response.ok) throw new Error(snapshot.message || 'No se pudo preparar el acceso sin conexión.');
        if (stopped || request.signal.aborted) return;
        if (snapshot.unchanged === true) {
          if (!sameAccount || snapshot.sessionId !== previous?.state.sessionId || snapshot.expiresAt <= Date.now()) throw new Error('No se pudo verificar la copia sin conexión.');
          setReady(true); setStatus(''); return;
        }
        if (snapshot.userId !== userId || snapshot.playaId !== playaId) throw new Error('La cuenta o playa cambió. Volvé a abrir esta pantalla.');
        const access = password || crypto.randomUUID() + crypto.randomUUID();
        if (!password) await vault.rememberDeviceAccess(access);
        const freshReceipts = Array.isArray(snapshot.receipts) ? snapshot.receipts : [];
        const freshKeys = new Set(freshReceipts.map((receipt: { registrationId: string; kind: string }) => `${receipt.registrationId}:${receipt.kind}`));
        const keptReceipts = sameAccount && snapshot.modalidad !== 'GRATUITO' ? (previous?.state.receipts || []).filter((receipt: { registrationId?: string; kind: string }) => !receipt.registrationId || !freshKeys.has(`${receipt.registrationId}:${receipt.kind}`)).slice(-150) : [];
        const state = { ...snapshot, receiptBase: process.env.NEXT_PUBLIC_RECEIPTS_URL?.replace(/\/+$/, '') || '', deviceId, pending: [], syncedCount: 0, receipts: [...freshReceipts, ...keptReceipts] };
        const savedRevision = await vault.saveOperations(state, access, previous?.revision || 0);
        cached = { state, revision: savedRevision };
        if (!stopped) { setReady(true); setStatus(''); }
      } catch (error) {
        if (!stopped && (!request.signal.aborted || timedOut)) { setReady(false); setStatus(timedOut ? 'No se pudo actualizar la copia sin conexión. Reintentá cuando mejore la conexión.' : error instanceof Error ? error.message : 'No se pudo preparar el acceso sin conexión.'); }
      } finally {
        clearTimeout(timeout); busy = false;
        if (again) { again = false; schedule(); }
      }
    }
    const refresh = () => {
      if (busy) { again = true; return; }
      if (navigator.locks) void navigator.locks.request('parking-auto-prepare', { ifAvailable: true }, lock => lock ? prepare() : undefined);
      else void prepare();
    };
    // Una ráfaga de entradas se agrupa por un segundo; no se posterga indefinidamente una playa activa.
    function schedule() { if (!stopped && !debounce && !document.hidden && navigator.onLine) debounce = setTimeout(() => { debounce = undefined; refresh(); }, 1000); }
    const suspend = () => { if (document.hidden) { clearTimeout(debounce); debounce = undefined; controller?.abort(); } };
    refreshRef.current = refresh; scheduleRef.current = schedule;
    refresh();
    window.addEventListener('parking-shift-changed', schedule);
    document.addEventListener('visibilitychange', suspend);
    const pagehide = () => controller?.abort();
    window.addEventListener('pagehide', pagehide);
    return () => {
      stopped = true; cached = null; controller?.abort(); clearTimeout(debounce);
      refreshRef.current = () => {}; scheduleRef.current = () => {};
      window.removeEventListener('parking-shift-changed', schedule);
      document.removeEventListener('visibilitychange', suspend);
      window.removeEventListener('pagehide', pagehide);
    };
  }, [playaId, userId, retry]);
  useForegroundPoll(() => refreshRef.current(), 60000, { immediate: false, enabled: !!playaId && !!userId });
  useEffect(() => { if (lastRevision.current !== revision) { lastRevision.current = revision; scheduleRef.current(); } }, [revision]);
  // Abrir la copia local no depende de la sesión del servidor. El shell comprueba los datos,
  // su vigencia y los pendientes; la API sigue autorizando cada sincronización.
  return <div className="flex flex-col items-start gap-2">
    <a href="/offline.html" className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border/70 bg-secondary/30 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-gm-yellow/40 hover:bg-secondary/60 hover:text-foreground"><WifiOff className="size-3.5" />Abrir modo sin conexión</a>
    {!ready && status && <div role="status" className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>{status}</span>{loginRequired ? <a href="/auth/login?callbackUrl=%2Ftickets" className="underline">Iniciar sesión</a> : <button type="button" className="underline" onClick={() => setRetry(value => value + 1)}>Reintentar</button>}</div>}
  </div>;
}
