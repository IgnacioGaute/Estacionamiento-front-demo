/** @jest-environment jsdom */
import { render, screen, within } from '@testing-library/react';
import { OrigenesCard } from './origenes-card';

const conteo = (c: Partial<Record<'ESCANER' | 'CORREGIDA' | 'MANUAL' | 'TARJETA' | 'SIN_DATO', number>>) => ({
  ESCANER: 0, CORREGIDA: 0, MANUAL: 0, TARJETA: 0, SIN_DATO: 0, ...c,
});

test('muestra por playa qué parte de las entradas y salidas se hizo con el escáner, sin contar lo de antes', () => {
  render(
    <OrigenesCard
      dias={30}
      nombreEmpresa={new Map([['e1', 'Garage Mitre']])}
      origenes={[
        { playaId: 'p1', playa: 'Playa Mitre', empresaId: 'e1', entradas: conteo({ ESCANER: 6, CORREGIDA: 2, MANUAL: 2, SIN_DATO: 40 }), salidas: conteo({ ESCANER: 1, MANUAL: 3 }) },
        { playaId: 'p2', playa: 'Playa Colón', empresaId: 'e1', entradas: conteo({ MANUAL: 1, TARJETA: 1 }), salidas: conteo({}) },
      ]}
    />,
  );
  // Totales: 8 de 12 entradas medidas con escáner (las 40 sin dato no cuentan); 1 de 4 salidas.
  expect(screen.getByText('67%')).toBeInTheDocument();
  expect(screen.getByText(/8 de 12 · 2 corregidas/)).toBeInTheDocument();
  expect(screen.getByText(/1 de 4 · 0 corregidas/)).toBeInTheDocument();
  const mitre = screen.getByText('Playa Mitre').closest('tr')!;
  expect(within(mitre).getByText('Garage Mitre')).toBeInTheDocument();
  expect(mitre).toHaveTextContent('80% con escáner · 2 corr. · 2 a mano · 40 sin dato');
  // Sin nada medido, no se inventa un porcentaje.
  expect(screen.getByText('Playa Colón').closest('tr')).toHaveTextContent('— con escáner · 0 corr. · 0 a mano');
});
