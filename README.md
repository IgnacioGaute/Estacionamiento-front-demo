# Estacionamiento: interfaz de operadores

Interfaz web (Next.js 15, React 19, Tailwind, shadcn/ui) del sistema de gestión de playas de estacionamiento:
ingresos y salidas, caja y turnos, tarifas, inquilinos y administración de la empresa. Los datos y los
permisos los decide la API (`estacionamiento-back-demo`); esta app los muestra y nunca es la autoridad.

## Levantarlo en local

```bash
pnpm install
pnpm dev   # http://localhost:3000 (necesita la API corriendo en http://localhost:3030)
```

Variables en `.env`:

| Variable | Para qué |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL de la API |
| `NEXTAUTH_SECRET` | Firma de las sesiones; tiene que ser la misma que en la API |
| `API_SECRET_TOKEN` | Token de servicio para que el login consulte la API |
| `NEXT_PUBLIC_HOST_URL` | URL pública de esta app |
| `NEXT_PUBLIC_RECEIPTS_URL` | URL de la app de comprobantes (`estacionamiento-comprobantes-demo`) |
| `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS` | Envío de mails |

## Tests

Jest, con los archivos junto al código como `src/**/*.test.ts(x)`.

```bash
pnpm test                 # todos (unos 5 s)
pnpm test middleware      # solo los archivos que coinciden con "middleware"
pnpm test -t "SUPER_ADMIN"  # solo los casos cuyo nombre contiene el texto
pnpm test:watch           # se vuelven a correr al guardar
```

| Archivo | Qué cubre |
|---|---|
| `src/auth.test.ts` | Sesión: el rol y los datos se releen siempre de la API. Una sesión manipulada desde el navegador no cambia el rol, y un cambio de contraseña o un token inválido la cierran. |
| `src/middleware.test.ts` | A qué pantallas entra cada rol: el super admin solo ve la administración de la plataforma, el operador no entra a `/admin`, sin sesión va al login. |
| `src/utils/ticket-box-rows.test.ts` | Planilla de caja: suma cobros, resta devoluciones, la cortesía cuenta $0 y no duplica estadías. |
| `src/utils/tariff-plan.utils.test.ts` | Editor de tarifas: cambiar de modalidad y volver no pierde precios; validación de precios faltantes y duraciones repetidas. |
| `src/components/confirm-delete-dialog.test.tsx` | Diálogo de eliminar: qué muestra, qué hacen los botones, bloqueo mientras procesa. Sirve de ejemplo para testear componentes. |

Para testear un componente, el archivo empieza con `/** @jest-environment jsdom */` y usa Testing Library
(`render`, `screen`, `fireEvent`), como en `confirm-delete-dialog.test.tsx`. Los demás tests corren en Node.

La API también tiene tests que leen archivos de este repo (diseño del comprobante en el celular, historial,
modo sin conexión, editor de tarifas). Antes de renombrar esos componentes, revisá la sección «Solo en
local» del README de la API.

## Antes de subir cambios

`next.config.ts` hace que `pnpm build` **ignore errores de tipos y de lint**: que el build termine bien no
prueba nada de eso. Corré lo mismo que el CI:

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

## CI/CD

[.github/workflows/ci.yml](.github/workflows/ci.yml) corre tipos, lint, tests y build en cada push a `main` y
en cada pull request. El deploy lo hace Railway con cada push a `main`. Con «Wait for CI» activado en el
servicio, solo despliega un commit que pasó el CI.

Más detalle de la arquitectura (sesión, permisos, multiempresa) en [CLAUDE.md](CLAUDE.md).
