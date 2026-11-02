// Los pasos de la configuración inicial de una playa nueva. Mismo orden y nombres que el backend
// (src/tenancy/configuracion-inicial.ts): el avance se guarda allá.
export const PASOS_CONFIGURACION = ['nombre', 'ubicacion', 'vehiculos', 'tarifas', 'turnos', 'mercadopago', 'usuarios'] as const;
export type PasoConfiguracion = (typeof PASOS_CONFIGURACION)[number];
// Turnos, MercadoPago y usuarios se pueden dejar para después.
export const PASOS_OMITIBLES: readonly PasoConfiguracion[] = ['turnos', 'mercadopago', 'usuarios'];

// Los asistentes de Turnos y MercadoPago terminan yendo a Configuración. Dentro de la configuración
// inicial avisan con este evento y el recorrido sigue con el paso siguiente.
export const EVENTO_PASO_TERMINADO = 'configuracion-inicial:paso-terminado';

export type ConfiguracionInicial = {
  paso?: PasoConfiguracion;
  hechos?: PasoConfiguracion[];
  omitidos?: PasoConfiguracion[];
  terminadaEn?: string;
};

export type EstadoConfiguracionInicial = {
  playa: { id: string; nombre: string; direccion: string | null };
  configuracion: ConfiguracionInicial;
};

export type AvanceConfiguracion = {
  paso?: PasoConfiguracion;
  hecho?: PasoConfiguracion;
  omitido?: PasoConfiguracion;
  terminar?: boolean;
};
