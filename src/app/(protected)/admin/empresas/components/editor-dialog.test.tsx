/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createPlayaAction, updateEmpresaAction } from '@/actions/tenancy/tenancy.action';
import type { EmpresaConDetalle } from '@/types/tenancy.type';
import { EditorDialog } from './editor-dialog';

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@/actions/tenancy/tenancy.action', () => ({
  asignarPlayasAction: jest.fn(),
  createEmpresaAction: jest.fn(),
  createPlayaAction: jest.fn(async () => ({ playa: {} })),
  updateEmpresaAction: jest.fn(async () => ({ empresa: {} })),
  updatePlayaAction: jest.fn(),
  saveUsuarioEmpresaAction: jest.fn(),
}));

const empresa = {
  id: 'e1',
  nombre: 'Norte SRL',
  cuit: '20123456786',
  condicionIva: 'MONOTRIBUTO',
  contactoNombre: 'Marcela',
  playas: [],
  usuarios: [],
} as unknown as EmpresaConDetalle;

beforeEach(() => jest.clearAllMocks());

test('editar empresa: muestra el CUIT con guiones y manda los datos limpios; vacío borra', async () => {
  const guardado = jest.fn();
  render(<EditorDialog editor={{ tipo: 'empresa', empresa }} cerrar={jest.fn()} guardado={guardado} />);
  expect(screen.getByLabelText('CUIT')).toHaveValue('20-12345678-6');
  fireEvent.change(screen.getByLabelText('Persona de contacto'), { target: { value: '' } });
  fireEvent.change(screen.getByLabelText('WhatsApp'), { target: { value: ' 341 555-1234 ' } });
  fireEvent.change(screen.getByLabelText('Provincia'), { target: { value: 'Santa Fe' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  await waitFor(() => expect(guardado).toHaveBeenCalled());
  expect(updateEmpresaAction).toHaveBeenCalledWith('e1', expect.objectContaining({
    nombre: 'Norte SRL',
    cuit: '20123456786',
    condicionIva: 'MONOTRIBUTO',
    contactoNombre: null,
    contactoTelefono: '341 555-1234',
    provincia: 'Santa Fe',
    razonSocial: null,
  }));
});

test('un CUIT con el verificador mal no se manda y lo explica', async () => {
  render(<EditorDialog editor={{ tipo: 'empresa', empresa }} cerrar={jest.fn()} guardado={jest.fn()} />);
  const cuit = screen.getByLabelText('CUIT');
  fireEvent.change(cuit, { target: { value: '20-12345678-7' } });
  fireEvent.blur(cuit);
  expect(screen.getByText(/No coincide el dígito verificador/)).toBeInTheDocument();
  expect(cuit).toHaveAttribute('aria-invalid', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  expect(await screen.findByText(/Revisá el CUIT/)).toBeInTheDocument();
  expect(updateEmpresaAction).not.toHaveBeenCalled();
});

test('playa nueva con capacidad; sin cargar viaja como null', async () => {
  const guardado = jest.fn();
  render(<EditorDialog editor={{ tipo: 'playa', empresa }} cerrar={jest.fn()} guardado={guardado} />);
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Centro' } });
  fireEvent.change(screen.getByLabelText('Capacidad (opcional)'), { target: { value: '40' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  await waitFor(() => expect(guardado).toHaveBeenCalled());
  expect(createPlayaAction).toHaveBeenCalledWith('e1', { nombre: 'Centro', direccion: '', capacidad: 40 });
});
