'use client';
import LatticeLoader from '@/components/ui/lattice-loader';

import { useState, useTransition, ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tone = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmActionDialogProps {
  /** Element that opens the dialog — wrapped in DialogTrigger asChild. */
  trigger: ReactNode;
  /** Big title. */
  title: string;
  /** Subtitle / one-liner. */
  description?: string;
  /** Body content above the confirmation input. */
  children?: ReactNode;
  /** Icon shown in the header tile. Defaults to AlertTriangle. */
  icon?: LucideIcon;
  /** Visual treatment. */
  tone?: Tone;
  /** If set, user must type this exact string to enable the action button. */
  confirmText?: string;
  /** Action button label. */
  actionLabel: string;
  /** Variant for the action button. Defaults based on tone. */
  actionVariant?: ButtonProps['variant'];
  /** Async confirm handler. */
  onConfirm: () => void | Promise<void>;
  /** External pending flag. */
  pending?: boolean;
}

const TONE_STYLES: Record<
  Tone,
  { tile: string; tileText: string }
> = {
  danger: {
    tile: 'border-destructive/40 bg-destructive/15',
    tileText: 'text-[#F08775]',
  },
  warning: {
    tile: 'border-gm-orange/40 bg-gm-orange/15',
    tileText: 'text-[#FF8458]',
  },
  info: {
    tile: 'border-gm-yellow/40 bg-gm-yellow/15',
    tileText: 'text-gm-yellow',
  },
  success: {
    tile: 'border-[hsl(120_35%_55%/0.4)] bg-[hsl(120_35%_55%/0.15)]',
    tileText: 'text-[#9AD588]',
  },
};

/**
 * Single confirm dialog used by every delete / soft-delete / restore flow.
 * Removes the 6+ near-identical files in the original repo.
 */
export function ConfirmActionDialog({
  trigger,
  title,
  description,
  children,
  icon: IconCmp = AlertTriangle,
  tone = 'danger',
  confirmText,
  actionLabel,
  actionVariant,
  onConfirm,
  pending,
}: ConfirmActionDialogProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [internalPending, startTransition] = useTransition();
  const isPending = !!pending || internalPending;

  const handleConfirm = () => {
    if (confirmText && text !== confirmText) return;
    startTransition(async () => {
      await onConfirm();
      setText('');
      setOpen(false);
    });
  };

  const t = TONE_STYLES[tone];
  const fallbackVariant: ButtonProps['variant'] =
    tone === 'danger' ? 'destructive' : tone === 'success' ? 'orange' : 'default';

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setText('');
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'grid size-9 place-items-center rounded-md border',
                t.tile,
                t.tileText,
              )}
            >
              <IconCmp className="size-4" />
            </span>
            <div>
              <DialogTitle>{title}</DialogTitle>
              {description && (
                <DialogDescription className="mt-0.5">
                  {description}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        {children && (
          <div className="text-[13.5px] leading-relaxed text-muted-foreground">
            {children}
          </div>
        )}

        {confirmText && (
          <div className="space-y-1.5">
            <Label>
              Para confirmar, escribí{' '}
              <span className="text-foreground gm-mono">"{confirmText}"</span>
            </Label>
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={confirmText}
              disabled={isPending}
              autoFocus
            />
          </div>
        )}

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            variant={actionVariant ?? fallbackVariant}
            onClick={handleConfirm}
            disabled={isPending || (!!confirmText && text !== confirmText)}
          >
            {isPending && <LatticeLoader compact label="Procesando…" showTimer={false} cellSize={4} gap={1} />}
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
