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
// MAX_CHISPAS: el tope para la densidad del original (7 por px); una línea menos densa tiene un
// tope proporcional. Dibujar todas (hasta 14.000) trababa la animación: con menos chispas se
// compensa el brillo para que el enjambre dé la misma luz.
const TRAMO = 90, GLOW_ANCHO = 1.5, GLOW_BLUR = 3.5, GLOW_OPACIDAD = 0.6, MAX_CHISPAS = 4000;
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
//
// Rendimiento: lo caro se hace una sola vez al empezar. La línea (con su resplandor desenfocado) y su
// versión «al rojo» se dibujan en lienzos aparte y en cada cuadro solo se copian recortadas hasta el
// frente (que avanza en x). Las chispas se estampan con sellos ya pintados (8 tonos × 6 temperaturas)
// y sus datos (dirección, velocidad, vida) están precalculados.
// Así ningún cuadro aplica filtros de desenfoque ni arma colores nuevos.
const TONOS = 8, TEMPERATURAS = 6, SELLO = 24;
export function animarCometa(canvas: HTMLCanvasElement, series: SerieCometa[], escala: number, alTerminar: () => void) {
  const ctx = canvas.getContext('2d');
  if (!ctx) { alTerminar(); return () => undefined; }
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const { width, height } = canvas.getBoundingClientRect();
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  const lienzo = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  const datos = series.map((s) => {
    const m = muestrear(s.puntos, escala);
    const colores = s.colores.map(rgb) as [number, number, number][];
    const trazo = (c: CanvasRenderingContext2D) => { c.beginPath(); c.moveTo(m.xs[0], m.ys[0]); for (let i = 1; i < m.xs.length; i++) c.lineTo(m.xs[i], m.ys[i]); };

    // La línea en reposo: resplandor (×1,5 de ancho, desenfoque 3,5, opacidad 0,6) y la línea encima.
    const linea = lienzo(canvas.width, canvas.height);
    const l = linea.getContext('2d')!;
    l.setTransform(dpr, 0, 0, dpr, 0, 0); l.lineCap = 'round'; l.lineJoin = 'round';
    const gradiente = l.createLinearGradient(m.x0, 0, m.x1, 0);
    s.colores.forEach((c, i) => gradiente.addColorStop(i / 3, c));
    l.save(); l.filter = `blur(${GLOW_BLUR}px)`; l.globalAlpha = GLOW_OPACIDAD; l.strokeStyle = gradiente; l.lineWidth = s.ancho * GLOW_ANCHO; trazo(l); l.stroke(); l.restore();
    l.strokeStyle = gradiente; l.lineWidth = s.ancho; trazo(l); l.stroke();

    // La misma línea al rojo (blanco cálido, con un brillo alrededor) para el tramo detrás del frente.
    const caliente = lienzo(canvas.width, canvas.height);
    const k = caliente.getContext('2d')!;
    k.setTransform(dpr, 0, 0, dpr, 0, 0); k.lineCap = 'round'; k.lineJoin = 'round';
    k.save(); k.filter = 'blur(5px)'; k.strokeStyle = css(HOT, 0.6); k.lineWidth = s.ancho * GLOW_ANCHO + 5; trazo(k); k.stroke(); k.restore();
    k.strokeStyle = css(HOT, 1); k.lineWidth = s.ancho; trazo(k); k.stroke();

    // Sellos de chispa: cada tono de la paleta (por posición x) mezclado con el blanco según la
    // temperatura; un disco de borde suave, como el que dibujaba la versión anterior.
    const sellos: HTMLCanvasElement[] = [];
    for (let tono = 0; tono < TONOS; tono++) for (let temp = 0; temp < TEMPERATURAS; temp++) {
      const c = lienzo(SELLO, SELLO), g = c.getContext('2d')!;
      const col = mezclar(paleta(colores, tono / (TONOS - 1)), HOT, (temp / (TEMPERATURAS - 1)) * 0.6);
      const rad = g.createRadialGradient(SELLO / 2, SELLO / 2, 0, SELLO / 2, SELLO / 2, SELLO / 2);
      rad.addColorStop(0, css(col, 1)); rad.addColorStop(0.7, css(col, 0.9)); rad.addColorStop(1, css(col, 0));
      g.fillStyle = rad; g.fillRect(0, 0, SELLO, SELLO);
      sellos.push(c);
    }

    // Las chispas, con todo lo que no depende del tiempo ya calculado:
    // x, y, dirección (dx, dy), velocidad, vida, tamaño base, tono, fase del titileo, momento de nacer.
    // Si se piden más que el tope, cada una brilla más, así el enjambre da la misma luz en total.
    const pedidas = Math.max(1, Math.round(m.total * s.densidad));
    const n = Math.min(Math.round(MAX_CHISPAS * s.densidad / 7), pedidas);
    const compensacion = 0.35 * Math.min(2.5, pedidas / n);
    const r = aleatorio(73_313);
    const ultimo = m.xs.length - 1;
    const ch = new Float32Array(n * 10);
    for (let p = 0; p < n; p++) {
      const i = Math.min(ultimo, Math.round(r() * ultimo));
      const [tx, ty] = tangente(m, i);
      const travesia = (r() - 0.5) * s.ancho * 1.6;
      const r1 = r(), r2 = r(), r3 = r(), r4 = r();
      const ang = r3 * Math.PI * 2;
      let dx = Math.cos(ang) + (-tx - Math.cos(ang)) * COMET.backward, dy = Math.sin(ang) + (-ty - Math.sin(ang)) * COMET.backward;
      const largo = Math.hypot(dx, dy) || 1e-4; dx /= largo; dy /= largo;
      const o = p * 10;
      ch[o] = m.xs[i] - ty * travesia; ch[o + 1] = m.ys[i] + tx * travesia;
      ch[o + 2] = dx; ch[o + 3] = dy;
      ch[o + 4] = (COMET.speed[0] + (COMET.speed[1] - COMET.speed[0]) * r1 * r1) * (s.spread / 150);
      ch[o + 5] = VIDA[0] + (VIDA[1] - VIDA[0]) * r2;
      ch[o + 6] = COMET.size[0] + (COMET.size[1] - COMET.size[0]) * r4 * r3;
      ch[o + 7] = Math.round(fraccionX(m, i) * (TONOS - 1));
      ch[o + 8] = r4 * 60;
      ch[o + 9] = timeAtProgress(EASE, fraccionX(m, i)) * DURACION;
    }
    const vivo = ctx.createLinearGradient(m.x0, 0, m.x1, 0);
    s.colores.forEach((c, i) => vivo.addColorStop(i / 3, c));
    return { s, m, colores, linea, caliente, sellos, ch, n, compensacion, gradiente: vivo };
  });

  // Junto a la cabeza la línea se dibuja en vivo. Copiar el lienzo recortado en x hasta el frente
  // dejaba ver, en las bajadas empinadas, un pedazo de la línea que todavía no llegó (y su brillo).
  // ZONA cubre lo que alcanza el resplandor desenfocado y queda casi entera bajo el destello de la
  // cabeza, por eso ahí alcanza con un resplandor aproximado, sin desenfoque.
  const ZONA = 20;
  const tramoVivo = (d: (typeof datos)[number], corte: number, iFrente: number, calor: number) => {
    const { xs, ys } = d.m;
    let desde = iFrente;
    while (desde > 0 && xs[desde - 1] >= corte - ZONA) desde--;
    if (desde === iFrente) return;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.beginPath(); ctx.rect(corte, 0, width - corte, height); ctx.clip();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(xs[desde], ys[desde]);
    for (let i = desde + 1; i <= iFrente; i++) ctx.lineTo(xs[i], ys[i]);
    ctx.strokeStyle = d.gradiente;
    ctx.globalAlpha = GLOW_OPACIDAD * 0.4; ctx.lineWidth = d.s.ancho * GLOW_ANCHO + 4; ctx.stroke();
    ctx.globalAlpha = 1; ctx.lineWidth = d.s.ancho; ctx.stroke();
    if (calor > 0) {
      ctx.strokeStyle = css(HOT, 1);
      ctx.globalAlpha = 0.2 * calor; ctx.lineWidth = d.s.ancho * GLOW_ANCHO + 6; ctx.stroke();
      ctx.globalAlpha = 0.75 * calor; ctx.lineWidth = d.s.ancho; ctx.stroke();
    }
    ctx.restore();
  };

  // Copia de un lienzo recortada entre dos x (en px de pantalla).
  const copiar = (origen: HTMLCanvasElement, desde: number, hasta: number) => {
    const a = Math.max(0, Math.floor(desde * dpr)), b = Math.min(canvas.width, Math.ceil(hasta * dpr));
    if (b > a) ctx.drawImage(origen, a, 0, b - a, canvas.height, a, 0, b - a, canvas.height);
  };
  const viajeDe = (e: number) => (1 - Math.exp(-COMET.drag * e)) / COMET.drag;
  // Las chispas van en una capa a resolución normal (son puntos difusos: no necesitan la densidad de
  // la pantalla) y se pegan una sola vez por cuadro: dibujarlas a 2x era lo que más costaba.
  const capa = lienzo(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)));
  const c2 = capa.getContext('2d')!;

  // Precalentado: el navegador sube cada lienzo a la placa de video la primera vez que se dibuja, y
  // eso trababa los primeros cuadros. Se dibujan todos una vez antes de empezar y se borra todo.
  for (const d of datos) {
    ctx.drawImage(d.linea, 0, 0); ctx.drawImage(d.caliente, 0, 0);
    for (const sello of d.sellos) c2.drawImage(sello, 0, 0);
  }
  ctx.drawImage(capa, 0, 0);
  c2.clearRect(0, 0, capa.width, capa.height);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // El reloj avanza a lo sumo 1/30 s por cuadro: si el navegador se traba (el resto del panel
  // cargando), la línea se demora un instante en vez de pegar un salto.
  // Calidad adaptable: si los cuadros vienen tardando más de lo que da la pantalla (una notebook
  // lenta), se dibuja una de cada dos chispas, más brillantes; vuelve a todas cuando hay resto.
  let anterior = 0, t = 0, raf = 0, cancelado = false, promedio = 16, paso = 1;
  const fin = DURACION + VIDA[1] + ENFRIADO;
  const cuadro = (ahora: number) => {
    if (cancelado) return;
    if (anterior) {
      const dt = ahora - anterior;
      t += Math.min(1 / 30, dt / 1000);
      promedio = promedio * 0.8 + Math.min(100, dt) * 0.2;
      paso = promedio > 24 ? 2 : promedio < 19 ? 1 : paso;
    }
    anterior = ahora;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const estado = datos.map((d) => {
      const progreso = easeAt(EASE, Math.min(1, Math.max(0, t / DURACION)));
      const iFrente = progreso >= 1 ? d.m.xs.length - 1 : indiceEnFraccion(d.m, progreso);
      const pasado = t - DURACION;
      return { d, progreso, iFrente, xFrente: d.m.xs[iFrente], calor: pasado > 0 ? Math.max(0, 1 - pasado / ENFRIADO) : 1 };
    });
    // Las líneas hasta el frente, y el tramo al rojo en tres franjas cada vez más cerca del frente.
    for (const { d, progreso, iFrente, xFrente, calor } of estado) {
      if (progreso <= 0) continue;
      const enCamino = progreso < 1;
      const corte = enCamino ? xFrente - ZONA : xFrente + d.s.ancho;
      copiar(d.linea, 0, corte);
      if (calor > 0) {
        for (const [atras, alfa] of [[TRAMO, 0.3], [TRAMO / 2, 0.35], [TRAMO / 6, 0.45]] as const) {
          ctx.globalAlpha = alfa * calor;
          copiar(d.caliente, xFrente - atras, corte);
        }
        ctx.globalAlpha = 1;
      }
      if (enCamino) tramoVivo(d, corte, iFrente, calor);
    }
    // Las chispas: nacen cuando el frente pasa por su lugar, salen hacia atrás, frenan y se enfrían.
    c2.setTransform(1, 0, 0, 1, 0, 0);
    c2.globalCompositeOperation = 'source-over'; c2.globalAlpha = 1;
    c2.clearRect(0, 0, capa.width, capa.height);
    c2.globalCompositeOperation = 'lighter';
    let hayChispas = false;
    for (const { d } of estado) {
      const ch = d.ch;
      const brillo = d.compensacion * paso;
      for (let p = 0; p < d.n; p += paso) {
        const o = p * 10;
        const edad = t - ch[o + 9];
        const vida = ch[o + 5];
        if (edad < 0 || edad > vida) continue;
        const viaje = ch[o + 4] * viajeDe(edad);
        const x = ch[o] + ch[o + 2] * viaje, y = ch[o + 1] + ch[o + 3] * viaje + 0.5 * COMET.gravity * edad * edad;
        const apagado = 1 - edad / vida;
        const a = apagado * apagado * (1 - COMET.twinkle * (0.5 + 0.5 * Math.sin(t * 18 + ch[o + 8]))) * brillo;
        if (a < 0.02) continue;
        const h = Math.exp(-edad * COMET.cooling);
        const tam = ch[o + 6] * (0.7 + 0.6 * h);
        c2.globalAlpha = Math.min(1, a);
        c2.drawImage(d.sellos[ch[o + 7] * TEMPERATURAS + Math.min(TEMPERATURAS - 1, Math.floor(h * TEMPERATURAS))], x - tam / 2, y - tam / 2, tam, tam);
        hayChispas = true;
      }
    }
    if (hayChispas) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(capa, 0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';
    }
    // Las cabezas: núcleo, halo y rayos en cruz, con un leve parpadeo.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    for (const { d, progreso, iFrente, xFrente, calor } of estado) {
      const alfa = Math.min(1, t / 0.15) * calor * calor;
      if (alfa <= 0.01 || progreso <= 0) continue;
      const hx = xFrente, hy = d.m.ys[iFrente], radio = COMET.flare / 2;
      const parpadeo = 0.85 + 0.15 * Math.sin(t * 40);
      const tinte = paleta(d.colores, d.m.largos[iFrente] / (d.m.total || 1));
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
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    if (t >= fin) { ctx.clearRect(0, 0, canvas.width, canvas.height); alTerminar(); return; }
    raf = requestAnimationFrame(cuadro);
  };
  raf = requestAnimationFrame(cuadro);
  return () => { cancelado = true; cancelAnimationFrame(raf); };
}
