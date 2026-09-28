'use client';

// Cómo está la cuenta de un inquilino cuando se empieza a llevar en el sistema. Antes era un
// tilde de «tiene deuda» con los últimos 12 meses y un número de crédito suelto; ahora se elige
// entre tres situaciones y la deuda se carga como total a una fecha o mes por mes, sin límite.

import { useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { plata } from '@/components/plataforma/formato';
import { Segmentos } from '@/components/plataforma/mono';
import { registrarSaldoInicialAction } from '@/actions/cuentas/cuentas.action';
import { SaldoInicial } from '@/types/cuenta.type';
import { CampoImporte } from './campo-importe';
import { hoyAR, leerImporte, mesActual, sumarMeses } from './util';

export const SALDO_AL_DIA: SaldoInicial = { tipo: 'AL_DIA' };

export function totalSaldoInicial(v: SaldoInicial) {
  if (v.tipo === 'AL_DIA') return 0;
  if (v.tipo === 'DEUDA' && v.modo === 'POR_MES') return (v.meses ?? []).reduce((s, m) => s + m.importe, 0);
  return v.importe ?? 0;
}

// Sin errores = listo para mandar. Se valida acá para no esperar al servidor en lo obvio.
export function erroresSaldoInicial(v: SaldoInicial) {
  if (v.tipo === 'AL_DIA') return null;
  if (v.tipo === 'A_FAVOR') return v.importe ? null : 'Ingresá el saldo a favor.';
  if (v.modo === 'POR_MES') {
    const meses = v.meses ?? [];
    if (!meses.length) return 'Agregá al menos un mes adeudado.';
    if (meses.some((m) => !m.importe)) return 'Cada mes necesita su importe.';
    if (new Set(meses.map((m) => m.mes)).size !== meses.length) return 'Hay meses repetidos.';
    return null;
  }
  if (!v.importe) return 'Ingresá el importe adeudado.';
  if (!v.fecha) return 'Elegí la fecha de corte.';
  return null;
}

export function EditorSaldoInicial({
  valor,
  onChange,
  abono,
  conAlDia = true,
}: {
  valor: SaldoInicial;
  onChange: (v: SaldoInicial) => void;
  // Abono mensual del inquilino: se propone como importe de cada mes adeudado.
  abono: number;
  // «Está al día» es la opción por defecto del alta. Para un inquilino que ya existe no registra
  // nada (una cuenta vacía ya está al día), así que ahí no se ofrece.
  conAlDia?: boolean;
}) {
  const ultimoMes = sumarMeses(mesActual(), -1);
  const meses = valor.meses ?? [];
  // Lo tecleado en cada importe. El número recién se guarda cuando es válido: con centavos o
  // letras queda vacío (y el campo lo avisa), nunca un importe distinto del escrito.
  const [textos, setTextos] = useState<Record<string, string>>({});
  const textoDe = (clave: string, numero?: number) => textos[clave] ?? (numero ? String(numero) : '');
  const escribir = (clave: string, t: string) => {
    setTextos((x) => ({ ...x, [clave]: t }));
    const { valor: n, error } = leerImporte(t);
    return error ? 0 : n;
  };

  const cambiarTipo = (tipo: SaldoInicial['tipo']) => {
    if (tipo === 'AL_DIA') onChange({ tipo });
    else if (tipo === 'A_FAVOR') onChange({ tipo, importe: valor.tipo === 'A_FAVOR' ? valor.importe : undefined, nota: valor.nota });
    else
      onChange({
        tipo,
        modo: valor.modo ?? 'POR_MES',
        fecha: valor.fecha ?? hoyAR(),
        importe: valor.tipo === 'DEUDA' ? valor.importe : undefined,
        meses: meses.length ? meses : [{ mes: ultimoMes, importe: abono }],
        nota: valor.nota,
      });
  };

  // Agrega el mes anterior al más viejo cargado: la deuda se arma yendo hacia atrás.
  const agregarMes = () => {
    const masViejo = meses.map((m) => m.mes).sort()[0] ?? mesActual();
    onChange({ ...valor, meses: [...meses, { mes: sumarMeses(masViejo, -1), importe: abono }] });
  };

  return (
    <div className="space-y-4">
      <Segmentos
        etiqueta="Estado de la cuenta"
        className="w-fit"
        opciones={[
          ...(conAlDia ? [{ id: 'AL_DIA' as const, label: 'Está al día' }] : []),
          { id: 'DEUDA' as const, label: 'Debe' },
          { id: 'A_FAVOR' as const, label: 'Tiene saldo a favor' },
        ]}
        valor={valor.tipo}
        onChange={cambiarTipo}
      />

      {valor.tipo === 'AL_DIA' && (
        <p className="text-sm text-muted-foreground">
          Arranca sin saldo pendiente ni saldo a favor. Desde ahora se le carga su abono cada mes.
        </p>
      )}

      {valor.tipo === 'A_FAVOR' && (
        <label className="block max-w-xs">
          <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Saldo a favor</span>
          <CampoImporte
            grande
            ariaLabel="Saldo a favor"
            texto={textoDe('importe', valor.importe)}
            onTexto={(t) => onChange({ ...valor, importe: escribir('importe', t) || undefined })}
          />
          <span className="mt-1.5 block text-xs text-muted-foreground">Se descuenta solo de los próximos cargos.</span>
        </label>
      )}

      {valor.tipo === 'DEUDA' && (
        <>
          <Segmentos
            etiqueta="Cómo cargar la deuda"
            className="w-fit"
            redondo
            claro
            opciones={[
              { id: 'POR_MES', label: 'Mes por mes' },
              { id: 'TOTAL', label: 'Un total a una fecha' },
            ]}
            valor={valor.modo ?? 'POR_MES'}
            onChange={(modo) => onChange({ ...valor, modo })}
          />

          {(valor.modo ?? 'POR_MES') === 'POR_MES' ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Cada mes queda como un cargo pendiente propio, ya vencido: se ve qué mes debe y se cobra por separado.
              </p>
              {[...meses]
                .map((m, i) => ({ ...m, i }))
                .sort((a, b) => b.mes.localeCompare(a.mes))
                .map((m) => (
                  <div key={m.i} className="flex items-center gap-2">
                    <input
                      type="month"
                      aria-label="Mes adeudado"
                      max={ultimoMes}
                      value={m.mes}
                      onChange={(e) =>
                        onChange({ ...valor, meses: meses.map((x, j) => (j === m.i ? { ...x, mes: e.target.value } : x)) })
                      }
                      className="h-11 w-48 rounded-xl border border-border bg-background px-3 text-sm [color-scheme:dark]"
                    />
                    <CampoImporte
                      className="flex-1"
                      ariaLabel="Importe adeudado del mes"
                      texto={textoDe(`mes-${m.i}`, m.importe)}
                      onTexto={(t) =>
                        onChange({
                          ...valor,
                          meses: meses.map((x, j) => (j === m.i ? { ...x, importe: escribir(`mes-${m.i}`, t) } : x)),
                        })
                      }
                    />
                    <button
                      type="button"
                      aria-label="Quitar mes"
                      onClick={() => {
                        // Los textos van por posición: al quitar un mes se vuelven a tomar de los importes.
                        setTextos((x) => Object.fromEntries(Object.entries(x).filter(([k]) => !k.startsWith('mes-'))));
                        onChange({ ...valor, meses: meses.filter((_, j) => j !== m.i) });
                      }}
                      className="flex size-11 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-gm-surface-2 hover:text-foreground"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              <button
                type="button"
                onClick={agregarMes}
                className="flex items-center gap-1.5 text-sm font-semibold text-gm-yellow hover:text-[#FFD84D]"
              >
                <Plus className="size-4" /> Agregar el mes anterior{abono ? ` (${plata(abono)})` : ''}
              </button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Saldo pendiente total</span>
                <CampoImporte
                  grande
                  ariaLabel="Deuda total"
                  texto={textoDe('importe', valor.importe)}
                  onTexto={(t) => onChange({ ...valor, importe: escribir('importe', t) || undefined })}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Al día</span>
                <input
                  type="date"
                  max={hoyAR()}
                  value={valor.fecha ?? ''}
                  onChange={(e) => onChange({ ...valor, fecha: e.target.value })}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm [color-scheme:dark]"
                />
              </label>
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Queda como un solo cargo «Saldo inicial», vencido desde esa fecha. Sirve cuando se sabe cuánto debe
                pero no de qué meses.
              </p>
            </div>
          )}
        </>
      )}

      {valor.tipo !== 'AL_DIA' && (
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Nota (opcional)</span>
          <input
            value={valor.nota ?? ''}
            onChange={(e) => onChange({ ...valor, nota: e.target.value })}
            maxLength={255}
            placeholder="Ej.: según la planilla de papel de septiembre"
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-gm-yellow"
          />
        </label>
      )}

      {valor.tipo !== 'AL_DIA' && totalSaldoInicial(valor) > 0 && (
        <div className="flex justify-between rounded-xl border border-border bg-background px-4 py-2.5 text-sm">
          <span className="text-muted-foreground">{valor.tipo === 'A_FAVOR' ? 'Arranca con saldo a favor' : 'Arranca con saldo pendiente'}</span>
          <strong className={valor.tipo === 'A_FAVOR' ? 'text-emerald-400' : 'text-[#FF7A4D]'}>{plata(totalSaldoInicial(valor))}</strong>
        </div>
      )}
    </div>
  );
}

// Para un inquilino que ya existe: cargarle el saldo con el que se empieza a llevar la cuenta.
export function SaldoInicialDialog({
  customerId,
  nombre,
  abono,
  open,
  onOpenChange,
  onGuardado,
}: {
  customerId: string;
  nombre: string;
  abono: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onGuardado?: () => void;
}) {
  const [valor, setValor] = useState<SaldoInicial>({ tipo: 'DEUDA', modo: 'POR_MES', meses: [{ mes: sumarMeses(mesActual(), -1), importe: abono }] });
  const [enviando, setEnviando] = useState(false);
  const error = erroresSaldoInicial(valor);

  async function guardar() {
    if (error || valor.tipo === 'AL_DIA') return;
    setEnviando(true);
    const r = await registrarSaldoInicialAction(customerId, {
      ...valor,
      nota: valor.nota?.trim() || undefined,
      ...(valor.modo === 'POR_MES' ? { importe: undefined, fecha: undefined } : { meses: undefined }),
    });
    setEnviando(false);
    if (!r.data) {
      toast.error(r.error ?? 'No se pudo guardar el saldo inicial.');
      return;
    }
    toast.success('Saldo inicial cargado.');
    onOpenChange(false);
    onGuardado?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Saldo inicial</DialogTitle>
          <DialogDescription>
            Lo que {nombre} debía o tenía a favor antes de empezar a llevar su cuenta acá. Si arrancó al día, no hace
            falta cargar nada. Se carga una sola vez.
          </DialogDescription>
        </DialogHeader>
        <EditorSaldoInicial valor={valor} onChange={setValor} abono={abono} conAlDia={false} />
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={() => onOpenChange(false)} className="h-11 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-gm-surface-2">
            Cancelar
          </button>
          <button
            type="button"
            disabled={!!error || valor.tipo === 'AL_DIA' || enviando}
            onClick={() => void guardar()}
            title={error ?? undefined}
            className="flex h-11 items-center gap-2 rounded-xl bg-gm-yellow px-5 text-sm font-bold text-gm-ink hover:bg-[#FFD23A] disabled:opacity-50"
          >
            {enviando && <Loader2 className="size-4 animate-spin" />}
            Guardar saldo inicial
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
