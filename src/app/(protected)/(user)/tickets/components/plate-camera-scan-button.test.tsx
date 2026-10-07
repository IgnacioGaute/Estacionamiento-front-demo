/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTenant } from '@/components/tenant-provider';
import { recognizePlateAction } from '@/actions/tickets/recognize-plate.action';
import { prepararFotoPatente } from '@/utils/plate-photo';
import { PlateCameraScanButton } from './plate-camera-scan-button';
jest.mock('@/hooks/use-mobile', () => ({ useIsMobile: jest.fn() }));
jest.mock('@/components/tenant-provider', () => ({ useTenant: jest.fn() }));
jest.mock('@/actions/tickets/recognize-plate.action', () => ({ recognizePlateAction: jest.fn() }));
jest.mock('@/utils/plate-photo', () => ({ prepararFotoPatente: jest.fn() }));
jest.mock('@/lib/toast', () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }));
jest.mock('./plate-live-scanner', () => ({ PlateLiveScanner: () => null }));
jest.mock('@/components/ui/lattice-loader', () => ({ __esModule: true, default: () => null }));
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useIsMobile).mockReturnValue(true);
  jest.mocked(useTenant).mockReturnValue({ reconocimientoPatentes: true } as ReturnType<typeof useTenant>);
});
test('ofrece la cámara cuando el backend habilita el motor sin token de la playa', () => {
  render(<PlateCameraScanButton onRecognized={jest.fn()} />);
  expect(screen.getByRole('button', { name: 'Escanear patente con la cámara' })).toBeEnabled();
});
test.each(['field', 'action'] as const)('sin motor o fuera de celular oculta la cámara %s', (variant) => {
  jest.mocked(useTenant).mockReturnValue({ reconocimientoPatentes: false } as ReturnType<typeof useTenant>);
  const view = render(<PlateCameraScanButton variant={variant} onRecognized={jest.fn()} />);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  jest.mocked(useTenant).mockReturnValue({ reconocimientoPatentes: true } as ReturnType<typeof useTenant>);
  jest.mocked(useIsMobile).mockReturnValue(false);
  view.rerender(<PlateCameraScanButton variant={variant} onRecognized={jest.fn()} />);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
test('la foto completa la patente para revisión sin registrar una entrada', async () => {
  const onRecognized = jest.fn();
  const file = new File(['jpeg'], 'patente.jpg', { type: 'image/jpeg' });
  jest.mocked(prepararFotoPatente).mockResolvedValue(file);
  jest.mocked(recognizePlateAction).mockResolvedValue({ success: true, plate: 'ab123cd', score: 0.99 });
  const view = render(<PlateCameraScanButton onRecognized={onRecognized} />);
  const input = view.container.querySelector('input[type=file]')!;
  expect(input).toHaveAttribute('capture', 'environment');
  fireEvent.change(input, { target: { files: [file] } });
  await waitFor(() => expect(onRecognized).toHaveBeenCalledWith('AB123CD'));
  expect(jest.mocked(recognizePlateAction).mock.calls[0][0].get('image')).toBe(file);
});
