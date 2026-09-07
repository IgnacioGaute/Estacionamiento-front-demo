'use client';

import React, { useState, useRef, useEffect, startTransition } from 'react';
import { startScanner } from '@/services/scanner.service';
import { toast } from 'sonner';
import { getCustomerById } from '@/services/customers.service';
import { historialReceiptsAction } from '@/actions/receipts/create-receipt.action';
import { useSession } from 'next-auth/react';
import { OpenScannerDialog } from './open-scanner-dialog';
import { Customer } from '@/types/cutomer.type';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ReceiptSchemaType } from '@/schemas/receipt.schema';
import { Receipt } from '@/types/receipt.type';
import { Hash, Keyboard, QrCode, ScanLine, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ScannerButton({
  isDialogOpen,
  scannerRef,
  scannerStyle,
  manualRef,
  manualStyle,
  onScanningChange,
  onTicketRegistered,
  hideControls,
}: {
  isDialogOpen: boolean;
  scannerRef?: (el: HTMLElement | null) => void;
  scannerStyle?: React.CSSProperties;
  manualRef?: (el: HTMLElement | null) => void;
  manualStyle?: React.CSSProperties;
  onScanningChange?: (isScanning: boolean) => void;
  onTicketRegistered?: () => void;
  // El lector USB sigue escuchando en segundo plano (el input oculto + el listener de teclado
  // no dependen de este render) pero no se dibuja el pill de estado ni el toggle de ingreso
  // manual — ese ingreso manual ahora vive en el diálogo unificado de "Registrar entrada".
  hideControls?: boolean;
}) {
  const [isScanning, setIsScanning] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const session = useSession();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [barCode, setBarCode] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer>();
  const [receipt, setReceipt] = useState<Receipt>();
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [manualInputVisible, setManualInputVisible] = useState(false);
  const [manualBarCode, setManualBarCode] = useState('');

  useEffect(() => {
    onScanningChange?.(isScanning);
  }, [isScanning, onScanningChange]);

  useEffect(() => {
    const handleKeyDown = () => {
      const dialogIsOpen = isDialogOpen || dialogOpen || manualInputVisible;
      if (!dialogIsOpen && !isScanning) {
        setIsScanning(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    };
    const handleKeyUp = () => setIsScanning(false);

    const dialogIsOpen = isDialogOpen || dialogOpen || manualInputVisible;
    if (!dialogIsOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('keyup', handleKeyUp);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [isDialogOpen, dialogOpen, manualInputVisible, isScanning]);

  const handleSubmit = async (code: string) => {
    if (!code) return;
    startTransition(() => {
      startScanner({ barCode: code })
        .then(async (data) => {
          if (!data || 'error' in data) {
            toast.error(data?.error || 'Error desconocido');
          } else {
            if (data.type === 'RECEIPT') {
              toast.success('🧾 Recibo detectado', { duration: 5000 });
              setCustomerId(data.id);
              setBarCode(data.barcode);
              setReceipt(data.receipt);
              setReceiptId(data.receiptId || '');
              try {
                const fetchedCustomer = await getCustomerById(data.id || '', session.data?.token);
                if (!fetchedCustomer) {
                  toast.error('No se encontró el cliente.');
                  return;
                }
                setCustomer(fetchedCustomer);
                setDialogOpen(true);
              } catch (err) {
                console.error('Error al obtener cliente:', err);
                toast.error('Error al obtener los datos del cliente.');
              }
            } else {
              toast.success('🎫 Ticket detectado', { duration: 3000 });
              if (data.warning) {
                toast.warning(data.warning, { duration: 8000 });
              }
              onTicketRegistered?.();
            }
          }
          setIsScanning(false);
        })
        .catch((err) => {
          console.error(err);
          toast.error('Error en la solicitud.');
          setIsScanning(false);
        });
    });
  };

  const handleConfirm = async (data: ReceiptSchemaType) => {
    if (!data?.payments || !customerId) return;
    try {
      const updatedCustomer = await getCustomerById(customerId, session.data?.token);
      if (!updatedCustomer) {
        toast.error('No se pudieron obtener los datos actualizados del cliente.');
        return;
      }
      setCustomer(updatedCustomer);

      const fullData: ReceiptSchemaType = { ...data, barcode: barCode || undefined };
      const result = await historialReceiptsAction(receiptId || '', customerId, fullData);

      if (result.error) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Pago registrado exitosamente.', { duration: 5000 });
      setDialogOpen(false);
    } catch (err) {
      console.error('Error al registrar el pago:', err);
      toast.error('Error al registrar el pago.');
    }
  };

  if (hideControls) {
    return (
      <>
        <input
          ref={inputRef}
          type="text"
          autoFocus
          onBlur={() => setIsScanning(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSubmit(e.currentTarget.value);
              e.currentTarget.value = "";
            }
          }}
          className="absolute h-0 w-0 opacity-0 pointer-events-none"
          aria-hidden
        />
        <OpenScannerDialog
          open={dialogOpen}
          onConfirm={handleConfirm}
          onClose={() => setDialogOpen(false)}
          customer={customer}
          receipt={receipt}
          customerType={customer?.customerType}
        />
      </>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex flex-wrap items-center justify-center gap-3.5">
        {/* Scanner status — reflects the real USB-scanner listener, not a clickable trigger */}
        <div
          ref={scannerRef}
          style={{ ...scannerStyle, transform: isScanning ? 'scale(.98)' : 'scale(1)' }}
          role="status"
          className={cn(
            'relative inline-flex items-center gap-2.5 h-[52px] px-5 rounded-2xl text-sm font-semibold uppercase tracking-[0.02em] transition-all duration-300 select-none',
            isScanning
              ? 'bg-gm-surface-2 text-muted-foreground'
              : 'bg-gradient-to-br from-gm-yellow to-gm-yellow-deep text-gm-ink shadow-[0_8px_22px_-8px_hsl(var(--gm-yellow)/0.55)]',
          )}
        >
          <span
            className="grid place-items-center"
            style={isScanning ? { animation: 'gm-blink 0.8s steps(2, jump-none) infinite' } : undefined}
          >
            <QrCode className="size-5" strokeWidth={1.8} />
          </span>
          {isScanning ? 'Escaneando…' : 'Listo para escanear'}
        </div>

        {/* Manual entry toggle */}
        <button
          ref={manualRef}
          style={manualStyle}
          onClick={() => setManualInputVisible((p) => !p)}
          className={cn(
            'inline-flex items-center gap-2.5 h-[52px] px-5 rounded-2xl border text-[13px] font-medium transition-all duration-300',
            manualInputVisible
              ? 'border-border bg-card/50 text-foreground'
              : 'border-dashed border-gm-line-strong text-muted-foreground hover:text-foreground hover:border-foreground/30',
          )}
        >
          {manualInputVisible ? <X className="size-4" /> : <Keyboard className="size-4" />}
          {manualInputVisible ? 'Cancelar ingreso manual' : 'Ingresar código manualmente'}
        </button>
      </div>

      {/* Hidden input that captures scan input */}
      {!manualInputVisible && (
        <input
          ref={inputRef}
          type="text"
          autoFocus
          onBlur={() => setIsScanning(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSubmit(e.currentTarget.value);
              e.currentTarget.value = '';
            }
          }}
          className="absolute h-0 w-0 opacity-0 pointer-events-none"
          aria-hidden
        />
      )}

      {/* Manual entry form */}
      {manualInputVisible && (
        <div className="w-full max-w-md space-y-2">
          <Label>Código de recibo o ticket</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={manualBarCode}
                onChange={(e) => setManualBarCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmit(manualBarCode);
                    setManualBarCode('');
                    setManualInputVisible(false);
                  }
                }}
                placeholder="Pegá o tipeá el código…"
                className="pl-9 gm-mono tracking-[0.04em]"
              />
            </div>
            <Button
              onClick={() => {
                handleSubmit(manualBarCode);
                setManualBarCode('');
                setManualInputVisible(false);
              }}
              disabled={!manualBarCode}
            >
              <ScanLine className="size-4" />
              Confirmar
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Apretá <kbd className="gm-kbd">Enter</kbd> para procesar.
          </p>
        </div>
      )}

      <OpenScannerDialog
        open={dialogOpen}
        onConfirm={handleConfirm}
        onClose={() => setDialogOpen(false)}
        customer={customer}
        receipt={receipt}
        customerType={customer?.customerType}
      />
    </div>
  );
}
