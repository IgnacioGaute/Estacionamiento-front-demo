import { plata } from '@/components/plataforma/formato';
import { CargoCuenta, ResultadoPago, Tramo, nombreMetodo } from '@/types/cuenta.type';

// «2026-10-02» → «02/10/2026». Sin pasar por Date: un «AAAA-MM-DD» se lee como medianoche UTC y
// en Argentina mostraría el día anterior.
export function fechaAR(fecha: string | null | undefined) {
  if (!fecha) return '—';
  const [a, m, d] = String(fecha).slice(0, 10).split('-');
  return d && m && a ? `${d}/${m}/${a}` : '—';
}

// Un instante (createdAt) se muestra en el día de Argentina: cortar el ISO en UTC daría el día
// siguiente para todo lo cargado después de las 21.
export function diaDeInstanteAR(instante: string | null | undefined) {
  if (!instante) return '—';
  const d = new Date(instante);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', year: 'numeric' });
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export function mesLargo(fecha: string) {
  const [a, m] = fecha.slice(0, 7).split('-').map(Number);
  return `${MESES[m - 1] ?? ''} ${a}`;
}

// «2026-10» → «octubre».
export const nombreMes = (mes: string) => MESES[Number(mes.slice(5, 7)) - 1] ?? '';

export function mesActual() {
  const ahora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
}

export function sumarMeses(mes: string, n: number) {
  const [a, m] = mes.split('-').map(Number);
  const d = new Date(a, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export const hoyAR = () => {
  const ahora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
};

// Saldo positivo = pendiente de pago; negativo = saldo a favor del inquilino.
export function textoSaldo(saldo: number) {
  return saldo > 0 ? `Pendiente ${plata(saldo)}` : saldo < 0 ? `A favor ${plata(-saldo)}` : 'Al día';
}

export const colorSaldo = (saldo: number) => (saldo > 0 ? 'text-[#FF7A4D]' : saldo < 0 ? 'text-emerald-400' : '');

const MAXIMO = 1_000_000_000;

// Importes en pesos enteros. Se acepta «12500» o «12.500» (puntos de miles). Lo que parezca
// tener centavos («1.000,50», «1000.5») se rechaza con un aviso: convertirlo en silencio haría
// de 1.000,50 un 100.050. `completo` es false mientras el texto puede estar a medio escribir
// («12.» o «12.5» camino a «12.500»): ahí todavía no se muestra el error.
export function leerImporte(texto: string): { valor: number; error: string | null; completo: boolean } {
  const t = texto.replace(/[\s$]/g, '');
  if (!t) return { valor: 0, error: null, completo: true };
  if (t.includes(',')) return { valor: 0, error: 'Sin centavos: ingresá pesos enteros (por ejemplo 12.500).', completo: true };
  let valor: number | null = null;
  if (/^\d+$/.test(t)) valor = Number(t);
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) valor = Number(t.replace(/\./g, ''));
  if (valor === null) {
    const aMedias = /^\d{1,3}(\.\d{3})*\.\d{0,2}$/.test(t);
    return {
      valor: 0,
      error: /^\d+\.\d{1,2}$/.test(t)
        ? 'Sin centavos: ingresá pesos enteros (por ejemplo 12.500).'
        : 'Revisá el importe: solo números, con o sin puntos de miles.',
      completo: !aMedias,
    };
  }
  if (valor > MAXIMO) return { valor: 0, error: 'El importe es demasiado grande.', completo: true };
  return { valor, error: null, completo: true };
}

// Colores y nombres de los tramos de deuda: pendiente (todavía no vence) y vencido por días.
export const TRAMOS: Record<Tramo, { label: string; corto: string; color: string }> = {
  PENDIENTE: { label: 'Pendiente, sin vencer', corto: 'Sin vencer', color: '#E9E1D4' },
  VENCIDO_30: { label: 'Vencido hasta 30 días', corto: 'Hasta 30 días', color: '#F5C219' },
  VENCIDO_60: { label: 'Vencido 31 a 60 días', corto: '31 a 60 días', color: '#FF9A5C' },
  VENCIDO_MAS: { label: 'Vencido hace más de 60 días', corto: 'Más de 60 días', color: '#FF5C4D' },
};

// La misma imputación que hace el backend (elegidos primero, después del más viejo al más
// nuevo), para mostrar antes de confirmar qué cubre el cobro.
export function simularImputacion(pendientes: CargoCuenta[], elegidos: string[], total: number) {
  const orden = [
    ...elegidos.map((id) => pendientes.find((r) => r.id === id)).filter((r): r is CargoCuenta => !!r),
    ...pendientes.filter((r) => !elegidos.includes(r.id)),
  ];
  let resta = total;
  const lineas: { recibo: CargoCuenta; aplicado: number; queda: number }[] = [];
  for (const r of orden) {
    if (resta <= 0) break;
    const aplicado = Math.min(r.saldo, resta);
    if (!aplicado) continue;
    lineas.push({ recibo: r, aplicado, queda: r.saldo - aplicado });
    resta -= aplicado;
  }
  return { lineas, aFavor: resta };
}

// Recibo de pago para imprimir (ticket de 80 mm o A4, lo decide la impresora). Documenta la plata
// recibida, no la operación: lleva la «X» y la leyenda de documento no válido como factura, como
// corresponde a un comprobante interno. Se arma en una ventana aparte con estilos propios.
export function imprimirComprobante(r: ResultadoPago, playa?: string) {
  const filas = r.imputaciones
    .map(
      (i) =>
        `<tr><td>${escapar(i.concepto)}</td><td class="n">${plata(i.aplicado)}</td><td class="n">${i.saldoRecibo ? plata(i.saldoRecibo) : 'Saldado'}</td></tr>`,
    )
    .join('');
  const medios = r.medios.map((m) => `<tr><td>${nombreMetodo(m.metodo)}</td><td class="n">${plata(m.importe)}</td></tr>`).join('');
  return abrirImpresion(`Recibo de pago N° ${r.numero}`, `
    <header><div class="encabezado"><div><div class="marca">${escapar(playa ?? 'Estacionamiento')}</div><h1>Recibo de pago</h1>
    <div class="meta">N° ${r.numero} · ${fechaAR(r.fecha)}</div></div><div class="letra"><b>X</b><span>Documento no válido como factura</span></div></div></header>
    <p class="cliente">Recibimos de <strong>${escapar(r.cliente)}</strong> la suma de <strong>${plata(r.total)}</strong>.</p>
    <table><thead><tr><th>Medio de pago</th><th class="n">Importe</th></tr></thead><tbody>${medios}</tbody></table>
    ${filas ? `<h2>Aplicado a</h2><table><thead><tr><th>Cargo</th><th class="n">Aplicado</th><th class="n">Queda pendiente</th></tr></thead><tbody>${filas}</tbody></table>` : ''}
    ${r.aFavor ? `<p>Queda como saldo a favor: <strong>${plata(r.aFavor)}</strong></p>` : ''}
    <div class="saldo"><span>Saldo de la cuenta</span><strong>${textoSaldo(r.saldo)}</strong></div>
    ${r.nota ? `<p class="nota">${escapar(r.nota)}</p>` : ''}
    <p class="leyenda">Documento no válido como factura.</p>
  `);
}

export function abrirImpresion(titulo: string, cuerpo: string) {
  const ventana = window.open('', '_blank', 'width=420,height=640');
  if (!ventana) return false;
  ventana.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapar(titulo)}</title>
    <style>
      *{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;padding:18px;font-size:12px;max-width:760px}
      header{border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:10px}.marca{font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:11px}
      .encabezado{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
      .letra{display:flex;flex-direction:column;align-items:center;max-width:110px;text-align:center}
      .letra b{display:block;border:2px solid #111;width:38px;height:38px;line-height:34px;font-size:24px}
      .letra span{font-size:8.5px;margin-top:3px;text-transform:uppercase;letter-spacing:.04em}
      h1{font-size:18px;margin:4px 0 2px}h2{font-size:12px;margin:14px 0 4px;text-transform:uppercase;letter-spacing:.06em}.meta{color:#444}
      table{width:100%;border-collapse:collapse;margin-top:6px}th,td{text-align:left;padding:5px 4px;border-bottom:1px solid #ddd;vertical-align:top}
      th{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#555}.n{text-align:right;white-space:nowrap}
      .saldo{display:flex;justify-content:space-between;border-top:2px solid #111;margin-top:12px;padding-top:8px;font-size:14px}
      .nota{color:#444;font-style:italic}.tachado td{text-decoration:line-through;color:#888}.cliente{font-size:13px}
      .leyenda{margin-top:14px;font-size:10px;color:#444;text-align:center;text-transform:uppercase;letter-spacing:.06em}
      @media print{body{padding:0}}
    </style></head><body>${cuerpo}<script>window.onload=function(){window.print()}</script></body></html>`);
  ventana.document.close();
  return true;
}

// Identificador único para un cobro. `randomUUID` solo existe en contextos seguros (HTTPS o
// localhost); en una red local por HTTP se arma igual, con el mismo generador aleatorio.
export function nuevoId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function escapar(texto: string) {
  return texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
