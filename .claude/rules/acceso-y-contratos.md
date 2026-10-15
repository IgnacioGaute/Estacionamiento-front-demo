---
paths:
  - "src/auth.ts"
  - "src/middleware.ts"
  - "src/routes.ts"
  - "src/lib/**"
  - "src/services/**"
  - "src/actions/**"
  - "src/hooks/**"
---

# Acceso y contratos
- Leer docs/architecture/acceso.md: getAuthHeaders, tenantFetch, roles y sockets.
- Revisar cambio de playa, logout, authVersion y revocación; no confiar en estado del cliente.
- Contratos: actualizar tipos/schema/action y consumidor, errores estructurados y permisos backend.
- Los hooks realtime existentes administran ciclo de vida: no crear conexiones globales paralelas.
