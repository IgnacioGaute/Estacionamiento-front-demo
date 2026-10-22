/** @jest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { useForegroundPoll } from './use-foreground-poll';
import { useResincronizar } from './use-resincronizar';

let hidden = false, online = true;
beforeEach(() => {
  jest.useFakeTimers(); hidden = false; online = true;
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => online });
});
afterEach(() => jest.useRealTimers());

test('detiene los timers al bloquear y actualiza una vez al volver', () => {
  const update = jest.fn();
  const { unmount } = renderHook(() => useForegroundPoll(update, 60000));
  expect(update).toHaveBeenCalledTimes(1);
  act(() => { jest.advanceTimersByTime(60000); });
  expect(update).toHaveBeenCalledTimes(2);
  act(() => { hidden = true; document.dispatchEvent(new Event('visibilitychange')); });
  expect(jest.getTimerCount()).toBe(0);
  act(() => { jest.advanceTimersByTime(3600000); });
  expect(update).toHaveBeenCalledTimes(2);
  act(() => { hidden = false; document.dispatchEvent(new Event('visibilitychange')); });
  expect(update).toHaveBeenCalledTimes(3);
  expect(jest.getTimerCount()).toBe(1);
  unmount(); expect(jest.getTimerCount()).toBe(0);
});

test('sin red espera y al reconectar usa el callback vigente sin duplicar intervalos', () => {
  online = false;
  const first = jest.fn(), second = jest.fn();
  const { rerender } = renderHook(({ callback }) => useForegroundPoll(callback, 1000), { initialProps: { callback: first } });
  expect(first).not.toHaveBeenCalled(); expect(jest.getTimerCount()).toBe(0);
  rerender({ callback: second });
  act(() => { online = true; window.dispatchEvent(new Event('online')); });
  expect(second).toHaveBeenCalledTimes(1); expect(jest.getTimerCount()).toBe(1);
  act(() => { online = false; window.dispatchEvent(new Event('offline')); });
  expect(jest.getTimerCount()).toBe(0);
});

test('un pedido de resincronización demorado no ejecuta trabajo con el teléfono bloqueado', () => {
  const update = jest.fn();
  const { result } = renderHook(() => useResincronizar(update));
  act(() => result.current());
  act(() => result.current());
  act(() => { hidden = true; document.dispatchEvent(new Event('visibilitychange')); jest.advanceTimersByTime(5000); });
  expect(update).toHaveBeenCalledTimes(1);
  act(() => { hidden = false; document.dispatchEvent(new Event('visibilitychange')); });
  expect(update).toHaveBeenCalledTimes(2);
});
