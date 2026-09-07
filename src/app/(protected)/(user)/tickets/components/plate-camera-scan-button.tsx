'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { sanitizePlateInput } from '@/utils/plate.utils';
import { recognizePlateAction } from '@/actions/tickets/recognize-plate.action';

// Solo aparece en mobile (viewport angosto). La captura la hace el <input capture="environment">
// nativo, que abre la app de cámara del celular directamente — NO usa `getUserMedia`/
// `mediaDevices`, así que no hace falta (ni tiene sentido) chequear esa API: `mediaDevices` solo
// existe en contextos seguros (HTTPS o localhost), y en LAN por HTTP simple viene `undefined`
// aunque el `<input capture>` funcione perfecto — chequearla acá ocultaba el botón sin motivo.
export function PlateCameraScanButton({
  disabled,
  onRecognized,
}: {
  disabled?: boolean;
  onRecognized: (plate: string) => void;
}) {
  const isMobile = useIsMobile();
  const [isScanning, setIsScanning] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  if (!isMobile) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir la misma foto si el intento anterior falló

    if (!file) return;

    setIsScanning(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
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
        onClick={() => inputRef.current?.click()}
        className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gm-line-strong text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-foreground/30 disabled:opacity-50"
      >
        {isScanning ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Reconociendo patente…
          </>
        ) : (
          <>
            <Camera className="size-4" />
            Escanear patente con la cámara
          </>
        )}
      </button>
    </>
  );
}
