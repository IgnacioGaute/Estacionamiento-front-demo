# Referencia técnica: acceso

### Tenancy: empresa → playa (affects every request)

The backend scopes all operational data to a *playa* (parking lot) inside an *empresa*, and picks it from the
`X-Playa-Id` header.

- `src/lib/auth.ts` → `getAuthHeaders()` is the single place that builds `Authorization` + `X-Playa-Id`. The
  selected playa lives in the httpOnly cookie `parking-playa`, stored as `"<userId>:<playaId>"` so one browser
  cannot inherit another account's selection. Role `USER` never sends the header — the backend resolves the
  single playa the admin assigned.
- `src/app/(protected)/layout.tsx` loads `/tenant/context` through `getOperationalContext()` and wraps children in
  `TenantProvider`. With no usable playa it renders `NoPlaya` (asignación pendiente / elegí una playa) instead of
  the app.
- `src/components/tenant-provider.tsx` exposes `useTenant()` (`{ playaId, context }`) and `PlayaSelector`.
  Switching playa calls `selectPlayaAction` and then **hard-navigates** (`window.location.assign`) so no stale
  data from the previous playa survives in memory or in the router cache.
- Client components that fetch or subscribe must key off `playaId` from `useTenant()`.

### Roles

USER opera una playa; ADMIN administra su empresa; SUPER_ADMIN administra la plataforma.
Revisar src/middleware.ts y src/routes.ts: las rutas de plataforma incluyen empresas, métricas y planes.
Los comprobantes públicos viven en estacionamiento-comprobantes-demo, no en un bypass /comprobantes aquí.
La UI refleja permisos; el backend es la autoridad. Las rutas del operador necesitan la entrada pertinente
en src/tenancy/endpoint-policy.ts del backend. RoleGate vuelve a comprobar el rol en páginas de admin.
Las rutas de autenticación y contingencia tienen tratamientos explícitos; no inferir acceso de un comentario.

### Authentication

- `src/auth.ts` — Credentials provider (email or username + password) posting to the backend with
  `API_SECRET_TOKEN`. The `jwt` callback **re-reads the user from the backend on every call** and mints/validates
  an HS256 access token (via `jose`) carrying `{ id, authVersion }`; identity, role and profile never come from a
  client-side `session.update`. A mismatch in `id` or `authVersion` (bumped by the backend on password change)
  returns `null`, which kills the session instead of silently renewing it. `session.token` is what services send
  as the bearer token.
- `src/lib/auth.ts` — server-only `currentUser()`, `currentRole()`, `currentToken()`, `getAuthHeaders(token?)`.

### Data flow pattern

Every entity follows the same four layers:

1. **Schema** (`src/schemas/`) — Zod schema + inferred type (e.g. `CustomerSchemaType`).
2. **Service** (`src/services/`) — fetch wrappers around `NEXT_PUBLIC_API_URL`, always authenticated through
   `getAuthHeaders()`. Backend errors are returned as `{ error: { code, message } }` so callers can branch on
   `code`.
3. **Server Action** (`src/actions/`) — `'use server'` functions that validate with the Zod schema, call the
   service, and return `{ error }` or `{ success }`.
4. **Page / Component** — server components fetch via services; client components call actions with
   `useTransition`.

**Caching:** every service imports `tenantFetch as fetch` from `src/lib/tenant-fetch.ts`, which forces
`cache: 'no-store'` and strips `next` — access must be revalidated on every request, including after a playa
assignment is revoked. Some `next: { tags }` options remain in the source (dashboard, others) but are inert under
`tenantFetch`; `revalidateTag` still runs after mutations in a handful of services. `src/services/cache-tags.ts`
remains the tag registry — use `getCacheTag(service, tag, ...params)`, never a hardcoded string — but do not
assume tags actually cache anything today.

### Real-time updates

All sockets go through `useTenantEvent(event, cb)` (`src/hooks/use-tenant-event.ts`): one `socket.io-client`
connection to `NEXT_PUBLIC_API_URL` authenticated with `{ token, playaId }`, torn down when either changes. The
backend re-validates the account, its `authVersion` and playa access before every emit. `useTicketRealtime`
(`new-registration`), `useNotifications` (`notification`) and `use-notification-interest` are thin wrappers — do
not open a socket directly. Unread-note state is server-derived (`unreadNotesAction`, refreshed on an interval,
on focus and on DOM events), not localStorage.
