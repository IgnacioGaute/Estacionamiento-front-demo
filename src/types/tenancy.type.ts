export type PlayaResumen = {
  id: string;
  empresaId: string;
  nombre: string;
  direccion: string | null;
  // Secciones opcionales que prende el super admin.
  modulos?: { inquilinos?: boolean };
};

export type UsuarioDeEmpresa = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  // A qué playas de su empresa tiene acceso. Vacío = todavía no se le asignó ninguna.
  playaIds: string[];
};

export type EmpresaConDetalle = {
  id: string;
  nombre: string;
  estado: 'ACTIVA' | 'SUSPENDIDA' | 'BAJA';
  playas: PlayaResumen[];
  usuarios: UsuarioDeEmpresa[];
  // La cuenta con la que cobra por QR. Null = nunca la conectó.
  mercadoPago?: {
    estado: 'ACTIVA' | 'DESCONECTADA' | 'ERROR';
    conectadaEl: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
};

// Métricas de operación por playa. El panel las suma por empresa y según el filtro activo.
export type PlayaMetrics = {
  playaId: string;
  empresaId: string;
  nombre: string;
  cobrado: number;
  estadiasAbiertas: number;
  turnosAbiertos: number;
  // Sin franjas de precio cargadas la playa no puede registrar entradas.
  tieneTarifas: boolean;
  ultimaOperacion: string | null;
  // Canales de comprobante que la playa tiene encendidos.
  comprobantes?: { whatsapp: boolean; qr: boolean; print: boolean };
};

export type PlataformaMetrics = {
  desde: string;
  dias: number;
  playas: PlayaMetrics[];
};

// Lo que bloquea un borrado, consultado ANTES de ofrecerlo.
export type ResumenEliminacion = {
  nombre: string;
  estado?: 'ACTIVA' | 'SUSPENDIDA' | 'BAJA';
  playas?: number;
  usuarios: number;
  registros: number;
  puedeEliminar: boolean;
};

export type ActividadEmpresa = {
  accion: string;
  entidad: string;
  entidadId: string | null;
  fecha: string;
  playa: string | null;
  usuario: string | null;
  // Los campos que cambiaron, ya filtrados por el backend (nunca contraseñas ni tokens).
  detalle: Record<string, unknown> | null;
};

// Detalle para la pantalla de métricas: serie diaria, medios de pago y actividad por hora.
export type MetricsDetalle = {
  dias: number;
  serie: { dia: string; total: number }[];
  // Las fechas del período anterior son las suyas: para superponer las dos líneas hay que
  // correrlas `dias` días hacia adelante.
  anterior: { dia: string; total: number }[];
  // Estadías cerradas por día, para que el KPI dibuje su propia forma y no la del dinero.
  serieEstadias: { dia: string; total: number }[];
  // Las del período anterior, con sus propias fechas (igual que `anterior`).
  serieEstadiasAnterior?: { dia: string; total: number }[];
  // Cobrado por playa y por día del período actual.
  seriePlayas?: { playaId: string; dia: string; total: number }[];
  metodos: { metodo: string; total: number }[];
  metodosAnterior?: { metodo: string; total: number }[];
  // Estadías abiertas hora por hora en las últimas 24 horas; la última es ahora.
  abiertas24h?: { hora: string; abiertas: number }[];
  // Entradas (día de apertura) y salidas (día de cierre), desde el período anterior.
  entradas?: { dia: string; total: number }[];
  salidas?: { dia: string; total: number }[];
  // Estadías por día, semana o mes: vendidas en el período, importe y las vigentes ahora.
  abonos?: {
    tipo: 'DIA' | 'SEMANA' | 'MES';
    vendidos: number;
    anteriores: number;
    importe: number;
    pendientes: number;
    vigentes: number;
  }[];
  // Lo que los operadores le preguntan al asistente.
  asistente?: {
    temas: { tema: string; total: number; anterior: number; sinRespuesta: number }[];
    recientes: {
      pregunta: string;
      tema: string;
      respondida: boolean;
      fecha: string;
      playa: string;
      empresa: string;
    }[];
    frecuentes: { pregunta: string; tema: string; veces: number }[];
  };
  // `dia` es ISODOW: 1 = lunes … 7 = domingo.
  horas: { dia: number; hora: number; entradas: number }[];
  empresas: {
    empresaId: string;
    nombre: string;
    cobrado: number;
    anterior: number;
    estadias: number;
  }[];
  totales: {
    actual: number;
    anterior: number;
    estadias: number;
    estadiasAnterior: number;
  };
};
