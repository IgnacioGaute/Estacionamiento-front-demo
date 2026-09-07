'use client';

import { useEffect, useState } from 'react';
import { Download, MoreVertical, Share } from 'lucide-react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';

// Chrome/Android disparan este evento y guardan un prompt que se puede activar por código.
// Safari/iOS nunca lo dispara — ahí no existe forma de disparar "Agregar a inicio" desde JS, la
// única opción es explicarle al usuario el gesto manual (Compartir → Agregar a inicio).
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

// En iOS, Chrome (y cualquier otro navegador) corre sobre WebKit por Apple, así que tiene la
// misma limitación que Safari — pero el botón Compartir vive en un lugar distinto en cada uno.
// Chrome en iOS se identifica por "CriOS" en el user agent (Chrome de escritorio/Android usa
// "Chrome" a secas, no aplica acá porque ya filtramos por isIos()).
function isChromeIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /crios/i.test(navigator.userAgent);
}

export function InstallAppMenuItem() {
  const isMobile = useIsMobile();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [alreadyInstalled, setAlreadyInstalled] = useState(false);

  useEffect(() => {
    setAlreadyInstalled(isStandalone());

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);

    const onInstalled = () => setAlreadyInstalled(true);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!isMobile || alreadyInstalled) return null;
  if (!deferredPrompt && !isIos()) return null; // ni prompt nativo ni iOS: no hay nada que ofrecer

  const handleClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setAlreadyInstalled(true);
      setDeferredPrompt(null);
      return;
    }
    setShowIosHelp(true);
  };

  return (
    <>
      <DropdownMenuItem
        onSelect={(e) => {
          e.preventDefault();
          handleClick();
        }}
        className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-1.5 text-[12.5px] text-foreground transition-colors duration-150 hover:bg-white/[0.08] focus:bg-white/[0.08]"
      >
        <Download className="size-3.5 text-muted-foreground" />
        Agregar a pantalla de inicio
      </DropdownMenuItem>

      <Dialog open={showIosHelp} onOpenChange={setShowIosHelp}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Agregar a pantalla de inicio</DialogTitle>
            <DialogDescription>
              El navegador no permite hacer esto desde la app — hacelo así:
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-[13px] text-foreground">
            <li className="flex items-start gap-2.5">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-gm-surface-3 text-[11px] font-bold text-gm-yellow">1</span>
              <span className="pt-0.5">
                {isChromeIos() ? (
                  <>
                    Tocá el menú <MoreVertical className="inline size-3.5 -mt-0.5" /> (arriba a la derecha, en Chrome) y elegí &quot;Compartir&quot;.
                  </>
                ) : (
                  <>
                    Tocá el botón Compartir <Share className="inline size-3.5 -mt-0.5" /> en la barra de Safari.
                  </>
                )}
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-gm-surface-3 text-[11px] font-bold text-gm-yellow">2</span>
              <span className="pt-0.5">Elegí &quot;Agregar a pantalla de inicio&quot;.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-gm-surface-3 text-[11px] font-bold text-gm-yellow">3</span>
              <span className="pt-0.5">Confirmá — te va a quedar un ícono para entrar directo, sin pasar por el navegador.</span>
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}
