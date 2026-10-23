'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Flashlight, FlashlightOff, RotateCcw, ScanLine } from 'lucide-react';
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

// Lo que Chrome en Android expone de la cámara y TypeScript todavía no tipa.
type CapacidadesCamara = MediaTrackCapabilities & { torch?: boolean; focusMode?: string[] };
type AjusteCamara = MediaTrackConstraintSet & { torch?: boolean; focusMode?: string };

function detener(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function ajustar(pista: MediaStreamTrack, ajuste: AjusteCamara) {
  return pista.applyConstraints({ advanced: [ajuste] });
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

function textoDe(estado: Estado, sugerirLinterna: boolean): string {
  switch (estado.tipo) {
    case 'iniciando':
      return 'Abriendo la cámara…';
    case 'apuntando':
      return 'Encuadrá la patente dentro del recuadro y mantené el celular quieto.';
    case 'leyendo':
      return 'Leyendo la patente…';
    case 'mover':
      return sugerirLinterna
        ? 'No se pudo leer. Acercate un poco, cambiá el ángulo o prendé la linterna si hay poca luz.'
        : 'No se pudo leer. Acercate un poco o cambiá el ángulo.';
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
  // `foto`: el cuadro que se leyó, para sugerir el tipo de vehículo en la playa gratuita.
  onRecognized: (plate: string, dudosa: boolean, foto: File) => void;
  onTakePhoto: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const alReconocer = useRef(onRecognized);
  const alCerrar = useRef(onOpenChange);
  const [estado, setEstado] = useState<Estado>({ tipo: 'iniciando' });
  const [ronda, setRonda] = useState(0);
  // null: la cámara no tiene linterna o el navegador no deja usarla.
  const [linterna, setLinterna] = useState<boolean | null>(null);

  useEffect(() => {
    alReconocer.current = onRecognized;
    alCerrar.current = onOpenChange;
  });

  useEffect(() => {
    if (!open) return;
    let cancelado = false;
    const apagar = () => {
      detener(streamRef.current);
      streamRef.current = null;
      setLinterna(null);
    };
    // El reconocimiento remoto puede seguir pendiente al bloquear el teléfono. Soltamos el
    // hardware inmediatamente y descartamos esa respuesta, sin esperar a que vuelva la red.
    const suspender = () => { cancelado = true; apagar(); alCerrar.current(false); };
    const visibilidad = () => { if (document.hidden) suspender(); };
    document.addEventListener('visibilitychange', visibilidad);
    window.addEventListener('pagehide', suspender);

    (async () => {
      if (document.hidden) { suspender(); return; }
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

      // Con cámaras mediocres lo que más falla es la luz y el foco. Hay Android que abren la
      // cámara con el foco fijo: el continuo acompaña al operador mientras se acerca. La linterna
      // se ofrece solo si la cámara la tiene; se apaga sola al cerrar la cámara.
      const pista = stream.getVideoTracks()[0];
      const capacidades = (pista?.getCapabilities?.() ?? {}) as CapacidadesCamara;
      if (capacidades.focusMode?.includes('continuous')) {
        ajustar(pista, { focusMode: 'continuous' }).catch(() => undefined);
      }
      setLinterna(capacidades.torch ? false : null);

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
      if (cancelado || resultado.tipo === 'cancelado') return;
      apagar();
      if (resultado.tipo === 'patente') {
        navigator.vibrate?.(80);
        alReconocer.current(resultado.plate, resultado.dudosa, resultado.foto);
      } else if (resultado.tipo === 'error') {
        setEstado({ tipo: 'error', mensaje: resultado.mensaje });
      } else {
        setEstado({ tipo: 'sin-resultado' });
      }
    })();

    return () => {
      cancelado = true;
      apagar();
      document.removeEventListener('visibilitychange', visibilidad);
      window.removeEventListener('pagehide', suspender);
    };
  }, [open, ronda]);

  const sacarFoto = () => {
    // La cámara se suelta antes de abrir la app de fotos: en Android la toma un solo proceso.
    detener(streamRef.current);
    streamRef.current = null;
    setLinterna(null);
    onTakePhoto();
  };

  const alternarLinterna = () => {
    const pista = streamRef.current?.getVideoTracks()[0];
    if (!pista || linterna === null) return;
    const encender = !linterna;
    ajustar(pista, { torch: encender })
      .then(() => setLinterna(encender))
      .catch(() => setLinterna(null));
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
          {linterna !== null && (
            <button
              type="button"
              onClick={alternarLinterna}
              aria-label="Linterna"
              aria-pressed={linterna}
              className={cn(
                'absolute right-2 top-2 grid size-11 place-items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow',
                linterna ? 'bg-gm-yellow text-gm-ink' : 'bg-black/55 text-white',
              )}
            >
              {linterna ? <Flashlight className="size-5" aria-hidden /> : <FlashlightOff className="size-5" aria-hidden />}
            </button>
          )}
        </div>

        <p
          aria-live="polite"
          className={cn(
            'flex items-start gap-2 text-sm',
            estado.tipo === 'error' ? 'text-gm-orange' : 'text-muted-foreground',
          )}
        >
          {estado.tipo === 'leyendo' && <ScanLine className="mt-0.5 size-4 shrink-0 animate-pulse" />}
          {textoDe(estado, linterna === false)}
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
