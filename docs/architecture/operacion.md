# Referencia técnica: operacion

### Ticket system

Ways to open an hourly stay:

- **Barcode scan** — `src/app/(protected)/(user)/components/scanner-button.tsx` keeps a hidden input plus a global
  keyboard listener for the USB scanner (it keeps listening even when `hideControls` hides the UI) and calls
  `startScanner`. A second scan of the same card returns `requiresClose` + `registrationId`, which opens
  `CloseTicketPanel` in place; the component drives the panel and the receipt dialog through its own state and an
  `onTicketRegistered` callback.
- **Plate recognition** — `recognizePlateFromImage` (`src/services/plate-recognition.service.ts`) posts a photo as
  `multipart/form-data`; it deletes the `Content-Type` that `getAuthHeaders` sets, otherwise the multipart
  boundary is lost. Result feeds `create-registration-by-plate.action.ts`. The live scanner
  (`plate-live-scanner.tsx` + `src/utils/plate-scan.ts`) uploads only what the 3:4 viewer shows (`zonaVisible`),
  without downscaling it; the backend's ALPR service locates the guide with the same geometry. When the camera
  exposes them it asks for continuous focus and offers a torch toggle for low light.
- **Day/week/month** — `TicketRegistrationForDay`, managed in `(user)/tickets/tickets-days-or-weeks/`.

Physical cards and plates share `CloseTicketPanel` (`(user)/tickets/components/`). Closing submits
`expectedPrice` and `expectedCollected` taken from the close summary; stale values refresh the panel instead of
charging. Overpayment requires a refund method. Advance amounts are accumulated totals; a decrease requires a
reason. `entryMode` preserves the origin after the card is unlinked.

Turnos y cajas: la UI usa el contexto de caja del backend y soporta cajas físicas y turnos
compartidos mediante CashSession. Revisar src/types/turno.type.ts y docs/caja-turnos.md del backend
antes de modificar aperturas/cierres; los turnos legacy conservan su circuito histórico.
Cash is not revenue: BoxList.totalPrice es efectivo físico neto, no ingresos ni fondos de traspaso.

The caja planilla is computed by `src/utils/ticket-box-rows.ts` (`ticketBoxRows`) from daily `ticketMovements`,
with a legacy fallback for old records. Courtesy is zero income; negative adjustments are outflows. It is the one
piece of business math in this repo with unit tests — keep them passing.

### Customer model

Three customer types: `OWNER`, `RENTER`, `PRIVATE` (`CUSTOMER_TYPE`). Each has `receipts[]`, `vehicles[]` and
`vehicleRenters[]`. Receipts have status `PENDING | PAID` and payment types
`TRANSFER | CASH | CHECK | MIX | CREDIT | TP | FIX`.

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
