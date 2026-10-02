// La cuenta de cada empresa con la plataforma: plan por playa, alta, vencimiento y pagos. Las
// fechas de día vienen como "YYYY-MM-DD" (días de Argentina): se muestran con `diaAR`, nunca con
// `new Date()`, que las corre un día para atrás.

export type EstadoCuenta =
  | 'SIN_ACTIVAR'
  | 'BONIFICADA'
  | 'PRUEBA'
  | 'AL_DIA'
  | 'VENCIDA'
  | 'SUSPENDIDA'
  | 'BAJA';

export type MotivoSuspension = 'FALTA_DE_PAGO' | 'MANUAL';

export type MedioPagoSaas = 'TRANSFERENCIA' | 'EFECTIVO' | 'MERCADOPAGO' | 'OTRO';

export type Plan = {
  id: string;
  codigo: string;
  nombre: string;
  // null = sin límite.
  maxActivos: number | null;
  incluyeCocheras: boolean;
  precioMensual: number;
  activo?: boolean;
  orden?: number;
  // Cuántas playas y empresas lo tienen asignado (solo en la lista del super admin).
  playas?: number;
  empresas?: number;
};

export type LineaPlan = {
  playaId: string;
  playa: string;
  planId: string;
  plan: string;
  codigo: string;
  maxActivos: number | null;
  incluyeCocheras: boolean;
  // Precio pactado; `precioLista` es el del catálogo hoy.
  precio: number;
  precioLista: number;
  desde: string;
};

// Lo mínimo para los avisos del menú: viaja en el contexto de cada pedido.
export type SituacionCuenta = {
  estado: EstadoCuenta;
  // Último día cubierto (prueba o pago).
  venceEl: string | null;
  // El día siguiente: el de la factura del período que sigue, que vence ese mismo día.
  proximoVencimiento: string | null;
  diasParaVencer: number | null;
  // Días desde el vencimiento sin pagar (0 si no venció o vence hoy).
  diasDeAtraso: number;
  suspendeEl: string | null;
  // Días de margen después del vencimiento: 5, o 10 con débito automático (MercadoPago reintenta).
  diasDeGracia: number;
  enPrueba: boolean;
  debeSuspenderse: boolean;
  motivoSuspension: MotivoSuspension | null;
  // Solo en el contexto del menú: lo que debe (factura pendiente) o lo que paga por mes.
  aPagar?: number;
  // Solo en el contexto del menú: tiene débito automático confirmado.
  conDebito?: boolean;
};

// El débito automático de MercadoPago. `pending`: lo pidió pero todavía no cargó la tarjeta
// (`url` es donde lo termina); `authorized`: activo; `paused`: lo pausó desde MercadoPago.
export type DebitoAutomatico = {
  estado: 'pending' | 'authorized' | 'paused';
  email: string | null;
  url: string | null;
};

export type ResumenCuenta = SituacionCuenta & {
  alta: string;
  pruebaHasta: string | null;
  pagadoHasta: string | null;
  prorrogaHasta: string | null;
  bonificada: boolean;
  suspendidaEl: string | null;
  mensual: number;
  planes: LineaPlan[];
  facturaPendiente: { id: string; importe: number; desde: string; hasta: string } | null;
  ultimoPago: { fecha: string; importe: number; medio: MedioPagoSaas | null } | null;
  debito: DebitoAutomatico | null;
};

export type FacturaSaas = {
  id: string;
  desde: string;
  hasta: string;
  meses: number;
  importe: number;
  detalle: { playaId: string; playa: string; planId: string; plan: string; precio: number }[];
  estado: 'PENDIENTE' | 'PAGADA' | 'ANULADA';
  pagadaEl: string | null;
  medio: MedioPagoSaas | null;
  referencia: string | null;
  // Solo en la vista del super admin.
  nota?: string | null;
  motivoAnulacion?: string | null;
  anuladaEl?: string | null;
  registradaPor?: string | null;
};

export type UsoPlaya = {
  playaId: string;
  nombre: string;
  inquilinos: boolean;
  plan: LineaPlan | null;
  // Paga con el descuento de playa adicional.
  adicional: boolean;
  activos: number;
  // Máximo de estadías abiertas a la vez en los últimos 30 días.
  pico: number;
  diasExcedidos: number;
  serie: { dia: string; pico: number }[];
};

export type DetalleSuscripcion = {
  cuenta: ResumenCuenta;
  notas: string | null;
  playas: UsoPlaya[];
  facturas: FacturaSaas[];
  historial: {
    accion: string;
    entidad: string;
    detalle: Record<string, unknown> | null;
    fecha: string;
    usuario: string | null;
  }[];
};

export type MiPlan = {
  cuenta: ResumenCuenta;
  playas: { playaId: string; nombre: string; plan: LineaPlan | null }[];
  // La lista de planes, para mostrarle dónde está parado.
  catalogo: Plan[];
  facturas: FacturaSaas[];
  // Datos de transferencia y WhatsApp de la plataforma, si están configurados.
  comoPagar: string | null;
  contacto: string | null;
  // La plataforma cobra con MercadoPago (pago con link y débito automático).
  mercadoPago: boolean;
  // Con la clave pública, el débito se activa cargando la tarjeta en el panel (sin cuenta de
  // MercadoPago); sin ella, se confirma en MercadoPago.
  mercadoPagoClavePublica: string | null;
};

export type PagoPlataforma = {
  id: string;
  empresaId: string;
  empresa: string;
  importe: number;
  meses: number;
  medio: MedioPagoSaas | null;
  referencia: string | null;
  pagadaEl: string;
  desde: string;
  hasta: string;
  estado: 'PAGADA' | 'ANULADA';
};
