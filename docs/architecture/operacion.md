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

Cobrar salida muestra patente, tipo de vehículo y saldo en un resumen compacto. En la fila del tipo
van «Corregir» (pastilla) y Eliminar (ícono de papelera), ambos con 44 px táctiles; el que se abre
lleva `data-abierto` y ocupa la fila, y el resto se esconde por CSS (`:has`). Eliminar mantiene la
restricción de administrador, sin cobros, sin medio de pago elegido y con confirmación.
Ver cálculo despliega las tarifas junto al resumen, tanto en móvil como en escritorio, sin ocultar
los medios de pago. El pie de confirmación permanece visible y el cuerpo se desplaza.

Estadías de más de 4 h (`tickets/components/estadias-largas.ts`): al cruzarlas salta un solo aviso
de sonner con id fijo (uno por auto nunca; si cruzan varios, el mismo aviso pasa a «N autos»). Sin
respuesta, el auto queda «sin confirmar» en la franja del inicio (`AvisoEstadiasLargas`, sube de tono
pasada una hora) y primero en Cobrar salida sin buscar; los botones de salida muestran la cuenta.
«Sigue» se guarda en localStorage por 4 h (`useConfirmadas`) y el repaso del cierre lo toma. De 2 a
4 h solo una línea azul, sin aviso.

«Se fue antes» (`se-fue-antes.tsx`): en cada auto de la franja (4 h y 2 h), en la misma línea que
«Sigue» y «Cobrar», y en el cobro de cualquier auto, al lado de «Corregir» (el tipo de vehículo va
debajo de la patente para dejarles la fila). Diálogo propio: el backend arma las tarifas que pudo
haber pagado con su importe (`GET …/salida-anterior`), se elige una sin hora exacta y un solo botón
cobra y registra la salida (`POST …/salida-anterior`).

Turnos y cajas: la UI usa el contexto de caja del backend y soporta cajas físicas y turnos
compartidos mediante CashSession. Revisar src/types/turno.type.ts y docs/caja-turnos.md del backend
antes de modificar aperturas/cierres; los turnos legacy conservan su circuito histórico.
Al abrir una caja, el efectivo recibido empieza vacío: el operador debe elegir un importe o
escribirlo, incluso si recibe cero. Se vuelve a pedir al reabrir el diálogo o cambiar de caja.
Un importe distinto al cierre anterior exige motivo. Unirse a una caja ya abierta no vuelve a
declarar el fondo compartido.
Cash is not revenue: BoxList.totalPrice es efectivo físico neto, no ingresos ni fondos de traspaso.

Las tarjetas de vehículos por hora y estadías largas muestran el tipo con ícono y nombre. `CardTicket` comparte el catálogo de tipos mediante `VehicleTypeLabelsContext`; las etiquetas incluyen tipos desactivados y usan el código como respaldo si el catálogo no está disponible. El color de estadía y los avisos conservan su significado.

Configuración → Operación → Turnos → Sueldo permite activar el retiro por usuario y definir su importe por jornada. La lista de usuarios habilitados proviene de `/turnos/configuracion`; los importes se guardan en `sueldosPorUsuario` de la configuración de la playa. Sin selección no hay retiro. Los cambios rigen para nuevas jornadas y los turnos abiertos conservan su importe previsto.

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

### Modalidad gratuita

`useTenant()` expone `modalidad` y `cobroHabilitado` (la playa la recibe en `/tenant/context`; la define el super
admin). Con `cobroHabilitado` en false también salen falsos `shiftsEnabled` e `inquilinosEnabled`, y las páginas
server usan `modalidadActual()` (`src/lib/modalidad.server.ts`). En una playa gratuita: menús sin Tarifas, planilla
de caja, gastos e ingresos, Caja, Inquilinos ni Centro de aprendizaje; las secciones de
dinero muestran `SoloConCobro`; el dashboard solo trae actividad por hora; no hay comprobantes, estadías por
día, semana o mes (ni su columna, filtro o contador),
anticipos ni «Se fue antes». El modo sin conexión prepara entradas por patente y salidas sin importes ni caja. `CloseTicketPanel` reconoce un resumen con `modalidad: 'GRATUITO'`
(`esSalidaGratuita`) y muestra la salida sin importes con «Registrar salida» (`PATCH …/salida`); vale también para
una estadía que entró gratis en una playa que volvió a cobrar. Si el super admin cambia la modalidad, el evento
`playa-modalidad` recarga la pantalla. La planilla de vehículos está en `/admin/vehiculos`, con acceso rápido para administradores desde Tickets en móvil y escritorio. Detalle en
`docs/modalidad-gratuita.md` del backend.
