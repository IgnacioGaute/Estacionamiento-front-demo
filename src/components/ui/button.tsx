import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-[13px] font-semibold tracking-tight ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gm-yellow text-gm-ink shadow-[inset_0_-2px_0_rgba(0,0,0,0.18)] hover:bg-[hsl(var(--gm-yellow-deep))]",
        orange:
          "bg-gm-orange text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.22)] hover:bg-[hsl(var(--gm-orange-deep))]",
        destructive:
          "bg-destructive text-destructive-foreground border border-destructive/40 hover:bg-destructive/90",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-gm-surface-2 hover:border-gm-line-strong",
        secondary:
          "bg-gm-surface-2 text-foreground border border-border hover:bg-gm-surface-3 hover:border-gm-line-strong",
        ghost:
          "text-muted-foreground hover:bg-gm-surface-2 hover:text-foreground",
        link:
          "text-gm-yellow underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-sm px-3 text-[12px]",
        lg: "h-11 rounded-md px-6 text-sm",
        xl: "h-12 rounded-md px-7 text-[15px]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// En el celular, los botones comunes miden 44 px y los chicos 40: con 36 y 32 px «Ayuda»,
// «Nuevo aviso» o «Generar recibos» quedaban chicos para el pulgar. Desde sm vuelven a su
// medida compacta. Si el botón trae su propia altura (h-7 dentro de un buscador, una
// paginación), se respeta en todas las pantallas: por eso no va en las variantes, donde
// tailwind-merge descartaría la altura base pero dejaría la del celular.
const ALTO_CELULAR: Partial<Record<NonNullable<VariantProps<typeof buttonVariants>["size"]>, string>> = {
  default: "max-sm:h-11",
  sm: "max-sm:h-10",
}
const ALTURA_PROPIA = /(^|\s)(h|size)-/

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const celular = ALTURA_PROPIA.test(className ?? "") ? undefined : ALTO_CELULAR[size ?? "default"]
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), celular, className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
