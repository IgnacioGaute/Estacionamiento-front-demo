/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { PaymentMethodChoices } from './payment-method-choices';

const nombres = () => screen.getAllByRole('button').map((b) => b.textContent);

test('con el alias activo, «Transferencia» sin verificar no se ofrece', () => {
  render(<PaymentMethodChoices hibrido value={null} onChange={() => {}} aliasDisponible transferenciaManual={false} />);
  expect(nombres().some((n) => n?.startsWith('Transferencia'))).toBe(false);
  expect(nombres().some((n) => n?.startsWith('Al alias'))).toBe(true);
});

test('sin alias (o para la administración) sigue estando', () => {
  render(<PaymentMethodChoices value={null} onChange={() => {}} aliasDisponible={false} />);
  expect(nombres().some((n) => n?.startsWith('Transferencia'))).toBe(true);
});
