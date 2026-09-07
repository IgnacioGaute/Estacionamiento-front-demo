'use client';

import { useState, useTransition, useMemo } from 'react';
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
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { toast } from 'sonner';
import { createCustomerAction } from '@/actions/customers/create-customer.action';
import { customerSchema, CustomerSchemaType } from '@/schemas/customer.schema';
import { OwnerParkingType } from '@/types/owner-parking-type';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Car,
  CheckCircle2,
  CircleDollarSign,
  Loader2,
  ParkingCircle,
  Plus,
  Trash2,
  User,
  UserPlus,
} from 'lucide-react';

/** Two-phase create-owner wizard, redesigned around the Garage Mitre visual system. */
export function CreateOwnerDialog({ ownerParkingTypes }: { ownerParkingTypes: OwnerParkingType[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [phase, setPhase] = useState<'customer' | 'vehicles'>('customer');

  const form = useForm<CustomerSchemaType>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      numberOfVehicles: 1,
      customerType: 'OWNER',
      hasDebt: false,
      monthsDebt: [],
      comments: '',
      parkingOwners: [],
      credit: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'parkingOwners',
  });

  // ——— Month options (last 12 months, excluding current; older than 1 year disabled)
  const monthOptions = useMemo(() => {
    const today = new Date();
    const oneYearAgo = new Date(
      today.getFullYear() - 1,
      today.getMonth(),
      1,
    );
    return Array.from({ length: 12 })
      .map((_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const value = d.toISOString().slice(0, 7);
        const label = d.toLocaleString('es-AR', {
          month: 'short',
          year: '2-digit',
        });
        return {
          value,
          label: label.replace(/\.$/, '').toUpperCase(),
          isDisabled: d < oneYearAgo,
        };
      })
      .filter((opt) => {
        const currentMonth = today.toISOString().slice(0, 7);
        return opt.value !== currentMonth;
      });
  }, []);

  const formattedMonth = (m: string) => (m.length === 7 ? `${m}-01` : m);
  const hasDebt = form.watch('hasDebt');
  const monthsDebt = form.watch('monthsDebt') ?? [];
  const credit = Number(form.watch('credit') ?? 0);
  const numberOfVehicles = Number(form.watch('numberOfVehicles') ?? 1);
  const totalDebt = monthsDebt.reduce(
    (acc, d) => acc + Number(d.amount || 0),
    0,
  );

  // ——— Phase transitions
  const handleCustomerSubmit = (values: CustomerSchemaType) => {
    const n = values.numberOfVehicles;
    const current = form.getValues('parkingOwners') || [];

    if (current.length < n) {
      append(
        Array.from({ length: n - current.length }, () => ({
          garageNumber: '',
          rent: false,
          ownerParkingTypeId: '',
        })),
      );
    } else if (current.length > n) {
      for (let i = 0; i < current.length - n; i++) {
        remove(current.length - 1 - i);
      }
    }
    setPhase('vehicles');
  };

  const handleVehiclesSubmit = (values: CustomerSchemaType) => {
    startTransition(async () => {
      const data = await createCustomerAction(values);
      if (!data || data.error) {
        const errorMessage =
          typeof data?.error === 'string' ? data.error : data?.error?.message;
        toast.error(errorMessage || 'No se pudo crear el propietario');
      } else {
        toast.success('Propietario y vehículos creados exitosamente');
        form.reset();
        setOpen(false);
        setPhase('customer');
      }
    });
  };

  // ——— Reset on close
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setTimeout(() => {
        form.reset();
        setPhase('customer');
      }, 200);
    }
  };

  // ——— Format ARS
  const ars = (n: number) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          Nuevo propietario
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[92vh] w-full max-w-2xl overflow-hidden p-0">
        {/* HEADER + STEPPER */}
        <div className="px-6 pt-5 pb-4 border-b border-border">
          <DialogHeader className="border-0 pb-0 -mx-0 px-0">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-md border border-gm-yellow/40 bg-gm-yellow/15 text-gm-yellow">
                <UserPlus className="size-4" />
              </span>
              <div>
                <DialogTitle>Nuevo propietario</DialogTitle>
                <DialogDescription className="mt-0.5">
                  {phase === 'customer'
                    ? 'Datos personales y configuración del abono.'
                    : 'Asigná las cocheras y tipo de expensas.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Stepper */}
          <ol className="mt-5 grid grid-cols-2 gap-3">
            <StepperStep
              n={1}
              label="Identidad"
              sub="Cliente · deuda · crédito"
              active={phase === 'customer'}
              done={phase === 'vehicles'}
            />
            <StepperStep
              n={2}
              label="Cocheras"
              sub={`${numberOfVehicles} ${numberOfVehicles === 1 ? 'unidad' : 'unidades'}`}
              active={phase === 'vehicles'}
              done={false}
            />
          </ol>
        </div>

        {/* SCROLLABLE BODY */}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(
              phase === 'customer' ? handleCustomerSubmit : handleVehiclesSubmit,
            )}
            className="flex max-h-[calc(92vh-200px)] flex-col"
          >
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">
              {phase === 'customer' && (
                <>
                  {/* — IDENTIDAD — */}
                  <Section
                    icon={<User className="size-3.5" />}
                    title="Identidad"
                    hint="Nombre completo y datos de contacto."
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="firstName"
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
                        name="lastName"
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
                      name="phone"
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

                  {/* — CONFIGURACIÓN — */}
                  <Section
                    icon={<ParkingCircle className="size-3.5" />}
                    title="Configuración"
                    hint="Cantidad de cocheras y crédito inicial."
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="numberOfVehicles"
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
                      <FormField
                        control={form.control}
                        name="credit"
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
                                  value={field.value ?? 0}
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
                      />
                    </div>

                    {credit > 0 && (
                      <p className="-mt-1 text-[11.5px] text-muted-foreground">
                        Saldo a favor de {ars(credit)} — se aplicará al primer
                        cobro automáticamente.
                      </p>
                    )}
                  </Section>

                  {/* — DEUDA — */}
                  <Section
                    icon={<CircleDollarSign className="size-3.5" />}
                    title="Estado de cuenta"
                    hint="¿El cliente arrastra deuda de meses anteriores?"
                  >
                    <FormField
                      control={form.control}
                      name="hasDebt"
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
                        name="monthsDebt"
                        render={() => (
                          <FormItem className="space-y-2">
                            <Label>Meses adeudados</Label>

                            {/* Chip grid — fast inline picker (replaces popover) */}
                            <div className="grid grid-cols-6 gap-1.5">
                              {monthOptions.map((opt) => {
                                const monthKey = formattedMonth(opt.value);
                                const current = monthsDebt;
                                const isSelected = current.some(
                                  (d) => d.month === monthKey,
                                );
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    disabled={opt.isDisabled || isPending}
                                    onClick={() => {
                                      if (isSelected) {
                                        form.setValue(
                                          'monthsDebt',
                                          current.filter(
                                            (d) => d.month !== monthKey,
                                          ),
                                        );
                                      } else {
                                        form.setValue('monthsDebt', [
                                          ...current,
                                          { month: monthKey, amount: 0 },
                                        ]);
                                      }
                                    }}
                                    className={cn(
                                      'gm-display rounded-md border px-2 py-2 text-[11px] font-bold tracking-[0.04em] transition-colors',
                                      isSelected
                                        ? 'border-gm-orange bg-gm-orange/15 text-[#FF8458]'
                                        : 'border-border bg-gm-surface-2 text-muted-foreground hover:bg-gm-surface-3 hover:text-foreground',
                                      opt.isDisabled &&
                                        'opacity-40 cursor-not-allowed',
                                    )}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Per-month amount editor */}
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
                                  {monthsDebt.map((entry, index) => {
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
                                                `monthsDebt.${index}.amount`,
                                                parseFloat(e.target.value) ||
                                                  0,
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
                                              'monthsDebt',
                                              monthsDebt.filter(
                                                (_, i) => i !== index,
                                              ),
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
                  </Section>

                  {/* — COMENTARIOS — */}
                  <Section
                    title="Notas internas"
                    hint="Información que solo el equipo verá."
                  >
                    <FormField
                      control={form.control}
                      name="comments"
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

              {phase === 'vehicles' && (
                <>
                  <div className="flex items-start gap-3 rounded-md border border-gm-yellow/30 bg-gm-yellow/10 p-3 text-[12.5px]">
                    <Car className="size-4 mt-px text-gm-yellow shrink-0" />
                    <div>
                      <div className="font-semibold text-foreground">
                        {fields.length}{' '}
                        {fields.length === 1 ? 'cochera a asignar' : 'cocheras a asignar'}
                      </div>
                      <div className="text-muted-foreground">
                        Definí número de cochera, tipo de expensas y si se
                        alquila a un tercero.
                      </div>
                    </div>
                  </div>

                  {fields.map((field, index) => (
                    <VehicleCard
                      key={field.id}
                      index={index}
                      form={form}
                      isPending={isPending}
                      ownerParkingTypes={ownerParkingTypes}
                    />
                  ))}
                </>
              )}
            </div>

            {/* FOOTER */}
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
                  {isPending && <Loader2 className="size-4 animate-spin" />}
                  {phase === 'customer' ? (
                    <>
                      Siguiente <ArrowRight className="size-4" />
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" />
                      Crear propietario
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
 * Internal pieces
 * ============================================================ */

function Section({
  icon,
  title,
  hint,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  children: React.ReactNode;
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
        {hint && <p className="text-[11.5px] text-muted-foreground mt-0.5">{hint}</p>}
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
        <div className="text-[10.5px] text-muted-foreground truncate">
          {sub}
        </div>
      </div>
    </li>
  );
}

function YesNo({
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

function VehicleCard({
  index,
  form,
  isPending,
  ownerParkingTypes,
}: {
  index: number;
  form: ReturnType<typeof useForm<CustomerSchemaType>>;
  isPending: boolean;
  ownerParkingTypes: OwnerParkingType[];
}) {
  const isRent = form.watch(`parkingOwners.${index}.rent`) === true;

  return (
    <article className="rounded-md border border-border bg-gm-surface-2 overflow-hidden">
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-gm-surface">
        <div className="flex items-center gap-2.5">
          <span className="gm-display gm-tnum grid size-7 place-items-center rounded-sm bg-gm-yellow text-gm-ink text-[11px] font-bold">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="gm-display text-[12px] font-bold tracking-[0.06em] text-foreground">
            COCHERA {index + 1}
          </span>
        </div>
        {isRent && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gm-orange/40 bg-gm-orange/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#FF8458]">
            <AlertTriangle className="size-3" />
            Alquilada
          </span>
        )}
      </header>

      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name={`parkingOwners.${index}.garageNumber`}
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel>N° de cochera</FormLabel>
                <FormControl>
                  <Input
                    disabled={isPending}
                    placeholder="B-12"
                    className="gm-mono tracking-[0.05em] uppercase"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`parkingOwners.${index}.ownerParkingTypeId`}
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel>Tipo de expensas</FormLabel>
                <FormControl>
                  <Select
                    disabled={isPending}
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ownerParkingTypes.length === 0 ? (
                        <div className="px-2 py-1.5 text-[12px] text-muted-foreground">
                          No hay tipos creados. Cargalos en Administrar.
                        </div>
                      ) : (
                        ownerParkingTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name={`parkingOwners.${index}.rent`}
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel>¿Usa esta cochera para alquilar?</FormLabel>
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

        {isRent && (
          <FormField
            control={form.control}
            name={`parkingOwners.${index}.amountRenter`}
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel>Monto de alquiler mensual</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm gm-mono">
                      $
                    </span>
                    <Input
                      type="number"
                      placeholder="38000"
                      disabled={isPending}
                      className="pl-7 gm-mono gm-tnum"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>
    </article>
  );
}
