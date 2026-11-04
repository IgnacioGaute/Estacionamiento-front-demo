// Los pasos de la configuración inicial de una playa nueva. Mismo orden y nombres que el backend
// (src/tenancy/configuracion-inicial.ts): el avance se guarda allá.
export const PASOS_CONFIGURACION = ['nombre', 'ubicacion', 'vehiculos', 'tarifas', 'pases', 'turnos', 'mercadopago', 'usuarios'] as const;
export type PasoConfiguracion = (typeof PASOS_CONFIGURACION)[number];
// Los pases (día, semana, mes), turnos, MercadoPago y usuarios se pueden dejar para después.
export const PASOS_OMITIBLES: readonly PasoConfiguracion[] = ['pases', 'turnos', 'mercadopago', 'usuarios'];

// Los asistentes de Turnos y MercadoPago terminan yendo a Configuración. Dentro de la configuración
// inicial avisan con este evento y el recorrido sigue con el paso siguiente.
export const EVENTO_PASO_TERMINADO = 'configuracion-inicial:paso-terminado';
// Una pantalla embebida avisa que su paso ya tiene lo mínimo (por ejemplo, las tarifas quedaron
// aplicadas) para habilitar «Continuar» sin esperar a que se recargue la página.
export const EVENTO_PASO_LISTO = 'configuracion-inicial:paso-listo';
export type DetallePasoListo = { paso: PasoConfiguracion; listo: boolean };

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
