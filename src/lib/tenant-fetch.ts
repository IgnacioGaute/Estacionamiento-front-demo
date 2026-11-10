// Operational responses must revalidate access on every request, including after a
// parking-lot assignment is revoked. Do not reuse Next's shared data cache here.
export function tenantFetch(input: RequestInfo | URL, init?: RequestInit) {
  const internalUrl = typeof window === 'undefined' && process.env.API_INTERNAL_URL;
  const publicUrl = process.env.NEXT_PUBLIC_API_URL;
  let target = input;
  if (internalUrl && publicUrl) {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, publicUrl);
    const base = new URL(publicUrl);
    const prefix = base.pathname.replace(/\/$/, '');
    // Solo la API configurada cambia de destino: nunca reenviar credenciales de otros servicios.
    if (url.origin === base.origin && (url.pathname === prefix || url.pathname.startsWith(`${prefix}/`))) {
      const internal = new URL(internalUrl);
      internal.pathname = internal.pathname.replace(/\/$/, '') + url.pathname.slice(prefix.length);
      internal.search = url.search;
      target = typeof input === 'string' || input instanceof URL ? internal : new Request(internal, input);
    }
  }
  return globalThis.fetch(target, { ...init, cache: 'no-store', next: undefined });
}
