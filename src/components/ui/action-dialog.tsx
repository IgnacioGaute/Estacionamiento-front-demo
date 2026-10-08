"use client"

// Diálogos de operación del mostrador: registrar una entrada, cobrar una salida, entregar el
// comprobante. En el celular son una hoja apoyada abajo, del alto de su contenido, con encabezado y
// pie fijos: el botón que registra o cobra queda siempre en el mismo lugar, al alcance del pulgar,
// sin desplazar y aunque el teclado esté abierto. En computadora es un diálogo centrado con la misma
// estructura (encabezado, cuerpo, pie).
//
// No reemplaza a `dialog.tsx`, que sigue siendo el diálogo general del sistema.

import * as React from "react"
import { createPortal } from "react-dom"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { ChevronLeft, X } from "lucide-react"

import { cn } from "@/lib/utils"

const ActionDialog = DialogPrimitive.Root
const ActionDialogTrigger = DialogPrimitive.Trigger

// Mismo corte que `sm:` de Tailwind: debajo, hoja; arriba, diálogo centrado.
const MEDIA_HOJA = "(max-width: 639px)"

// En constantes (y en una sola cadena) porque test/receipt-mobile-layout.test.cjs del backend las
// lee de este archivo para comprobar que el comprobante no desborda en celulares.
const CLASES_HOJA = "fixed z-50 flex flex-col overflow-hidden border-gm-line-strong bg-card text-card-foreground shadow-[0_-20px_60px_-12px_rgba(0,0,0,0.6)] outline-none inset-x-0 bottom-0 max-h-[calc(100dvh-0.5rem)] rounded-t-[22px] border-t sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[min(90dvh,860px)] sm:w-[calc(100%-2rem)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[22px] sm:border sm:shadow-[0_30px_80px_-12px_rgba(0,0,0,0.7)]"
const CLASES_CUERPO = "flex min-h-0 min-w-0 flex-auto flex-col gap-4 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pb-4 pt-1 [overflow-wrap:anywhere] short:gap-2.5 short:pb-3 sm:px-6"

type AreaVisible = { bottom: number; height: number }

// Lo que realmente se ve, no el layout viewport. En iOS el teclado achica el visual viewport sin
// mover los `position: fixed`: con `bottom: 0` el pie quedaría debajo del teclado, tapado. Acá la
// hoja se apoya sobre el borde de lo visible y nunca es más alta que eso; el cuerpo es lo único
// que cede lugar.
function useAreaVisible(): AreaVisible | null {
  const [area, setArea] = React.useState<AreaVisible | null>(null)

  React.useEffect(() => {
    if (typeof window.matchMedia !== "function") return
    const media = window.matchMedia(MEDIA_HOJA)
    const vv = window.visualViewport
    const update = () => {
      if (!media.matches || !vv) {
        setArea(null)
        return
      }
      const layout = document.documentElement.clientHeight
      setArea({ bottom: Math.max(0, layout - (vv.offsetTop + vv.height)), height: vv.height })
    }
    update()
    media.addEventListener("change", update)
    vv?.addEventListener("resize", update)
    vv?.addEventListener("scroll", update)
    return () => {
      media.removeEventListener("change", update)
      vv?.removeEventListener("resize", update)
      vv?.removeEventListener("scroll", update)
    }
  }, [])

  return area
}

// El pie lo arma el diálogo, pero a veces el botón que corresponde lo decide un panel de adentro
// (el QR, la transferencia al alias): esos lo mandan al pie con `ActionDialogFooterPortal`.
const PieContext = React.createContext<{
  pie: HTMLElement | null
  setPie: (node: HTMLElement | null) => void
} | null>(null)

const ActionDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, style, ...props }, ref) => {
  const area = useAreaVisible()
  const [pie, setPie] = React.useState<HTMLElement | null>(null)

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        ref={ref}
        // Mientras hay una abierta, el asistente flotante se esconde en el celular: su botón queda por
        // encima de cualquier diálogo y tapaba la X de cerrar (ver assistant-widget.css).
        data-action-dialog=""
        className={cn(
          CLASES_HOJA,
          "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
          "sm:data-[state=open]:fade-in-0 sm:data-[state=closed]:fade-out-0 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95",
          "sm:data-[state=open]:slide-in-from-left-1/2 sm:data-[state=open]:slide-in-from-top-[48%] sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=closed]:slide-out-to-top-[48%]",
          className
        )}
        style={
          area
            ? {
                bottom: area.bottom,
                maxHeight: `calc(${area.height}px - max(env(safe-area-inset-top), 0.5rem))`,
                ...style,
              }
            : style
        }
        {...props}
      >
        <div className="gm-stripes h-[5px] w-full shrink-0" aria-hidden />
        <PieContext.Provider value={{ pie, setPie }}>{children}</PieContext.Provider>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
})
ActionDialogContent.displayName = "ActionDialogContent"

function ActionDialogHeader({
  title,
  description,
  onBack,
  backLabel = "Volver",
  backDisabled,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  onBack?: () => void
  backLabel?: string
  backDisabled?: boolean
  className?: string
}) {
  return (
    <header className={cn("flex shrink-0 items-center gap-1.5 pb-3 pl-3 pr-4 pt-3 short:pb-2 short:pt-2 sm:pl-4 sm:pr-5 sm:pt-4", className)}>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          disabled={backDisabled}
          aria-label={backLabel}
          className="grid size-11 shrink-0 place-items-center rounded-xl text-foreground transition-colors hover:bg-gm-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow disabled:opacity-40"
        >
          <ChevronLeft className="size-[22px]" aria-hidden />
        </button>
      )}
      <div className={cn("min-w-0 flex-1", !onBack && "pl-2")}>
        <DialogPrimitive.Title className="gm-display truncate text-[21px] font-semibold leading-tight tracking-[0.03em] text-foreground sm:text-[22px]">
          {title}
        </DialogPrimitive.Title>
        {/* En pantallas bajas la bajada se oculta (sigue para lectores de pantalla): el lugar es del formulario. */}
        <DialogPrimitive.Description className={description ? "mt-0.5 truncate text-[13px] text-muted-foreground short:sr-only" : "sr-only"}>
          {description ?? title}
        </DialogPrimitive.Description>
      </div>
      {/* El mismo botón de cerrar que el resto de los diálogos (dialog.tsx): gira al pasar el mouse y
          se achica al tocarlo. El área táctil se agranda por fuera sin cambiar el dibujo. */}
      <DialogPrimitive.Close
        className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground opacity-80 ring-offset-background transition-all duration-200 after:absolute after:-inset-1.5 after:content-[''] hover:rotate-90 hover:scale-100 hover:bg-gm-surface-3 hover:text-foreground hover:opacity-100 active:scale-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
      >
        <X className="h-4 w-4" aria-hidden />
        <span className="sr-only">Cerrar</span>
      </DialogPrimitive.Close>
    </header>
  )
}

// El único que cede lugar: el contenido está pensado para entrar sin desplazar, y solo con el
// teclado abierto o en pantallas muy bajas se puede mover, sin arrastrar al encabezado ni al pie.
const ActionDialogBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn(CLASES_CUERPO, className)} {...props} />
)
ActionDialogBody.displayName = "ActionDialogBody"

// Vacío (sin botones propios ni de un panel) no ocupa lugar. En computadora los botones van en fila
// y el principal ocupa el ancho que queda, alineado con el contenido.
function ActionDialogFooter({ className, children }: { className?: string; children?: React.ReactNode }) {
  const contexto = React.useContext(PieContext)
  return (
    <div
      ref={contexto?.setPie}
      className={cn(
        "flex shrink-0 flex-col gap-2 border-t border-border bg-card px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] empty:hidden short:pt-2.5 sm:flex-row sm:items-center sm:gap-3 sm:px-6 sm:pb-4",
        className
      )}
    >
      {children}
    </div>
  )
}

function ActionDialogFooterPortal({ children }: { children: React.ReactNode }) {
  const contexto = React.useContext(PieContext)
  return contexto?.pie ? createPortal(children, contexto.pie) : null
}

// El botón principal: lo que se hace y, abajo, sobre qué (patente, importe, medio). Lee de una
// pasada qué se va a registrar antes de tocarlo.
const ActionDialogPrimaryButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { detail?: React.ReactNode }
>(({ className, children, detail, type = "button", ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn(
      "flex min-h-[58px] w-full flex-col items-center justify-center gap-0.5 rounded-2xl bg-gm-yellow px-5 py-2 text-gm-ink transition-colors hover:bg-gm-yellow-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:bg-gm-surface-3 disabled:text-muted-foreground short:min-h-[52px] short:py-1.5 sm:w-auto sm:flex-1",
      className
    )}
    {...props}
  >
    <span className="gm-display text-[16px] font-semibold leading-tight tracking-[0.05em]">{children}</span>
    {detail && <span className="gm-mono text-[12.5px] font-semibold opacity-80">{detail}</span>}
  </button>
))
ActionDialogPrimaryButton.displayName = "ActionDialogPrimaryButton"

const ActionDialogSecondaryButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "outline" | "ghost" }
>(({ className, tone = "outline", type = "button", ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn(
      "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 text-[14.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow disabled:opacity-50 sm:w-auto",
      tone === "outline"
        ? "border-[1.5px] border-gm-line-strong text-foreground hover:bg-gm-surface-2"
        : "min-h-11 text-[#D9D1C3] hover:text-foreground",
      className
    )}
    {...props}
  />
))
ActionDialogSecondaryButton.displayName = "ActionDialogSecondaryButton"

export {
  ActionDialog,
  ActionDialogTrigger,
  ActionDialogContent,
  ActionDialogHeader,
  ActionDialogBody,
  ActionDialogFooter,
  ActionDialogFooterPortal,
  ActionDialogPrimaryButton,
  ActionDialogSecondaryButton,
}
