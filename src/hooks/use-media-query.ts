import { useEffect, useState } from 'react';

// `undefined` hasta montar: el servidor no sabe el ancho de la pantalla, así que quien lo use puede
// dibujar las dos variantes (y dejar que el CSS muestre la que va) hasta saberlo.
export function useMediaQuery(query: string): boolean | undefined {
  const [coincide, setCoincide] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      setCoincide(false);
      return;
    }
    const mql = window.matchMedia(query);
    const actualizar = () => setCoincide(mql.matches);
    actualizar();
    mql.addEventListener('change', actualizar);
    return () => mql.removeEventListener('change', actualizar);
  }, [query]);
  return coincide;
}
