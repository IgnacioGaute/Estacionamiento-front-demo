import { PDFDocument } from 'pdf-lib';
import { generarPdfVehiculos, textoSeguro } from './generate-vehiculos-pdf';
import type { FilaPlanillaVehiculos } from '@/services/tickets.service';

const fila = (i: number, adentro = false): FilaPlanillaVehiculos => ({
  id: `r${i}`,
  vehiculo: i % 7 === 0 ? `00${i}` : `AB${String(i).padStart(3, '0')}CD`,
  tipo: 'AUTO',
  origen: i % 7 === 0 ? 'BARCODE' : 'PLATE',
  modalidad: 'CON_COBRO',
  entradaDia: '2026-10-22',
  entradaHora: '09:15:00',
  salidaDia: adentro ? null : '2026-10-22',
  salidaHora: adentro ? null : '11:40:00',
  permanenciaMinutos: 145,
  operadorEntrada: i === 3 ? 'Ñandú Pérez 🚗' : 'Andrés Gaute',
  operadorSalida: adentro ? null : 'Renzo Díaz',
});

const contexto = (gratuita: boolean) => ({
  playa: 'Playa Mitre 1543',
  empresa: 'Estacionamiento Calle Mitre',
  desde: '2026-10-20',
  hasta: '2026-10-22',
  estado: 'TODAS' as const,
  gratuita,
  filtros: ['Operador: Andrés Gaute', 'Búsqueda: «AB»'],
  generado: new Date(2026, 9, 22, 18, 30),
});

const resumen = { entradas: 60, salidas: 55, presentes: 5, permanenciaMediana: 95 };

test('arma varias hojas con los filtros y no se rompe con caracteres que la fuente no tiene', async () => {
  const filas = Array.from({ length: 60 }, (_, i) => fila(i + 1, i % 12 === 0));
  const bytes = await generarPdfVehiculos(filas, resumen, contexto(false), () => 'Auto');
  const pdf = await PDFDocument.load(bytes);
  expect(pdf.getPageCount()).toBeGreaterThan(1);
  const [ancho, alto] = [pdf.getPage(0).getWidth(), pdf.getPage(0).getHeight()];
  expect(ancho).toBeGreaterThan(alto); // apaisado
});

test('sirve también para una playa gratuita y con una sola fila', async () => {
  const bytes = await generarPdfVehiculos([fila(1, true)], { ...resumen, permanenciaMediana: null }, { ...contexto(true), estado: 'PRESENTES', filtros: [] }, () => 'Auto');
  expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
});

test('acepta el día como fecha completa, como lo manda el backend', async () => {
  const bytes = await generarPdfVehiculos([{ ...fila(1, true), entradaDia: '2026-10-23T03:00:00.000Z' }], resumen, contexto(false), () => 'Auto');
  expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
});

test('reemplaza lo que no se puede escribir con las fuentes del PDF', () => {
  expect(textoSeguro('Ñandú «AB» – 🚗')).toBe('Ñandú «AB» – ?');
});
