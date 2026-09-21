// Operational responses must revalidate access on every request, including after a
// parking-lot assignment is revoked. Do not reuse Next's shared data cache here.
export function tenantFetch(input: RequestInfo | URL, init?: RequestInit) {
  return globalThis.fetch(input, { ...init, cache: 'no-store', next: undefined });
}
