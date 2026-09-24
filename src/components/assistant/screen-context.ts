// Only known UI labels are sent. Never collect input values, table rows or arbitrary text.
const LABELS = new Set([
  'Tickets', 'Tickets y patentes', 'Registrar entrada', 'Registrar entradas', 'Cobrar salida', 'Cobrar salidas',
  'Registrar salida y cobrar', 'Patente', 'Ticket', 'Por hora', 'Día/Sem/Mes', 'Consultar precios',
  'Administrar tickets', 'Administrar precios', 'Estadía por día, semana o mes', 'Turno actual', 'Abrir turno', 'Cerrar turno', 'Cerrar este turno',
  'Precios por duración', 'Cómo cobrar', 'Tipos de vehículo', 'Día / semana / mes',
  'Forma de cobro', 'Cruces de horario', 'Probar tarifas', 'Ver cuánto cobrar',
  'Historial de turnos', 'Turnos cerrados', 'Hoy', 'Ayer', '7 días', 'Todo', 'Más filtros',
  'Planilla diaria de caja', 'Gastos e ingresos', 'Registrar Ingreso o Egreso', 'Varios',
  'Avisos', 'Nuevo aviso', 'Cartelera del equipo', 'Marcar como leído',
  'Administración', 'Operación', 'Usuarios', 'Frecuentes', 'Dashboard', 'Panel',
  'Anterior', 'Siguiente', 'Guardar', 'Crear', 'Cancelar', 'Confirmar', 'Cerrar',
]);
export function captureScreenContext() {
  const controls: { label: string; kind: string; selected: boolean; disabled: boolean; area: string }[] = [];
  for (const element of document.querySelectorAll<HTMLElement>('button, a, [role="tab"], summary, h1, h2, [role="dialog"]')) {
    if (element.closest('[data-assistant-ui]')) continue;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    if (!rect.width || !rect.height || rect.bottom <= 0 || rect.top >= innerHeight || rect.right <= 0 || rect.left >= innerWidth || style.visibility === 'hidden' || style.display === 'none') continue;
    const titleId = element.getAttribute('aria-labelledby');
    const text = element.getAttribute('role') === 'dialog' && titleId ? document.getElementById(titleId)?.textContent : element.textContent;
    const label = (text ?? '').replace(/\s+/g, ' ').trim();
    if (!LABELS.has(label)) continue;
    controls.push({ label, kind: element.getAttribute('role') || element.tagName.toLowerCase(), selected: element.getAttribute('aria-selected') === 'true' || element.getAttribute('aria-pressed') === 'true', disabled: element.matches(':disabled') || element.getAttribute('aria-disabled') === 'true', area: `${rect.top < innerHeight / 3 ? 'arriba' : rect.top > innerHeight * 2 / 3 ? 'abajo' : 'centro'}${innerWidth >= 768 ? rect.left < innerWidth / 2 ? ', izquierda' : ', derecha' : ''}` });
    if (controls.length >= 35) break;
  }
  return JSON.stringify({ viewport: innerWidth < 768 ? 'celular' : 'escritorio', controls, scope: 'Solo etiquetas conocidas visibles en el viewport. No incluye valores de formularios ni registros. La lista puede ser parcial.' });
}
