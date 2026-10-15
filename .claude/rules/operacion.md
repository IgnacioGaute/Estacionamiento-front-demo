---
paths:
  - "src/app/**/tickets/**"
  - "src/app/**/caja/**"
  - "src/app/**/renters/**"
  - "src/utils/ticket*"
  - "src/types/turno.type.ts"
---

# Operación y dinero
- Leer docs/architecture/operacion.md y la documentación del dominio en backend.
- No equiparar efectivo, ingresos y fondos de apertura. Preservar anticipos, devoluciones y cortesías.
- Cierre con importes esperados; repetir una acción no puede cobrar dos veces.
- UI de tarifas separa configurar, simular y cobrar; no activar opciones retiradas por accidente.
