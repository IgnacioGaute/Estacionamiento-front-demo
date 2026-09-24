'use client';

import { PricingBreakdown, formatPrice } from '@/components/pricing-breakdown';
import { ParkingReceiptDelivery } from '@/components/parking-receipt-delivery';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { AlertTriangle, Banknote, Barcode, Car, CreditCard, Search } from 'lucide-react';
import { TicketRegistration } from '@/types/ticket-registration.type';
import { searchActiveRegistrationsAction } from '@/actions/tickets/search-active-registrations.action';
import { getCloseSummaryAction } from '@/actions/tickets/get-close-summary.action';
import { closeRegistrationAction } from '@/actions/tickets/close-registration.action';
import { CloseSummary } from '@/services/tickets.service';
import { formatElapsed, minutesSinceEntry, isOverdue, isBarcodeOrigin } from '@/utils/ticket-registration.utils';

export function CloseTicketPanel({
  open,
  onOpenChange,
  onSuccess,
  initialRegistrationId,
  barcodeTicketsEnabled = true,
}: {
  open: boolean;
  barcodeTicketsEnabled?: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialRegistrationId?: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const summaryRequest = useRef(0);
  const searchRequest = useRef(0);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TicketRegistration[]>([]);
  const [summary, setSummary] = useState<CloseSummary | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER' | null>(null);
  const [showCourtesy, setShowCourtesy] = useState(false);
  const [courtesyReason, setCourtesyReason] = useState('');

  const resetAll = () => {
    summaryRequest.current++;
    searchRequest.current++;
    setQuery('');
    setResults([]);
    setSummary(null);
    setPaymentMethod(null);
    setShowCourtesy(false);
    setCourtesyReason('');
  };

  useEffect(() => {
    if (!open) {
      resetAll();
      return;
    }
    resetAll();
    if (initialRegistrationId) {
      loadSummary(initialRegistrationId);
    } else {
      // Sin ticket puntual preseleccionado, el buscador arranca poblado con todos los
      // vehículos activos en vez de esperar a que se escriba algo.
      handleSearchChange('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialRegistrationId]);

  const loadSummary = (id: string) => {
    const request = ++summaryRequest.current;
    startTransition(async () => {
      const data = await getCloseSummaryAction(id);
      if (request !== summaryRequest.current) return;
      if (!data) {
        toast.error('No se pudo cargar la estadía.');
        return;
      }
      setSummary(data);
    });
  };

  const handleSearchChange = (value: string) => {
    setQuery(value);
    const request = ++searchRequest.current;
    startTransition(async () => {
      const data = await searchActiveRegistrationsAction(value);
      if (request === searchRequest.current) setResults(data);
    });
  };

  const handleClose = (closeType: 'PAYMENT' | 'NO_CHARGE' | 'COURTESY', metodo?: 'CASH' | 'TRANSFER', refundMetodo?: 'CASH' | 'TRANSFER') => {
    if (!summary) return;
    if (closeType === 'COURTESY' && !courtesyReason.trim()) {
      toast.error('Ingresá el motivo de la cortesía.');
      return;
    }
    startTransition(async () => {
      const data = await closeRegistrationAction(summary.registration.id, {
        closeType,
        expectedPrice: summary.previewBracket.price,
        expectedCollected: summary.totalCollectedSoFar,
        refundMetodo,
        metodo,
        motivo: closeType === 'COURTESY' ? courtesyReason : undefined,
      });
      if (!data || 'error' in data) {
        const errorMessage = typeof data?.error === 'string' ? data.error : data?.error?.message;
        toast.error(errorMessage ?? 'Error desconocido');
        const refreshed = await getCloseSummaryAction(summary.registration.id);
        if (refreshed) setSummary(refreshed);
        setPaymentMethod(null);
      } else {
        toast.success('Salida registrada exitosamente');
        if (data.registrationId) setReceiptId(data.registrationId);
        onOpenChange(false);
        onSuccess?.();
      }
    });
  };

  return (
    <><Dialog open={open} onOpenChange={(o) => { if (isPending) return; if (!o) resetAll(); onOpenChange(o); }}>
      <DialogContent className="max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="items-center">
          <DialogTitle>Registrar salida y cobrar</DialogTitle>
        </DialogHeader>

        {!summary ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                className="pl-9 h-[46px] rounded-xl border-gm-line-strong bg-gm-surface-2 gm-mono uppercase"
                placeholder={barcodeTicketsEnabled ? "Patente, ficha, casillero o apellido" : "Patente o apellido"}
                value={query}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              {results.map((r) => {
                const elapsed = minutesSinceEntry(r, Date.now());
                const overdue = isOverdue(r, Date.now());
                const barcodeOrigin = isBarcodeOrigin(r);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => loadSummary(r.id)}
                    className="w-full flex items-center gap-2.5 rounded-xl border border-border bg-gm-surface-2/60 hover:bg-gm-surface-2 px-3 py-2.5 text-left text-sm transition-colors"
                  >
                    <span
                      className={cn(
                        'size-2 shrink-0 rounded-full',
                        overdue ? 'bg-destructive' : 'bg-[hsl(120_35%_55%)]',
                      )}
                    />
                    <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-gm-surface-3 text-muted-foreground">
                      {barcodeOrigin ? <Barcode className="size-3.5" /> : <Car className="size-3.5" />}
                    </span>
                    <span className="flex flex-col min-w-0">
                      <span className="font-medium text-foreground truncate">
                        {barcodeOrigin
                          ? `Ticket ${r.ticket?.codeBar ?? r.codeBarTicket ?? '—'}`
                          : r.noPlate
                          ? `Sin patente · ${r.lastNameCustomer ?? ''}`
                          : r.licensePlateOriginal || '—'}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {r.casilleroNumber ? `Casillero ${r.casilleroNumber} · ` : ''}
                        {elapsed !== null ? `hace ${formatElapsed(elapsed)}` : ''}
                      </span>
                    </span>
                  </button>
                );
              })}
              {results.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {isPending ? 'Buscando vehículos…' : query.trim() ? (barcodeTicketsEnabled ? 'No encontramos ese vehículo. Revisá la patente o el número de ticket.' : 'No encontramos ese vehículo. Revisá la patente o el apellido.') : 'No hay vehículos adentro.'}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card/40 p-4 space-y-1.5">
              <p className="font-medium text-foreground">
                {isBarcodeOrigin(summary.registration) ? `Ticket ${summary.registration.ticket?.codeBar ?? summary.registration.codeBarTicket}` : summary.registration.noPlate ? `Sin patente · ${summary.registration.lastNameCustomer ?? ''}` : summary.registration.licensePlateOriginal}
                {summary.registration.casilleroNumber ? ` · Casillero ${summary.registration.casilleroNumber}` : ''}
              </p>
              <p className="text-sm text-muted-foreground">
                Entró {summary.registration.entryTime} · hace {formatElapsed(summary.elapsedMinutes)}
              </p>
              <p className="text-sm text-muted-foreground">Total de la estadía: <strong className="text-foreground">{formatPrice(summary.previewBracket.price)}</strong></p>
              {summary.previewBracket.breakdown && <details className="pt-2"><summary className="cursor-pointer text-sm font-medium">¿Cómo se calculó este importe?</summary><div className="mt-3 space-y-2"><p className="text-xs text-muted-foreground">{summary.pricingDayTypeBasis === 'SPLIT' ? 'Cada parte de la estadía usa el precio de día o noche que le corresponde.' : `Se usa el precio de la hora de ${summary.pricingDayTypeBasis === 'ENTRY' ? 'entrada' : 'salida'}.`} {summary.tariffSnapshotUsed ? 'Se respetan los precios guardados cuando ingresó.' : 'Este ingreso es anterior al sistema de precios guardados: usa los precios actuales.'}</p><PricingBreakdown lines={summary.previewBracket.breakdown} total={summary.previewBracket.price} /></div></details>}
              {summary.totalCollectedSoFar > 0 && (
                <p className="text-sm text-muted-foreground">Ya pagó por adelantado: {formatPrice(summary.totalCollectedSoFar)}</p>
              )}
              {summary.previewBracket.usedFallback && (
                <div className="flex items-center gap-2 text-xs text-gm-orange">
                  <AlertTriangle className="h-3.5 w-3.5" /> El tiempo supera los precios cargados. Revisá el importe antes de cobrar.
                </div>
              )}
            </div>

            {summary.cambioARetornar > 0 && (
              <p className="text-sm text-muted-foreground text-center">Hay que devolverle: {formatPrice(summary.cambioARetornar)}</p>
            )}

            <div className="rounded-2xl border border-border bg-gm-surface-2 p-5 text-center">
              <p className="text-sm font-medium text-muted-foreground">Falta cobrar ahora</p>
              <p className="text-4xl font-bold text-foreground gm-mono gm-tnum">{formatPrice(summary.saldoACobrar)}</p>
            </div>

            {summary.saldoACobrar > 0 ? (
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setPaymentMethod('CASH')}
                  aria-pressed={paymentMethod === 'CASH'}
                  className="flex flex-col items-center justify-center gap-1.5 min-h-[76px] rounded-2xl border-[1.5px] border-gm-line-strong bg-gm-surface-2 text-foreground disabled:opacity-50 aria-pressed:border-gm-yellow aria-pressed:bg-gm-yellow/15"
                >
                  <Banknote className="size-5" />
                  <span className="gm-display text-base font-semibold">Efectivo</span>
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setPaymentMethod('TRANSFER')}
                  aria-pressed={paymentMethod === 'TRANSFER'}
                  className="flex flex-col items-center justify-center gap-1.5 min-h-[76px] rounded-2xl border-[1.5px] border-gm-line-strong bg-gm-surface-2 text-foreground disabled:opacity-50 aria-pressed:border-gm-yellow aria-pressed:bg-gm-yellow/15"
                >
                  <CreditCard className="size-5" />
                  <span className="gm-display text-base font-semibold">Transferencia</span>
                </button>
              </div>
            ) : summary.cambioARetornar > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                <Button disabled={isPending} onClick={() => handleClose('NO_CHARGE', undefined, 'CASH')}>Devolver en efectivo</Button>
                <Button disabled={isPending} onClick={() => handleClose('NO_CHARGE', undefined, 'TRANSFER')}>Devolver por transferencia</Button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleClose('NO_CHARGE')}
                className="gm-display w-full h-[52px] rounded-2xl bg-gradient-to-br from-gm-yellow to-gm-yellow-deep text-sm font-bold text-gm-ink disabled:opacity-50"
              >
                Registrar salida: no queda saldo
              </button>
            )}

            {summary.saldoACobrar > 0 && <div className="space-y-2"><p className="text-sm text-muted-foreground">Elegí cómo te pagó. Confirmá sólo después de recibir el efectivo o verificar la transferencia.</p><Button className="w-full min-h-12 whitespace-normal" disabled={isPending || !paymentMethod} onClick={() => paymentMethod && handleClose('PAYMENT', paymentMethod)}>{isPending ? 'Registrando…' : `Confirmar cobro de ${formatPrice(summary.saldoACobrar)} y salida`}</Button></div>}

            {summary.saldoACobrar > 0 && (!showCourtesy ? (
              <button
                type="button"
                className="text-xs text-muted-foreground underline w-full text-center"
                onClick={() => setShowCourtesy(true)}
              >
                Cortesía / no cobrar
              </button>
            ) : (
              <div className="space-y-2 rounded-lg border border-border p-3">
                <Input
                  placeholder="Motivo (obligatorio)"
                  value={courtesyReason}
                  onChange={(e) => setCourtesyReason(e.target.value)}
                  disabled={isPending}
                />
                <Button type="button" variant="outline" className="w-full" disabled={isPending} onClick={() => handleClose('COURTESY')}>
                  Confirmar cortesía
                </Button>
              </div>
            ))}

            <Button type="button" variant="ghost" disabled={isPending} className="w-full" onClick={resetAll}>
              Volver a buscar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
    <ParkingReceiptDelivery registrationId={receiptId} kind="EXIT" onDismiss={() => setReceiptId(null)} />
    </>
  );
}
