// Espera antes del próximo intento automático: crece al doble en cada fallo seguido, con un tope y
// una variación aleatoria (la mitad fija, la otra mitad al azar) para que muchos celulares que
// perdieron la conexión al mismo tiempo no vuelvan todos en el mismo segundo. Si el servidor dijo
// cuándo volver (Retry-After), nunca antes de eso.
export function esperaReintento(
  fallosSeguidos: number,
  { baseMs = 2_000, maxMs = 30_000, retryAfterMs = null as number | null, azar = Math.random } = {},
) {
  const exponencial = Math.min(maxMs, baseMs * 2 ** Math.max(0, fallosSeguidos - 1));
  const conVariacion = exponencial / 2 + azar() * (exponencial / 2);
  return Math.round(Math.max(conVariacion, retryAfterMs ?? 0));
}
