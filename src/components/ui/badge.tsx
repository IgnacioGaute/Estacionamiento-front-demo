import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[11px] font-bold uppercase tracking-[0.04em] transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-border bg-gm-surface-3 text-muted-foreground",
        yellow:
          "border-gm-yellow/40 bg-gm-yellow/15 text-gm-yellow",
        orange:
          "border-gm-orange/40 bg-gm-orange/15 text-gm-aviso",
        green:
          "border-gm-ok/40 bg-gm-ok/15 text-gm-ok",
        red:
          "border-destructive/40 bg-destructive/15 text-gm-peligro",
        blue:
          "border-[hsl(200_60%_60%/0.4)] bg-[hsl(200_60%_60%/0.15)] text-[#8FCDF0]",
        outline:
          "border-border text-foreground",
        secondary:
          "border-border bg-secondary text-secondary-foreground",
        destructive:
          "border-destructive/40 bg-destructive/15 text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
