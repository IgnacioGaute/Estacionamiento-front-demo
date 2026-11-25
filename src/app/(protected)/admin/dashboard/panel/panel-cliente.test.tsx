/** @jest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react';
import dayjs from 'dayjs';
import type { PanelResumen } from '@/types/panel.type';
import { PanelCliente } from './panel-cliente';
import { agrupar, atajos, nombreRango, vistasPosibles } from './utilidades';

const push = jest.fn();
let busqueda = '';
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/admin/dashboard',
  useSearchParams: () => new URLSearchParams(busqueda),
}));

const HOY = dayjs().tz?.('America/Argentina/Buenos_Aires').format('YYYY-MM-DD') ?? dayjs().format('YYYY-MM-DD');
const dias = (desde: string, n: number) => Array.from({ length: n }, (_, i) => dayjs(desde).add(i, 'day').format('YYYY-MM-DD'));

function panel(desde: string, n: number, extra: Partial<PanelResumen> = {}): PanelResumen {
  const fechas = dias(desde, n);
  const porDia = fechas.map((fecha, i) => ({ fecha, total: 1000 * (i + 1), CASH: 600 * (i + 1), TRANSFER: 300 * (i + 1), MERCADOPAGO: 100 * (i + 1) }));
  const total = porDia.reduce((a, d) => a + d.total, 0);
  return {
    rango: { desde, hasta: fechas[n - 1], dias: n },
    comparacion: { modo: 'anterior', desde: dayjs(desde).subtract(n, 'day').format('YYYY-MM-DD'), hasta: dayjs(desde).subtract(1, 'day').format('YYYY-MM-DD') },
    cobrado: {
      total, porMedio: { CASH: total * 0.6, TRANSFER: total * 0.3, MERCADOPAGO: total * 0.1 }, porDia,
      porHora: n === 1 ? Array.from({ length: 24 }, (_, h) => (h < 12 ? 100 : 0)) : null,
      anterior: { total: total / 2, porDia: porDia.map((d) => ({ fecha: d.fecha, total: d.total / 2 })), porHora: n === 1 ? Array.from({ length: 24 }, () => 50) : null },
    },
    estadias: {
      entradas: 40, salidas: 30, ticketPromedio: 2400, duracionPromedio: 95,
      porDia: fechas.map((fecha, i) => ({ fecha, entradas: 5 + i, salidas: 4 + i, ticketPromedio: 2300 + i * 10, duracionPromedio: 90 + i })),
      anterior: { entradas: 50, salidas: 40, ticketPromedio: 2000, duracionPromedio: 100 },
    },
    hoy: { fecha: HOY, horaActual: 3, adentroPorHora: [7, 6, 5, 9], adentroAhora: 9, entradas: 12, salidas: 3 },
    calendario: dias(dayjs(HOY).subtract(10, 'day').format('YYYY-MM-DD'), 11).map((fecha, i) => ({ fecha, total: i * 1000 })),
    avisos: { correccionesPendientes: 2, faltantes: { cantidad: 1, total: 1200, ultimo: { fecha: new Date().toISOString(), diferencia: -1200, caja: 'Caja principal', usuario: 'Ana' } } },
    ...extra,
  };
}

beforeEach(() => { push.mockClear(); busqueda = ''; });

test('muestra lo cobrado con su variación, los indicadores y lo que hay que mirar', () => {
  const p = panel(dayjs(HOY).subtract(6, 'day').format('YYYY-MM-DD'), 7);
  render(<PanelCliente panel={p} comparar="anterior" deudores={{ cantidad: 5, total: 184000, masDe60: 1, nuevos: 0, deudores: [] }} />);
  expect(screen.getByText('$28.000')).toBeInTheDocument();
  expect(screen.getByText(/Subió 100,0%/)).toBeInTheDocument();
  const mirar = screen.getByRole('region', { name: 'Para mirar' });
  expect(within(mirar).getByText('3 cosas para mirar')).toBeInTheDocument();
  expect(within(mirar).getByRole('link', { name: /Faltaron \$1\.200 en un cierre/ })).toHaveAttribute('href', '/admin/caja');
  expect(within(mirar).getByRole('link', { name: /2 correcciones esperan/ })).toBeInTheDocument();
  expect(within(mirar).getByRole('link', { name: /5 inquilinos tienen la cuota vencida/ })).toHaveAttribute('href', '/notes?tab=inquilinos');
  // Los indicadores comparan con el período anterior: menos autos (rojo), mejor ticket (verde).
  const indicadores = screen.getByRole('region', { name: 'Indicadores del período' });
  expect(within(indicadores).getByText('Autos que entraron').closest('div')!.parentElement!.parentElement).toHaveTextContent('▼20,0%');
  expect(within(indicadores).getByText('$2.400')).toBeInTheDocument();
  expect(within(indicadores).getByText('1 h 35 min')).toBeInTheDocument();
  // Autos adentro (hoy) y cómo pagaron.
  expect(screen.getByText('adentro ahora')).toBeInTheDocument();
  expect(screen.getByText('Efectivo')).toBeInTheDocument();
});

test('los filtros cambian la dirección: atajos, comparación y agrupación', async () => {
  const p = panel(dayjs(HOY).startOf('month').format('YYYY-MM-DD'), Math.max(1, dayjs(HOY).date()));
  busqueda = `desde=${p.rango.desde}&hasta=${p.rango.hasta}`;
  render(<PanelCliente panel={p} comparar="anterior" deudores={null} />);
  const periodo = screen.getByRole('group', { name: 'Período' });
  fireEvent.click(within(periodo).getByRole('button', { name: '7 días' }));
  const siete = atajos(HOY).find((a) => a.clave === '7d')!;
  expect(push).toHaveBeenLastCalledWith(`/admin/dashboard?desde=${siete.desde}&hasta=${siete.hasta}`, { scroll: false });

  fireEvent.click(screen.getByRole('button', { name: /Comparar con: Período anterior/ }));
  fireEvent.click(await screen.findByRole('radio', { name: /No comparar/ }));
  expect(push).toHaveBeenLastCalledWith(expect.stringContaining('comparar=no'), { scroll: false });
});

test('con un período largo se puede ver por semana o por mes', () => {
  const p = panel(dayjs(HOY).subtract(89, 'day').format('YYYY-MM-DD'), 90);
  render(<PanelCliente panel={p} comparar="anterior" deudores={null} />);
  const verPor = screen.getByRole('group', { name: 'Ver por' });
  expect(within(verPor).getByRole('button', { name: 'Semana' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(within(verPor).getByRole('button', { name: 'Mes' }));
  expect(push).toHaveBeenLastCalledWith(expect.stringContaining('ver=mes'), { scroll: false });
});

test('al pasar el mouse por la curva se ve el día con lo cobrado y lo del período comparado', () => {
  const p = panel(dayjs(HOY).subtract(6, 'day').format('YYYY-MM-DD'), 7);
  render(<PanelCliente panel={p} comparar="anterior" deudores={null} />);
  fireEvent.mouseEnter(screen.getAllByTestId('zona-cobrado')[2]);
  const tarjeta = screen.getAllByRole('status').find((el) => el.textContent?.includes('Cobrado'))!;
  expect(tarjeta).toHaveTextContent('$3.000');
  expect(tarjeta).toHaveTextContent('Antes$1.500');
});

test('tocar un día del calendario lo elige como período', () => {
  const p = panel(dayjs(HOY).subtract(6, 'day').format('YYYY-MM-DD'), 7);
  render(<PanelCliente panel={p} comparar="anterior" deudores={null} />);
  const ayer = dayjs(HOY).subtract(1, 'day').format('YYYY-MM-DD');
  fireEvent.click(screen.getAllByRole('button').find((b) => b.getAttribute('aria-label')?.startsWith(`${['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][dayjs(ayer).day()]} ${dayjs(ayer).date()} de`))!);
  expect(push).toHaveBeenLastCalledWith(`/admin/dashboard?desde=${ayer}&hasta=${ayer}`, { scroll: false });
});

test('agrupar suma lo cobrado y lo comparado por semana y por mes; un día va por hora', () => {
  const p = panel('2026-10-01', 45);
  const meses = agrupar(p, 'mes');
  expect(meses.map((b) => b.clave)).toEqual(['2026-10', '2026-11']);
  expect(meses[0].total + meses[1].total).toBe(p.cobrado.total);
  expect(meses[0].anterior! + meses[1].anterior!).toBe(p.cobrado.anterior!.total);
  const semanas = agrupar(p, 'semana');
  expect(semanas[0].clave).toBe('2026-09-28');
  expect(semanas.reduce((a, b) => a + b.total, 0)).toBe(p.cobrado.total);
  const unDia = panel('2026-11-20', 1);
  expect(agrupar(unDia, 'hora')).toHaveLength(24);
  expect(vistasPosibles(1)).toEqual(['hora']);
  expect(vistasPosibles(90)).toEqual(['dia', 'semana', 'mes']);
  expect(nombreRango('2026-11-01', '2026-11-24', '2026-11-24')).toBe('1 – 24 nov 2026');
  expect(nombreRango('2026-10-28', '2026-11-03', '2026-11-24')).toBe('28 oct – 3 nov 2026');
});
