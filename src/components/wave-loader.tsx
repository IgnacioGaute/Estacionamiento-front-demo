'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useMemo } from 'react';

/**
 * Ola de barras con una pelota que rebota (adaptado de WavePhysicsLoader) con los colores del
 * sistema: en reposo las barras van en el gris de las superficies y, donde pasa la ola, toman el
 * color de la marca, amarillo a la izquierda y naranja a la derecha. Dura 4 s, lo mismo que el
 * auto de la pantalla de carga, para que las dos animaciones vayan al mismo ritmo.
 */
const BARRAS = 15;
const CUADROS = 201;
const REBOTES = 4;
const DURACION = 4;

// --gm-surface-3, --gm-yellow y --gm-orange en RGB: framer-motion interpola colores, no variables CSS.
const REPOSO = [42, 36, 29] as const;
const AMARILLO = [245, 194, 25] as const;
const NARANJA = [230, 77, 30] as const;

export function WaveLoader({ escala = 0.42 }: { escala?: number }) {
  const quieto = useReducedMotion();
  const ancho = 12 * escala;
  const separacion = 8 * escala;
  const paso = ancho + separacion;
  const base = 16 * escala;
  const pico = 48 * escala;
  const maxRebote = 60 * escala;
  const hundimiento = 20 * escala;

  const { barras, pelota, tiempos } = useMemo(() => {
    const barras = Array.from({ length: BARRAS }, () => ({ alturas: [] as string[], colores: [] as string[] }));
    const pelota = { x: [] as number[], y: [] as number[], sx: [] as number[], sy: [] as number[] };
    const tiempos: number[] = [];

    for (let k = 0; k < CUADROS; k++) {
      const t = k / (CUADROS - 1);
      tiempos.push(t);

      // Ida y vuelta por las barras; en cada tramo la pelota toca cuatro veces.
      const avance = t < 0.5 ? t / 0.5 : (1 - t) / 0.5;
      const indice = avance * (BARRAS - 1);
      let fase = (avance * REBOTES) % 1;
      if (avance === 1 || avance === 0) fase = 0;
      const rebote = 4 * fase * (1 - fase);
      const apoyo = Math.max(0, 1 - rebote * 2);

      pelota.x.push(indice * paso);
      pelota.y.push(-(base + pico - apoyo * hundimiento + rebote * maxRebote));
      pelota.sx.push(1 + apoyo * 0.25);
      pelota.sy.push(1 - apoyo * 0.3);

      for (let i = 0; i < BARRAS; i++) {
        const distancia = Math.abs(i - indice);
        const ola = distancia < 3 ? Math.cos((distancia / 3) * (Math.PI / 2)) : 0;
        const hundido = distancia < 1.5 ? Math.cos((distancia / 1.5) * (Math.PI / 2)) * apoyo * hundimiento : 0;
        barras[i].alturas.push(`${Math.max(4 * escala, base + ola * pico - hundido)}px`);

        const p = i / (BARRAS - 1);
        const [r, g, b] = REPOSO.map((desde, c) => {
          const marca = AMARILLO[c] + (NARANJA[c] - AMARILLO[c]) * p;
          return Math.round(desde + ola * (marca - desde));
        });
        barras[i].colores.push(`rgb(${r}, ${g}, ${b})`);
      }
    }
    return { barras, pelota, tiempos };
  }, [escala, paso, base, pico, maxRebote, hundimiento]);

  const transicion = { duration: DURACION, repeat: Infinity, times: tiempos, ease: 'linear' as const };

  return (
    <div
      aria-hidden="true"
      className="relative flex items-end"
      style={{ width: BARRAS * ancho + (BARRAS - 1) * separacion, height: 140 * escala, gap: separacion }}
    >
      {barras.map((barra, i) => (
        <motion.span
          key={i}
          className="block flex-none rounded-full"
          style={{ width: ancho, height: base, backgroundColor: `rgb(${REPOSO.join(', ')})` }}
          animate={quieto ? undefined : { height: barra.alturas, backgroundColor: barra.colores }}
          transition={transicion}
        />
      ))}
      <motion.span
        className="absolute bottom-0 left-0 z-10 block rounded-full"
        style={{
          width: ancho,
          height: ancho,
          transformOrigin: 'bottom center',
          backgroundColor: 'hsl(var(--foreground))',
          boxShadow: '0 0 10px hsl(var(--gm-yellow) / 0.35)',
          y: quieto ? -base : undefined,
        }}
        animate={quieto ? undefined : { x: pelota.x, y: pelota.y, scaleX: pelota.sx, scaleY: pelota.sy }}
        transition={transicion}
      />
    </div>
  );
}
