/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { buscarPatente } from '@/utils/plate-scan';
import { PlateLiveScanner } from './plate-live-scanner';

jest.mock('@/actions/tickets/recognize-plate.action', () => ({ recognizePlateAction: jest.fn() }));
jest.mock('@/utils/plate-scan', () => ({
  ...jest.requireActual('@/utils/plate-scan'),
  buscarPatente: jest.fn(),
}));

function camara(capacidades: Record<string, unknown>) {
  const pista = {
    getCapabilities: jest.fn(() => capacidades),
    applyConstraints: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn(),
  };
  const stream = { getTracks: () => [pista], getVideoTracks: () => [pista] };
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: jest.fn().mockResolvedValue(stream) },
  });
  return pista;
}

function abrir() {
  return render(
    <PlateLiveScanner open onOpenChange={jest.fn()} onRecognized={jest.fn()} onTakePhoto={jest.fn()} />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  // La búsqueda sigue abierta: el test mira la cámara, no la lectura.
  jest.mocked(buscarPatente).mockReturnValue(new Promise(() => undefined));
});

test('con linterna la ofrece, la prende y pide foco continuo', async () => {
  const pista = camara({ torch: true, focusMode: ['manual', 'continuous'] });
  abrir();

  const boton = await screen.findByRole('button', { name: 'Linterna' });
  expect(boton).toHaveAttribute('aria-pressed', 'false');
  expect(pista.applyConstraints).toHaveBeenCalledWith({ advanced: [{ focusMode: 'continuous' }] });

  fireEvent.click(boton);
  await waitFor(() => expect(boton).toHaveAttribute('aria-pressed', 'true'));
  expect(pista.applyConstraints).toHaveBeenLastCalledWith({ advanced: [{ torch: true }] });

  fireEvent.click(boton);
  await waitFor(() => expect(boton).toHaveAttribute('aria-pressed', 'false'));
  expect(pista.applyConstraints).toHaveBeenLastCalledWith({ advanced: [{ torch: false }] });
});

test('sin linterna no muestra el botón ni toca el foco que no existe', async () => {
  const pista = camara({});
  abrir();

  await waitFor(() => expect(buscarPatente).toHaveBeenCalled());
  expect(screen.queryByRole('button', { name: 'Linterna' })).not.toBeInTheDocument();
  expect(pista.applyConstraints).not.toHaveBeenCalled();
});

test('si el navegador rechaza la linterna, el botón desaparece', async () => {
  const pista = camara({ torch: true });
  abrir();

  const boton = await screen.findByRole('button', { name: 'Linterna' });
  pista.applyConstraints.mockRejectedValueOnce(new Error('OverconstrainedError'));
  fireEvent.click(boton);
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Linterna' })).not.toBeInTheDocument());
});
