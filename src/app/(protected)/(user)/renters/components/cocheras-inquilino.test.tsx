/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { CocherasInquilino, cocherasParaGuardar } from './cocheras-inquilino';

test('la patente va aparte del número de cochera: los dos son opcionales y la patente se normaliza', () => {
  expect(
    cocherasParaGuardar([
      { garageNumber: ' B-12 ', licensePlate: 'ab 123-cd', amount: 45000 },
      { amount: 5000 },
    ]),
  ).toEqual([
    { garageNumber: 'B-12', licensePlate: 'AB123CD', amount: 45000 },
    { garageNumber: '', licensePlate: '', amount: 5000 },
  ]);
});

function Formulario() {
  const form = useForm({ defaultValues: { parkingRenters: [{ garageNumber: '', licensePlate: 'AB123CD', amount: 45000 }] } });
  const { fields } = useFieldArray({ control: form.control, name: 'parkingRenters' });
  return (
    <Form {...form}>
      <CocherasInquilino form={form} fields={fields} />
    </Form>
  );
}

test('cada cochera muestra número y patente como campos separados', () => {
  render(<Formulario />);
  expect(screen.getByLabelText(/N° de cochera/)).toHaveValue('');
  expect(screen.getByLabelText(/Patente/)).toHaveValue('AB123CD');
});
