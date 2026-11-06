import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Un color con transparencia para estilos en línea. Sirve igual para un hex que para un token
// («hsl(var(--gm-ok))»): pegarle «24» al final solo funciona con hex y rompe con un token.
export function tinte(color: string, porcentaje: number) {
  return `color-mix(in srgb, ${color} ${porcentaje}%, transparent)`
}
