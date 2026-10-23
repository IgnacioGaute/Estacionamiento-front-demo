import { calculateStayPrice, assertPricingCoverage } from './offline-stay-pricing.js';

export const vehicleState = v => JSON.stringify([v.plate, v.vehicleType, v.entry, v.collected ?? 0, v.discount ?? 0, !!v.departed]);
export const passState = p => JSON.stringify([p.price, !!p.paid, !!p.retired, p.paymentMetodo ?? null]);
const free = (s, v) => (v?.modalidad ?? s.modalidad) === 'GRATUITO';
const integer = (n, min = 0) => { if (!Number.isSafeInteger(n) || n < min || n > 100000000) throw new Error('Ingresá un importe entero válido.'); return n; };
const reason = text => { if (!text?.trim() || text.trim().length > 255) throw new Error('Escribí un motivo de hasta 255 caracteres.'); return text.trim(); };
export function summary(s, v, at = new Date().toISOString()) {
  if (free(s, v)) return { price: 0, saldo: 0, refund: 0, collected: 0, breakdown: [] };
  if (!v.pricing) throw new Error('Falta la tarifa histórica de esta estadía en el equipo.');
  if (Date.parse(at) < Date.parse(v.entry)) throw new Error('La salida no puede ser anterior a la entrada.');
  const preview = calculateStayPrice(v.pricing, v.vehicleType, new Date(v.entry), new Date(at));
  const discount = Math.min(preview.price, v.discount || 0), price = preview.price - discount;
  return { ...preview, price, discount, collected: v.collected || 0, saldo: Math.max(0, price - (v.collected || 0)), refund: Math.max(0, (v.collected || 0) - price), breakdown: [...preview.breakdown, ...(discount ? [{ label: 'Descuento aplicado', amount: -discount }] : [])] };
}
export function previousTariff(s, v, at) {
  const current = summary(s, v, at);
  if (!current.saldo) return null;
  const price = minutes => calculateStayPrice(v.pricing, v.vehicleType, new Date(v.entry), new Date(Date.parse(v.entry) + minutes * 60000));
  let low = 0, high = Math.floor(current.elapsedMinutes);
  if (price(0).price >= current.price + current.discount) return null;
  while (high - low > 1) { const mid = Math.floor((low + high) / 2); if (price(mid).price < current.price + current.discount) low = mid; else high = mid; }
  const prior = price(low), amount = Math.min(current.saldo, current.price - prior.price);
  return amount > 0 ? { ...prior, amount } : null;
}
function cashChange(s, delta) {
  if (!delta || !s.cash) return;
  const active = s.cash.active;
  if (active) {
    active.efectivoDisponible += delta;
    const caja = s.cash.cajas.find(c => c.id === active.cajaId);
    if (caja) caja.efectivoDisponible += delta;
  }
  s.cash.efectivoDisponible += delta;
}
function receipt(s, op, v, kind, price, collected, method, charged) {
  if (free(s, v) || !(s.receiptDelivery?.print || s.receiptDelivery?.qr || s.receiptDelivery?.whatsapp)) return;
  s.receipts ||= [];
  s.receipts.push({ id: op.id, registrationId: v.id, kind, plate: v.plate, vehicleType: v.vehicleType, entry: v.entry, occurredAt: op.occurredAt, price, collected, method, charged, operatorName: s.operatorName, business: s.business, synced: false });
}
export function makeOperation(s, action, registrationId, data, at = new Date(Math.floor(Date.now() / 1000) * 1000).toISOString()) {
  data = structuredClone(data);
  if (['PLATE_ENTRY','EDIT'].includes(action) && data.licensePlate !== undefined) data.licensePlate = data.licensePlate.trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  if (data.noPlate && data.lastNameCustomer) data.lastNameCustomer = data.lastNameCustomer.trim();
  const v = s.vehicles.find(v => v.id === registrationId), p = s.passes?.find(p => p.id === registrationId);
  return { id: crypto.randomUUID(), registrationId, kind: 'ACTION', action, data, occurredAt: at, shiftId: s.shift?.id ?? null, ...(v ? { expectedState: vehicleState(v) } : p ? { expectedState: passState(p) } : {}), ...(action === 'SHIFT_OPEN' ? { cashSessionId: crypto.randomUUID() } : {}) };
}
export function applyOperation(source, op) {
  const s = structuredClone(source), d = op.data, action = op.action;
  if (s.operationVersion !== 3) throw new Error('Volvé al sistema con conexión para actualizar la copia de este equipo. Tus pendientes se conservan.');
  if (Date.parse(op.occurredAt) > s.expiresAt || Date.parse(op.occurredAt) < Date.parse(s.capturedAt) - 120000) throw new Error('Venció la autorización sin conexión. Sincronizá para renovarla.');
  let v = s.vehicles.find(v => v.id === op.registrationId);
  if (v && (v.departed || vehicleState(v) !== op.expectedState)) throw new Error('La estadía cambió. Volvé a abrirla antes de confirmar.');
  if (['DELETE', 'CASH_MOVEMENT'].includes(action) && !['ADMIN', 'SUPER_ADMIN'].includes(s.role)) throw new Error('Esta opción requiere un administrador.');
  if (['PLATE_ENTRY', 'CARD_ENTRY'].includes(action)) {
    const card = action === 'CARD_ENTRY' ? s.cards.find(c => c.id === d.ticketId) : null;
    const type = card?.vehicleType ?? d.vehicleType;
    if (!s.types.some(t => t.code === type)) throw new Error('Elegí un tipo de vehículo habilitado.');
    const plate = card?.codeBar ?? (d.noPlate ? d.lastNameCustomer?.trim() : d.licensePlate?.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''));
    if (!plate) throw new Error(d.noPlate ? 'Ingresá el apellido para identificar el vehículo sin patente.' : 'Ingresá una patente o tarjeta válida.');
    if (d.phoneCustomer && !/^[1-9]\d{7,14}$/.test(d.phoneCustomer)) throw new Error('Ingresá el teléfono con código de país, entre 8 y 15 dígitos.');
    if (d.lastNameCustomer?.length > 100 || d.casilleroNumber?.length > 255 || (!d.noPlate && plate.length > 50)) throw new Error('Revisá la longitud de la patente, el apellido o el casillero.');
    if (s.vehicles.some(v => !v.departed && v.plate === plate && (!d.noPlate || v.entryMode === 'BARCODE'))) {
      if (card || !d.duplicateOverride) throw new Error('Ya hay un vehículo activo con esa identificación.');
      reason(d.duplicateOverrideReason);
    }
    if (!free(s)) { assertPricingCoverage(s.pricing, type, 'DAY'); assertPricingCoverage(s.pricing, type, 'NIGHT'); }
    v = { id: op.registrationId, modalidad: s.modalidad, plate, vehicleType: type, entry: op.occurredAt, pricing: s.pricing, collected: 0, discount: 0, eligible: true, entryMode: card ? 'BARCODE' : 'PLATE', noPlate: !!d.noPlate, lastNameCustomer: d.lastNameCustomer, phoneCustomer: d.phoneCustomer, casilleroNumber: d.casilleroNumber };
    s.vehicles.push(v); receipt(s, op, v, 'ENTRY');
  } else if (action === 'CLOSE') {
    if (!v) throw new Error('No encontramos la estadía.');
    const at = d.salidaEn || op.occurredAt;
    if (Date.parse(at) > Date.parse(op.occurredAt) + 60000) throw new Error('La salida no puede ser posterior a ahora.');
    const totals = summary(s, v, at);
    let cash = 0;
    if (!free(s, v)) {
      if (totals.price !== d.expectedPrice || totals.collected !== d.expectedCollected) throw new Error('Cambió el importe. Revisá el resumen antes de confirmar.');
      if (d.closeType === 'COURTESY') reason(d.motivo);
      else if (totals.saldo) {
        const payments = d.pagos || [{ metodo: d.metodo, importe: totals.saldo }];
        if (d.closeType !== 'PAYMENT' || payments.some(p => !['CASH','TRANSFER'].includes(p.metodo) || integer(p.importe, 1) < 1) || payments.reduce((n,p) => n + p.importe, 0) !== totals.saldo) throw new Error('Los pagos deben sumar el saldo a cobrar.');
        cash = payments.filter(p => p.metodo === 'CASH').reduce((n,p) => n + p.importe, 0);
      }
      if (totals.refund && !['CASH','TRANSFER'].includes(d.refundMetodo)) throw new Error('Elegí cómo devolviste el anticipo excedente.');
      if (d.refundMetodo === 'CASH') cash -= totals.refund;
    }
    cashChange(s, cash); v.departed = true; v.departure = at;
    receipt(s, op, v, 'EXIT', totals.price, totals.collected, d.pagos ? 'MIXED' : d.metodo, d.closeType === 'COURTESY' ? 0 : totals.saldo - totals.refund);
  } else if (action === 'ADVANCE') {
    if (!v || free(s, v)) throw new Error('Esta estadía no admite anticipos.');
    const target = d.chargeFullPlannedStay ? calculateStayPrice(v.pricing, v.vehicleType, new Date(v.entry), new Date(Date.parse(v.entry) + integer(d.expectedUptoMinutes, 1) * 60000)).price : integer(d.advancePaidAmount ?? v.collected);
    const delta = target - v.collected;
    if (delta < 0) reason(d.adjustmentReason);
    if (delta && !['CASH','TRANSFER'].includes(d.metodo)) throw new Error('Elegí el medio de pago o devolución.');
    if (d.metodo === 'CASH') cashChange(s, delta);
    Object.assign(v, { collected: target, ...(d.expectedUptoMinutes !== undefined ? { expectedUptoMinutes: d.expectedUptoMinutes, expectedBracketLabel: d.expectedBracketLabel } : {}) });
  } else if (action === 'DISCOUNT' || action === 'PARTIAL_CASH') {
    const totals = summary(s, v, op.occurredAt), amount = integer(action === 'DISCOUNT' ? d.monto : d.importe, 1);
    if (totals.price !== d.expectedPrice || totals.collected !== d.expectedCollected || amount > totals.saldo || (action === 'PARTIAL_CASH' && amount === totals.saldo)) throw new Error('El importe debe ser menor o igual al saldo pendiente.');
    if (action === 'DISCOUNT') { reason(d.motivo); v.discount = (v.discount || 0) + amount; }
    else { v.collected += amount; cashChange(s, amount); }
  } else if (action === 'EDIT') {
    if (!v) throw new Error('No encontramos la estadía.');
    if (d.licensePlate !== undefined) {
      if (v.entryMode === 'BARCODE') throw new Error('La estadía de tarjeta no tiene patente para corregir.');
      const plate = d.licensePlate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!plate || s.vehicles.some(other => other.id !== v.id && !other.departed && other.plate === plate)) throw new Error('La patente está vacía o ya tiene un ingreso activo.');
      v.plate = plate; v.noPlate = false;
    }
    if (d.vehicleType && d.vehicleType !== v.vehicleType) {
      if (!s.types.some(t => t.code === d.vehicleType)) throw new Error('Elegí un tipo habilitado.');
      if (v.pricing) { const pricing = { ...v.pricing, brackets: s.pricing.brackets.filter(b => b.vehicleType === d.vehicleType) }; assertPricingCoverage(pricing, d.vehicleType, 'DAY'); assertPricingCoverage(pricing, d.vehicleType, 'NIGHT'); v.pricing = pricing; }
      v.vehicleType = d.vehicleType;
    }
  } else if (action === 'EDIT_ENTRY') {
    if (!v || Date.parse(op.occurredAt) - Date.parse(v.entry) > 900000 || Date.parse(d.entrada) >= Date.parse(v.entry) || Date.parse(op.occurredAt) - Date.parse(d.entrada) > 86400000) throw new Error('Sólo podés corregir un ingreso cargado en los últimos 15 minutos, hasta 24 horas hacia atrás.');
    v.entry = new Date(Math.floor(Date.parse(d.entrada) / 60000) * 60000).toISOString();
  } else if (action === 'DELETE') {
    if (!v || v.collected || v.discount) throw new Error('No se puede eliminar una estadía con movimientos de cobro.');
    s.vehicles = s.vehicles.filter(row => row.id !== v.id);
  } else if (action === 'PASS_ENTRY') {
    if (free(s)) throw new Error('La modalidad gratuita no tiene estadías por día, semana o mes.');
    const units = d.ticketTimeType === 'SEMANA_Y_DIA' ? [['SEMANA',d.weeks],['DIA',d.days]] : d.ticketTimeType === 'MES_Y_DIA' ? [['MES',d.months],['DIA',d.days]] : [[d.ticketTimeType, d.ticketTimeType === 'DIA' ? d.days : d.ticketTimeType === 'SEMANA' ? d.weeks : d.months]];
    let price = 0;
    for (const [type, count] of units) { const rate = s.passPrices.find(p => p.ticketTimeType === type && p.vehicleType === d.vehicleType); if (!rate || integer(count) > 365) throw new Error('No hay tarifa guardada para esa duración y vehículo.'); price += rate.ticketTimePrice * count; }
    if (!price || !d.vehiclePlateCustomer?.trim()) throw new Error('Completá la patente y la duración.');
    s.passes ||= []; s.passes.push({ ...d, id: op.registrationId, price, createdAt: op.occurredAt, retired: false });
    if (d.paid && d.paymentMetodo === 'CASH') cashChange(s, price);
    receipt(s, op, { id: op.registrationId, plate: d.vehiclePlateCustomer, vehicleType: d.vehicleType, entry: op.occurredAt }, 'ENTRY', price, d.paid ? price : 0, d.paymentMetodo);
  } else if (action === 'PASS_UPDATE') {
    const p = s.passes.find(p => p.id === op.registrationId);
    if (!p || passState(p) !== op.expectedState) throw new Error('La estadía cambió. Volvé a abrirla.');
    const before = p.paid && !['TRANSFER','MERCADOPAGO'].includes(p.paymentMetodo) ? p.price : 0;
    Object.assign(p, d); if (d.retired) p.retiredAt = op.occurredAt;
    const after = p.paid && !['TRANSFER','MERCADOPAGO'].includes(p.paymentMetodo) ? p.price : 0;
    cashChange(s, after - before);
    if (d.retired) receipt(s, op, { id: p.id, plate: p.vehiclePlateCustomer, vehicleType: p.vehicleType, entry: p.createdAt }, 'EXIT', p.price, p.paid ? p.price : 0, p.paymentMetodo, after - before);
  } else if (action === 'SHIFT_OPEN') {
    if (free(s) || !s.shiftsEnabled || s.cash.active) throw new Error('No se puede abrir otro turno.');
    const c = s.cash.cajas.find(c => c.id === d.cajaId);
    if (!c || !c.activa) throw new Error('Elegí una caja habilitada.');
    if (!s.cash.multipleShiftsEnabled && s.cash.cajas.some(c => c.session)) throw new Error('Ya hay un turno abierto.');
    integer(d.fondoInicial); integer(d.cambioAgregado || 0);
    if (d.fondoInicial < (d.cambioAgregado || 0)) throw new Error('El fondo debe incluir el cambio agregado.');
    if (c.session && (d.fondoInicial || d.cambioAgregado || d.sesionActivaId !== c.session.id)) throw new Error('La caja compartida ya tiene fondo. Confirmá que te unís sin volver a cargarlo.');
    const expected = c.pending?.efectivoParaSiguiente ?? c.legacyPending?.efectivoParaSiguiente ?? 0;
    if (!c.session && c.pending && d.sesionAnteriorId !== c.pending.id) throw new Error('Revisá el fondo pendiente de esta caja.');
    if (!c.session && expected !== d.fondoInicial - (d.cambioAgregado || 0)) reason(d.motivoApertura);
    c.session ||= { id: op.cashSessionId, fondoInicial: d.fondoInicial, fechaApertura: op.occurredAt };
    c.operadores ||= []; c.operadores.push({ turnoId: op.registrationId, id: s.userId, nombre: s.operatorName });
    if (c.operadores.length === 1) c.efectivoDisponible = d.fondoInicial;
    s.shift = { id: op.registrationId, name: s.operatorName };
    s.cash.active = { id: op.registrationId, nombre: s.operatorName, cajaId: c.id, cashSessionId: c.session.id, sueldoPrevisto: s.salary || 0, fondoObjetivo: c.fondoObjetivo || 0, efectivoDisponible: c.efectivoDisponible, usuariosEnCaja: c.operadores.length, fechaApertura: op.occurredAt };
    s.cash.efectivoDisponible = c.efectivoDisponible;
  } else if (action === 'SHIFT_CLOSE') {
    const t = s.cash?.active;
    if (!t || t.id !== op.registrationId) throw new Error('No hay un turno propio abierto.');
    const c = s.cash.cajas.find(c => c.id === t.cajaId), shared = c.operadores.length > 1;
    const counted = shared ? t.efectivoDisponible : integer(d.efectivoContado);
    const salary = t.sueldoPrevisto > 0 && counted - (c.fondoObjetivo || 0) >= t.sueldoPrevisto ? t.sueldoPrevisto : 0;
    if (t.sueldoPrevisto > 0 && d.sueldoEsperado !== salary) throw new Error('Revisá el sueldo antes de cerrar.');
    if (!shared) {
      if (d.efectivoEsperado !== t.efectivoDisponible) throw new Error('El efectivo esperado cambió.');
      if (counted !== t.efectivoDisponible) reason(d.observaciones);
      if (integer(d.efectivoParaSiguiente || 0) + salary > counted) throw new Error('El fondo y sueldo no pueden superar el efectivo contado.');
      c.pending = { ...c.session, id: c.session.id, efectivoParaSiguiente: d.efectivoParaSiguiente || 0 };
      c.session = null; c.efectivoDisponible = d.efectivoParaSiguiente || 0;
    } else { if (d.cerrarCaja || d.efectivoContado !== undefined) throw new Error('Hay otros operadores. Cerrá sólo tu turno.'); c.efectivoDisponible -= salary; }
    c.operadores = c.operadores.filter(o => o.turnoId !== t.id);
    s.cash.active = null; s.shift = null; s.cash.efectivoDisponible = c.efectivoDisponible;
  } else if (action === 'CASH_MOVEMENT') {
    const c = s.cash?.cajas.find(c => c.session?.id === op.registrationId);
    if (!c || c.efectivoDisponible !== d.efectivoEsperado) throw new Error('La caja cambió. Revisá el efectivo esperado.');
    integer(d.importe, 1); reason(d.motivo);
    if (d.tipo === 'RETIRO' && d.importe > c.efectivoDisponible) throw new Error('No podés retirar más efectivo del disponible.');
    const delta = d.tipo === 'RETIRO' ? -d.importe : d.importe;
    c.efectivoDisponible += delta;
    if (s.cash.active?.cashSessionId === c.session.id) s.cash.active.efectivoDisponible += delta;
    s.cash.efectivoDisponible += delta;
  } else if (action === 'BOX_MOVEMENT') {
    if (free(s)) throw new Error('La modalidad gratuita no usa caja.');
    integer(d.price, 1); reason(d.description);
    if (!['CASH','TRANSFER'].includes(d.paymentMethod) || !['INGRESOS','EGRESOS'].includes(d.type)) throw new Error('Elegí el tipo y medio del movimiento.');
    if (d.paymentMethod === 'CASH') cashChange(s, d.type === 'EGRESOS' ? -d.price : d.price);
  } else throw new Error('Operación sin conexión desconocida.');
  s.pending.push(op);
  return s;
}
