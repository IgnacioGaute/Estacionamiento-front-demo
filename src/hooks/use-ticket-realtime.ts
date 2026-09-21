'use client';
import { TicketRegistration } from '@/types/ticket-registration.type';
import { useTenantEvent } from './use-tenant-event';
export function useTicketRealtime(onNewRegistration: (data: TicketRegistration) => void) {
  useTenantEvent('new-registration', onNewRegistration);
}
