'use client'

import { useState, useTransition } from 'react'
import { toast } from '@/lib/toast'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

import { RenterParkingType } from '@/types/renter-parking-type'
import { updateRenterParkingTypeSchema, UpdateRenterParkingTypeSchemaType } from '@/schemas/renter-parking-type.schema'
import { updateRenterParkingTypeAction } from '@/actions/renter-parking-type/update-renter-parking-type.action'

// El backend todavía recibe el mes, pero ya no lo usa para reescribir cargos: se manda el actual.
const getCurrentMonthYYYYMM = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function UpdateRenterParkingTypeDialog({ parkingType }: { parkingType: RenterParkingType }) {
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  const form = useForm<UpdateRenterParkingTypeSchemaType>({
    resolver: zodResolver(updateRenterParkingTypeSchema),
    defaultValues: {
      amount: parkingType.amount || 0,
      name: parkingType.name,
      month: getCurrentMonthYYYYMM(), // "YYYY-MM"
    },
  })

  const onSubmit = async (values: UpdateRenterParkingTypeSchemaType) => {
    startTransition(async () => {
      const response = await updateRenterParkingTypeAction(parkingType.id, values)

      if (response?.error) {
        toast.error(typeof response.error === 'string' ? response.error : 'Error al actualizar')
        return
      }

      toast.success('Tipo de estacionamiento actualizado exitosamente')
      form.reset({
        amount: values.amount,
        name: values.name,
        month: values.month,
      })
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start" size="sm" onClick={() => setOpen(true)}>
          Editar
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader className="items-center">
          <DialogTitle>Actualizar tipo de estacionamiento (inquilinos)</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* El precio ya no reescribe el cargo de un mes: rige para los abonos que se carguen de
                acá en adelante (la cuenta corriente conserva lo registrado; se corrige con ajustes). */}
            <p className="rounded-lg border border-gm-yellow/40 bg-gm-yellow/[0.06] px-3 py-2.5 text-sm">
              El precio nuevo rige para los abonos que se carguen de acá en adelante. Los cargos ya registrados conservan su
              importe; si hace falta corregir alguno, cargá un ajuste en la cuenta del inquilino.
            </p>

            {/* Nombre */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input disabled={isPending} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Precio */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio</FormLabel>
                  <FormControl>
                    <Input type="number" disabled={isPending} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button className="w-full" type="submit" disabled={isPending}>
              Editar
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
