 'use client';

import { useId, useState } from 'react';
import { ArrowDown, ArrowRight, Car, Clock3, Flag, Repeat2, ShieldCheck } from 'lucide-react';
import styles from './ticket-price-bracket-map.module.css';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVehicleTypes } from '@/components/vehicle-type-options';
import { TicketPriceBracket } from '@/types/ticket-price-bracket.type';
import { TicketSchedule } from '@/services/tickets.service';
import { effectiveBrackets, formatMinutesLabel, formatRecurringUnitLabel, resolveRecurringUnitPrice, minutesToAmountUnit } from '@/utils/ticket-price-bracket.utils';
import { PricingPreview } from './pricing-preview';

const money = (value: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
const hour = (value: number) => String(value).padStart(2, '0') + ':00';

export function TicketPriceBracketMap({ brackets, schedule, embedded = false }: { brackets: TicketPriceBracket[]; schedule: TicketSchedule; embedded?: boolean }) {
  const id = useId();
  const { types } = useVehicleTypes();
  const charging = schedule.pricingOptions?.charging;
  const codes = Array.from(new Set(charging?.enabled ? charging.rates.map(rate => rate.vehicleType) : brackets.map(row => row.vehicleType)));
  const [selected, setSelected] = useState('AUTO');
  const vehicle = codes.includes(selected) ? selected : codes[0] ?? 'AUTO';
  const [period, setPeriod] = useState<'DAY' | 'NIGHT'>('DAY');
  const name = (code: string) => types.find(type => type.code === code)?.name ?? ({ AUTO: 'Auto', CAMIONETA: 'Camioneta', MOTO: 'Moto' }[code] ?? code);
  const pool = effectiveBrackets(brackets, vehicle, period);
  const finite = pool.filter(row => row.uptoMinutes !== null).sort((a, b) => a.uptoMinutes! - b.uptoMinutes!);
  const recurring = pool.find(row => row.uptoMinutes === null);
  const recurringPrice = recurring?.recurringUnitMinutes && recurring.recurringPriceMode !== 'FIXED'
    ? resolveRecurringUnitPrice(recurring.recurringUnitMinutes, finite, recurring.id)?.price ?? recurring.price
    : recurring?.price;
  const rate = charging?.rates.find(row => row.vehicleType === vehicle);
  const crossing = schedule.pricingOptions?.crossing;
  const minutePrices = finite.filter(row => row.uptoMinutes! > 0 && row.uptoMinutes! < 60);
  const extraMinutesAfter = (index: number) => {
    const current = finite[index];
    const next = finite[index + 1];
    if (!next || minutesToAmountUnit(current.uptoMinutes!).unit !== 'HOUR') return [];
    return minutePrices.filter(row => current.uptoMinutes! + row.uptoMinutes! < next.uptoMinutes!);
  };

  return <section className={embedded ? 'min-w-0 space-y-6' : 'min-w-0 space-y-6 rounded-2xl border bg-gm-surface-2 p-4 sm:p-6'}>
    <header className="space-y-2">
      <h3 className="text-xl font-bold">Tu mapa de tarifas</h3>
      <p className="text-sm text-muted-foreground">Seguí el recorrido: mirá cuánto tiempo se queda y qué precio corresponde.</p>
      <p className="text-xs text-muted-foreground">Para un vehículo que ya ingresó, consultá su importe desde Cobrar salida: puede conservar una tarifa anterior.</p>
    </header>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="min-w-0 space-y-2"><label htmlFor={id} className="text-sm font-medium">Vehículo</label>
        <Select value={vehicle} onValueChange={setSelected} disabled={!codes.length}><SelectTrigger id={id} className="w-full"><SelectValue>{codes.length ? name(vehicle) : 'Sin precios cargados'}</SelectValue></SelectTrigger><SelectContent>{codes.map(code => <SelectItem key={code} value={code}>{name(code)}</SelectItem>)}</SelectContent></Select>
      </div>
      <fieldset className="min-w-0 space-y-2"><legend className="text-sm font-medium">Horario de la tarifa</legend><div className="grid grid-cols-2 gap-2">{(['DAY', 'NIGHT'] as const).map(value => <button key={value} type="button" aria-pressed={period === value} onClick={() => setPeriod(value)} className={'rounded-lg border px-3 py-2 text-sm ' + (period === value ? 'border-gm-yellow bg-gm-yellow text-gm-ink' : 'bg-background text-foreground')}><span className="block font-semibold">{value === 'DAY' ? 'Día' : 'Noche'}</span><span className="text-xs">{value === 'DAY' ? hour(schedule.dayStartHour) + ' a ' + hour(schedule.dayEndHour) : hour(schedule.dayEndHour) + ' a ' + hour(schedule.dayStartHour)}</span></button>)}</div></fieldset>
    </div>
    <div className={styles.map} data-night={period === 'NIGHT'}>
      <div className={styles.mapHeading}>
        <span className={styles.vehicleIcon}><Car aria-hidden="true" size={22} /></span>
        <div><h4>{name(vehicle)} · {period === 'DAY' ? 'Tarifa de día' : 'Tarifa de noche'}</h4><p>{charging?.enabled ? 'Así se cuenta el tiempo' : 'Cada parada muestra una duración y su precio de referencia'}</p></div>
      </div>
      <div className={styles.start}><span><Flag size={14} aria-hidden="true" /> Entrada</span><p>El tiempo empieza a contar acá</p></div>
      <ol className={styles.route} aria-label="Recorrido de tarifas">
        {charging?.enabled ? rate ? <>
          <li className={styles.stop}><span className={styles.marker}><Clock3 size={18} aria-hidden="true" /></span><article className={styles.card}><span className={styles.eyebrow}>Tiempo de cada período</span><h5>{formatMinutesLabel(charging.unitMinutes).replace('Hasta ', '')}</h5><p>Es la unidad que se usa para calcular el cobro.</p></article><span className={styles.connector} aria-hidden="true"><ArrowRight /><ArrowDown /></span></li>
          <li className={styles.stop}><span className={styles.marker}>$</span><article className={styles.card}><span className={styles.eyebrow}>Precio del período</span><strong className={styles.price}>{money(period === 'DAY' ? rate.dayPrice : rate.nightPrice)}</strong><p>{formatRecurringUnitLabel(charging.unitMinutes)}</p></article><span className={styles.connector} aria-hidden="true"><ArrowRight /><ArrowDown /></span></li>
          <li className={styles.stop}><span className={styles.marker}><Repeat2 size={18} aria-hidden="true" /></span><article className={styles.card}><span className={styles.eyebrow}>Cómo sigue el cobro</span><h5>{charging.mode === 'STARTED' ? 'Cada período que empieza' : charging.mode === 'COMPLETED' ? 'Solo períodos completos' : 'Por los minutos usados'}</h5><p>{charging.mode === 'STARTED' ? 'Al empezar otro período, se agrega su precio. Se tiene en cuenta la tolerancia.' : charging.mode === 'COMPLETED' ? 'Se agrega el precio al completar cada período. Antes del primero, el importe es $0.' : 'Se calcula la parte del precio que corresponde al tiempo exacto.'}</p></article></li>
        </> : <li className={styles.empty}>No hay precio para este vehículo.</li> : <>
          {finite.map((row, index) => <li key={row.id} className={styles.stop}><span className={styles.marker}>{index + 1}</span><article className={styles.card}><span className={styles.eyebrow}>Tiempo de estadía</span><h5>{formatMinutesLabel(row.uptoMinutes)}</h5><strong className={styles.price}>{money(row.price)}</strong><p>Precio de referencia para esta duración</p></article>{extraMinutesAfter(index).length > 0 && <aside className={styles.minuteBridge}>
            <span className={styles.bridgeLabel}>Si pasa de {formatMinutesLabel(row.uptoMinutes).replace('Hasta ', '')}</span>
            <h6>Se suman los minutos de más</h6>
            <p>Se conserva el precio de {formatMinutesLabel(row.uptoMinutes).replace('Hasta ', '')} y se agrega el precio de los minutos que sobran.</p>
            <ul>{extraMinutesAfter(index).map(short => <li key={short.id}><span>{formatMinutesLabel(short.uptoMinutes)} de más</span><strong>+ {money(short.price)}</strong></li>)}</ul>
            <p><strong>Cómo se suma:</strong> {money(row.price)} + el precio de los minutos de más.</p>
            <p>Se respeta la tolerancia de {schedule.graceMinutes} min. El total nunca supera {money(finite[index + 1].price)}, que es el precio de {formatMinutesLabel(finite[index + 1].uptoMinutes).replace('Hasta ', '')}. Si no hay una tarifa de minutos que cubra el sobrante, se usa el precio de la siguiente duración.</p>
          </aside>}{(index < finite.length - 1 || recurring) && <span className={styles.connector} aria-hidden="true"><ArrowRight /><ArrowDown /></span>}</li>)}
          {recurring && <li className={styles.stop}><span className={styles.marker}><Repeat2 size={18} aria-hidden="true" /></span><article className={styles.card + ' ' + styles.additional}><span className={styles.eyebrow}>Si se queda más tiempo</span><h5>{finite.length ? 'Después de la última duración' : 'Cobro por tiempo adicional'}</h5>{recurring.recurringUnitMinutes ? <><strong className={styles.price}>+ {money(recurringPrice ?? 0)}</strong><p>{formatRecurringUnitLabel(recurring.recurringUnitMinutes)}</p><span className={styles.tag}>Se suma al tiempo ya cobrado</span></> : <p>Probá la duración en el simulador para conocer el total.</p>}</article></li>}
          {!pool.length && <li className={styles.empty}>No hay tarifas cargadas para este vehículo y horario.</li>}
        </>}
      </ol>
      {!charging?.enabled && pool.length > 0 && <div className={styles.legend}><ShieldCheck size={17} aria-hidden="true" /><p><strong>No sumes los precios de las paradas.</strong> Cuando se agregan minutos, lo indicamos en el recorrido. Para consultar una estadía concreta, usá la prueba de abajo.</p></div>}
    </div>
    <div className="space-y-2 rounded-xl bg-muted/30 p-4 text-sm text-muted-foreground">
      <p><strong className="text-foreground">Tolerancia: {schedule.graceMinutes} minutos.</strong> {schedule.graceMinutes ? 'Es el margen configurado antes de aumentar el cobro; no equivale a minutos gratis al ingresar. Probá un horario y una duración para ver cómo se aplica.' : 'No hay margen adicional de tolerancia.'}</p>
      <p><strong className="text-foreground">Si pasa de día a noche:</strong> {crossing?.enabled && crossing.mode === 'SPLIT' ? 'se calcula cada tramo con su precio.' : (crossing?.enabled ? crossing.mode : schedule.pricingDayTypeBasis) === 'ENTRY' ? 'se usa el horario de entrada.' : 'se usa el horario de salida.'}</p>
    </div>
    <details className="rounded-xl border"><summary className="cursor-pointer p-4 font-semibold">Probá cuánto cobrarías</summary><div className="border-t p-2 sm:p-4"><PricingPreview /></div></details>
  </section>;
}
