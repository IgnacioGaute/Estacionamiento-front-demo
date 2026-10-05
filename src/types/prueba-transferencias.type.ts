// La prueba de transferencias del super admin (no es la función comercial): qué informa
// MercadoPago de la plata que entró a una cuenta autorizada para probar. Cada consulta viene con
// su resultado o con el error que contestó MercadoPago, porque eso también es parte de la prueba.

export type ConsultaFallida = { ok: false; estado: number | null; error: string };
type Simples = Record<string, string | number | boolean | null>;

export const VENTANAS_PRUEBA = [5, 30, 120, 1440] as const;
export type VentanaPrueba = (typeof VENTANAS_PRUEBA)[number];

export type PagoDePrueba = {
  id: number;
  creado: string | null;
  aprobado: string | null;
  actualizado: string | null;
  estado: string | null;
  detalle: string | null;
  importe: number | null;
  moneda: string | null;
  neto: number | null;
  operacion: string | null;
  tipo: string | null;
  medio: string | null;
  descripcion: string | null;
  referencia: string | null;
  cobradorId: number | null;
  // null: MercadoPago no dijo quién cobró.
  recibido: boolean | null;
  pagador: { nombre: string | null; documento: string | null };
  origen: {
    tipo: string | null;
    subtipo: string | null;
    banco: { pagador: Simples; cobrador: Simples } | null;
  } | null;
  claves: string[];
};

export type PruebaPagos = {
  cuenta: { mpUserId: string; nickname: string | null };
  minutos: VentanaPrueba;
  desde: string;
  hasta: string;
  consultadoEl: string;
  pagos:
    | { ok: true; total: number | null; truncado: boolean; egresosOmitidos: number; items: PagoDePrueba[] }
    | ConsultaFallida;
};

export type PruebaReporteEstado = {
  config: { ok: true; columnas: string[]; faltan: string[]; [campo: string]: unknown } | ConsultaFallida;
  reportes: { ok: true; items: Simples[] } | ConsultaFallida;
};

export type PruebaReportePedido = {
  pedidoEl: string;
  desde: string;
  hasta: string;
  respuesta: { ok: true; estado: number; [campo: string]: unknown } | ConsultaFallida;
};

export type PruebaReporteConfiguracion = {
  creada: boolean;
  respuesta: { ok: true; estado: number } | ConsultaFallida;
};

export type PruebaReporteLectura = {
  archivo: string;
  leidoEl?: string;
  respuesta:
    | { ok: true; columnas: string[]; reconocible: boolean; totalFilas: number; ingresos: Record<string, string>[] }
    | ConsultaFallida;
};
