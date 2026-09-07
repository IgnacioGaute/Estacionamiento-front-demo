import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-gm-surface-3 px-3 py-2 text-base text-foreground ring-offset-background transition-colors",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground/80",
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
