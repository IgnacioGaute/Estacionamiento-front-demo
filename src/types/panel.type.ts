// El panel de la administración (GET /operaciones/panel). Ver docs/panel.md del backend.
export type MedioPanel = 'CASH' | 'TRANSFER' | 'MERCADOPAGO';
export type CompararPanel = 'anterior' | 'anio' | 'no';
export type VerPanel = 'hora' | 'dia' | 'semana' | 'mes';

export type ResumenEstadias = { entradas: number; salidas: number; ticketPromedio: number | null; duracionPromedio: number | null };

export type PanelResumen = {
  rango: { desde: string; hasta: string; dias: number };
  comparacion: { modo: Exclude<CompararPanel, 'no'>; desde: string; hasta: string } | null;
  cobrado: {
    total: number;
    porMedio: Record<MedioPanel, number>;
    porDia: ({ fecha: string; total: number } & Record<MedioPanel, number>)[];
    // Solo cuando el rango es de un día: 24 valores.
    porHora: number[] | null;
    anterior: { total: number; porDia: { fecha: string; total: number }[]; porHora: number[] | null } | null;
  };
  estadias: ResumenEstadias & { porDia: (ResumenEstadias & { fecha: string })[]; anterior: ResumenEstadias | null };
  hoy: { fecha: string; horaActual: number; adentroPorHora: number[]; adentroAhora: number; entradas: number; salidas: number };
  calendario: { fecha: string; total: number }[];
  avisos: {
    correccionesPendientes: number;
    faltantes: { cantidad: number; total: number; ultimo: { fecha: string; diferencia: number; caja: string; usuario: string | null } | null };
  };
};

export type FiltrosPanel = { desde: string; hasta: string; comparar: CompararPanel };
