# Referencia técnica: interfaz

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
    configuracion-inicial/  # pasos de una playa nueva para su ADMIN; reutiliza las pantallas de Configuración.
                            # (user)/layout y admin/layout llevan ahí con llevarAConfiguracionInicial (lib/configuracion-inicial.server.ts)
      caja/                 # (secciones)/: turnos/ y movimientos/ (Ingresos y gastos). page.tsx sólo redirige y
                            # queda fuera del grupo: redirigir con el layout ya enviado rompe el router en desarrollo
      configuracion/        # turnos/ vehiculos/ (tipos) comprobantes/ mercadopago/; sin portada (abre la primera)
      dashboard/ tickets/ frecuentes/ parking-type/ users/ interests/
      other-payments/ update-amount-customers/
  auth/                 # login, register, reset, new-password, new-verification, error
  api/assistant/chat/   # SSE proxy to the backend assistant
  api/auth/[...nextauth]/
```

Las pantallas operativas requieren sesión; autenticación y APIs de contingencia tienen excepciones
explícitas en middleware/routes. Los comprobantes públicos se sirven en otro repositorio.

### UI conventions

- Data tables: TanStack Table as `*-columns.tsx` (column defs) + `*-table.tsx` (client `DataTable`), often through
  `src/components/data-table-shell.tsx`.
- Dialogs: `create-*`, `update-*`, `delete-*`, `soft-delete-*`, `restored-*`.
- Multi-step forms use `src/components/customer-stepper-shell.tsx`, a generic `react-hook-form` wizard shell.
- Sections with several pages (Configuración, Caja) list their options as `items` in `seccionesAdmin`
  (`src/components/navegation/secciones-admin.ts`): the sidebar unfolds them under the section, one route per option.
  Each page titles itself with `EncabezadoSeccion`. Reserve tabs for views of the same thing on one page (Tarifas).
  The section layout also renders the same `items` as a row of links under its title (`Subpaginas`), because the
  collapsed sidebar shows only the section icon and on phones the sidebar is a separate sheet.
- Títulos: sin rótulos en mayúsculas encima (`TARIFAS VIGENTES`, `MI TURNO`); lo que decía el rótulo va en
  el título o en una línea debajo. Los rótulos en mayúsculas quedan para etiquetas de un dato (una cifra,
  una columna). Texto mínimo de 11 px, salvo lo que tiene que entrar en una chapa o un ícono.
- Botones: `Button` mide 44 px (comunes) y 40 px (`size="sm"`) en el celular y vuelve a 36/32 px desde
  `sm`. Si el botón trae su propia altura en `className` (`h-7` en un buscador), se respeta en todas las
  pantallas.
- Setup flows (`SetupStepper`) are for configuring something the first time; once it exists, the same steps render as
  `SetupSections` (all visible, each with its own save). Tarifas goes back to steps only when the charging method changes.
- Onboarding tours: a page defines `TOUR_STEPS` (selector, title, desc) targeting `data-tour="..."` elements and
  renders `<PageTour steps={TOUR_STEPS} />` in its header actions — see `admin/dashboard/page.tsx`.
- Charts use `recharts` through `src/components/ui/chart.tsx`; toasts use `sonner` (`src/lib/toast.ts`).
- Colores de estado: `gm-aviso` (revisar antes de seguir: importe de respaldo, sin turno, tiempo
  superado), `gm-atencion` (pendiente sin urgencia), `gm-ok` (confirmado) y `gm-texto-tenue` (lo más
  apagado que pasa AA sobre el fondo). Peligro y error: fondos y bordes en `destructive`, texto en
  `gm-peligro` (`destructive` como texto chico no llega a 4,5:1). Definidos en `globals.css` y
  `tailwind.config.ts`, admiten opacidad (`bg-gm-aviso/10`). Las pantallas en uso ya están migradas.
  Quedan hex sueltos en las pantallas sin uso (Propietarios, Particulares y sus comprobantes viejos),
  que no se tocan, y en las de plataforma del super admin, que tienen su propia paleta
  (`components/plataforma`).
- Pantallas de acceso (login, recuperar, nueva contraseña, verificación, registro, error): mismo marco
  que `/seleccionar-acceso` (`components/auth/card-wrapper.tsx`), con `AppIcon`, título y ancho fluido.
- All dates/times use `dayjs` in `America/Argentina/Buenos_Aires`.
- User-visible copy and domain comments are in **Spanish** (Argentine operators). Match that; comments should say
  *why*, not restate the code.
- The app is installable (PWA): `src/app/manifest.ts` + `install-app-menu-item.tsx`, start URL `/tickets`.
