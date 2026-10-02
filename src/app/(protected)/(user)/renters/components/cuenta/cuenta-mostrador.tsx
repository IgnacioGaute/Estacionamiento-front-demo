'use client';
import { DataLoading } from '@/components/ui/data-loading';

// La cuenta de un inquilino como la ve el operador: lo que debe y lo que pagó, en dos pestañas.
// Sin movimientos ni nada que corregir: cobrar y volver a entregar el recibo de un pago. El
// estado de cuenta, los ajustes y las anulaciones son de la administración (el backend tampoco
// se los da al operador).

import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Printer, Wallet } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Segmentos } from '@/components/plataforma/mono';
import { plata } from '@/components/plataforma/formato';
import { useTenant } from '@/components/tenant-provider';
import { getCuentaMostradorAction } from '@/actions/cuentas/cuentas.action';
import { CuentaMostrador, DeudaCuenta, ResultadoPago, nombreMetodo } from '@/types/cuenta.type';
import { EntregaRecibo } from './entrega-recibo';
import { colorSaldo, fechaAR, textoSaldo } from './util';

type Tab = 'deudas' | 'pagos';
type Pago = CuentaMostrador['pagos'][number];

// El pago como recibo, para la impresión en hoja (la misma que al cobrar).
function comoRecibo(p: Pago, cuenta: CuentaMostrador): ResultadoPago {
  const aplicado = p.aplicado.reduce((s, a) => s + a.importe, 0);
  return {
    id: p.id,
    numero: p.numero ?? '—',
    fecha: p.fecha,
    cliente: `${cuenta.cliente.apellido ?? ''} ${cuenta.cliente.nombre ?? ''}`.trim(),
    total: p.total,
    medios: p.medios.map((m) => ({ metodo: m.metodo ?? 'TRANSFER', importe: m.importe })),
    imputaciones: p.aplicado.map((a) => ({ receiptId: '', concepto: a.concepto, aplicado: a.importe, saldoRecibo: a.queda })),
    aFavor: Math.max(0, p.total - aplicado),
    saldoAnterior: 0,
    saldo: p.saldoDespues ?? cuenta.saldo,
    nota: p.nota,
  };
}

function EstadoDeuda({ d }: { d: DeudaCuenta }) {
  const [texto, clase] = d.vencido
    ? [d.situacion === 'PARCIAL' ? 'Vencido · pago parcial' : 'Vencido', 'bg-[#FF5C4D]/[0.16] text-[#FF7A4D]']
    : d.situacion === 'PARCIAL'
      ? ['Pago parcial', 'bg-gm-yellow/[0.14] text-gm-yellow']
      : ['Pendiente', 'bg-[#231D17] text-[#E9E1D4]'];
  return <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${clase}`}>{texto}</span>;
}

export function CuentaMostradorDialog({
  customerId,
  nombre,
  open,
  onOpenChange,
  onCobrar,
}: {
  customerId: string;
  nombre: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCobrar: () => void;
}) {
  const [cuenta, setCuenta] = useState<CuentaMostrador | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('deudas');
  // El pago cuyo recibo se está entregando (dentro del mismo diálogo).
  const [recibo, setRecibo] = useState<Pago | null>(null);
  const { context, playaId } = useTenant();
  const playa = context.playas.find((p) => p.id === playaId)?.nombre;

  useEffect(() => {
    if (!open) return;
    let vigente = true;
    setCuenta(null);
    setError('');
    setTab('deudas');
    setRecibo(null);
    void getCuentaMostradorAction(customerId).then((r) => {
      if (!vigente) return;
      if (r.data) setCuenta(r.data);
      else setError(r.error ?? 'No se pudo cargar la cuenta.');
    });
    return () => {
      vigente = false;
    };
  }, [open, customerId]);

  const cocheras = cuenta?.cliente.cocheras ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-xl">
        <DialogHeader>
          <DialogTitle className="pr-8 font-display text-2xl">{nombre}</DialogTitle>
          <DialogDescription>
            {cuenta ? (
              <>
                {cocheras.length
                  ? `${cocheras.map((c) => (c.numero ? `Cochera ${c.numero}` : 'Cochera')).join(', ')} · `
                  : ''}
                {cuenta.cliente.baja ? 'Dado de baja' : `Abono mensual ${plata(cuenta.cliente.abono)}`}
              </>
            ) : (
              ' '
            )}
          </DialogDescription>
        </DialogHeader>

        {error && <p className="py-4 text-sm text-destructive">{error}</p>}
        {!cuenta && !error && (
          <DataLoading label="Cargando cuenta…" />
        )}

        {cuenta && recibo && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setRecibo(null)}
              className="flex h-9 items-center gap-1.5 rounded-[10px] border border-border px-3 text-[13px] font-semibold hover:bg-gm-surface-2"
            >
              <ArrowLeft className="size-3.5" /> Pagos
            </button>
            <div className="flex items-baseline justify-between gap-3 rounded-xl bg-gm-surface-2/60 px-4 py-3">
              <span className="min-w-0">
                <span className="block text-sm font-semibold">Recibo de pago N° {recibo.numero}</span>
                <span className="block text-xs text-muted-foreground">
                  {fechaAR(recibo.fecha)} · {recibo.medios.map((m) => nombreMetodo(m.metodo)).join(' + ')}
                </span>
              </span>
              <span className="shrink-0 font-display text-xl font-semibold tabular-nums text-emerald-400">{plata(recibo.total)}</span>
            </div>
            <EntregaRecibo pagoId={recibo.id} resultado={comoRecibo(recibo, cuenta)} playa={playa} />
          </div>
        )}

        {cuenta && !recibo && (
          <div className="space-y-4">
            <div className="flex items-baseline justify-between gap-3 rounded-xl bg-gm-surface-2/60 px-4 py-3">
              <span className="text-sm font-semibold">Saldo</span>
              <span className="text-right">
                <span className={`font-display text-[24px] font-semibold tabular-nums ${colorSaldo(cuenta.saldo)}`}>
                  {textoSaldo(cuenta.saldo)}
                </span>
                {cuenta.vencido > 0 && (
                  <span className="block text-xs font-semibold text-[#FF7A4D]">{plata(cuenta.vencido)} vencido</span>
                )}
              </span>
            </div>

            <Segmentos
              etiqueta="Ver"
              className="w-max"
              opciones={[
                { id: 'deudas' as Tab, label: 'Deudas', cuenta: cuenta.deudas.length },
                { id: 'pagos' as Tab, label: 'Pagos', cuenta: cuenta.pagos.length },
              ]}
              valor={tab}
              onChange={(v) => setTab(v as Tab)}
            />

            {tab === 'deudas' &&
              (cuenta.deudas.length ? (
                <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                  {cuenta.deudas.map((d) => (
                    <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">{d.concepto}</span>
                          <EstadoDeuda d={d} />
                        </span>
                        <span className={`block text-xs ${d.vencido ? 'font-semibold text-[#FF7A4D]' : 'text-muted-foreground'}`}>
                          {d.vencido ? `Venció el ${fechaAR(d.vencimiento)}` : `Vence el ${fechaAR(d.vencimiento)}`}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-semibold tabular-nums">{plata(d.saldo)}</span>
                        {d.saldo !== d.total && (
                          <span className="block text-[11px] text-muted-foreground">de {plata(d.total)}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  {cuenta.saldo < 0 ? `No debe nada y tiene ${plata(-cuenta.saldo)} a favor.` : 'No debe nada.'}
                </p>
              ))}

            {tab === 'pagos' &&
              (cuenta.pagos.length ? (
                <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                  {cuenta.pagos.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">
                          {p.numero ? `Pago N° ${p.numero}` : 'Pago anterior al sistema'}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {fechaAR(p.fecha)} · {p.medios.map((m) => nombreMetodo(m.metodo)).join(' + ')}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-emerald-400">{plata(p.total)}</span>
                      {p.numero && (
                        <button
                          type="button"
                          onClick={() => setRecibo(p)}
                          className="flex h-9 shrink-0 items-center gap-1 rounded-[10px] border border-border px-3 text-[13px] font-semibold hover:bg-gm-surface-2"
                        >
                          <Printer className="size-3.5" /> Recibo
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
                  Todavía no registró pagos.
                </p>
              ))}
          </div>
        )}

        <div className="sticky bottom-[-24px] z-10 -mx-6 -mb-6 flex justify-end gap-2 border-t border-border bg-card px-6 py-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-11 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-gm-surface-2"
          >
            Cerrar
          </button>
          <button
            type="button"
            disabled={!cuenta}
            onClick={onCobrar}
            className="flex h-11 items-center gap-2 rounded-xl bg-gm-yellow px-5 text-sm font-bold text-gm-ink hover:bg-[#FFD23A] disabled:opacity-50"
          >
            <Wallet className="size-4" /> Cobrar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
