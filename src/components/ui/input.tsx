import * as React from "react"

import { cn } from "@/lib/utils"

// En el celular 44 px, como los botones y la lista desplegable: con 40 un campo y un botón en la
// misma fila quedaban desparejos. Si el campo trae su propia altura, se respeta.
const ALTURA_PROPIA = /(^|\s)(h|size)-/

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-gm-surface-3 px-3 py-2 text-base text-foreground ring-offset-background transition-colors",
          !ALTURA_PROPIA.test(className ?? "") && "max-sm:h-11",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          // Sin /80: con la opacidad el placeholder quedaba en 4,0:1, debajo de AA.
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:border-gm-yellow focus-visible:ring-2 focus-visible:ring-gm-yellow/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
          // 16px en mobile evita que iOS/Android hagan zoom automático al enfocar el campo — un
          // tamaño menor dispara ese zoom y la página queda "trabada" en esa escala.
          "md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
