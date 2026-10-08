import type { TicketRegistrationForDay, TicketTimeType } from '@/types/ticket-registration-for-day.type';

// Fecha estimada de vencimiento: fecha de alta + la duración comprada. Cada tipo usa SOLO los
// campos que le corresponden — mezclar semanas/días de un tipo que no los usa da una fecha mal.
export function vencimientoEstadiaLarga(r: TicketRegistrationForDay): Date | null {
  if (!r.dateNow) return null;
  const dueDate = new Date(r.dateNow);
  if (r.ticketTimeType === 'MES' || r.ticketTimeType === 'MES_Y_DIA') {
    dueDate.setMonth(dueDate.getMonth() + (r.months ?? 0));
    if (r.ticketTimeType === 'MES_Y_DIA') {
      dueDate.setDate(dueDate.getDate() + (r.days ?? 0));
    }
  } else {
    const totalDays =
      r.ticketTimeType === 'SEMANA'
        ? (r.weeks ?? 0) * 7
        : r.ticketTimeType === 'SEMANA_Y_DIA'
          ? (r.weeks ?? 0) * 7 + (r.days ?? 0)
          : r.days ?? 0; // DIA
    dueDate.setDate(dueDate.getDate() + totalDays);
  }
  return dueDate;
}

// Un abono por día/semana/mes sigue "en el playón" mientras no se haya registrado su salida —
// pasar la fecha comprada NO lo saca de la lista ni cambia lo que se cobra (este flujo no tiene
// ninguna conexión con la escalera de tarifas por hora): solo queda marcado como vencido.
export function estadiaLargaActiva(r: TicketRegistrationForDay) {
  return !r.retired;
}

export function estadiaLargaVencida(r: TicketRegistrationForDay) {
  if (r.retired) return false;
  const dueDate = vencimientoEstadiaLarga(r);
  if (!dueDate) return false;
  return dueDate.getTime() < new Date().setHours(0, 0, 0, 0);
}

export const UNIDAD_ESTADIA_LARGA: Record<TicketTimeType, string> = {
  DIA: 'Día',
  SEMANA: 'Semana',
  SEMANA_Y_DIA: 'Semana y días',
  MES: 'Mes',
  MES_Y_DIA: 'Mes y días',
};
