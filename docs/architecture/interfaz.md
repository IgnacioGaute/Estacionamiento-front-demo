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
- Títulos: cada pantalla de administración usa `PageHeader` (Mi plan y Pagar incluidas); un título
  propio (Editar tarifas, la cuenta de un inquilino) copia su medida: `gm-display`, 26 px y 30 px desde
  `md`. La portada de Entradas y salidas del operador tiene su propio saludo y título. Sin rótulos en
  mayúsculas encima (`TARIFAS VIGENTES`, `MI TURNO`); lo que decía el rótulo va en el título o en una
  línea debajo. Las mayúsculas quedan para etiquetas de un dato (una cifra, una columna).
- Letra: mínimo 11 px y sin medios píxeles (11, 12, 13, 14, 15…), salvo lo que tiene que entrar en
  una chapa. Las etiquetas de campo (`Label`, `FormLabel`) van en 13 px seminegrita y sin
  mayúsculas, igual que en Tarifas y en el modo sin conexión.
- Carga: la primera carga de una pantalla o de un componente muestra un esqueleto con su forma
  (el mismo contenedor, la misma grilla, las mismas tarjetas y filas), armado con las piezas de
  `components/esqueletos.tsx` (`Cargando`, `Hueso`, `EsqueletoEncabezado`, `EsqueletoTabla`…). Cada
  pantalla en uso tiene su `loading.tsx` y cada componente su esqueleto (por ejemplo
  `renters/components/cuenta/cargando.tsx`, `components/plataforma/cargando.tsx`). El ícono
  (`DataLoading`) queda solo para datos que se actualizan o se buscan dentro de algo que ya está en
  pantalla («Actualizando cuentas…», «Buscando patentes parecidas…»). La pantalla del auto
  (`LoadingScreen`) es solo para el arranque de la app (`app/loading.tsx`, `(protected)/loading.tsx`);
  ya no se muestra en cada navegación.
- Reglas globales como `admin/mobile.css` (40 px mínimos en los botones del celular) agrandan
  también los botones de componentes compuestos: lo que se dibuja encima de un botón (la pastilla
  del segmentado) tiene que seguir su altura real, no una fija.
- Tablas: el encabezado de columna es el de las planillas (`thPlanilla` en `components/planilla`):
  11 px, negrita, mayúsculas por CSS y `text-muted-foreground`. El texto de las celdas se escribe
  normal («Abono mensual»), no en mayúsculas.
- Botones y campos: `Button` mide 44 px (comunes y de ícono) y 40 px (`size="sm"`) en el celular y
  vuelve a 36/32 px desde `sm`; `Input` mide 44 px en el celular y 40 desde `sm`, igual que la lista
  desplegable. Si traen su propia altura en `className` (`h-7` en un buscador), se respeta en todas
  las pantallas.
- Setup flows (`SetupStepper`) are for configuring something the first time; once it exists, the same steps render as
  `SetupSections` (all visible, each with its own save). Tarifas goes back to steps only when the charging method changes.
- Onboarding tours: a page defines `TOUR_STEPS` (selector, title, desc) targeting `data-tour="..."` elements and
  renders `<PageTour steps={TOUR_STEPS} />` in its header actions — see `admin/dashboard/page.tsx`.
- Charts use `recharts` directly (see `admin/dashboard/components`); toasts use `sonner` (`src/lib/toast.ts`).
- Colores de estado: `gm-aviso` (revisar antes de seguir: importe de respaldo, sin turno, tiempo
  superado, deuda), `gm-atencion` (pendiente sin urgencia, avisos de caja y de tarifas), `gm-ok`
  (confirmado, al día, a favor: el único verde) y `gm-yellow` para los acentos de marca (selección,
  foco, el tema de día de Tarifas). Peligro y error: fondos y bordes en `destructive`, texto en
  `gm-peligro` (`destructive` como texto chico no llega a 4,5:1). Sin colores de la paleta de
  Tailwind (`amber-*`, `emerald-*`) para estados.
- Textos en cuatro pasos: `foreground`, `gm-texto-2`, `muted-foreground` y `gm-texto-tenue` (lo más
  apagado que pasa AA). Superficies: `gm-hondo` (barra lateral, barra del celular, login),
  `background`, `gm-surface`, `muted`/`gm-surface-2`, `gm-surface-3`; bordes `gm-line` y
  `gm-line-strong`. Todo en `globals.css` y `tailwind.config.ts`, con opacidad (`bg-gm-aviso/10`).
  En estilos en línea, `hsl(var(--token))`, y para teñir `tinte(color, %)` de `lib/utils`: pegarle
  «24» al final de un color solo funciona con hex y rompe con un token.
- Quedan hex a propósito en lo que imita objetos reales (el QR impreso, la chapa, el comprobante de
  muestra, el botón de WhatsApp), en las pantallas sin uso (Propietarios, Particulares y sus
  comprobantes viejos), que no se tocan, y en las de plataforma del super admin, con su propia paleta
  (`components/plataforma`).
- Modo sin conexión (`public/offline.html`, `offline.css`): HTML estático sin Tailwind que sigue las
  mismas reglas. Copia los tokens de `globals.css` con los mismos nombres y usa las tipografías de la
  app (copias de `src/fonts` en `public/offline-*.woff2`, guardadas por `sw.js`). Encabezado y
  tarjetas sobre el fondo, sin marco alrededor; la franja de obra arriba es la marca de la pantalla
  local. Al tocar un token o una tipografía, actualizar la copia y subir `CACHE` en `sw.js`.
- Pantallas de acceso (login, recuperar, nueva contraseña, verificación, registro, error): mismo marco
  que `/seleccionar-acceso` (`components/auth/card-wrapper.tsx`), con `AppIcon`, título y ancho fluido.
- All dates/times use `dayjs` in `America/Argentina/Buenos_Aires`.
- User-visible copy and domain comments are in **Spanish** (Argentine operators). Match that; comments should say
  *why*, not restate the code.
- The app is installable (PWA): `src/app/manifest.ts` + `install-app-menu-item.tsx`, start URL `/tickets`.
