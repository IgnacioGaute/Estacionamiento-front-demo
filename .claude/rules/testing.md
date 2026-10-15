---
paths:
  - "src/**/*.test.ts"
  - "src/**/*.test.tsx"
  - "jest*"
  - "package.json"
  - ".github/workflows/**"
  - ".claude/**"
---

# Pruebas
- Leer docs/desarrollo.md: jsdom por archivo, mocks ESM y carga de .env de next/jest.
- Un build verde no reemplaza typecheck ni lint. Ejecutar comprobaciones separadas.
- Revisar tests del backend que importan archivos del frontend antes de renombrarlos.
- Para configuración de agentes: pnpm test:agents. Evitar tests que solo repitan detalles internos.
