'use client';
import LatticeLoader from '@/components/ui/lattice-loader';

import { useEffect, useRef, useState } from 'react';
import { Camera, ScanLine } from 'lucide-react';
import { toast } from '@/lib/toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTenant } from '@/components/tenant-provider';
import { sanitizePlateInput } from '@/utils/plate.utils';
import { prepararFotoPatente } from '@/utils/plate-photo';
import { recognizePlateAction } from '@/actions/tickets/recognize-plate.action';
import { PlateLiveScanner } from './plate-live-scanner';

// Aparece en mobile cuando el backend informa un motor disponible: Plate Recognizer con token
// de la playa, o fast-alpr de la plataforma para las playas sin token. La cámara no necesita saber
// cuál se usa ni recibir credenciales. Con cámara en vivo (`getUserMedia`) la patente se lee
// sola apuntando; si no está disponible, se cae a la foto con el <input capture="environment">
// nativo. El botón no se oculta nunca por falta de `mediaDevices`: esa API solo existe en contextos
// seguros (HTTPS o localhost), y en LAN por HTTP simple viene `undefined` aunque la foto funcione.
export function PlateCameraScanButton({
  disabled,
  onRecognized,
  variant = 'field',
  onBusyChange,
  notifyRecognition = true,
}: {
  disabled?: boolean;
  onRecognized: (plate: string) => void | Promise<void>;
  variant?: 'field' | 'action';
  onBusyChange?: (busy: boolean) => void;
  notifyRecognition?: boolean;
}) {
  const isMobile = useIsMobile();
  const { reconocimientoPatentes } = useTenant();
  const [isScanning, setIsScanning] = useState(false);
  const [enVivo, setEnVivo] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { onBusyChange?.(isScanning || enVivo); }, [isScanning, enVivo, onBusyChange]);

  if ((variant === 'field' && !isMobile) || !reconocimientoPatentes) return null;

  const abrir = () => {
    if (typeof navigator.mediaDevices?.getUserMedia === 'function') setEnVivo(true);
    else inputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir la misma foto si el intento anterior falló

    if (!file) return;

    setIsScanning(true);
    try {
      const formData = new FormData();
      formData.append('image', await prepararFotoPatente(file));
      const result = await recognizePlateAction(formData);

      if ('error' in result) {
        toast.error(result.error);
        return;
      }

      await onRecognized(sanitizePlateInput(result.plate));
      if (notifyRecognition) toast.success('Patente reconocida — revisala antes de confirmar.');
    } catch (err) {
      console.error(err);
      toast.error('Error al reconocer la patente. Escribila manualmente.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        disabled={disabled || isScanning}
        onChange={handleFileChange}
      />
      <button
        type="button"
        disabled={disabled || isScanning}
        onClick={abrir}
        className={variant === 'action'
          ? 'flex min-h-[72px] w-full min-w-0 items-center gap-3 rounded-xl border border-gm-line-strong bg-card/40 px-4 py-3 text-left transition-colors hover:border-gm-yellow/50 hover:bg-gm-yellow/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50'
          : 'mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gm-line-strong text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-foreground/30 disabled:opacity-50'}
      >
        {isScanning ? (
          <>
            <LatticeLoader compact label="Procesando…" showTimer={false} cellSize={4} gap={1} />
            Reconociendo patente…
          </>
        ) : variant === 'action' ? (
          <>
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-gm-line-strong text-gm-yellow"><ScanLine className="size-5" /></span>
            <span className="min-w-0"><span className="block text-sm font-semibold">Escanear patente</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">Abrí la cámara · entrada o salida según el vehículo</span></span>
            <Camera className="ml-auto size-4 shrink-0 text-muted-foreground" />
          </>
        ) : (
          <>
            <Camera className="size-4" />
            Escanear patente con la cámara
          </>
        )}
      </button>
      <PlateLiveScanner
        open={enVivo}
        onOpenChange={setEnVivo}
        onRecognized={async (plate, dudosa) => {
          setEnVivo(false);
          setIsScanning(true);
          try { await onRecognized(sanitizePlateInput(plate)); }
          catch { toast.error('No se pudo consultar la patente. Intentá de nuevo.'); return; }
          finally { setIsScanning(false); }
          if (dudosa) toast.warning('La lectura no fue segura: revisá la patente antes de confirmar.');
          else if (notifyRecognition) toast.success('Patente reconocida — revisala antes de confirmar.');
        }}
        onTakePhoto={() => {
          setEnVivo(false);
          inputRef.current?.click();
        }}
      />
    </>
  );
}
