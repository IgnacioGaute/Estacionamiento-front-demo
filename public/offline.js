import { openOperations, saveOperations, finishOperations, rememberDeviceAccess, getDeviceAccess, hasOperations } from './offline-vault.js';
import { calculateStayPrice, assertPricingCoverage } from './offline-stay-pricing.js';
const $ = id => document.getElementById(id);
let state = null, revision = 0, password = '', busy = false, exit = null, timer;
let selectedReceipt = null;
const receiptEnabled = () => !!(state?.receiptDelivery?.print || state?.receiptDelivery?.qr || state?.receiptDelivery?.whatsapp);
function addReceipt(next, op) {
  if (!receiptEnabled()) return;
  const vehicle = next.vehicles.find(v => v.id === op.registrationId);
  next.receipts ||= [];
  next.receipts.push({ id: op.id, kind: op.kind, plate: vehicle.plate, vehicleType: vehicle.vehicleType, entry: vehicle.entry, occurredAt: op.occurredAt, price: op.expectedPrice, collected: op.expectedCollected, method: op.method, business: next.business, synced: false });
}
function receiptLines(r) {
  return [r.business?.name || 'Estacionamiento', r.business?.address || '', 'Comprobante de ' + (r.kind === 'ENTRY' ? 'entrada' : 'salida'), r.plate, r.vehicleType, 'Entrada: ' + new Date(r.entry).toLocaleString('es-AR'), ...(r.kind === 'EXIT' ? ['Salida: ' + new Date(r.occurredAt).toLocaleString('es-AR'), 'Tarifa total: ' + money(r.price), 'Anticipos: ' + money(r.collected), 'Cobrado: ' + money(r.price - r.collected), r.method === 'CASH' ? 'Efectivo' : 'Transferencia confirmada'] : []), r.synced ? 'Movimiento sincronizado' : 'Registro local · pendiente de sincronización', 'No válido como factura.', 'Referencia: ' + r.id];
}
function showReceipt(r) {
  selectedReceipt = r;
  $('receipt-paper').replaceChildren(...receiptLines(r).filter(Boolean).map((line, i) => { const el = document.createElement(i === 0 ? 'h2' : 'p'); el.textContent = line; return el; }));
  $('receipt-print').hidden = !state.receiptDelivery?.print;
  if (!$('receipt-dialog').open) $('receipt-dialog').showModal();
}
const money = n => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n);
const normalize = p => p.toUpperCase().replace(/[^A-Z0-9]/g, '');
const timestamp = () => new Date(Math.floor(Date.now() / 1000) * 1000).toISOString();
function message(text) { $('status').textContent = text; }
function controls() { document.querySelectorAll('button').forEach(b => b.disabled = busy || b.dataset.ineligible === 'true'); if (state) $('finish').disabled = busy || state.pending.length > 0; }
function lock() { if (busy) return; state = null; password = ''; exit = null; clearTimeout(timer); $('workspace').hidden = true; $('unlock').hidden = false; $('exit').hidden = true; for (const id of ['rows','queue','stamp','pending','amount']) $(id).replaceChildren(); $('plate').value = ''; }
async function persist(next) { revision = await saveOperations(next, password, revision); state = next; render(); }
async function api(action, body) {
  let response;
  try { response = await fetch('/api/offline/' + action, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Parking-Offline': '1' }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) }); }
  catch { throw new Error('Sin conexión con el servidor. Los movimientos siguen guardados en este equipo.'); }
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Iniciá sesión con el mismo usuario y playa. Las operaciones siguen guardadas.');
  const data = await response.json();
  if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join('. ') : data.message || 'No se pudo sincronizar.');
  return data;
}
function allowedTime() {
  if (Date.now() > state.expiresAt || Date.now() < Date.parse(state.capturedAt) - 120000) throw new Error('Los datos guardados vencieron o cambió el reloj. Sincronizá y volvé al sistema con conexión para actualizarlos automáticamente.');
}
function row(title, detail) { const el = document.createElement('div'); el.className = 'row'; const strong = document.createElement('strong'); strong.textContent = title; const p = document.createElement('p'); p.textContent = detail; el.append(strong, p); return el; }
function render() {
  if (!state) return;
  $('stamp').textContent = 'Datos preparados el ' + new Date(state.capturedAt).toLocaleString('es-AR') + '. Operaciones autorizadas hasta ' + new Date(state.expiresAt).toLocaleString('es-AR') + '.';
  $('pending').textContent = state.pending.length + ' operaciones pendientes de sincronizar';
  const q = normalize($('search').value);
  const vehicles = state.vehicles.filter(v => !v.departed && (!q || normalize(v.plate).includes(q)));
  $('rows').replaceChildren(...vehicles.map(v => {
    const el = row(v.plate, v.vehicleType + ' · Entrada: ' + new Date(v.entry).toLocaleString('es-AR'));
    const button = document.createElement('button'); button.type = 'button'; button.dataset.ineligible = String(!v.eligible); button.textContent = v.eligible ? 'Registrar salida' : 'Requiere revisión online: tarifa histórica no disponible'; button.disabled = busy || !v.eligible;
    button.onclick = () => {
      try {
        allowedTime();
        const occurredAt = timestamp();
        const preview = calculateStayPrice(v.pricing, v.vehicleType, new Date(v.entry), new Date(occurredAt));
        if (v.collected > preview.price) throw new Error('Hay un anticipo excedente. La devolución requiere revisión online.');
        exit = { id: crypto.randomUUID(), registrationId: v.id, kind: 'EXIT', occurredAt, expectedPrice: preview.price, expectedCollected: v.collected };
        $('amount').textContent = v.plate + ' · Total: ' + money(preview.price) + ' · Anticipos: ' + money(v.collected) + ' · A cobrar: ' + money(preview.price - v.collected);
        $('exit').hidden = false; $('exit').scrollIntoView({ block: 'center' });
      } catch (e) { message(e.message); }
    }; el.append(button);
    if (receiptEnabled()) {
      const receiptButton = document.createElement('button'); receiptButton.type = 'button'; receiptButton.textContent = 'Comprobante de entrada';
      receiptButton.onclick = () => showReceipt((state.receipts || []).find(r => r.kind === 'ENTRY' && r.plate === v.plate && r.entry === v.entry) || { id: v.id, kind: 'ENTRY', plate: v.plate, vehicleType: v.vehicleType, entry: v.entry, occurredAt: v.entry, business: state.business, synced: !state.pending.some(op => op.registrationId === v.id && op.kind === 'ENTRY') });
      el.append(receiptButton);
    }
    return el;
  }));
  if (!vehicles.length) $('rows').textContent = 'No hay vehículos activos en esta búsqueda.';
  $('queue').replaceChildren(...state.pending.map(op => row((op.kind === 'ENTRY' ? 'Entrada' : 'Salida') + ' · ' + (op.plate || state.vehicles.find(v => v.id === op.registrationId)?.plate || op.registrationId), new Date(op.occurredAt).toLocaleString('es-AR') + (op.kind === 'EXIT' ? ' · Cobrado: ' + money(op.expectedPrice - op.expectedCollected) : '') + (op.error ? ' · REVISAR: ' + op.error : ' · Pendiente'))));
  $('receipts-section').hidden = !receiptEnabled();
  $('receipts').replaceChildren(...(state.receipts || []).slice().reverse().map(r => {
    const el = row(r.plate, (r.kind === 'ENTRY' ? 'Entrada' : 'Salida') + ' · ' + new Date(r.occurredAt).toLocaleString('es-AR'));
    const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Ver comprobante'; button.onclick = () => showReceipt(r); el.append(button); return el;
  }));
  controls();
}
async function sync() {
  if (!state || busy || !navigator.onLine || !state.pending.length) return;
  busy = true; controls();
  try {
    while (state.pending.length) {
      const op = state.pending[0];
      const { error, ...payload } = op;
      try { await api('sync', { ...payload, sessionId: state.sessionId, deviceId: state.deviceId }); }
      catch (e) { const next = structuredClone(state); next.pending[0].error = e.message; await persist(next); throw e; }
      const next = structuredClone(state); next.pending.shift(); next.syncedCount = (next.syncedCount || 0) + 1;
      const receipt = next.receipts?.find(r => r.id === op.id); if (receipt) receipt.synced = true;
      await persist(next);
    }
    message('Todas las operaciones fueron confirmadas por el servidor.');
  } catch (e) { message(e.message + ' No se borró la operación pendiente.'); }
  finally { busy = false; render(); }
}
async function openWorkspace(accessPassword) {
  if (busy) return; busy = true; controls(); message('');
  try {
    password = accessPassword; $('password').value = '';
    const opened = await openOperations(password); state = opened.state; revision = opened.revision;
    document.querySelector('header h1').textContent = state.business?.name || 'Entradas y salidas';
    await rememberDeviceAccess(password);
    $('vehicle').replaceChildren(...state.types.map(t => { const o = document.createElement('option'); o.value = t.code; o.textContent = t.name; return o; }));
    $('workspace').hidden = false; $('unlock').hidden = true; render();
  } catch (e) { password = ''; $('unlock').hidden = false; message(e.message); }
  finally { busy = false; controls(); }
  await sync();
}
$('unlock').onsubmit = event => { event.preventDefault(); void openWorkspace($('password').value); };
$('entry').onsubmit = async event => {
  event.preventDefault(); if (!state || busy) return;
  busy = true; controls();
  try {
    allowedTime();
    const plate = normalize($('plate').value);
    if (!plate) throw new Error('Ingresá una patente válida.');
    if (state.vehicles.some(v => !v.departed && normalize(v.plate) === plate)) throw new Error('Ya hay un vehículo activo con esa patente.');
    const vehicleType = $('vehicle').value;
    assertPricingCoverage(state.pricing, vehicleType, 'DAY'); assertPricingCoverage(state.pricing, vehicleType, 'NIGHT');
    const occurredAt = timestamp();
    calculateStayPrice(state.pricing, vehicleType, new Date(occurredAt), new Date(Date.parse(occurredAt) + 3600000));
    const op = { id: crypto.randomUUID(), registrationId: crypto.randomUUID(), kind: 'ENTRY', occurredAt, plate, vehicleType };
    const next = structuredClone(state); next.pending.push(op); next.vehicles.push({ id: op.registrationId, plate, vehicleType, entry: occurredAt, pricing: state.pricing, collected: 0, eligible: true });
    addReceipt(next, op);
    await persist(next); $('plate').value = ''; message('Entrada guardada en este dispositivo. Pendiente de sincronizar.');
  } catch (e) { message(e.message); }
  finally { busy = false; render(); }
  await sync();
};
$('confirm-exit').onclick = async () => {
  if (!exit || busy || !state) return; busy = true; controls();
  try {
    allowedTime();
    const next = structuredClone(state);
    const vehicle = next.vehicles.find(v => v.id === exit.registrationId);
    if (!vehicle || vehicle.departed) throw new Error('La salida ya fue registrada.');
    const op = { ...exit, method: $('method').value };
    next.pending.push(op); vehicle.departed = true; addReceipt(next, op);
    await persist(next); exit = null; $('exit').hidden = true; message('Salida y cobro guardados. Pendientes de sincronizar.');
  } catch (e) { message(e.message); }
  finally { busy = false; render(); }
  await sync();
};
$('cancel-exit').onclick = () => { exit = null; $('exit').hidden = true; };
$('search').oninput = render; $('sync').onclick = sync; $('lock').onclick = lock;
$('export').onclick = () => { if (!state) return; const url = URL.createObjectURL(new Blob([JSON.stringify({ sessionId: state.sessionId, playaId: state.playaId, userId: state.userId, pending: state.pending }, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'operaciones-pendientes.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
$('finish').onclick = async () => {
  if (!state || busy || state.pending.length || !confirm('¿Finalizar la contingencia de este equipo? Todos los movimientos deben estar sincronizados.')) return;
  busy = true; controls();
  try { await api('finish', { sessionId: state.sessionId, deviceId: state.deviceId }); await finishOperations(revision); busy = false; lock(); message('Contingencia finalizada. Podés preparar una nueva jornada desde el sistema.'); }
  catch (e) { message(e.message); } finally { busy = false; controls(); }
};
function connection() { $('connection').textContent = navigator.onLine ? 'Modo local · conexión disponible' : 'Sin conexión · guardado automático'; }
window.addEventListener('online', () => { connection(); sync(); }); window.addEventListener('offline', connection); connection();
setInterval(() => { if (state && state.pending.length) sync(); }, 30000);
async function initialize() {
  try {
    if (!(await hasOperations())) { message('Este dispositivo todavía no tiene vehículos y tarifas guardados. Al iniciar sesión con conexión, el sistema los prepara automáticamente. Volvé al sistema cuando recuperes internet.'); return; }
    const accessPassword = await getDeviceAccess();
    if (accessPassword) await openWorkspace(accessPassword);
    else $('unlock').hidden = false;
  } catch (e) { message('No se pudieron abrir los datos del equipo. ' + e.message); }
}
void initialize();
$('receipt-close').onclick = () => $('receipt-dialog').close();
$('receipt-print').onclick = () => window.print();
$('receipt-image').onclick = () => {
  if (!selectedReceipt) return;
  const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
  const lines = receiptLines(selectedReceipt).filter(Boolean);
  canvas.width = 800; canvas.height = 100 + lines.length * 48;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = '#111'; ctx.font = '22px sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, 36, 55 + i * 48, 728));
  canvas.toBlob(blob => { if (!blob) return; const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'comprobante-' + selectedReceipt.plate + '-' + selectedReceipt.kind.toLowerCase() + '.png'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }, 'image/png');
};
