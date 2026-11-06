"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Etiqueta de un campo: 13 px, seminegrita y sin mayúsculas, la misma de Tarifas y del modo sin
// conexión. Eran 11 px en mayúsculas espaciadas, chicas para leer en el celular y distintas de las
// demás pantallas. Las mayúsculas quedan para etiquetas de un dato (Etiqueta en turno-ui).
const labelVariants = cva(
  "text-[13px] font-semibold leading-snug text-gm-texto-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
)

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
