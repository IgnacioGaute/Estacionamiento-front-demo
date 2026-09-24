'use client';

import { useEffect, useState } from 'react';
import { getCashContextAction } from '@/actions/turnos/cash-context.action';
import { CashContext } from '@/types/turno.type';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BoxListDialog } from '@/components/box-list-dialog';
import { TurnoBar } from '@/app/(protected)/(user)/tickets/components/turno-bar';
import { TurnosHistorialPanel } from './turnos-historial-panel';

export function CajaActions({ shiftsEnabled = true }: { shiftsEnabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const [context, setContext] = useState<CashContext | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!shiftsEnabled) return;
    let vigente = true;
    getCashContextAction().then(result => {
      if (!vigente) return;
      setContext(result.context ?? null); setError(result.error ?? '');
    });
    return () => { vigente = false; };
  }, [revision, shiftsEnabled]);
  return (
    <>
    {shiftsEnabled ? <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gm-yellow/30 bg-gm-yellow/5 p-4">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-gm-yellow">Turno actual</p>
        {error ? <p role="alert" className="mt-2 text-sm">{error}</p> : !context ? <p className="mt-2 text-sm">Cargando turno…</p> : context.active ? <>
          <p className="mt-1 break-words font-semibold">{context.active.usuarioApertura ? `${context.active.usuarioApertura.firstName} ${context.active.usuarioApertura.lastName}` : 'Operador no disponible'} · En curso</p>
          <p className="mt-1 text-sm text-muted-foreground">Abierto el {new Date(context.active.fechaApertura).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short', timeStyle: 'short' })}</p>
        </> : <p className="mt-1 text-sm">No hay un turno abierto.</p>}
      </div>
      {/* El envoltorio existe para que el tour tenga a qué apuntar; `contents` no
          serviría porque un elemento sin caja mide 0×0 y el foco quedaría flotando. */}
      <span data-tour="caja-turno" className="inline-flex flex-wrap items-center gap-3">
        <TurnoBar onUpdated={() => setRevision(value => value + 1)} />
      </span>
    </div> : <p className="mb-6 rounded-xl border border-border p-4 text-sm text-muted-foreground">Los turnos están desactivados en Configuración. Podés consultar el historial y la planilla diaria.</p>}
    <div className="mb-5">
      <Button data-tour="caja-planilla" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <FileText className="size-4" /> Planilla diaria de caja
      </Button>
      <BoxListDialog open={open} setOpen={setOpen} />
    </div>
    <TurnosHistorialPanel revision={revision} />
    </>
  );
}
