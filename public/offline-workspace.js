import { summary, previousTariff } from './offline-operations.js';

const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);
const localTime = value => { const d = new Date(value); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
const now = () => new Date(Math.floor(Date.now() / 1000) * 1000).toISOString();
const methods = [['CASH','Efectivo'],['TRANSFER','Transferencia verificada']];
const operationLabels = { PLATE_ENTRY:'Entrada por patente', CARD_ENTRY:'Entrada con tarjeta', CLOSE:'Salida', ADVANCE:'Anticipo', DISCOUNT:'Descuento', PARTIAL_CASH:'Pago parcial en efectivo', EDIT:'Corrección de datos', EDIT_ENTRY:'Corrección de ingreso', DELETE:'Ingreso eliminado por error', PASS_ENTRY:'Alta de estadía', PASS_UPDATE:'Cobro / retiro de estadía', SHIFT_OPEN:'Apertura de turno', SHIFT_CLOSE:'Cierre de turno', CASH_MOVEMENT:'Retiro / aporte', BOX_MOVEMENT:'Ingreso / gasto', ENTRY:'Entrada', EXIT:'Salida' };
function el(tag, text, className) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
function button(text, click, secondary = true) { const b = el('button', text, secondary ? 'secondary' : ''); b.type = 'button'; b.onclick = click; return b; }
const numeric = (key, label, value = 0) => ({ key, label, type: 'number', value, min: 0, required: true });
const text = (key, label, value = '', required = false) => ({ key, label, value, required });
const select = (key, label, options, value) => ({ key, label, options, value });
export function createOfflineWorkspace({ getState, commit, isBusy, showReceipt }) {
  let mounted = false, dialog;
  const s = getState;
  const types = current => [...s().types.map(t => [t.code, t.name]), ...(current && !s().types.some(t => t.code === current) ? [[current, current + ' (tipo del ingreso)']] : [])];
  const free = v => (v?.modalidad ?? s().modalidad) === 'GRATUITO';
  function show(title, fields, submit, { description, label = 'Guardar pendiente', shortcuts = [] } = {}) {
    dialog?.remove(); dialog = el('dialog', undefined, 'operation-dialog'); dialog.setAttribute('aria-labelledby', 'operation-title');
    const heading = el('div', undefined, 'section-heading'), h = el('h2', title); h.id = 'operation-title';
    heading.append(h, button('Cerrar', () => dialog.close())); dialog.append(heading);
    if (description) dialog.append(el('p', description, 'operation-hint'));
    const form = el('form'), controls = {}, wrappers = {};
    for (const f of fields) {
      const wrapper = el('div', undefined, 'operation-field'), labelEl = el('label', f.label);
      const input = el(f.options ? 'select' : 'input'); input.id = 'operation-' + f.key; input.name = f.key; labelEl.htmlFor = input.id;
      if (f.options) for (const [value, name] of f.options) { const option = el('option', name); option.value = value; input.append(option); }
      else { input.type = f.type || 'text'; if (f.type === 'number') { input.min = f.min ?? 0; input.step = 1; input.max = 100000000; } }
      if (f.type === 'checkbox') input.checked = !!f.value; else if (f.value !== undefined) input.value = f.value;
      input.required = !!f.required; if (f.type !== 'number') input.maxLength = 255;
      wrapper.append(labelEl, input); if (f.hint) wrapper.append(el('small', f.hint)); form.append(wrapper); controls[f.key] = input; wrappers[f.key] = wrapper;
    }
    const values = () => Object.fromEntries(fields.map(f => [f.key, f.type === 'checkbox' ? controls[f.key].checked : f.type === 'number' ? Number(controls[f.key].value) : controls[f.key].value]));
    const update = () => fields.forEach(f => { const hidden = !!f.when && !f.when(values()); wrappers[f.key].hidden = hidden; controls[f.key].disabled = hidden; });
    form.oninput = update; form.onchange = update; update();
    const error = el('p', '', 'operation-error'); error.setAttribute('role', 'alert');
    const actions = el('div', undefined, 'actions');
    for (const [name, action] of shortcuts) actions.append(button(name, action));
    const save = el('button', label); save.type = 'submit'; actions.append(save);
    form.append(error, actions); dialog.append(form); document.body.append(dialog);
    const thisDialog = dialog;
    form.onsubmit = async event => {
      event.preventDefault(); if (isBusy()) return;
      save.disabled = true; error.textContent = '';
      try { await submit(values()); thisDialog.close(); }
      catch (e) { error.textContent = e.message; }
      finally { save.disabled = false; }
    };
    dialog.showModal(); controls[fields[0]?.key]?.focus();
  }
  function entry() {
    const mode = $('entry-mode').value;
    const options = types();
    if (mode === 'CARD') return show('Ingreso con tarjeta', [select('ticketId','Tarjeta', s().cards.map(c => [c.id, c.codeBar + ' · ' + c.vehicleType]))], d => commit('CARD_ENTRY', crypto.randomUUID(), d));
    const noPlate = mode === 'NAME';
    show(noPlate ? 'Ingreso sin patente' : 'Registrar entrada', [
      ...(noPlate ? [] : [text('licensePlate','Patente', $('plate').value.toUpperCase(), true)]),
      select('vehicleType','Vehículo', options, $('vehicle').value), text('lastNameCustomer', noPlate ? 'Apellido / identificación del cliente' : 'Apellido del cliente (opcional)', '', noPlate), text('phoneCustomer','Teléfono (opcional)'), text('casilleroNumber','Casillero (opcional)'),
      ...(!noPlate ? [{key:'duplicateOverride',label:'Confirmo otro ingreso de la misma patente',type:'checkbox',when:d=>s().vehicles.some(v=>!v.departed && v.plate===d.licensePlate?.toUpperCase().replace(/[^A-Z0-9]/g,''))},{...text('duplicateOverrideReason','Motivo del ingreso duplicado','',true),when:d=>!!d.duplicateOverride}] : []),
    ], async d => { if (noPlate) d.noPlate = true; if(!d.duplicateOverride) {delete d.duplicateOverride;delete d.duplicateOverrideReason;} for (const key of ['phoneCustomer','casilleroNumber','lastNameCustomer']) if (!d[key]) delete d[key]; if (d.phoneCustomer) d.phoneCustomer = d.phoneCustomer.replace(/[\s()+-]/g,''); await commit('PLATE_ENTRY', crypto.randomUUID(), d); $('plate').value = ''; }, { description: 'Podés agregar el anticipo o la duración prevista desde el detalle del vehículo.' });
  }
  function payment(v) {
    const quoteAt = now(), totals = summary(s(), v, quoteAt);
    const fields = [
      select('method', totals.refund ? 'Devolución del anticipo excedente' : 'Pago recibido', [...methods, ...(!totals.refund && totals.saldo ? [['MIXED','Efectivo + transferencia'],['COURTESY','Cortesía / sin cobrar con motivo']] : [])], 'CASH'),
      { ...numeric('cash','Parte recibida en efectivo', Math.floor(totals.saldo / 2)), when: d => d.method === 'MIXED' },
      { ...text('motivo','Motivo de la cortesía', '', true), when: d => d.method === 'COURTESY' },
      { key: 'earlier', label: 'El vehículo se fue antes', type: 'checkbox', value: false },
      { key: 'salidaEn', label: 'Hora real de salida', type: 'datetime-local', value: localTime(quoteAt), required: true, when: d => d.earlier },
    ];
    show('Confirmar salida · ' + v.plate, free(v) ? [] : fields, async d => {
      const departure = d.earlier ? new Date(d.salidaEn).toISOString() : quoteAt;
      const current = summary(s(), v, departure);
      const data = free(v) ? {} : { expectedPrice: current.price, expectedCollected: current.collected, closeType: d.method === 'COURTESY' ? 'COURTESY' : current.saldo ? 'PAYMENT' : 'NO_CHARGE' };
      if (!free(v)) {
        if (d.method === 'COURTESY') data.motivo = d.motivo;
        else if (current.saldo && d.method === 'MIXED') data.pagos = [{ metodo: 'CASH', importe: d.cash }, { metodo: 'TRANSFER', importe: current.saldo - d.cash }];
        else if (current.saldo) data.metodo = d.method;
        if (current.refund) data.refundMetodo = d.method;
        if (d.earlier) data.salidaEn = departure;
      }
      if (d.earlier) return show('Confirmar la salida anterior', [], () => commit('CLOSE', v.id, data, quoteAt), { description: 'Salida: ' + new Date(departure).toLocaleString('es-AR') + ' · Total: ' + money(current.price) + ' · A cobrar: ' + money(current.saldo) + ' · A devolver: ' + money(current.refund), label: 'Confirmar salida y cobro' });
      await commit('CLOSE', v.id, data, quoteAt);
    }, { description: free(v) ? 'Salida sin cobro.' : 'Total ' + money(totals.price) + ' · Anticipos ' + money(totals.collected) + ' · A cobrar ' + money(totals.saldo) + (totals.refund ? ' · A devolver ' + money(totals.refund) : '') + '. Elegí transferencia sólo si verificaste que recibiste el pago.', label: 'Guardar salida pendiente' });
  }
  function advance(v) {
    show('Anticipo · ' + v.plate, [select('mode','Importe o tarifa', [['AMOUNT','Editar total de anticipos'],['PLANNED','Cobrar duración prevista'],['DURATION','Sólo indicar duración prevista']]), numeric('amount','Total de anticipos cobrados', v.collected), { ...numeric('minutes','Duración prevista en minutos', v.expectedUptoMinutes || 60), when: d => d.mode !== 'AMOUNT' }, text('label','Nombre de la duración (opcional)', v.expectedBracketLabel || ''), select('metodo','Medio de pago o devolución', methods), text('reason','Motivo si reducís el anticipo')], async d => {
      const data = { metodo: d.metodo, adjustmentReason: d.reason };
      if (d.mode === 'PLANNED') data.chargeFullPlannedStay = true;
      else if (d.mode === 'AMOUNT') data.advancePaidAmount = d.amount;
      if (d.mode !== 'AMOUNT') Object.assign(data, { expectedUptoMinutes: d.minutes, expectedBracketLabel: d.label });
      await commit('ADVANCE', v.id, data);
    }, { description: 'Ingresá el total de anticipos que queda cobrado. Se registra sólo la diferencia; una reducción genera una devolución con motivo.' });
  }
  function discount(v, preset) {
    const at = now(), totals = summary(s(), v, at), prior = previousTariff(s(), v, at);
    show('Descuento · ' + v.plate, [numeric('monto','Importe a descontar', preset ?? Math.min(totals.saldo, prior?.amount || 0)), text('motivo','Motivo obligatorio', '', true)], d => commit('DISCOUNT', v.id, { ...d, expectedPrice: totals.price, expectedCollected: totals.collected }, at), { description: 'Saldo actual: ' + money(totals.saldo) + (prior ? '. Tarifa anterior: ' + money(prior.price) + '.' : '.'), shortcuts: [...(prior ? [['Aplicar tarifa anterior', () => discount(v, prior.amount)]] : []), ['Descontar todo el saldo', () => discount(v, totals.saldo)]] });
  }
  function detail(v) {
    const at = now(), totals = summary(s(), v, at);
    const actions = [];
    actions.push(['Registrar salida', () => payment(v)]);
    if (!free(v)) {
      actions.push(['Anticipo / duración prevista', () => advance(v)], ['Descuento', () => discount(v)]);
      if (totals.saldo > 1) actions.push(['Cobrar una parte en efectivo', () => show('Parte en efectivo', [numeric('importe','Importe cobrado', 1)], d => commit('PARTIAL_CASH', v.id, { ...d, expectedPrice: totals.price, expectedCollected: totals.collected }, at), { description: 'El resto podrá cobrarse por transferencia al registrar la salida.' })]);
    }
    actions.push(['Corregir patente o vehículo', () => show('Corregir estadía', [...(v.entryMode === 'BARCODE' ? [] : [text('licensePlate','Patente', v.noPlate ? '' : v.plate, true)]), select('vehicleType','Tipo de vehículo', types(v.vehicleType), v.vehicleType)], d => commit('EDIT', v.id, d))]);
    if (Date.now() - Date.parse(v.entry) <= 900000) actions.push(['Corregir hora de ingreso', () => show('Ingreso cargado tarde', [{ key: 'entrada', label: 'Hora real de ingreso', type: 'datetime-local', value: localTime(v.entry), required: true }], d => commit('EDIT_ENTRY', v.id, { entrada: new Date(d.entrada).toISOString() }), { description: 'Hasta 24 horas hacia atrás. Disponible para ingresos cargados en los últimos 15 minutos.' })]);
    if (s().role === 'ADMIN' && !v.collected && !v.discount) actions.push(['Eliminar ingreso por error', () => show('Eliminar ingreso · ' + v.plate, [], () => commit('DELETE', v.id, {}), { description: 'Confirmá que fue una carga por error. No se elimina una estadía con cobros.', label: 'Confirmar eliminación' })]);
    show('Estadía · ' + v.plate, [], () => payment(v), { description: 'Entrada: ' + new Date(v.entry).toLocaleString('es-AR') + ' · ' + v.vehicleType + (v.casilleroNumber ? ' · Casillero ' + v.casilleroNumber : '') + (v.lastNameCustomer ? ' · ' + v.lastNameCustomer : '') + (v.phoneCustomer ? ' · ' + v.phoneCustomer : '') + (free(v) ? ' · Sin cobro' : ' · Total ' + money(totals.price) + ' · Anticipos ' + money(totals.collected) + ' · Saldo ' + money(totals.saldo) + '\n' + totals.breakdown.map(b => b.label + ': ' + money(b.amount)).join(' · ')), label: 'Continuar a la salida', shortcuts: actions.slice(1) });
  }
  function passEntry() {
    show('Registrar estadía', [text('vehiclePlateCustomer','Patente', '', true), select('vehicleType','Vehículo', types()), text('lastNameCustomer','Apellido (opcional)'), select('ticketTimeType','Duración', [['DIA','Días'],['SEMANA','Semanas'],['MES','Meses'],['SEMANA_Y_DIA','Semanas y días'],['MES_Y_DIA','Meses y días']]), { ...numeric('days','Cantidad de días',1), when:d=>['DIA','SEMANA_Y_DIA','MES_Y_DIA'].includes(d.ticketTimeType) }, { ...numeric('weeks','Cantidad de semanas',1), when:d=>['SEMANA','SEMANA_Y_DIA'].includes(d.ticketTimeType) }, { ...numeric('months','Cantidad de meses',1), when:d=>['MES','MES_Y_DIA'].includes(d.ticketTimeType) }, {key:'paid',label:'Ya recibí el pago',type:'checkbox'}, select('paymentMetodo','Medio recibido',methods)], async d => {
      if (!['DIA','SEMANA_Y_DIA','MES_Y_DIA'].includes(d.ticketTimeType)) delete d.days;
      if (!['SEMANA','SEMANA_Y_DIA'].includes(d.ticketTimeType)) delete d.weeks;
      if (!['MES','MES_Y_DIA'].includes(d.ticketTimeType)) delete d.months;
      const rate = type => s().passPrices.find(p=>p.ticketTimeType===type && p.vehicleType===d.vehicleType)?.ticketTimePrice;
      const price = (d.days || 0)*(rate('DIA') || 0)+(d.weeks || 0)*(rate('SEMANA') || 0)+(d.months || 0)*(rate('MES') || 0);
      show('Confirmar estadía · ' + d.vehiclePlateCustomer, [], () => commit('PASS_ENTRY',crypto.randomUUID(),d), { description: 'Total: '+money(price)+' · '+(d.paid?'Pago recibido':'Queda pendiente de pago'), label:'Confirmar estadía pendiente' });
    });
  }
  function passDetail(p) {
    show('Estadía · '+p.vehiclePlateCustomer, [{key:'paid',label:'Pago recibido',type:'checkbox',value:!!p.paid}, select('paymentMetodo','Medio de pago',[...(p.paymentMetodo==='MERCADOPAGO'?[['KEEP','Conservar pago por Mercado Pago']]:[]),...methods],p.paymentMetodo==='MERCADOPAGO'?'KEEP':p.paymentMetodo || 'CASH'), {key:'retired',label:'El vehículo se retira',type:'checkbox',value:!!p.retired}], d=>{if(d.paymentMetodo==='KEEP')delete d.paymentMetodo;return commit('PASS_UPDATE',p.id,d);}, { description:'Total '+money(p.price)+' · '+p.ticketTimeType+'. Los cambios de cobro se registran como movimientos de ajuste.' });
  }
  function forgottenEntry() {
    show('Vehículo que se va sin ingreso registrado',[text('licensePlate','Patente','',true),select('vehicleType','Vehículo',types()),{key:'entrada',label:'Hora real de ingreso',type:'datetime-local',value:localTime(Date.now()-3600000),required:true}],async d=>{
      const entrada=new Date(d.entrada).toISOString(), id=crypto.randomUUID();
      if(Date.now()-Date.parse(entrada)>86400000 || Date.parse(entrada)>=Date.now()) throw new Error('Indicá un ingreso dentro de las últimas 24 horas.');
      await commit('PLATE_ENTRY',id,{licensePlate:d.licensePlate,vehicleType:d.vehicleType});
      await commit('EDIT_ENTRY',id,{entrada});
      payment(s().vehicles.find(v=>v.id===id));
    },{description:'Se guarda el ingreso con su hora real y después confirmás la salida y el cobro.'});
  }
  function mount() {
    if(mounted) return; mounted=true;
    const mode=el('select'); mode.id='entry-mode'; for(const [value,name] of [['PLATE','Por patente'],['NAME','Sin patente / por apellido'],...(s().cards?.length?[['CARD','Tarjeta / código de barras']]:[])]) {const o=el('option',name);o.value=value;mode.append(o);}
    const label=el('label','Identificación');label.htmlFor=mode.id;$('entry').prepend(label,mode);
    mode.onchange=()=>{$('plate').required=mode.value==='PLATE';$('plate').hidden=mode.value!=='PLATE';};
    $('entry').after(button('Se va sin ingreso registrado',forgottenEntry));
    const panel=el('section',undefined,'offline-extra-panel');panel.id='offline-extra'; $('receipts-section').before(panel);
    const hint=el('p','La cámara para leer patentes, el asistente, los pagos por QR y la verificación bancaria necesitan internet. El resto de las operaciones de este equipo se guardan como pendientes.','operation-hint');panel.append(hint);
    const staysTitle=el('h2','Estadías por día, semana o mes');staysTitle.id='offline-stays-title';
    panel.append(staysTitle,button('Registrar estadía',passEntry));panel.lastChild.id='offline-new-pass';
    panel.append(el('div'));panel.lastChild.id='offline-passes';
    const pending=el('details');pending.append(el('summary','Operaciones pendientes'),button('Guardar respaldo',()=>{const blob=new Blob([JSON.stringify(s(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='respaldo-operaciones-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}),el('div'));pending.lastChild.id='offline-queue';panel.append(pending);
  }
  function render() {
    if(s()?.operationVersion!==3) return;
    mount(); $('exit').hidden=true;
    const q=$('search').value.toUpperCase().replace(/[^A-Z0-9]/g,'');
    const vehicles=s().vehicles.filter(v=>!v.departed && (!q || [v.plate,v.lastNameCustomer,v.casilleroNumber,v.phoneCustomer].some(x=>String(x||'').toUpperCase().replace(/[^A-Z0-9]/g,'').includes(q))));
    $('rows').replaceChildren(...vehicles.map(v=>{const row=el('div',undefined,'row');row.append(el('strong',v.plate),el('p',v.vehicleType+' · '+new Date(v.entry).toLocaleString('es-AR')));const actions=el('div',undefined,'actions');actions.append(button('Ver opciones',()=>{try{detail(v);}catch(e){$('status').textContent=e.message;}}),button('Registrar salida',()=>{try{payment(v);}catch(e){$('status').textContent=e.message;}},false)); if(!free(v)&&s().receiptDelivery?.print) actions.append(button('Comprobante de entrada',()=>showReceipt((s().receipts||[]).find(r=>r.registrationId===v.id&&r.kind==='ENTRY') || {id:v.id,registrationId:v.id,kind:'ENTRY',plate:v.plate,vehicleType:v.vehicleType,entry:v.entry,occurredAt:v.entry,business:s().business,historical:true})));row.append(actions);return row;}));
    if(!vehicles.length) $('rows').textContent='No hay vehículos activos en esta búsqueda.';
    $('offline-new-pass').hidden=free();$('offline-stays-title').hidden=free();
    $('offline-passes').replaceChildren(...(s().passes||[]).filter(p=>!p.retired).map(p=>{const row=el('div',undefined,'row');row.append(el('strong',p.vehiclePlateCustomer),el('p',p.vehicleType+' · '+p.ticketTimeType+' · '+money(p.price)+' · '+(p.paid?'Pagado':'Pendiente de pago')),button('Cobro y retiro',()=>passDetail(p)));return row;}));
    $('offline-queue').replaceChildren(...s().pending.map(op=>{const row=el('div',undefined,'row');row.append(el('strong',operationLabels[op.action||op.kind]||'Operación pendiente'),el('p',new Date(op.occurredAt).toLocaleString('es-AR')+(op.error?' · '+op.error:'')));return row;}));
  }
  return {render,entry};
}
