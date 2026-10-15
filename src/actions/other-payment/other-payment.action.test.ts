import { createOtherPaymentAction } from './create-other-payment.action';
import { updateExpenseAction } from './update-other-payment.action';
import { deleteExpenseAction } from './delete-other-payment.action';
import { createOtherPayment, updateExpense, deleteExpense } from '@/services/expenses.service';

jest.mock('@/services/expenses.service', () => ({ createOtherPayment: jest.fn(), updateExpense: jest.fn(), deleteExpense: jest.fn() }));
const gasto = { description: 'Limpieza', price: 1000, type: 'EGRESOS', paymentMethod: 'CASH' } as const;
const error = { error: { code: 'BAD_REQUEST', message: 'Hay más de una caja abierta: registralo desde el turno de la caja de donde sale o entra el efectivo.' } };

test('crear un gasto muestra el motivo real del backend', async () => {
  jest.mocked(createOtherPayment).mockResolvedValue(error as never);
  expect(await createOtherPaymentAction(gasto)).toEqual({ error: error.error.message });
});

test('editar o eliminar con error no se muestra como éxito', async () => {
  jest.mocked(updateExpense).mockResolvedValue(error as never);
  jest.mocked(deleteExpense).mockResolvedValue(error as never);
  expect(await updateExpenseAction('g1', { price: 500 })).toEqual({ error: error.error.message });
  expect(await deleteExpenseAction('g1')).toEqual({ error: error.error.message });
});

test('cuando sale bien, sigue avisando el éxito', async () => {
  jest.mocked(createOtherPayment).mockResolvedValue({ id: 'g1' } as never);
  expect(await createOtherPaymentAction(gasto)).toEqual({ success: 'Pago creado exitosamente' });
});
