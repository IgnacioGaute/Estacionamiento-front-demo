import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        // 16px en mobile evita que iOS/Android hagan zoom automático al enfocar el campo.
        "flex min-h-[88px] w-full rounded-md border border-input bg-gm-surface-3 px-3 py-2 text-base text-foreground ring-offset-background placeholder:text-muted-foreground/80 focus-visible:outline-none focus-visible:border-gm-yellow focus-visible:ring-2 focus-visible:ring-gm-yellow/30 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
