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
      dashboard/ caja/ tickets/ frecuentes/ parking-type/ users/ interests/
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
- Onboarding tours: a page defines `TOUR_STEPS` (selector, title, desc) targeting `data-tour="..."` elements and
  renders `<PageTour steps={TOUR_STEPS} />` in its header actions — see `admin/dashboard/page.tsx`.
- Charts use `recharts` through `src/components/ui/chart.tsx`; toasts use `sonner` (`src/lib/toast.ts`).
- All dates/times use `dayjs` in `America/Argentina/Buenos_Aires`.
- User-visible copy and domain comments are in **Spanish** (Argentine operators). Match that; comments should say
  *why*, not restate the code.
- The app is installable (PWA): `src/app/manifest.ts` + `install-app-menu-item.tsx`, start URL `/tickets`.
