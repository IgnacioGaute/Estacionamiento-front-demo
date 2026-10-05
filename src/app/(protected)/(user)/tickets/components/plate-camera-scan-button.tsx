'use client';
import LatticeLoader from '@/components/ui/lattice-loader';

import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { toast } from '@/lib/toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTenant } from '@/components/tenant-provider';
import { sanitizePlateInput } from '@/utils/plate.utils';
import { prepararFotoPatente } from '@/utils/plate-photo';
import { recognizePlateAction } from '@/actions/tickets/recognize-plate.action';
import { PlateLiveScanner } from './plate-live-scanner';

// Solo aparece en mobile (viewport angosto) y en playas con plan de Plate Recognizer: cada lectura
// descuenta del plan de la playa, que el super admin carga en la ficha de la empresa. Sin plan, el
// operador escribe la patente. Con cámara en vivo (`getUserMedia`) la patente se lee
// sola apuntando; si no está disponible, se cae a la foto con el <input capture="environment">
// nativo. El botón no se oculta nunca por falta de `mediaDevices`: esa API solo existe en contextos
// seguros (HTTPS o localhost), y en LAN por HTTP simple viene `undefined` aunque la foto funcione.
export function PlateCameraScanButton({
  disabled,
  onRecognized,
}: {
  disabled?: boolean;
  onRecognized: (plate: string) => void;
}) {
  const isMobile = useIsMobile();
  const { reconocimientoPatentes } = useTenant();
  const [isScanning, setIsScanning] = useState(false);
  const [enVivo, setEnVivo] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  if (!isMobile || !reconocimientoPatentes) return null;

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

      onRecognized(sanitizePlateInput(result.plate));
      toast.success('Patente reconocida — revisala antes de confirmar.');
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
        className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gm-line-strong text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-foreground/30 disabled:opacity-50"
      >
        {isScanning ? (
          <>
            <LatticeLoader compact label="Procesando…" showTimer={false} cellSize={4} gap={1} />
            Reconociendo patente…
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
        onRecognized={(plate, dudosa) => {
          setEnVivo(false);
          onRecognized(plate);
          if (dudosa) toast.warning('La lectura no fue segura: revisá la patente antes de confirmar.');
          else toast.success('Patente reconocida — revisala antes de confirmar.');
        }}
        onTakePhoto={() => {
          setEnVivo(false);
          inputRef.current?.click();
        }}
      />
    </>
  );
}
