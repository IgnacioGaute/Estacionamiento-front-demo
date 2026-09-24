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
    <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-xs text-muted-foreground hover:text-gm-yellow" onClick={() => { setStatus(''); setOpen(true); }}><Download className="size-3.5" />Consulta sin conexión</button>
    <Dialog open={open} onOpenChange={value => { if (busy) return; setOpen(value); setPassword(''); setConfirmation(''); }}><DialogContent><DialogHeader><DialogTitle>Preparar consulta sin conexión</DialogTitle><DialogDescription>Guardá una copia cifrada de vehículos activos y tarifas de referencia en este dispositivo. Vence en 24 horas.</DialogDescription></DialogHeader>
      <form className="space-y-4" onSubmit={async event => {
        event.preventDefault();
        if (password !== confirmation) { setStatus('Las frases no coinciden.'); return; }
        setBusy(true); setStatus('Preparando copia…');
        try {
          if (!window.isSecureContext || !('serviceWorker' in navigator)) throw new Error('Necesitás HTTPS y un navegador compatible.');
          await Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => setTimeout(() => reject(new Error('La app offline aún no está lista. Recargá y volvé a intentar.')), 15000))]);
          const response = await fetch('/api/offline/snapshot', { cache: 'no-store', signal: AbortSignal.timeout(20000) });
          if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('No se pudo preparar la copia. Revisá tu sesión y conexión.');
          const snapshot = await response.json();
          const moduleUrl = '/offline-vault.js';
          const vault = await import(/* webpackIgnore: true */ moduleUrl);
          await vault.saveSnapshot(snapshot, password);
          setPassword(''); setConfirmation('');
          setStatus(`Copia guardada: ${snapshot.vehicles.length} vehículos. Podés abrirla desde el enlace de abajo.`);
        } catch (error) { setStatus(error instanceof Error ? error.message : 'No se pudo guardar la copia.'); }
        finally { setBusy(false); }
      }}>
        <p className="rounded-lg border border-gm-yellow/20 bg-gm-yellow/5 p-3 text-sm">Solo consulta. Registrar entradas, cobrar y sincronizar sin conexión todavía no está habilitado.</p>
        <p className="text-xs text-muted-foreground">La copia reemplaza cualquier copia anterior de este navegador. No incluye teléfonos ni claves de sesión. Usá una frase distinta de tu contraseña; no se envía al servidor. Si la olvidás, tendrás que preparar otra copia con conexión.</p>
        <label className="block space-y-1 text-sm"><span>Frase de acceso (mínimo 12 caracteres)</span><Input type="password" autoComplete="new-password" minLength={12} required disabled={busy} value={password} onChange={e => setPassword(e.target.value)} /></label>
        <label className="block space-y-1 text-sm"><span>Repetir frase</span><Input type="password" autoComplete="new-password" minLength={12} required disabled={busy} value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label>
        <p role="status" className="text-sm">{status}</p><Button disabled={busy}>{busy ? 'Guardando…' : 'Guardar copia en este dispositivo'}</Button>
        <a href="/offline.html" className="block text-sm text-gm-yellow underline">Abrir consulta guardada</a>
      </form>
    </DialogContent></Dialog>
  </>;
}
