# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # dev server on localhost:3000
pnpm build        # production build
pnpm lint         # ESLint via next lint
pnpm doctor       # npx react-doctor (see .agents/skills/react-doctor)
pnpm exec tsc --noEmit --incremental false     # typecheck — the build does NOT do this
node --test test/*.cjs                          # the test suite (no runner, no build step)
```

`next.config.ts` sets `eslint.ignoreDuringBuilds` and `typescript.ignoreBuildErrors`, so **a green
`pnpm build` proves nothing about types or lint** — run `tsc --noEmit` and `pnpm lint` yourself.

Tests are plain `node:test` files in `test/` that transpile the TypeScript source in-process with the
`typescript` package (no Jest, no build):

- `test/auth-session.test.cjs` — the NextAuth `jwt`/`session` callbacks in `src/auth.ts`.
- `test/platform-access.test.cjs` — the role and route rules in `src/middleware.ts`.
- `test/ticket-box-rows.test.cjs` — the caja planilla math in `src/utils/ticket-box-rows.ts`.

The **backend repo** (`../estacionamiento-back-demo`) also runs a puppeteer test that reads files from *this*
repo (`test/receipt-mobile-layout.test.cjs` → `src/components/ui/dialog.tsx` and
`src/components/parking-receipt-delivery.tsx`), so renaming those breaks a test over there.

## Architecture

**Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui (Radix UI), TanStack Table,
next-auth v5 (beta) + jose, Zod, React Hook Form, sonner (toasts), dayjs, socket.io-client, recharts, pdf-lib,
qrcode.react, jsbarcode, xlsx. Package manager pnpm; path alias `@/` maps to `src/`.

This is the operator UI for the `estacionamiento` backend (`../estacionamiento-back-demo`). The backend is
multi-tenant and enforces its own permissions; the UI mirrors those rules but is never the authority.

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

`USER` (operator), `ADMIN` (empresa administrator), `SUPER_ADMIN` (platform owner).

- `src/middleware.ts`: unauthenticated → `/auth/login`; `SUPER_ADMIN` is pinned to `/admin/empresas` and
  redirected there from everything else; everyone else is blocked *out* of `/admin/empresas`; non-`ADMIN` on any
  other `/admin/*` route → `/403`. Public comprobante URLs (`/comprobantes/<64 hex>`) skip auth entirely and get
  `no-store` / `no-referrer` / `noindex` headers. Note there is **no `/403` route**, so that redirect currently
  lands on the 404 page.
- `src/components/auth/role-gate.tsx` re-checks the role server-side inside admin pages.
- The backend allowlists which handlers an operator may call (`src/tenancy/endpoint-policy.ts` over there). A new
  operator-facing screen usually needs a matching entry there, or it 403s at runtime.

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

### Ticket system

Ways to open an hourly stay:

- **Barcode scan** — `src/app/(protected)/(user)/components/scanner-button.tsx` keeps a hidden input plus a global
  keyboard listener for the USB scanner (it keeps listening even when `hideControls` hides the UI) and calls
  `startScanner`. A second scan of the same card returns `requiresClose` + `registrationId`, which opens
  `CloseTicketPanel` in place; the component drives the panel and the receipt dialog through its own state and an
  `onTicketRegistered` callback.
- **Plate recognition** — `recognizePlateFromImage` (`src/services/plate-recognition.service.ts`) posts a photo as
  `multipart/form-data`; it deletes the `Content-Type` that `getAuthHeaders` sets, otherwise the multipart
  boundary is lost. Result feeds `create-registration-by-plate.action.ts`.
- **Day/week/month** — `TicketRegistrationForDay`, managed in `(user)/tickets/tickets-days-or-weeks/`.

Physical cards and plates share `CloseTicketPanel` (`(user)/tickets/components/`). Closing submits
`expectedPrice` and `expectedCollected` taken from the close summary; stale values refresh the panel instead of
charging. Overpayment requires a refund method. Advance amounts are accumulated totals; a decrease requires a
reason. `entryMode` preserves the origin after the card is unlinked.

Turnos (shifts): `TurnoBar` manages successive shifts of arbitrary length over one shared physical drawer —
manual cash count, withdrawal and handover. Shared context comes from `/turnos/caja`; closing sends
`efectivoEsperado` to detect cash operations that happened meanwhile, and the next opening sends
`turnoAnteriorId` to acknowledge the handover. Only the responsible operator closes a shift. Cash is not revenue:
`BoxList.totalPrice` is daily net physical cash — never add handover funds to sales totals.

The caja planilla is computed by `src/utils/ticket-box-rows.ts` (`ticketBoxRows`) from daily `ticketMovements`,
with a legacy fallback for old records. Courtesy is zero income; negative adjustments are outflows. It is the one
piece of business math in this repo with unit tests — keep them passing.

### Comprobantes (parking receipts)

`src/components/parking-receipt-delivery.tsx` opens after an entry or an exit when the playa has any delivery
channel enabled (WhatsApp / QR / print, from the backend's `receiptDelivery` settings). It issues through
`issueParkingReceiptAction`, and a failed issue can be retried without re-registering or re-charging.

**The public page is not in this repo.** It lives in the sibling app `../estacionamiento-comprobantes-demo`,
deployed as its own Railway service on its own domain, so the QR / WhatsApp link a customer receives never
reveals the system's domain. This app only builds the link, from `NEXT_PUBLIC_RECEIPTS_URL`:
`${NEXT_PUBLIC_RECEIPTS_URL}/c/<token>` (plus `?print=58|80` for the thermal layout). Without that variable the
delivery dialog says so instead of rendering broken links. Entry and exit have different tokens; the entry link
does not change when the stay is closed. `ParkingReceiptView` is duplicated in both repos — the dialog previews
the receipt here, the public app renders it there; keep them in sync by hand.

### Assistant

`src/components/assistant/assistant-widget.tsx` is a draggable operator chat (position persisted in
localStorage; conversations are not). It posts to `src/app/api/assistant/chat/route.ts`, a thin proxy that adds
`getAuthHeaders()` and streams the backend's SSE response straight through — the browser never holds the session
token or any Gemini key. `screen-context.ts` sends only labels from a fixed allowlist of visible UI controls,
never input values or table rows; keep it that way when adding screens.

### Real-time updates

All sockets go through `useTenantEvent(event, cb)` (`src/hooks/use-tenant-event.ts`): one `socket.io-client`
connection to `NEXT_PUBLIC_API_URL` authenticated with `{ token, playaId }`, torn down when either changes. The
backend re-validates the account, its `authVersion` and playa access before every emit. `useTicketRealtime`
(`new-registration`), `useNotifications` (`notification`) and `use-notification-interest` are thin wrappers — do
not open a socket directly. Unread-note state is server-derived (`unreadNotesAction`, refreshed on an interval,
on focus and on DOM events), not localStorage.

### Route structure

```
src/app/
  (protected)/          # session + TenantProvider; renders NoPlaya when no playa is usable
    (user)/             # operator routes — sidebar from UserNavbarSidebar
      tickets/          # hourly stays, close panel, turno bar; tickets-days-or-weeks/ for abonos
      owners/ renters/ privates/   # customers by type
      notes/            # cartelera del equipo
      components/       # shared across user routes (scanner, receipts, customers, notifications)
    admin/
      empresas/         # SUPER_ADMIN only: empresas, playas, usuarios, asignación de operadores
      dashboard/ caja/ tickets/ frecuentes/ parking-type/ users/ interests/
      other-payments/ update-amount-customers/
  auth/                 # login, register, reset, new-password, new-verification, error
  api/assistant/chat/   # SSE proxy to the backend assistant
  api/auth/[...nextauth]/
```

There is no public route here: every path requires a session (`src/middleware.ts` has no bypass).

### Customer model

Three customer types: `OWNER`, `RENTER`, `PRIVATE` (`CUSTOMER_TYPE`). Each has `receipts[]`, `vehicles[]` and
`vehicleRenters[]`. Receipts have status `PENDING | PAID` and payment types
`TRANSFER | CASH | CHECK | MIX | CREDIT | TP | FIX`.

### PDF / Excel generation

`src/utils/generate-*.ts` fill pre-made PDF templates from `/public/*.pdf` with `pdf-lib`
(`generate-all-receipts.ts`, `generate-receipt-without-registering.ts`, `generate-box-list.ts`);
`generate-receipt.ts` is legacy and fully commented out. Excel exports live in
`(protected)/admin/components/export-*.tsx` (`xlsx`). The customer-facing comprobante export (canvas → PNG → PDF)
now lives in the comprobantes app, not here.

### UI conventions

- Data tables: TanStack Table as `*-columns.tsx` (column defs) + `*-table.tsx` (client `DataTable`), often through
  `src/components/data-table-shell.tsx`.
- Dialogs: `create-*`, `update-*`, `delete-*`, `soft-delete-*`, `restored-*`.
- Multi-step forms use `src/components/customer-stepper-shell.tsx`, a generic `react-hook-form` wizard shell.
- Onboarding tours: a page defines `TOUR_STEPS` (selector, title, desc) targeting `data-tour="..."` elements and
  renders `<PageTour steps={TOUR_STEPS} />` in its header actions — see `admin/dashboard/page.tsx`.
- Charts use `recharts` through `src/components/ui/chart.tsx`; toasts use `sonner` (`src/lib/toast.ts`).
- All dates/times use `dayjs` in `America/Argentina/Buenos_Aires`.
- User-visible copy and domain comments are in **Spanish** (Argentine operators). Match that; comments should say
  *why*, not restate the code.
- The app is installable (PWA): `src/app/manifest.ts` + `install-app-menu-item.tsx`, start URL `/tickets`.

### Email

`src/lib/email/` sends transactional mail via Resend (`sendPasswordResetEmail`) for the password-reset flow;
templates in `src/lib/email/templates`.

### Environment variables

| Variable | Used in |
|---|---|
| `NEXT_PUBLIC_API_URL` | every service fetch, the assistant proxy and the socket connection |
| `NEXTAUTH_SECRET` | NextAuth session + signing/verifying the backend access token in `src/auth.ts` |
| `API_SECRET_TOKEN` | server-to-server login and user lookup during the NextAuth callbacks only |
| `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS` | password-reset email |
| `NEXT_PUBLIC_HOST_URL` | base URL embedded in password-reset links |
| `NEXT_PUBLIC_RECEIPTS_URL` | domain of the public comprobantes app; the QR / WhatsApp link is `<esta>/c/<token>` |

No Gemini or Plate Recognizer key belongs here — both stay on the backend.

### Tooling

`.agents/skills/react-doctor/` (mirrored in `.kiro/`) documents `npx react-doctor`; `.github/workflows/
react-doctor.yml` runs it on PRs and on pushes to `main` in advisory mode (it comments and sets a status but
never fails the build).

### Tarifas configurables y claridad de uso

- Forma de cobro y Cruces de horario son optativas y viven en `pricingOptions`; Reglas de permanencia está
  temporalmente retirada: el backend fuerza `stay.enabled = false` para nuevas entradas, configuraciones y
  simulaciones, conservando los snapshots históricos; las estadías conservan una copia al ingresar. El simulador
  y el cierre usan el mismo cálculo del backend.
- Los tipos de vehículo son códigos configurables por playa, no una unión cerrada AUTO/CAMIONETA. Desactivar
  bloquea nuevos ingresos, no salidas existentes.
- La UI debe explicar decisiones con ejemplos, ocultar campos de opciones apagadas y separar configurar precios de
  cobrar. El simulador acepta opciones sin guardar sin producir movimientos. El operador elige medio de pago y
  confirma importe antes de cerrar.
- Detalles y semántica: documentación del backend `docs/tickets-tarifas.md`, `docs/caja-turnos.md`,
  `docs/administracion-plataforma.md` y `docs/comprobantes.md`. No presentar la antigua escalera como importe
  final cuando hay opciones avanzadas activas.
