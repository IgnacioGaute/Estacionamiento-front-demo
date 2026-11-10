# Desarrollo del frontend

## Commands

```bash
pnpm dev          # dev server on localhost:3000
pnpm build        # production build
pnpm lint         # ESLint via next lint
pnpm typecheck    # tsc --noEmit — the build does NOT do this
pnpm test         # Jest (test:watch, test:ci with coverage)
pnpm doctor       # npx react-doctor (see .agents/skills/react-doctor)
```

`next.config.ts` sets `eslint.ignoreDuringBuilds` and `typescript.ignoreBuildErrors`, so **a green
`pnpm build` proves nothing about types or lint** — run `pnpm typecheck` and `pnpm lint` yourself.

Tests are Jest (`jest.config.mjs`, via `next/jest`: SWC, same transform as Next), colocated as
`src/**/*.test.ts(x)`. Run one file with `pnpm test <name>`, one case with `-t "<name>"`.

- Default environment is `node`. Component tests start with the docblock `/** @jest-environment jsdom */`
  and use Testing Library (`jest-dom` matchers are loaded in `jest.setup.ts`); see
  `src/components/confirm-delete-dialog.test.tsx`.
- `customExportConditions` is pinned to Node's so jsdom does not pick the ESM "browser" builds of
  lucide-react, jose, etc. ESM-only packages (`next-auth/jwt`) still need a `jest.mock`.
- `jest.mock` factories may only read variables prefixed `mock`, and imports are hoisted above `let`s:
  import a module whose load calls a mock that writes such a variable in `beforeAll`
  (`await import('./auth')`), as `src/auth.test.ts` does.
- `next/jest` loads `.env`: tests must set any env var they depend on.

CI: `.github/workflows/ci.yml` runs typecheck, lint, `test:ci` and build on every push to `main` and every PR.
Railway deploys `main`; with «Wait for CI» on, it only deploys a green commit.

The **backend repo** (`../estacionamiento-back-demo`) also runs puppeteer/transpile tests that read files from
*this* repo (`src/components/ui/dialog.tsx`, `src/components/parking-receipt-delivery.tsx`,
`src/utils/tariff-plan.utils.ts`, `public/`…), so renaming those breaks a test over there.

### Email

`src/lib/email/` sends transactional mail via Resend (`sendPasswordResetEmail`) for the password-reset flow;
templates in `src/lib/email/templates`.

### Environment variables

| Variable | Used in |
|---|---|
| `NEXT_PUBLIC_API_URL` | every service fetch, the assistant proxy and the socket connection |
| `API_INTERNAL_URL` | opcional, solo servidor: destino privado de las consultas a la API hechas por `tenantFetch`; conserva `NEXT_PUBLIC_API_URL` como destino público para el navegador y los sockets |
| `NEXTAUTH_SECRET` | NextAuth session + signing/verifying the backend access token in `src/auth.ts` |
| `API_SECRET_TOKEN` | server-to-server login and user lookup during the NextAuth callbacks only |
| `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS` | password-reset email |
| `NEXT_PUBLIC_HOST_URL` | base URL embedded in password-reset links |
| `NEXT_PUBLIC_RECEIPTS_URL` | domain of the public comprobantes app; the QR / WhatsApp link is `<esta>/c/<token>` |

No Gemini or Plate Recognizer key belongs here — both stay on the backend.

### Railway: HTTP 429 y red privada

Si varias consultas fallan con HTTP 429 y el cuerpo `rate limited`, revisar los Network Logs
del backend y las cabeceras `server`, `x-railway-request-id` y `retry-after`. Un rechazo del
proxy puede ocurrir antes de llegar a Nest; no equivale a una contraseña incorrecta.
El login y la validación de sesión registran esos metadatos sin volcar cuerpos ni tokens.

Para comunicar frontend y backend por la red privada, ambos deben estar en el mismo proyecto
y entorno de Railway. Configurar **en el frontend** `API_INTERNAL_URL` con
`http://<dominio-privado-del-backend>:<PORT-del-backend>` usando los valores reales del servicio
(por ejemplo `http://api.railway.internal:3030` si ese es su nombre y puerto).
Verificar conectividad desde el contenedor del frontend antes de activarlo. En entornos que
resuelven solo IPv6, el backend también debe escuchar en IPv6; `0.0.0.0` solo admite IPv4.
Referencia: https://docs.railway.com/networking/private-networking/library-configuration

No reemplazar `NEXT_PUBLIC_API_URL` por un dominio `.railway.internal`: el navegador y los
sockets necesitan la URL pública. Sin `API_INTERNAL_URL`, las consultas siguen usando la URL
pública. El cambio de destino conserva autorización y playa, fuerza `no-store` y no agrega
reintentos automáticos a escrituras ni consultas de sesión.

### Tooling

`.agents/skills/react-doctor/` (mirrored in `.kiro/`) documents `npx react-doctor`; `.github/workflows/
react-doctor.yml` runs it on PRs and on pushes to `main` in advisory mode (it comments and sets a status but
never fails the build).
