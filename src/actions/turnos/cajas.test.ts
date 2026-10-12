import { saveCajaAction } from './cajas.action';
import { saveCaja } from '@/services/turnos.service';
jest.mock('@/services/turnos.service', () => ({ saveCaja: jest.fn(), getCashConfiguration: jest.fn(), addCashMovement: jest.fn() }));
const id = 'aa8832a5-4c5d-4f48-a3e3-b4fae9ff6662';
beforeEach(() => jest.clearAllMocks());
test('conserva el fondo configurado al enviarlo al servidor', async () => {
  jest.mocked(saveCaja).mockResolvedValue({ id, nombre: 'Caja principal', principal: true, activa: true, fondoObjetivo: 20000 });
  const result = await saveCajaAction({ nombre: 'Caja principal', fondoObjetivo: 20000 }, id);
  expect(result.caja?.fondoObjetivo).toBe(20000);
  expect(saveCaja).toHaveBeenCalledWith({ nombre: 'Caja principal', fondoObjetivo: 20000 }, id);
});
test('rechaza un fondo negativo sin enviar la configuración', async () => {
  expect((await saveCajaAction({ nombre: 'Caja principal', fondoObjetivo: -1 }, id)).error).toBeTruthy();
  expect(saveCaja).not.toHaveBeenCalled();
});
