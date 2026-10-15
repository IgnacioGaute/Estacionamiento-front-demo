---
name: "verificar-cambio"
description: "Validar un cambio de Next.js/React del estacionamiento con tipos, lint, pruebas relevantes y contratos del backend."
---

# Verificar frontend
1. Leer AGENTS.md, package.json y el diff de la tarea; separar cambios preexistentes.
2. Ejecutar pnpm typecheck, pnpm lint y tests del comportamiento afectado. El build ignora tipos/lint.
3. Para cambios transversales ejecutar test:ci y build; no romper un dev activo compartiendo .next.
4. Elegir tests del backend que consumen la UI: receipt-mobile-layout, receipt-history-panel,
   assistant-message-render, tariff-editor-rules, pwa-offline y admin-*.ui según el área.
5. Si cambia interacción o layout, usar /verificar-interfaz. React Doctor sirve como diagnóstico
   complementario mediante /react-doctor; comparar hallazgos con el diff antes de ampliar alcance.
6. Configuración/hooks: pnpm test:agents. Informar comandos, resultados y limitaciones por repo.
