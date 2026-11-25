// La entrada «cometa» de la línea de lo cobrado, portada del efecto comet de Particle Line (bklit):
// la línea crece detrás de una cabeza brillante que despide chispas; las chispas salen hacia atrás,
// frenan, suben apenas y se enfrían del blanco al color de la paleta; detrás del frente queda un
// tramo «al rojo» de 90 px. Mismas constantes que el original (que usa WebGL); acá es un canvas 2D.
// Al terminar, el componente vuelve a la línea en SVG, igual en reposo.

export type SerieCometa = {
  puntos: [number, number][];   // en coordenadas del dibujo (viewBox)
  colores: [string, string, string, string];
  ancho: number;                // grosor de la línea (en px de pantalla)
  densidad: number;             // chispas por px de línea
  spread: number;
};

const EASE: [number, number, number, number] = [0.85, 0, 0.15, 1];
const DURACION = 1.1, ENFRIADO = 0.9, VIDA: [number, number] = [0.8, 1.9];
const COMET = { speed: [50, 190], backward: 0.93, gravity: -12, drag: 0.9, size: [1.6, 5.2], twinkle: 0.3, cooling: 2.4, flare: 38 };
const TRAMO = 90, GLOW_ANCHO = 1.5, GLOW_BLUR = 3.5, GLOW_OPACIDAD = 0.6, MAX_CHISPAS = 14000;
const HOT: [number, number, number] = [255, 247, 224];
export const DURACION_TOTAL_MS = (DURACION + VIDA[1] + ENFRIADO) * 1000;

function bezier(a: number, b: number, t: number) { const u = 1 - t; return 3 * u * u * t * a + 3 * u * t * t * b + t * t * t; }
function resolver(a: number, b: number, x: number) {
  let lo = 0, hi = 1;
  for (let i = 0; i < 32; i++) { const mid = (lo + hi) / 2; if (bezier(a, b, mid) < x) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
export const easeAt = ([x1, y1, x2, y2]: number[], t: number) => bezier(y1, y2, resolver(x1, x2, t));
const timeAtProgress = ([x1, y1, x2, y2]: number[], p: number) => bezier(x1, x2, resolver(y1, y2, p));

const rgb = (hex: string): [number, number, number] => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mezclar = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);
function paleta(c: [number, number, number][], t: number) {
  const x = Math.min(1, Math.max(0, t)) * 3;
  let col = mezclar(c[0], c[1], Math.min(1, Math.max(0, x)));
  col = mezclar(col, c[2], Math.min(1, Math.max(0, x - 1)));
  return mezclar(col, c[3], Math.min(1, Math.max(0, x - 2)));
}
const css = (c: number[], a = 1) => `rgba(${c.map((v) => Math.round(v)).join(',')},${a})`;

// La misma curva que dibuja el SVG (Catmull-Rom a Bézier), muestreada cada 1 px de largo.
function muestrear(puntos: [number, number][], escala: number) {
  const crudo: [number, number][] = [];
  for (let i = 1; i < puntos.length; i++) {
    const p0 = puntos[i - 2] ?? puntos[i - 1], p1 = puntos[i - 1], p = puntos[i], p3 = puntos[i + 1] ?? p;
    const c1 = [p1[0] + (p[0] - p0[0]) / 6, p1[1] + (p[1] - p0[1]) / 6], c2 = [p[0] - (p3[0] - p1[0]) / 6, p[1] - (p3[1] - p1[1]) / 6];
    for (let k = i === 1 ? 0 : 1; k <= 48; k++) {
      const t = k / 48, u = 1 - t;
      crudo.push([
        (u * u * u * p1[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p[0]) * escala,
        (u * u * u * p1[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p[1]) * escala,
      ]);
    }
  }
  const acum = [0];
  for (let i = 1; i < crudo.length; i++) acum.push(acum[i - 1] + Math.hypot(crudo[i][0] - crudo[i - 1][0], crudo[i][1] - crudo[i - 1][1]));
  const largo = acum[acum.length - 1] ?? 0;
  const xs: number[] = [], ys: number[] = [], largos: number[] = [];
  let j = 1;
  for (let s = 0; s <= largo && crudo.length > 1; s += 1) {
    while (j < crudo.length - 1 && acum[j] < s) j++;
    const f = (s - acum[j - 1]) / (acum[j] - acum[j - 1] || 1);
    xs.push(crudo[j - 1][0] + (crudo[j][0] - crudo[j - 1][0]) * f);
    ys.push(crudo[j - 1][1] + (crudo[j][1] - crudo[j - 1][1]) * f);
    largos.push(s);
  }
  return { xs, ys, largos, total: largos[largos.length - 1] ?? 0, x0: xs[0] ?? 0, x1: xs[xs.length - 1] ?? 1 };
}
type Muestras = ReturnType<typeof muestrear>;
function tangente(m: Muestras, i: number): [number, number] {
  const a = Math.max(0, i - 2), b = Math.min(m.xs.length - 1, i + 2);
  const dx = m.xs[b] - m.xs[a], dy = m.ys[b] - m.ys[a], l = Math.hypot(dx, dy) || 1;
  return [dx / l, dy / l];
}
const fraccionX = (m: Muestras, i: number) => (m.xs[i] - m.x0) / (m.x1 - m.x0 || 1);
function indiceEnFraccion(m: Muestras, f: number) {
  const objetivo = m.x0 + f * (m.x1 - m.x0);
  let lo = 0, hi = m.xs.length - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (m.xs[mid] < objetivo) lo = mid + 1; else hi = mid; }
  return lo;
}
function aleatorio(semilla: number) { let s = semilla; return () => { s = (s * 1_664_525 + 1_013_904_223) % 4_294_967_296; return s / 4_294_967_296; }; }

// Arma y corre la animación; devuelve cómo cancelarla. `alTerminar` llega cuando ya no queda nada en movimiento.
export function animarCometa(canvas: HTMLCanvasElement, series: SerieCometa[], escala: number, alTerminar: () => void) {
  const ctx = canvas.getContext('2d');
  if (!ctx) { alTerminar(); return () => undefined; }
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const { width, height } = canvas.getBoundingClientRect();
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);

  const datos = series.map((s) => {
    const m = muestrear(s.puntos, escala);
    const colores = s.colores.map(rgb) as [number, number, number][];
    const n = Math.min(MAX_CHISPAS, Math.max(1, Math.round(m.total * s.densidad)));
    const r = aleatorio(73_313);
    const ultimo = m.xs.length - 1;
    // Por chispa: x, y, tx, ty, color (fracción x), r1..r4, momento en que el frente la alcanza.
    const chispas = new Float32Array(n * 10);
    for (let p = 0; p < n; p++) {
      const i = Math.min(ultimo, Math.round(r() * ultimo));
      const [tx, ty] = tangente(m, i);
      const travesia = (r() - 0.5) * s.ancho * 1.6;
      const o = p * 10;
      chispas[o] = m.xs[i] - ty * travesia; chispas[o + 1] = m.ys[i] + tx * travesia;
      chispas[o + 2] = tx; chispas[o + 3] = ty; chispas[o + 4] = fraccionX(m, i);
      chispas[o + 5] = r(); chispas[o + 6] = r(); chispas[o + 7] = r(); chispas[o + 8] = r();
      chispas[o + 9] = timeAtProgress(EASE, fraccionX(m, i));
    }
    const gradiente = ctx.createLinearGradient(m.x0, 0, m.x1, 0);
    s.colores.forEach((c, i) => gradiente.addColorStop(i / 3, c));
    return { s, m, colores, chispas, n, gradiente };
  });

  const trazar = (m: Muestras, hasta: number, desde = 0) => {
    ctx.beginPath();
    ctx.moveTo(m.xs[desde], m.ys[desde]);
    for (let i = desde + 1; i <= hasta; i++) ctx.lineTo(m.xs[i], m.ys[i]);
  };

  let inicio = 0, raf = 0, cancelado = false;
  const fin = DURACION + VIDA[1] + ENFRIADO;
  const cuadro = (ahora: number) => {
    if (cancelado) return;
    if (!inicio) inicio = ahora;
    const t = (ahora - inicio) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    for (const d of datos) {
      const { m, s, colores } = d;
      const lineal = Math.min(1, Math.max(0, t / DURACION));
      const progreso = easeAt(EASE, lineal);
      const iFrente = progreso >= 1 ? m.xs.length - 1 : indiceEnFraccion(m, progreso);
      const frente = m.largos[iFrente] ?? 0;
      const pasado = t - DURACION;
      const calor = pasado > 0 ? Math.max(0, 1 - pasado / ENFRIADO) : 1;
      if (progreso > 0 && iFrente > 0) {
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        // Resplandor: la línea más ancha y desenfocada.
        ctx.save(); ctx.globalAlpha = GLOW_OPACIDAD; ctx.filter = `blur(${GLOW_BLUR}px)`; ctx.strokeStyle = d.gradiente; ctx.lineWidth = s.ancho * GLOW_ANCHO;
        trazar(m, iFrente); ctx.stroke(); ctx.restore();
        // La línea.
        ctx.strokeStyle = d.gradiente; ctx.lineWidth = s.ancho; trazar(m, iFrente); ctx.stroke();
        // El tramo al rojo detrás del frente: del color de la paleta al blanco caliente.
        if (calor > 0) {
          const desde = Math.max(0, iFrente - TRAMO * 3);
          for (let i = desde; i < iFrente; i += 2) {
            const h = Math.min(1, Math.exp(-(frente - m.largos[i]) / TRAMO) * calor);
            if (h < 0.02) continue;
            const col = mezclar(paleta(colores, fraccionX(m, i)), HOT, h * 0.75);
            ctx.strokeStyle = css(col, 1); ctx.lineWidth = s.ancho; trazar(m, Math.min(iFrente, i + 2), i); ctx.stroke();
          }
          // Brillo en el frente.
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.filter = 'blur(6px)'; ctx.strokeStyle = css(HOT, 0.55 * calor); ctx.lineWidth = s.ancho * GLOW_ANCHO + 6;
          trazar(m, iFrente, Math.max(0, iFrente - 30)); ctx.stroke(); ctx.restore();
        }
      }
      // Las chispas: nacen cuando el frente pasa por su lugar, salen hacia atrás, frenan y se enfrían.
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const ch = d.chispas;
      for (let p = 0; p < d.n; p++) {
        const o = p * 10;
        const edad = t - ch[o + 9] * DURACION;
        const vida = VIDA[0] + (VIDA[1] - VIDA[0]) * ch[o + 6];
        if (edad < 0 || edad > vida) continue;
        const ang = ch[o + 7] * Math.PI * 2;
        let dx = Math.cos(ang) + (-ch[o + 2] - Math.cos(ang)) * COMET.backward, dy = Math.sin(ang) + (-ch[o + 3] - Math.sin(ang)) * COMET.backward;
        const l = Math.hypot(dx, dy) || 1e-4; dx /= l; dy /= l;
        const vel = (COMET.speed[0] + (COMET.speed[1] - COMET.speed[0]) * ch[o + 5] * ch[o + 5]) * (s.spread / 150);
        const viaje = (1 - Math.exp(-COMET.drag * edad)) / COMET.drag;
        const x = ch[o] + dx * vel * viaje, y = ch[o + 1] + dy * vel * viaje + 0.5 * COMET.gravity * edad * edad;
        const brillo = 1 - COMET.twinkle * (0.5 + 0.5 * Math.sin(t * 18 + ch[o + 8] * 60));
        const apagado = 1 - edad / vida;
        const a = apagado * apagado * brillo;
        const h = Math.exp(-edad * COMET.cooling);
        const tam = (COMET.size[0] + (COMET.size[1] - COMET.size[0]) * ch[o + 8] * ch[o + 7]) * (0.7 + 0.6 * h);
        // El original pinta cada chispa con una caída gaussiana (exp(-d²·3,5)); un disco lleno con
        // ~0,35 de opacidad da el mismo brillo promedio.
        ctx.fillStyle = css(mezclar(paleta(colores, ch[o + 4]), HOT, h * 0.6), Math.min(1, a * 0.35));
        ctx.beginPath(); ctx.arc(x, y, tam / 2, 0, Math.PI * 2); ctx.fill();
      }
      // La cabeza: núcleo, halo y rayos en cruz, con un leve parpadeo.
      const alfa = Math.min(1, t / 0.15) * calor * calor;
      if (alfa > 0.01 && progreso > 0) {
        const hx = m.xs[iFrente], hy = m.ys[iFrente], radio = COMET.flare / 2;
        const parpadeo = 0.85 + 0.15 * Math.sin(t * 40);
        const tinte = paleta(colores, frente / (m.total || 1));
        const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, radio);
        g.addColorStop(0, css(HOT, alfa * parpadeo)); g.addColorStop(0.12, css(HOT, 0.85 * alfa * parpadeo));
        g.addColorStop(0.35, css(tinte, 0.4 * alfa * parpadeo)); g.addColorStop(1, css(tinte, 0));
        ctx.fillStyle = g; ctx.fillRect(hx - radio, hy - radio, radio * 2, radio * 2);
        for (const [w, hgt] of [[radio * 2, 1.6], [1.6, radio * 2]]) {
          const rayo = w > hgt ? ctx.createLinearGradient(hx - radio, 0, hx + radio, 0) : ctx.createLinearGradient(0, hy - radio, 0, hy + radio);
          rayo.addColorStop(0, css(HOT, 0)); rayo.addColorStop(0.5, css(HOT, 0.7 * alfa * parpadeo)); rayo.addColorStop(1, css(HOT, 0));
          ctx.fillStyle = rayo; ctx.fillRect(hx - w / 2, hy - hgt / 2, w, hgt);
        }
      }
      ctx.restore();
    }
    if (t >= fin) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); alTerminar(); return; }
    raf = requestAnimationFrame(cuadro);
  };
  raf = requestAnimationFrame(cuadro);
  return () => { cancelado = true; cancelAnimationFrame(raf); };
}
