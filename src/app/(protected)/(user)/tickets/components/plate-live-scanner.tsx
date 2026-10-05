'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, RotateCcw, ScanLine } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { recognizePlateAction } from '@/actions/tickets/recognize-plate.action';
import { ANCHO_GUIA, ASPECTO_VISOR, buscarPatente, type EstadoBusqueda } from '@/utils/plate-scan';

type Estado =
  | { tipo: 'iniciando' }
  | { tipo: EstadoBusqueda }
  | { tipo: 'sin-resultado' }
  | { tipo: 'error'; mensaje: string };

function detener(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function mensajeDeCamara(error: unknown): string {
  const nombre = error instanceof DOMException ? error.name : '';
  if (nombre === 'NotAllowedError') {
    return 'El navegador no tiene permiso para usar la cámara. Habilitalo en los ajustes del sitio o sacá la foto.';
  }
  if (nombre === 'NotReadableError') return 'La cámara está ocupada por otra aplicación.';
  if (nombre === 'NotFoundError' || nombre === 'OverconstrainedError') {
    return 'No se encontró una cámara disponible.';
  }
  return 'No se pudo abrir la cámara.';
}

function textoDe(estado: Estado): string {
  switch (estado.tipo) {
    case 'iniciando':
      return 'Abriendo la cámara…';
    case 'apuntando':
      return 'Encuadrá la patente dentro del recuadro y mantené el celular quieto.';
    case 'leyendo':
      return 'Leyendo la patente…';
    case 'mover':
      return 'No se pudo leer. Acercate un poco o cambiá el ángulo.';
    case 'sin-resultado':
      return 'No pude leer la patente. Probá de nuevo o sacá una foto.';
    case 'error':
      return estado.mensaje;
  }
}

export function PlateLiveScanner({
  open,
  onOpenChange,
  onRecognized,
  onTakePhoto,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // `dudosa`: no hubo lectura segura y se entrega la mejor que hubo; hay que revisarla.
  onRecognized: (plate: string, dudosa: boolean) => void;
  onTakePhoto: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const alReconocer = useRef(onRecognized);
  const [estado, setEstado] = useState<Estado>({ tipo: 'iniciando' });
  const [ronda, setRonda] = useState(0);

  useEffect(() => {
    alReconocer.current = onRecognized;
  });

  useEffect(() => {
    if (!open) return;
    let cancelado = false;
    const apagar = () => {
      detener(streamRef.current);
      streamRef.current = null;
    };

    (async () => {
      setEstado({ tipo: 'iniciando' });
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch (error) {
        if (!cancelado) setEstado({ tipo: 'error', mensaje: mensajeDeCamara(error) });
        return;
      }
      if (cancelado) return detener(stream);
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) return apagar();
      video.srcObject = stream;
      await video.play().catch(() => undefined);

      const resultado = await buscarPatente(video, {
        reconocer: (foto) => {
          const formData = new FormData();
          formData.append('image', foto);
          return recognizePlateAction(formData);
        },
        alCambiar: (tipo) => setEstado({ tipo }),
        cancelado: () => cancelado,
      });
      if (resultado.tipo === 'cancelado') return;
      apagar();
      if (resultado.tipo === 'patente') {
        navigator.vibrate?.(80);
        alReconocer.current(resultado.plate, resultado.dudosa);
      } else if (resultado.tipo === 'error') {
        setEstado({ tipo: 'error', mensaje: resultado.mensaje });
      } else {
        setEstado({ tipo: 'sin-resultado' });
      }
    })();

    return () => {
      cancelado = true;
      apagar();
    };
  }, [open, ronda]);

  const sacarFoto = () => {
    // La cámara se suelta antes de abrir la app de fotos: en Android la toma un solo proceso.
    detener(streamRef.current);
    streamRef.current = null;
    onTakePhoto();
  };

  const terminado = estado.tipo === 'sin-resultado' || estado.tipo === 'error';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Escanear patente</DialogTitle>
          <DialogDescription>Apuntá a la patente y mantené el celular quieto: se lee sola.</DialogDescription>
        </DialogHeader>

        <div
          className="relative w-full overflow-hidden rounded-xl bg-black"
          style={{ aspectRatio: ASPECTO_VISOR }}
        >
          <video ref={videoRef} muted playsInline className="absolute inset-0 h-full w-full object-cover" />
          <div
            aria-hidden
            className={cn(
              'pointer-events-none absolute left-1/2 top-1/2 aspect-[3/1] -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] transition-colors',
              estado.tipo === 'leyendo' ? 'border-gm-yellow' : 'border-white/85',
            )}
            style={{ width: `${ANCHO_GUIA * 100}%` }}
          />
        </div>

        <p
          aria-live="polite"
          className={cn(
            'flex items-start gap-2 text-sm',
            estado.tipo === 'error' ? 'text-gm-orange' : 'text-muted-foreground',
          )}
        >
          {estado.tipo === 'leyendo' && <ScanLine className="mt-0.5 size-4 shrink-0 animate-pulse" />}
          {textoDe(estado)}
        </p>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={sacarFoto}
            className={terminado ? undefined : 'col-span-2'}
          >
            <Camera className="size-4" />
            Sacar foto
          </Button>
          {terminado && (
            <Button type="button" onClick={() => setRonda((r) => r + 1)}>
              <RotateCcw className="size-4" />
              Reintentar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
