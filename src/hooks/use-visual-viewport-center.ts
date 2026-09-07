import * as React from "react"

type ViewportCenter = { left: number; top: number } | null

// iOS Safari ignora maximum-scale/user-scalable a propósito desde iOS 10 (decisión de Apple por
// accesibilidad, no algo que se pueda desactivar desde el sitio) — así que el pinch-zoom siempre
// va a estar disponible ahí. El problema es que `position: fixed` con `top/left: 50%` se ancla al
// "layout viewport" (el tamaño de página sin zoomear), no al "visual viewport" (lo que realmente
// se ve en pantalla) — cuando el usuario hace zoom, esos dos viewports se desalinean y el
// elemento fijo queda centrado respecto a un área que ya no es la visible, apareciendo corrido o
// con contenido tapado. La Visual Viewport API expone el viewport REAL visible, así que acá lo
// escuchamos en vivo y devolvemos el punto central para que el diálogo se pueda recentrar contra
// lo que el usuario realmente está viendo, en vez de depender de un cálculo CSS que no lo sabe.
export function useVisualViewportCenter(active: boolean): ViewportCenter {
  const [center, setCenter] = React.useState<ViewportCenter>(null)

  React.useEffect(() => {
    if (!active) {
      setCenter(null)
      return
    }
    const vv = typeof window !== "undefined" ? window.visualViewport : undefined
    if (!vv) return // navegador sin soporte — el CSS de fallback (top/left 50%) sigue aplicando

    const update = () => {
      setCenter({
        left: vv.offsetLeft + vv.width / 2,
        top: vv.offsetTop + vv.height / 2,
      })
    }

    update()
    vv.addEventListener("resize", update)
    vv.addEventListener("scroll", update)
    return () => {
      vv.removeEventListener("resize", update)
      vv.removeEventListener("scroll", update)
    }
  }, [active])

  return center
}
