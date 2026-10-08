'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { guardarComisionesCajaAction } from '@/actions/box-lists/comisiones.action';
import type { ClaveComision, ComisionesCaja } from '@/types/box-list.type';

const grupos: { titulo: string; detalle: string; campos: { key: ClaveComision; label: string; ayuda: string }[] }[] = [
  { titulo: 'Cobros con QR', detalle: 'Referencia: acreditación inmediata.', campos: [
    { key: 'qrSaldo', label: 'QR · saldo o transferencia', ayuda: 'Dinero en cuenta, banco u otra billetera.' },
    { key: 'qrDebito', label: 'QR · tarjeta de débito', ayuda: 'Cuando Mercado Pago informa débito.' },
    { key: 'qrCredito', label: 'QR · tarjeta de crédito', ayuda: 'Referencia en un pago, sin cuotas adicionales.' },
  ] },
  { titulo: 'Transferencias al alias de Mercado Pago', detalle: 'Sólo las verificadas en la cuenta vinculada.', campos: [
    { key: 'aliasSaldo', label: 'Alias · transferencia', ayuda: 'Transferencia directa de cuenta a cuenta.' },
    { key: 'aliasDebito', label: 'Alias · débito', ayuda: '0% inicial. Ajustá si tu liquidación aplica un cargo.' },
    { key: 'aliasCredito', label: 'Alias · crédito', ayuda: 'Sin tasa oficial verificada para el receptor. Podés definirla.' },
  ] },
];
const campos = grupos.flatMap(g => g.campos);
const aTexto = (tasas: ComisionesCaja) => Object.fromEntries(campos.map(c => [c.key, tasas[c.key] === null ? '' : String(tasas[c.key])])) as Record<ClaveComision, string>;
const valido = (v: string) => v === '' || (/^\d{1,3}([.,]\d{1,4})?$/.test(v) && Number(v.replace(',', '.')) <= 100);

export function ComisionesCajaForm({ inicial, referencia }: { inicial: ComisionesCaja; referencia: ComisionesCaja }) {
  const [valores, setValores] = useState(() => aTexto(inicial));
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const esValido = Object.values(valores).every(valido);
  return <form className="space-y-7" onSubmit={async event => {
    event.preventDefault();
    if (!esValido || guardando) return;
    setGuardando(true); setError(''); setMensaje('');
    const tasas = Object.fromEntries(campos.map(c => [c.key, valores[c.key] === '' ? null : Number(valores[c.key].replace(',', '.'))])) as ComisionesCaja;
    try {
      const result = await guardarComisionesCajaAction(tasas);
      if (result.error) setError(result.error);
      else setMensaje('Guardado para todas las playas de esta empresa.');
    } catch { setError('No se pudo guardar. Intentá nuevamente.'); }
    finally { setGuardando(false); }
  }}>
    <p className="text-xs text-muted-foreground">Porcentaje final, con IVA incluido si corresponde. 0% = sin descuento. Vacío = a definir.</p>
    {grupos.map(grupo => <fieldset key={grupo.titulo} disabled={guardando} className="min-w-0 rounded-xl border border-border">
      <legend className="ml-4 px-2 text-sm font-medium">{grupo.titulo}</legend>
      <p className="px-5 pb-2 pt-1 text-xs text-muted-foreground">{grupo.detalle}</p>
      <div className="divide-y divide-border/60 px-5">
        {grupo.campos.map(campo => <div key={campo.key} className="grid grid-cols-[minmax(0,1fr)_100px] items-center gap-4 py-4 sm:grid-cols-[minmax(0,1fr)_120px]">
          <div><label htmlFor={campo.key} className="text-sm font-medium">{campo.label}</label><p id={campo.key + '-ayuda'} className="mt-1 text-xs leading-relaxed text-muted-foreground">{campo.ayuda}</p></div>
          <div className="relative"><Input id={campo.key} aria-describedby={campo.key + '-ayuda'} aria-invalid={!valido(valores[campo.key])} inputMode="decimal" placeholder="A definir" value={valores[campo.key]} onChange={e => { setValores(v => ({ ...v, [campo.key]: e.target.value })); setMensaje(''); }} className="h-9 bg-transparent pr-7 text-right text-sm tabular-nums shadow-none" /><span className="pointer-events-none absolute right-3 top-2 text-xs text-muted-foreground">%</span></div>
        </div>)}
      </div>
    </fieldset>)}
    <details className="text-xs text-muted-foreground"><summary className="cursor-pointer py-1 hover:text-foreground">Referencias y forma de cálculo</summary><div className="mt-3 space-y-2 leading-relaxed">
      <p>QR al instante: saldo 0,80%, débito 1,35% y crédito 5,99%, más IVA del 21%. Los valores iniciales ya incluyen ese IVA. Pueden variar por provincia, plazo y condiciones de tu cuenta.</p>
      <a href="https://www.mercadopago.com.ar/herramientas-para-vender/cobrar-con-qr" target="_blank" rel="noreferrer" className="inline-block underline underline-offset-4">Ver tasas publicadas por Mercado Pago</a>
      <p>Referencia consultada el 08/10/2026. Alias con crédito queda a definir: no se aplica una tarifa de otro país ni un cargo del pagador como si fuera del comercio.</p>
      <p>Se calcula por cada ingreso confirmado. Si falta el medio de pago o el porcentaje, caja lo indica como pendiente. Las transferencias manuales quedan fuera de estas comisiones.</p>
      <p>Los porcentajes actuales recalculan también las fechas anteriores. Los tickets y el efectivo del cajón conservan sus importes.</p>
    </div></details>
    {!esValido && <p role="alert" className="text-sm text-destructive">Usá un porcentaje de 0 a 100, con hasta cuatro decimales.</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {mensaje && <p role="status" className="text-sm text-emerald-500">{mensaje}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
      <Button type="button" variant="ghost" size="sm" disabled={guardando} onClick={() => { setValores(aTexto(referencia)); setMensaje('Referencias cargadas. Guardá para aplicarlas.'); }}>Usar valores de referencia</Button>
      <Button type="submit" variant="outline" size="sm" disabled={!esValido || guardando}>{guardando ? 'Guardando…' : 'Guardar cambios'}</Button>
    </div>
  </form>;
}
