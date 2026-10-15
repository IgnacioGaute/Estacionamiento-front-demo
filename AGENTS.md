# Estacionamiento — frontend

## Proyecto

Next.js 15 App Router, React 19, TypeScript, Tailwind/shadcn, NextAuth y pnpm.
La versión de pnpm de CI es 10.14.0; usar el lockfile existente, sin migrarlo accidentalmente.
Alias @/ apunta a src/. Interfaz en español argentino. Conservar los componentes y patrones existentes.
Backend: ../estacionamiento-back-demo; comprobantes: ../estacionamiento-comprobantes-demo;
landing: ../estacionamiento-landing. Leer instrucciones y git status antes de editar otro repo.
En worktrees localizar los checkouts reales; las rutas ../ pueden cambiar.

## Invariantes

- getAuthHeaders() construye Authorization/X-Playa-Id del lado servidor; no enviar claves al navegador.
- tenantFetch aplica no-store. No introducir caché que mezcle usuarios/playas o sobreviva a revocación.
- Cambiar playa invalida estado visible y suscripciones. Sockets usan useTenantEvent.
- UI refleja permisos; backend los decide. Revisar contratos y códigos de error en ambos repos.
- Cierre usa expectedPrice/expectedCollected; ante importe obsoleto refrescar antes de confirmar.
- La UI no recalcula reglas financieras distintas del backend. Simulador no produce cobros.
- Comprobantes públicos viven en el repo independiente. Mantener sus vistas y tipos compatibles.
- Fechas: America/Argentina/Buenos_Aires usando utilidades existentes.
- Tipos de vehículo configurables; desactivar no bloquea la salida de una estadía existente.
- Cliente del asistente no envía valores de formularios ni filas: contexto de pantalla con allowlist.

## Edición y Git

- Revisar estado/diff y preservar trabajo existente; sesiones que editan en paralelo usan worktrees.
- Staging por archivos explícitos y revisión del índice antes de commit. No git add -A, git add .,
  git add -u ni git commit -a: pueden incorporar trabajo de otra sesión.
- Usar parches/edición UTF-8; evitar Get-Content | Set-Content y template literals en scripts inline.
- Respetar autorización de la tarea. Implementar no implica push/deploy; si ya se autorizaron,
  continuar sin pedirlo otra vez después de comprobar destino, diff y pruebas.

## Validación

- pnpm typecheck y pnpm lint: obligatorios para verificar tipos/lint; next.config.ts los omite al build.
- pnpm test <archivo>: Jest/Testing Library. next/jest carga .env; fijar en tests las variables relevantes.
- pnpm test:ci y pnpm build para una entrega transversal. No construir sobre un dev activo sin coordinar
  porque ambos usan .next; preferir worktree para build/verificación simultánea.
- pnpm test:agents comprueba instrucciones, configuración y hooks, sin red ni base de datos.
- Backend test/*.cjs contiene pruebas de esta UI: receipt-mobile-layout, receipt-history-panel,
  assistant-message-render, tariff-editor-rules, pwa-offline y admin-*.ui. Seleccionar por impacto.
- Ante cambios visuales, recorrer el flujo real con navegador si hay acceso; revisar móvil/escritorio,
  teclado, estados de error/carga y permisos. Informar si no se pudo validar visualmente.
- pnpm doctor es complementario y advisory; no reemplaza tipos, tests ni revisión de comportamiento.

## Referencias por tarea

| Cambio | Referencia |
| --- | --- |
| Comandos, tests, variables y tooling | docs/desarrollo.md |
| Autenticación, scope, fetch y sockets | docs/architecture/acceso.md |
| Tickets, caja y tarifas | docs/architecture/operacion.md; docs/caja-turnos.md del backend |
| Comprobantes, impresión y exportación | docs/architecture/comprobantes.md |
| Componentes, rutas y estilo | docs/architecture/interfaz.md |
| Asistente | docs/architecture/asistente.md |
| Claude, skills, hooks y revisores | docs/claude-workflow.md |

Leer solo las referencias de la tarea. Corregir documentación obsoleta después de verificar código,
pruebas e intención; una nota vieja no es motivo para deshacer una funcionalidad vigente.
