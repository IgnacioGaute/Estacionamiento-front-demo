import { cn } from "@/lib/utils"

// El Skeleton de SmoothUI (primitives/skeleton): un bloque apenas más claro que el fondo y un brillo
// que lo cruza de izquierda a derecha. Acá en CSS y no con Motion, para que siga sirviendo en los
// loading.tsx del servidor; mismos colores, duración, curva y pausa entre vueltas. Con «reducir
// movimiento» queda el bloque quieto. Las piezas no se leen: quien las agrupa avisa que está
// cargando (ver Cargando en components/esqueletos).
function Skeleton({
  className,
  shimmer = true,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  /** El brillo que cruza el bloque. Apagado, queda un relleno quieto. */
  shimmer?: boolean
}) {
  return (
    <div
      aria-hidden
      data-slot="skeleton"
      // max-w-full: los anchos fijos (w-40, w-52…) nunca pasan el ancho de lo que los contiene; en
      // una columna angosta (Cobrar salida en una pantalla chica) se salían de la tarjeta.
      className={cn("relative max-w-full overflow-hidden rounded-md bg-foreground/10", className)}
      {...props}
    >
      {shimmer && (
        <span
          aria-hidden
          data-slot="skeleton-shimmer"
          className="pointer-events-none absolute inset-0 -translate-x-full animate-skeleton-brillo bg-gradient-to-r from-transparent via-foreground/10 to-transparent will-change-transform motion-reduce:hidden"
        />
      )}
    </div>
  )
}

export { Skeleton }
