---
name: "verificar-interfaz"
description: "Comprobar en navegador flujos de operadores y administradores del estacionamiento, incluyendo móvil, permisos y errores."
---

# Verificar el flujo visible
1. Identificar escenario y criterios observables desde la tarea. Leer docs/architecture del área.
2. Usar Playwright MCP si está conectado, o el navegador disponible. Comprobar URL/puertos reales;
   no iniciar servidores duplicados ni cerrar procesos ajenos. Si no hay navegador, informar el límite.
3. Usar datos y cuenta de prueba autorizados. No hacer cobros reales ni usar información de producción
   para una simple comprobación. No guardar cookies, claves o datos de clientes en evidencia versionada.
4. Recorrer camino principal, error de API, carga, vacío y reintento. En cobros, verificar importe obsoleto,
   confirmación y resultado único. En permisos, probar el rol afectado y cambio de playa si corresponde.
5. Revisar escritorio y móvil, teclado/foco, desbordes y legibilidad de importes. Para recibos revisar
   repo público, impresión 58/80 mm y exportación si están dentro del cambio.
6. Guardar evidencia local en .playwright-mcp/ o la salida ignorada existente. Informar pasos y resultado;
   una captura no demuestra una transacción ni un test automatizado sustituye la comprobación visual.
