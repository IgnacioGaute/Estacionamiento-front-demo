'use client';
import LatticeLoader from '@/components/ui/lattice-loader';
import { DataLoading } from '@/components/ui/data-loading';

// Las anulaciones de la playa en un mes. En la cuenta de cada inquilino quedan ocultas (suman
// cero y confunden); este es el lugar donde el dueño controla quién anuló qué, cuándo y por qué.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { plata } from '@/components/plataforma/formato';
import { EJE, Pastilla, Selector } from '@/components/plataforma/mono';
import { getAnulacionesAction } from '@/actions/cuentas/cuentas.action';
import { ListadoAnulaciones, nombreMetodo } from '@/types/cuenta.type';
import { fechaAR, mesActual, mesLargo, sumarMeses } from './util';

const TIPO: Record<string, string> = {
  PAGO: 'Pago',
  CARGO: 'Cargo',
  SALDO_INICIAL: 'Saldo inicial',
  AJUSTE: 'Ajuste',
  DEVOLUCION: 'Devolución',
};

const cuando = (instante: string) =>
  new Date(instante).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

export function AnulacionesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const actual = mesActual();
  const [mes, setMes] = useState(actual);
  const [datos, setDatos] = useState<ListadoAnulaciones | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!open) return;
    let vigente = true;
    setCargando(true);
    setError('');
    void getAnulacionesAction(mes).then((r) => {
      if (!vigente) return;
      setCargando(false);
      if (r.data) setDatos(r.data);
      else setError(r.error ?? 'No se pudo cargar el listado.');
    });
    return () => {
      vigente = false;
    };
  }, [open, mes]);

  const t = datos?.mes === mes ? datos.totales : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] w-full max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Anulaciones</DialogTitle>
          <DialogDescription>
            Todo lo que se anuló en las cuentas de los inquilinos: quién, cuándo, por qué y cuánto cambió cada cuenta.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Selector
            etiqueta="MES"
            ariaLabel="Mes"
            valor={mes}
            opciones={Array.from({ length: 12 }, (_, i) => {
              const m = sumarMeses(actual, -i);
              return { id: m, label: mesLargo(m) };
            })}
            onChange={setMes}
          />
          {cargando && <LatticeLoader compact label="Procesando…" showTimer={false} cellSize={4} gap={1} />}
        </div>

        {t && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Anulaciones', valor: String(t.cantidad), color: '' },
              { label: 'Deuda anulada', valor: plata(t.deudaAnulada), color: t.deudaAnulada ? 'text-[#FF7A4D]' : '' },
              { label: 'Pagos anulados', valor: plata(t.pagosAnulados), color: t.pagosAnulados ? 'text-gm-yellow' : '' },
            ].map((k) => (
              <div key={k.label} className="rounded-xl border border-border bg-background px-3 py-2.5">
                <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{k.label}</div>
                <div className={`font-display text-xl font-semibold tabular-nums ${k.color}`}>{k.valor}</div>
              </div>
            ))}
          </div>
        )}

        {cargando && !t && <DataLoading label="Cargando anulaciones…" />}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {t && datos && !datos.lista.length && (
          <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
            No se anuló nada en {mesLargo(mes)}.
          </p>
        )}

        {t && datos && datos.lista.length > 0 && (
          <ul className="divide-y divide-[#2B2620] rounded-2xl border border-border">
            {datos.lista.map((a) => (
              <li key={a.id} className="flex flex-wrap items-start gap-x-4 gap-y-1.5 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/renters/${a.inquilino.id}`}
                      onClick={() => onOpenChange(false)}
                      className="font-semibold hover:text-gm-yellow"
                    >
                      {a.inquilino.nombre}
                    </Link>
                    <Pastilla tono={a.tipo === 'PAGO' ? 'verde' : 'amarillo'}>{TIPO[a.tipo] ?? a.tipo}</Pastilla>
                  </div>
                  <div className="mt-0.5 text-[13px] text-[#C9BFB1]">
                    {a.concepto}
                    <span style={{ color: EJE }}>
                      {' '}
                      · del {fechaAR(a.fechaOriginal)}
                      {a.medios.length ? ` · ${a.medios.map(nombreMetodo).join(' + ')}` : ''}
                    </span>
                  </div>
                  <div className="mt-1 text-xs" style={{ color: EJE }}>
                    «{a.motivo ?? 'Sin motivo'}» · {a.usuario ?? 'Sin usuario'} · {cuando(a.creado)}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-display text-lg font-semibold tabular-nums ${a.efecto < 0 ? 'text-[#FF7A4D]' : 'text-gm-yellow'}`}>
                    {plata(Math.abs(a.efecto))}
                  </div>
                  <div className="text-[11px]" style={{ color: EJE }}>
                    {a.efecto < 0 ? 'bajó la deuda' : 'volvió a deber'}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
