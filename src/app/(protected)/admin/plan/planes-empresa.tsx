'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  GrillaPlanes,
  Selector,
  TarjetaPlan,
  botonPlan,
  porPeriodo,
  precioEnPeriodo,
} from '@/components/plataforma/planes-landing';
import { agruparPlanes, pesos } from '@/components/plataforma/cuenta';
import type { MiPlan, PeriodoPago } from '@/types/suscripcion.type';

// Su plan con las tarjetas de la landing, solo en la modalidad que tiene. El selector de período
// muestra cuánto pagaría (y ahorraría) pagando por más tiempo; el cambio lo hace la plataforma
// (toca su factura y su débito), así que el botón lleva a escribirnos, como en la landing.
export function PlanesDeLaEmpresa({ plan }: { plan: MiPlan }) {
  const { cuenta } = plan;
  const grupos = agruparPlanes(plan.catalogo);
  const periodos: PeriodoPago[] = plan.periodos.length ? plan.periodos : [cuenta.periodo];
  const [codigo, setCodigo] = useState(cuenta.periodo.codigo);
  // El suyo con el descuento que tiene congelado; los otros, con el de hoy.
  const mismo = codigo === cuenta.periodo.codigo;
  const elegido = mismo ? cuenta.periodo : (periodos.find((p) => p.codigo === codigo) ?? cuenta.periodo);
  const variasPlayas = plan.playas.length > 1;
  const whatsapp = (texto: string) =>
    plan.contacto ? `https://wa.me/${plan.contacto.replace(/\D/g, '')}?text=${encodeURIComponent(texto)}` : null;
  const enElegido = precioEnPeriodo(cuenta.mensual, elegido);

  return (
    <div className="flex flex-col gap-7">
      {periodos.length > 1 && (
        <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
          <Selector
            etiqueta="Período de pago"
            opciones={periodos.map((p) => ({ valor: p.codigo, etiqueta: p.nombre, descuento: p.descuento }))}
            valor={codigo}
            onChange={setCodigo}
          />
          <p className="m-0 mb-[11px] text-sm text-[#8F8676]">
            Hoy pagás <strong className="font-semibold text-[#F6F0E6]">{cuenta.periodo.nombre.toLowerCase()}</strong>
          </p>
        </div>
      )}

      {plan.playas.map((p) => {
        const cocheras = !!p.plan?.incluyeCocheras;
        return (
          <div key={p.playaId} className="flex flex-col gap-3">
            {variasPlayas && <div className="text-[14.5px] font-semibold text-[#C9BFB1]">{p.nombre}</div>}
            <GrillaPlanes>
              {grupos.map((g) => {
                const opcion = cocheras ? g.alquileres : g.base;
                if (!opcion) return null;
                const suyo = opcion.id === p.plan?.planId;
                // Sin plan, la mediana va destacada como en la landing.
                const destacada = suyo || (!p.plan && g.tamano === 'MEDIANA');
                const consulta = whatsapp(
                  `Hola, quiero consultar por el plan ${g.nombre}${cocheras ? ' con cocheras mensuales' : ''}${p.plan ? ` para ${p.nombre}` : ''}.`,
                );
                const pasar = whatsapp(`Hola, quiero pasar a pago ${elegido.nombre.toLowerCase()}.`);
                return (
                  <TarjetaPlan
                    key={opcion.id}
                    nombre={g.nombre}
                    tamano={g.rango}
                    // El suyo con lo que paga esa playa (puede tener descuento de playa adicional).
                    mensual={suyo ? p.plan!.precio : opcion.precioMensual}
                    periodo={elegido}
                    cocheras={cocheras}
                    distintivo={suyo ? 'Tu plan' : destacada ? 'Más elegido' : undefined}
                    destacada={destacada}
                  >
                    {suyo ? (
                      mismo ? (
                        <Link href="/admin/plan/pagar" className={botonPlan(true)}>
                          Ver formas de pago
                        </Link>
                      ) : pasar ? (
                        <a href={pasar} target="_blank" rel="noopener noreferrer" className={botonPlan(true)}>
                          Pasar a pago {elegido.nombre.toLowerCase()}
                        </a>
                      ) : null
                    ) : consulta ? (
                      <a href={consulta} target="_blank" rel="noopener noreferrer" className={botonPlan(destacada)}>
                        Consultar este plan
                      </a>
                    ) : null}
                  </TarjetaPlan>
                );
              })}
            </GrillaPlanes>
          </div>
        );
      })}

      <p className="m-0 text-[13px] leading-relaxed text-[#BDB4A6]">
        {mismo
          ? `Los precios muestran el equivalente mensual.${
              cuenta.periodo.meses > 1 && cuenta.importePeriodo
                ? ` Pagás ${cuenta.periodo.nombre.toLowerCase()}: ${pesos(cuenta.importePeriodo)} ${porPeriodo(cuenta.periodo.meses)}.`
                : ''
            }`
          : `Con pago ${elegido.nombre.toLowerCase()} pagarías ${pesos(enElegido.total)} ${porPeriodo(elegido.meses)}${
              enElegido.ahorro > 0 ? ` y ahorrarías ${pesos(enElegido.ahorro)}` : ''
            }. Para cambiarlo, escribinos y lo dejamos listo.`}
      </p>
    </div>
  );
}
