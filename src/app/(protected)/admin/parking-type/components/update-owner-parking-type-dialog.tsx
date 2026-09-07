'use client'

import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { OwnerParkingType } from '@/types/owner-parking-type'
import { updateOwnerParkingTypeSchema, UpdateOwnerParkingTypeSchemaType } from '@/schemas/owner-parking-type.schema'
import { updateOwnerParkingTypeAction } from '@/actions/owner-parking-type/update-owner-parking-type.action'

// ==============================
// Helpers: mes/año a "YYYY-MM"
// ==============================
const MONTHS_ES = [
  { value: '01', label: 'Enero' },
  { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' },
  { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
]

const getCurrentMonthYYYYMM = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

const parseYYYYMM = (ym: string) => {
  const [y, m] = (ym || '').split('-')
  return {
    year: y || String(new Date().getFullYear()),
    month: m || String(new Date().getMonth() + 1).padStart(2, '0'),
  }
}

const buildYYYYMM = (year: string, month: string) => `${year}-${month}`

export function UpdateOwnerParkingTypeDialog({ parkingType }: { parkingType: OwnerParkingType }) {
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  const form = useForm<UpdateOwnerParkingTypeSchemaType>({
    resolver: zodResolver(updateOwnerParkingTypeSchema),
    defaultValues: {
      amount: parkingType.amount || 0,
      name: parkingType.name,
      month: getCurrentMonthYYYYMM(), // "YYYY-MM"
    },
  })

  const years = useMemo(() => {
    const current = new Date().getFullYear()
    const start = current - 2
    const end = current + 10
    const list: string[] = []
    for (let y = start; y <= end; y++) list.push(String(y))
    return list
  }, [])

  const onSubmit = async (values: UpdateOwnerParkingTypeSchemaType) => {
    startTransition(async () => {
      const response = await updateOwnerParkingTypeAction(parkingType.id, values)

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
          <DialogTitle>Actualizar tipo de estacionamiento (dueños)</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* ✅ Mes a actualizar (Select) */}
            <FormField
              control={form.control}
              name="month"
              render={({ field }) => {
                const { year, month } = parseYYYYMM(field.value)

                const setYear = (newYear: string) => field.onChange(buildYYYYMM(newYear, month))
                const setMonth = (newMonth: string) => field.onChange(buildYYYYMM(year, newMonth))

                return (
                  <FormItem>
                    <FormLabel>Mes a actualizar</FormLabel>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Año */}
                      <FormControl>
                        <Select disabled={isPending} value={year} onValueChange={setYear}>
                          <SelectTrigger>
                            <SelectValue placeholder="Año" />
                          </SelectTrigger>
                          <SelectContent>
                            {years.map((y) => (
                              <SelectItem key={y} value={y}>
                                {y}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>

                      {/* Mes */}
                      <FormControl>
                        <Select disabled={isPending} value={month} onValueChange={setMonth}>
                          <SelectTrigger>
                            <SelectValue placeholder="Mes" />
                          </SelectTrigger>
                          <SelectContent>
                            {MONTHS_ES.map((m) => (
                              <SelectItem key={m.value} value={m.value}>
                                {m.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </div>

                    <FormMessage />
                  </FormItem>
                )
              }}
            />

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
