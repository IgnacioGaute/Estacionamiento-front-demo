/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { VehicleTypeBadge } from '@/components/vehicle-type-badge';
import { DatosClienteEstadia } from './datos-cliente-estadia';

test('el modelo va al lado del tipo de vehículo', () => {
  render(<VehicleTypeBadge code="AUTO" modelo="Fiat Strada" />);
  expect(screen.getByTitle('Auto · Fiat Strada')).toHaveTextContent('Tipo de vehículo: Auto, modelo: Fiat Strada');
});

test('los datos del cliente quedan plegados debajo del vehículo y se abren al tocar', () => {
  render(<DatosClienteEstadia r={{ lastNameCustomer: 'Gómez', documentoCustomer: '30123456', phoneCustomer: '5491112345678' }} />);
  const boton = screen.getByRole('button', { name: /Datos del cliente/ });
  // Plegado muestra un resumen en una línea.
  expect(boton).toHaveTextContent('Gómez · 30.123.456 · +5491112345678');
  expect(screen.queryByText('DNI')).not.toBeInTheDocument();
  fireEvent.click(boton);
  expect(screen.getByText('DNI').nextSibling).toHaveTextContent('30.123.456');
  expect(screen.getByText('WhatsApp').nextSibling).toHaveTextContent('+5491112345678');
});

test('sin datos del cliente no se muestra el desplegable', () => {
  const { container } = render(<DatosClienteEstadia r={{ lastNameCustomer: null, documentoCustomer: null, phoneCustomer: '' }} />);
  expect(container).toBeEmptyDOMElement();
});
