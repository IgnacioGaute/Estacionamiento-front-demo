import { openSnapshot, clearSnapshot } from './offline-vault.js';
const $ = id => document.getElementById(id);
let snapshot = null;
let lockTimer;
function lock() { snapshot = null; $('rows').replaceChildren(); $('prices').replaceChildren(); $('parking').textContent = ''; $('stamp').textContent = ''; $('snapshot').hidden = true; $('unlock').hidden = false; $('search').value = ''; clearTimeout(lockTimer); }
function row(title, detail) { const el = document.createElement('div'); el.className = 'row'; const strong = document.createElement('strong'); strong.textContent = title; const p = document.createElement('p'); p.textContent = detail; el.append(strong, p); return el; }
function renderRows() {
  if (!snapshot) return;
  const q = $('search').value.trim().toLocaleLowerCase();
  const rows = snapshot.vehicles.filter(r => r.identification.toLocaleLowerCase().includes(q));
  $('rows').replaceChildren(...rows.map(r => row(r.identification, `${r.type} · Entrada: ${r.entry || 'Sin fecha'} · ${r.period}`)));
  if (!rows.length) $('rows').textContent = 'No hay vehículos en esta búsqueda.';
}
$('unlock').addEventListener('submit', async event => {
  event.preventDefault(); $('status').textContent = 'Abriendo copia…';
  const password = $('password').value; $('password').value = '';
  try {
    snapshot = await openSnapshot(password);
    $('parking').textContent = snapshot.parking;
    $('stamp').textContent = `Copia de ${new Date(snapshot.capturedAt).toLocaleString('es-AR')} · ${snapshot.vehicles.length} vehículos. Puede estar desactualizada.`;
    $('prices').replaceChildren(...snapshot.prices.map(p => row(`${p.vehicle} · ${p.label}`, `${p.period} · ${new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(p.price)}`)));
    $('snapshot').hidden = false; $('unlock').hidden = true; $('status').textContent = ''; renderRows();
    lockTimer = setTimeout(lock, 5 * 60 * 1000);
  } catch (error) { lock(); $('status').textContent = error.message; }
});
$('search').addEventListener('input', renderRows);
$('lock').addEventListener('click', lock);
document.addEventListener('visibilitychange', () => { if (document.hidden) lock(); });
$('delete').addEventListener('click', async () => { if (!confirm('¿Eliminar la copia de consulta de este dispositivo?')) return; try { await clearSnapshot(); lock(); $('status').textContent = 'Copia local eliminada.'; } catch { $('status').textContent = 'No se pudo eliminar la copia. Intentá nuevamente.'; } });
