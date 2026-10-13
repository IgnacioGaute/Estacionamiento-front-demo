// La versión de esta compilación. next.config la fija al compilar y la incrusta igual en el código
// del navegador y en el del servidor, así que comparar la que trae la página con la que responde
// /api/version dice si desde que se abrió la página hubo un despliegue nuevo.
export const VERSION_APP = process.env.NEXT_PUBLIC_VERSION_APP ?? 'dev';

// Los errores que no son de la aplicación sino de una página vieja hablando con un despliegue
// nuevo: el pedazo de JavaScript que pide ya no existe, o la acción de servidor cambió de id.
// Pasa sobre todo al volver a una pestaña que quedó abierta (el celular apagado) después de un
// despliegue. Recargar lo resuelve.
export function esDeOtraVersion(error: unknown): boolean {
  const texto = error instanceof Error ? `${error.name} ${error.message}` : String(error ?? '');
  // En el teléfono, una acción de servidor de otra versión llega como UnrecognizedActionError
  // («Server Action "…" was not found on the server»); en el log del servidor dice «Failed to find
  // Server Action … older or newer deployment».
  return /ChunkLoadError|Loading (CSS )?chunk|Failed to fetch dynamically imported module|Importing a module script failed|UnrecognizedActionError|was not found on the server|Failed to find Server Action|older or newer deployment/i.test(
    texto,
  );
}

// Una consulta que no llegó al servidor (sin red, o la red todavía volviendo al desbloquear el
// celular). No es un error de la aplicación: alcanza con reintentar cuando vuelva la conexión.
// Chrome dice «Failed to fetch», Safari «Load failed» y Firefox «NetworkError…».
export function esDeRed(error: unknown): boolean {
  const texto = error instanceof Error ? `${error.name} ${error.message}` : String(error ?? '');
  return /Failed to fetch|Load failed|NetworkError|Network request failed|ERR_NETWORK|ERR_INTERNET_DISCONNECTED/i.test(texto);
}

// Recarga una sola vez por minuto: si después de recargar sigue fallando, el problema es otro y
// recargar en bucle dejaría la pantalla parpadeando.
export function recargarUnaVez(): boolean {
  const CLAVE = 'recarga-por-version';
  try {
    const ultima = Number(sessionStorage.getItem(CLAVE) ?? 0);
    if (Date.now() - ultima < 60_000) return false;
    sessionStorage.setItem(CLAVE, String(Date.now()));
  } catch {
    // Sin sessionStorage (modo privado estricto) no hay cómo evitar el bucle: mejor no recargar.
    return false;
  }
  window.location.reload();
  return true;
}
