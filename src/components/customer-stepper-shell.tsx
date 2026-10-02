'use client';
import LatticeLoader from '@/components/ui/lattice-loader';

import { ReactNode, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type {
  UseFormReturn,
  FieldValues,
  Path,
  PathValue,
} from 'react-hook-form';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  ParkingCircle,
  Trash2,
  User,
  type LucideIcon,
} from 'lucide-react';

/**
 * Shared shell for the four customer wizards (create / update — owner / renter / private).
 * Encapsulates: dialog frame, stepper, phase-1 form (identidad + configuración + deuda + notas),
 * and the footer with cancel / back / next / submit.
 *
 * Phase-2 content is variant-specific and provided via `vehiclesPhase`.
 *
 * The form (`react-hook-form`) is owned by the caller — this shell renders fields
 * against it generically.
 */
export interface CustomerStepperShellProps<TForm extends FieldValues> {
  open: boolean;
  setOpen: (open: boolean) => void;
  trigger?: ReactNode;
  form: UseFormReturn<TForm>;
  isPending: boolean;
  /** Fields used to drive the phase-1 form. Defaults to the customerSchema field names. */
  fieldNames?: {
    firstName: Path<TForm>;
    lastName: Path<TForm>;
    phone: Path<TForm>;
    numberOfVehicles: Path<TForm>;
    credit: Path<TForm>;
    hasDebt: Path<TForm>;
    monthsDebt: Path<TForm>;
    comments: Path<TForm>;
  };
  /** Wizard title + subtitle */
  title: string;
  /** "propietario" · "inquilino" · "tercero" */
  entityLabel: string;
  /** Mode flag — changes copy in stepper / submit. */
  mode?: 'create' | 'update';
  /** Custom label for the phase-2 step (default = "Cocheras"). */
  vehiclesStepLabel?: string;
  /** Render fn for phase 2 (cocheras / cocheras-en-alquiler / etc). */
  vehiclesPhase: ReactNode;
  /** Called when phase 1 form passes validation — opportunity to sync vehicles array length. */
  onNextFromCustomer?: (values: TForm) => void;
  /** Called when phase 2 form is submitted. */
  onConfirm: (values: TForm) => void | Promise<void>;
  /** Number of vehicle items currently in the form — used for stepper label. */
  vehiclesCount: number;
  /**
   * Oculta crédito inicial y «Estado de cuenta» (deuda por meses). Los inquilinos cargan su saldo
   * inicial con el editor de la cuenta corriente, en el paso de cocheras.
   */
  sinDeudaLegacy?: boolean;
}

const defaultNames = {
  firstName: 'firstName',
  lastName: 'lastName',
  phone: 'phone',
  numberOfVehicles: 'numberOfVehicles',
  credit: 'credit',
  hasDebt: 'hasDebt',
  monthsDebt: 'monthsDebt',
  comments: 'comments',
} as const;

export function CustomerStepperShell<TForm extends FieldValues>(
  props: CustomerStepperShellProps<TForm>,
) {
  const {
    open,
    setOpen,
    trigger,
    form,
    isPending,
    fieldNames = defaultNames as unknown as CustomerStepperShellProps<TForm>['fieldNames'],
    title,
    entityLabel,
    mode = 'create',
    vehiclesStepLabel = 'Cocheras',
    vehiclesPhase,
    onNextFromCustomer,
    onConfirm,
    vehiclesCount,
    sinDeudaLegacy = false,
  } = props;

  const [phase, setPhase] = useState<'customer' | 'vehicles'>('customer');

  // — Month options (last 12, excl. current; older than 1y disabled)
  const monthOptions = useMemo(() => {
    const today = new Date();
    const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), 1);
    return Array.from({ length: 12 })
      .map((_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const value = d.toISOString().slice(0, 7);
        const label = d
          .toLocaleString('es-AR', { month: 'short', year: '2-digit' })
          .replace(/\.$/, '')
          .toUpperCase();
        return { value, label, isDisabled: d < oneYearAgo };
      })
      .filter((opt) => opt.value !== today.toISOString().slice(0, 7));
  }, []);

  const formattedMonth = (m: string) => (m.length === 7 ? `${m}-01` : m);
  const hasDebt = form.watch(fieldNames!.hasDebt);
  const monthsDebt = (form.watch(fieldNames!.monthsDebt) as any) ?? [];
  const credit = Number(form.watch(fieldNames!.credit) ?? 0);

  const totalDebt = monthsDebt.reduce(
    (acc: number, d: { amount: number }) => acc + Number(d.amount || 0),
    0,
  );

  const ars = (n: number) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(n);

  const handlePhase1Submit = (values: TForm) => {
    onNextFromCustomer?.(values);
    setPhase('vehicles');
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setTimeout(() => setPhase('customer'), 200);
    }
  };

  const ICON = mode === 'create' ? UserPlusFallback : EditFallback;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-h-[92vh] w-full max-w-2xl overflow-hidden p-0">
        {/* HEADER + STEPPER */}
        <div className="px-6 pt-5 pb-4 border-b border-border">
          <DialogHeader className="border-0 pb-0 -mx-0 px-0">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-md border border-gm-yellow/40 bg-gm-yellow/15 text-gm-yellow">
                <ICON className="size-4" />
              </span>
              <div>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription className="mt-0.5">
                  {phase === 'customer'
                    ? `Datos personales y configuración del abono.`
                    : `Asigná las cocheras del ${entityLabel}.`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <ol className="mt-5 grid grid-cols-2 gap-3">
            <StepperStep
              n={1}
              label="Identidad"
              sub={sinDeudaLegacy ? "Datos y contacto" : "Cliente · deuda · crédito"}
              active={phase === 'customer'}
              done={phase === 'vehicles'}
            />
            <StepperStep
              n={2}
              label={vehiclesStepLabel}
              sub={`${vehiclesCount} ${vehiclesCount === 1 ? 'unidad' : 'unidades'}`}
              active={phase === 'vehicles'}
              done={false}
            />
          </ol>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(
              phase === 'customer' ? handlePhase1Submit : onConfirm,
            )}
            // El cuerpo del Dialog ya mide como mucho 85dvh con su propio padding: si el
            // formulario pide más, aparece un segundo scroll y el encabezado se va de vista.
            className="flex max-h-[calc(85dvh-215px)] flex-col"
          >
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">
              {phase === 'customer' && (
                <>
                  <Section
                    icon={<User className="size-3.5" />}
                    title="Identidad"
                    hint="Nombre completo y datos de contacto."
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name={fieldNames!.firstName}
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel>Nombre</FormLabel>
                            <FormControl>
                              <Input
                                disabled={isPending}
                                placeholder="Lucía"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={fieldNames!.lastName}
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel>Apellido</FormLabel>
                            <FormControl>
                              <Input
                                disabled={isPending}
                                placeholder="Fernández"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name={fieldNames!.phone}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel>Número de celular</FormLabel>
                          <FormControl>
                            <Input
                              disabled={isPending}
                              placeholder="11 6122-8843"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </Section>

                  <Section
                    icon={<ParkingCircle className="size-3.5" />}
                    title="Configuración"
                    hint={sinDeudaLegacy ? 'Cantidad de cocheras.' : 'Cantidad de cocheras y crédito inicial.'}
                  >
                    <div className={sinDeudaLegacy ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-2 gap-3'}>
                      <FormField
                        control={form.control}
                        name={fieldNames!.numberOfVehicles}
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel>Número de cocheras</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                disabled={isPending}
                                min={1}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {!sinDeudaLegacy && <FormField
                        control={form.control}
                        name={fieldNames!.credit}
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel>Crédito inicial</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm gm-mono">
                                  $
                                </span>
                                <Input
                                  type="number"
                                  min={0}
                                  disabled={isPending}
                                  className="pl-7"
                                  placeholder="0"
                                  {...field}
                                  value={(field.value as number) ?? 0}
                                  onChange={(e) =>
                                    field.onChange(
                                      parseFloat(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />}
                    </div>

                    {!sinDeudaLegacy && credit > 0 && (
                      <p className="-mt-1 text-[11.5px] text-muted-foreground">
                        Saldo a favor de {ars(credit)} — se aplicará al primer
                        cobro automáticamente.
                      </p>
                    )}
                  </Section>

                  {!sinDeudaLegacy && <Section
                    icon={<CircleDollarSign className="size-3.5" />}
                    title="Estado de cuenta"
                    hint="¿El cliente arrastra deuda de meses anteriores?"
                  >
                    <FormField
                      control={form.control}
                      name={fieldNames!.hasDebt}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel>¿Tiene deuda?</FormLabel>
                          <div className="flex gap-1.5">
                            <YesNo
                              value={field.value === true}
                              onClick={() => field.onChange(true)}
                              label="Sí"
                              tone="orange"
                              disabled={isPending}
                            />
                            <YesNo
                              value={field.value === false}
                              onClick={() => field.onChange(false)}
                              label="No"
                              tone="green"
                              disabled={isPending}
                            />
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {hasDebt && (
                      <FormField
                        control={form.control}
                        name={fieldNames!.monthsDebt}
                        render={() => (
                          <FormItem className="space-y-2">
                            <Label>Meses adeudados</Label>
                            <div className="grid grid-cols-6 gap-1.5">
                              {monthOptions.map((opt) => {
                                const monthKey = formattedMonth(opt.value);
                                const current = monthsDebt;
                                const isSelected = current.some(
                                  (d: any) => d.month === monthKey,
                                );
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    disabled={opt.isDisabled || isPending}
                                    onClick={() => {
                                      if (isSelected) {
                                        form.setValue(
                                          fieldNames!.monthsDebt,
                                          current.filter(
                                            (d: any) => d.month !== monthKey,
                                          ) as PathValue<TForm, Path<TForm>>,
                                        );
                                      } else {
                                        form.setValue(
                                          fieldNames!.monthsDebt,
                                          [
                                            ...current,
                                            { month: monthKey, amount: 0 },
                                          ] as PathValue<TForm, Path<TForm>>,
                                        );
                                      }
                                    }}
                                    className={cn(
                                      'gm-display rounded-md border px-2 py-2 text-[11px] font-bold tracking-[0.04em] transition-colors',
                                      isSelected
                                        ? 'border-gm-orange bg-gm-orange/15 text-[#FF8458]'
                                        : 'border-border bg-gm-surface-2 text-muted-foreground hover:bg-gm-surface-3 hover:text-foreground',
                                      opt.isDisabled && 'opacity-40 cursor-not-allowed',
                                    )}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>

                            {monthsDebt.length > 0 && (
                              <div className="mt-3 rounded-md border border-border bg-gm-surface-2 overflow-hidden">
                                <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                                  <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                                    Montos por mes
                                  </span>
                                  <span className="gm-mono gm-tnum text-[12.5px] font-bold text-[#FF8458]">
                                    Total: {ars(totalDebt)}
                                  </span>
                                </div>
                                <div className="divide-y divide-border">
                                  {monthsDebt.map((entry: any, index: number) => {
                                    const label =
                                      monthOptions.find(
                                        (opt) =>
                                          formattedMonth(opt.value) ===
                                          entry.month,
                                      )?.label ?? entry.month;
                                    return (
                                      <div
                                        key={entry.month}
                                        className="flex items-center gap-3 px-3 py-2"
                                      >
                                        <span className="gm-display w-16 text-[12px] font-bold tracking-[0.04em] text-foreground">
                                          {label}
                                        </span>
                                        <div className="relative flex-1">
                                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm gm-mono">
                                            $
                                          </span>
                                          <Input
                                            type="number"
                                            min={0}
                                            step={1}
                                            className="h-9 pl-7"
                                            value={entry.amount}
                                            onChange={(e) =>
                                              form.setValue(
                                                `${String(fieldNames!.monthsDebt)}.${index}.amount` as Path<TForm>,
                                                (parseFloat(e.target.value) ||
                                                  0) as PathValue<TForm, Path<TForm>>,
                                              )
                                            }
                                          />
                                        </div>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="size-8 text-muted-foreground hover:text-[#F08775]"
                                          onClick={() =>
                                            form.setValue(
                                              fieldNames!.monthsDebt,
                                              monthsDebt.filter(
                                                (_: any, i: number) => i !== index,
                                              ) as PathValue<TForm, Path<TForm>>,
                                            )
                                          }
                                        >
                                          <Trash2 className="size-3.5" />
                                        </Button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </Section>}

                  <Section
                    title="Notas internas"
                    hint="Información que solo el equipo verá."
                  >
                    <FormField
                      control={form.control}
                      name={fieldNames!.comments}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel>Comentario</FormLabel>
                          <FormControl>
                            <Textarea
                              disabled={isPending}
                              rows={3}
                              placeholder="Ej: pasa a pagar los primeros días del mes, en efectivo."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </Section>
                </>
              )}

              {phase === 'vehicles' && vehiclesPhase}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border bg-gm-surface px-6 py-3">
              <div className="text-[11px] text-muted-foreground">
                {phase === 'customer' ? (
                  <span>Paso 1 de 2</span>
                ) : (
                  <span>Paso 2 de 2 · revisá antes de confirmar</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {phase === 'vehicles' && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setPhase('customer')}
                    disabled={isPending}
                  >
                    <ArrowLeft className="size-4" />
                    Atrás
                  </Button>
                )}
                <Button type="submit" disabled={isPending}>
                  {isPending && <LatticeLoader compact label="Procesando…" showTimer={false} cellSize={4} gap={1} />}
                  {phase === 'customer' ? (
                    <>
                      Siguiente <ArrowRight className="size-4" />
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" />
                      {mode === 'create' ? `Crear ${entityLabel}` : 'Guardar cambios'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
 * Pieces — also exported so variant phase-2 can reuse them.
 * ============================================================ */

export function Section({
  icon,
  title,
  hint,
  children,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <header>
        <div className="flex items-center gap-2">
          {icon && (
            <span className="text-muted-foreground inline-flex">{icon}</span>
          )}
          <h3 className="gm-display text-[12px] font-bold tracking-[0.08em] text-foreground">
            {title}
          </h3>
        </div>
        {hint && (
          <p className="text-[11.5px] text-muted-foreground mt-0.5">{hint}</p>
        )}
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function StepperStep({
  n,
  label,
  sub,
  active,
  done,
}: {
  n: number;
  label: string;
  sub: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <li
      className={cn(
        'flex items-center gap-3 rounded-md border px-3 py-2.5 transition-colors',
        active
          ? 'border-gm-yellow/60 bg-gm-yellow/10'
          : done
          ? 'border-border bg-gm-surface-2'
          : 'border-border bg-gm-surface-2/50',
      )}
    >
      <span
        className={cn(
          'gm-display grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-bold',
          active
            ? 'bg-gm-yellow text-gm-ink'
            : done
            ? 'bg-[hsl(120_35%_55%)] text-white'
            : 'bg-gm-surface-3 text-muted-foreground border border-border',
        )}
      >
        {done ? <CheckCircle2 className="size-3.5" /> : n}
      </span>
      <div className="min-w-0">
        <div
          className={cn(
            'gm-display text-[12px] font-bold tracking-[0.04em]',
            active ? 'text-gm-yellow' : 'text-foreground',
          )}
        >
          {label}
        </div>
        <div className="text-[10.5px] text-muted-foreground truncate">{sub}</div>
      </div>
    </li>
  );
}

export function YesNo({
  value,
  onClick,
  label,
  tone,
  disabled,
}: {
  value: boolean;
  onClick: () => void;
  label: string;
  tone: 'orange' | 'green';
  disabled?: boolean;
}) {
  const activeCls =
    tone === 'orange'
      ? 'border-gm-orange bg-gm-orange/15 text-[#FF8458]'
      : 'border-[hsl(120_35%_55%)] bg-[hsl(120_35%_55%/0.15)] text-[#9AD588]';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex-1 rounded-md border px-3 py-2 text-[12.5px] font-semibold transition-colors',
        value
          ? activeCls
          : 'border-border bg-gm-surface-2 text-muted-foreground hover:bg-gm-surface-3 hover:text-foreground',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      {label}
    </button>
  );
}

// — tiny fallbacks so the file doesn't need lucide-react re-exports
function UserPlusFallback(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}

function EditFallback(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
