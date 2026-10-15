# Claude Code — frontend

## Estructura

- CLAUDE.md importa AGENTS.md de forma explícita, compatible con Claude Code 2.1.252.
- AGENTS.md conserva invariantes, comandos y referencias (<200 líneas).
- .claude/rules/: acceso-y-contratos, operacion, interfaz y testing, con paths específicos.
- docs/architecture/: acceso, operacion, comprobantes, interfaz y asistente; lectura a demanda.
- docs/desarrollo.md conserva comandos, variables y detalles de pruebas del CLAUDE anterior.
- .claude/settings.json es compartido. settings.local.json, CLAUDE.local.md y worktrees son locales.

## Skills

| Comando | Resultado esperado |
| --- | --- |
| /verificar-cambio | Tipos, lint, tests, contratos y comprobaciones proporcionales al diff. |
| /verificar-interfaz | Recorrido con navegador, móvil/escritorio, teclado, permisos, carga y errores. |
| /react-doctor | Diagnóstico complementario usando la fuente en .agents/skills/react-doctor. |
| /trabajo-aislado | Rama/worktree por tarea concurrente, preservando trabajo y ubicando repos hermanos. |

Todas pueden descubrirse por descripción; no hace falta invocarlas en cada edición.
React Doctor tiene un adaptador en .claude/skills: no duplica el playbook de .agents/.
El diagnóstico no prueba que una transacción funcione ni sustituye validación visual.

Ejemplos:

    /verificar-interfaz Comprobá el nuevo cierre con importe obsoleto en móvil y escritorio.
    /verificar-cambio Validá los cambios de esta tarea y sus pruebas del backend.
    /react-doctor Revisá regresiones del diff actual sin ampliar el alcance.

## Revisores

revisor-frontend revisa estado, permisos, contratos e interacciones.
revisor-contratos revisa consumidores, compatibilidad y cobertura.
Solo disponen de Read/Grep/Glob, heredan modelo y tienen 16 turnos como máximo.
El agente principal les proporciona el diff, ejecuta tests y verifica visualmente cuando corresponde.
No se fuerzan agentes paralelos para tareas simples.

## Hooks

- SessionStart: consulta rama y cambios del checkout activo; recuerda preservar trabajo ajeno.
- PreToolUse, Bash/PowerShell: bloquea formas habituales de staging masivo y commit -a;
  usar git add -- <archivos concretos> y revisar el índice.
- PostToolUse, Edit/Write/MultiEdit: contiene recordatorios para controllers y migraciones
  cuando el checkout activo es el backend. Las ediciones comunes de UI no generan avisos repetidos.

Los hooks usan Node, no consultan modelos/red, no leen .env ni alteran archivos. No son un
parser completo de shell ni un sandbox: no cubren aliases, scripts externos, comandos construidos
dinámicamente ni todos los pathspecs posibles. No reemplazan permisos normales ni CI.
No hay hook Stop que fuerce repetir tests por cambios preexistentes. Los scripts compartidos se
mantienen también en el backend; al cambiarlos, sincronizar y probar ambas copias.

## Permisos, MCP y entorno

Se limpiaron permisos históricos del settings del proyecto y se conservaron permisos concretos
de comprobación y lectura visual. Las configuraciones globales del usuario permanecen vigentes;
la limpieza local no revoca sus permisos globales.
Playwright/Pencil ya están configurados globalmente en esta máquina. No se duplican en .mcp.json.
En otro equipo, conectar el navegador elegido y revisar /mcp. Si no hay conexión, la skill visual
debe informar el límite, no afirmar que vio la interfaz.

Los builds comparten .next con dev: verificar en un worktree si hay otra sesión usando el servidor.
Un worktree no copia .env ni settings.local.json, ni preserva automáticamente la relación ../ entre repos.
Para pruebas entre repos, preparar checkouts hermanos o resolver las rutas explícitamente.

## Comprobación

    pnpm test:agents

El comando está conectado al CI existente y comprueba YAML/frontmatter, rutas de reglas, hooks,
permisos portables, ignores e importación de AGENTS.md. Reutiliza el parser YAML de ESLint ya instalado.
No llama APIs ni usa datos reales. Las pruebas de hooks usan un Git temporal.
En una sesión nueva comprobar /context o /memory, /agents, /hooks y /mcp según la tarea.
Puede ser necesario confiar en la carpeta para que Claude active hooks de proyecto.

Guía técnica completa y límites comunes: ../estacionamiento-back-demo/docs/claude-workflow.md
(ruta relativa al checkout principal, no a este archivo; localizar el backend si se usa worktree).
