'use client';
import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export function OfflineConsultation() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  return <>
    <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-xs text-muted-foreground hover:text-gm-yellow" onClick={() => { setStatus(''); setOpen(true); }}><Download className="size-3.5" />Modo sin conexión</button>
    <Dialog open={open} onOpenChange={value => { if (busy) return; setOpen(value); setPassword(''); setConfirmation(''); }}><DialogContent><DialogHeader><DialogTitle>Activar equipo de contingencia</DialogTitle><DialogDescription>Este será el único equipo de contingencia de la playa. Permite registrar entradas por patente y cobrar salidas por hora, con sincronización posterior.</DialogDescription></DialogHeader>
      <form className="space-y-4" onSubmit={async event => {
        event.preventDefault();
        if (password !== confirmation) { setStatus('Las frases no coinciden.'); return; }
        setBusy(true); setStatus('Preparando equipo…');
        try {
          if (!window.isSecureContext || !('serviceWorker' in navigator)) throw new Error('Necesitás HTTPS y un navegador compatible.');
          await Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => setTimeout(() => reject(new Error('La app offline aún no está lista. Recargá y volvé a intentar.')), 15000))]);
          const moduleUrl = '/offline-vault.js';
          const vault = await import(/* webpackIgnore: true */ moduleUrl);
          if (typeof vault.hasOperations !== 'function') throw new Error('Hay una actualización pendiente. Cerrá todas las ventanas de la app y volvé a abrirla con conexión.');
          if (await vault.hasOperations()) throw new Error('Este equipo ya tiene una contingencia guardada. Abrí el modo operativo para sincronizar o finalizar; no se reemplazaron sus datos.');
          let deviceId = localStorage.getItem('parking-contingency-device');
          if (!deviceId) { deviceId = crypto.randomUUID(); localStorage.setItem('parking-contingency-device', deviceId); }
          const response = await fetch('/api/offline/prepare', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceId }), signal: AbortSignal.timeout(25000) });
          if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Revisá tu sesión y conexión.');
          const snapshot = await response.json();
          if (!response.ok) throw new Error(snapshot.message || 'No se pudo activar este equipo.');
          await vault.saveOperations({ ...snapshot, deviceId, pending: [], syncedCount: 0 }, password);
          setPassword(''); setConfirmation('');
          setStatus(`Equipo listo: ${snapshot.vehicles.length} vehículos. Abrí el modo operativo desde el enlace de abajo.`);
        } catch (error) { setStatus(error instanceof Error ? error.message : 'No se pudo guardar la copia.'); }
        finally { setBusy(false); }
      }}>
        <p className="rounded-lg border border-gm-yellow/20 bg-gm-yellow/5 p-3 text-sm">Requiere turnos desactivados. Admite estadías por hora; no abonos Día/Sem/Mes, cortesías ni devoluciones. Se autoriza por 24 horas; las operaciones pendientes se conservan aunque venza.</p>
        <p className="text-xs text-muted-foreground">Los datos y las operaciones quedan cifrados. Usá una frase distinta de tu contraseña y conservala: sin ella no podrás recuperar operaciones pendientes. No borres datos del navegador ni cambies de equipo hasta sincronizar y finalizar la contingencia.</p>
        <label className="block space-y-1 text-sm"><span>Frase de acceso (mínimo 12 caracteres)</span><Input type="password" autoComplete="new-password" minLength={12} required disabled={busy} value={password} onChange={e => setPassword(e.target.value)} /></label>
        <label className="block space-y-1 text-sm"><span>Repetir frase</span><Input type="password" autoComplete="new-password" minLength={12} required disabled={busy} value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label>
        <p role="status" className="text-sm">{status}</p><Button disabled={busy}>{busy ? 'Guardando…' : 'Activar este equipo'}</Button>
        <a href="/offline.html" className="block text-sm text-gm-yellow underline">Abrir modo operativo</a>
      </form>
    </DialogContent></Dialog>
  </>;
}
