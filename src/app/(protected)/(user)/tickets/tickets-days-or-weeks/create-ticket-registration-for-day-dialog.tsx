
import { VehicleTypeOptions } from '@/components/vehicle-type-options';
import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { CalendarPlus, Loader2 } from "lucide-react";
import { ticketRegistrationForDaySchema, TicketRegistrationForDaySchemaType } from "@/schemas/ticket-registration-for-day.schema";
import { createTicketRegistrationForDayAction } from "@/actions/tickets/create-ticket-registration-for-day.action";

type TicketTimeType = 'DIA' | 'SEMANA' | 'SEMANA_Y_DIA' | 'MES' | 'MES_Y_DIA';

const DEFAULT_VALUES: TicketRegistrationForDaySchemaType = {
  firstNameCustomer: '',
  lastNameCustomer: '',
  vehiclePlateCustomer: '',
  paid: false,
  retired: false,
  paymentMetodo: 'CASH',
  ticketTimeType: 'SEMANA',
  vehicleType: 'AUTO',
  weeks: 1,
  days: undefined,
  months: undefined,
};

export function CreateTicketRegistrationDialog({ setIsDialogOpen }: { setIsDialogOpen: (open: boolean) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [ticketType, setTicketType] = useState<TicketTimeType>('SEMANA');

  const form = useForm<TicketRegistrationForDaySchemaType>({
    resolver: zodResolver(ticketRegistrationForDaySchema),
    defaultValues: DEFAULT_VALUES,
  });
  const isPaid = form.watch('paid');

  const resetForm = () => {
    form.reset(DEFAULT_VALUES);
    setTicketType('SEMANA');
  };

  const onSubmit = (values: TicketRegistrationForDaySchemaType) => {
    // Si todavía no pagó, no tiene sentido guardar un método — recién se sabe al cobrar,
    // ya sea acá (si tildan "Sí") o después al registrar la salida.
    const payload = { ...values, paymentMetodo: values.paid ? values.paymentMetodo : undefined };
    startTransition(async () => {
      const result = await createTicketRegistrationForDayAction(payload);
      if (result && 'error' in result && result.error) {
        toast.error(typeof result.error === 'string' ? result.error : 'Error al crear el ticket');
        return;
      }
      toast.success("Ticket creado exitosamente");
      resetForm();
      setIsOpen(false);
      setIsDialogOpen(false);
    });
  };

  return (
    <>
      <button
        onClick={() => {
          setIsOpen(true);
          setIsDialogOpen(true);
        }}
        className="group flex min-h-12 w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="grid size-8 place-items-center rounded-xl border border-gm-orange/30 bg-gm-orange/15 text-[#FF8458] transition-colors group-hover:bg-gm-orange/25">
          <CalendarPlus className="size-4" />
        </span>
        Ticket por día, semana o mes
      </button>

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-md border border-gm-orange/40 bg-gm-orange/15 text-[#FF8458]">
                <CalendarPlus className="size-4" />
              </span>
              <div>
                <DialogTitle>Ticket por día, semana o mes</DialogTitle>
                <DialogDescription className="mt-0.5">
                  Para estadías largas planificadas — día suelto, semana/s o mes/es.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="ticketTimeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de ticket</FormLabel>
                    <FormControl>
                      <Select
                        disabled={isPending}
                        onValueChange={(value) => {
                          const nextType = value as TicketTimeType;
                          setTicketType(nextType);
                          field.onChange(value);
                          // Limpia los campos que no le corresponden al tipo elegido — si no,
                          // queda un valor viejo pegado (ej. "semanas" de una elección anterior)
                          // que no se muestra pero se guarda igual y rompe el cálculo de
                          // vencimiento más adelante.
                          form.setValue('weeks', nextType === 'SEMANA' || nextType === 'SEMANA_Y_DIA' ? 1 : undefined);
                          form.setValue(
                            'days',
                            nextType === 'DIA' || nextType === 'SEMANA_Y_DIA' || nextType === 'MES_Y_DIA' ? 1 : undefined,
                          );
                          form.setValue('months', nextType === 'MES' || nextType === 'MES_Y_DIA' ? 1 : undefined);
                        }}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SEMANA">Semana/s</SelectItem>
                          <SelectItem value="MES">Mes/es</SelectItem>
                          <SelectItem value="DIA">Día/s</SelectItem>
                          <SelectItem value="SEMANA_Y_DIA">Semana/s y día/s</SelectItem>
                          <SelectItem value="MES_Y_DIA">Mes/es y día/s</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3">
                {(ticketType === 'SEMANA' || ticketType === 'SEMANA_Y_DIA') && (
                  <FormField
                    control={form.control}
                    name="weeks"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Cantidad de semana/s</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            disabled={isPending}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {(ticketType === 'DIA' || ticketType === 'SEMANA_Y_DIA' || ticketType === 'MES_Y_DIA') && (
                  <FormField
                    control={form.control}
                    name="days"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Cantidad de día/s</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            disabled={isPending}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {(ticketType === 'MES' || ticketType === 'MES_Y_DIA') && (
                  <FormField
                    control={form.control}
                    name="months"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Cantidad de mes/es</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            disabled={isPending}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <FormField
                control={form.control}
                name="vehicleType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de vehículo</FormLabel>
                    <FormControl>
                      <Select
                        disabled={isPending}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <VehicleTypeOptions />
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3">
                <FormField
                  control={form.control}
                  name="firstNameCustomer"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Nombre (opcional)</FormLabel>
                      <FormControl>
                        <Input disabled={isPending} placeholder="Nombre" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastNameCustomer"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Apellido (opcional)</FormLabel>
                      <FormControl>
                        <Input disabled={isPending} placeholder="Apellido" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="vehiclePlateCustomer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patente</FormLabel>
                    <FormControl>
                      <Input disabled={isPending} placeholder="Ej: AB123CD" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>¿El cliente realizó el pago?</FormLabel>
                    <FormControl>
                      <Select
                        disabled={isPending}
                        onValueChange={(value) => field.onChange(value === "true")}
                        value={field.value?.toString()}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una opción" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Sí</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isPaid && (
                <FormField
                  control={form.control}
                  name="paymentMetodo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>¿Cómo pagó?</FormLabel>
                      <FormControl>
                        <Select disabled={isPending} onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un método" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CASH">Efectivo</SelectItem>
                            <SelectItem value="TRANSFER">Transferencia</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <Button className="w-full" type="submit" disabled={isPending || (isPaid && !form.watch('paymentMetodo'))}>
                {isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                Crear ticket
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
