'use server';

import { getAuthHeaders } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { getTicketSchedule } from '@/services/tickets.service';
import type { IssuedParkingReceipt, ReceiptDeliverySettings } from '@/types/parking-receipt.type';

export async function saveReceiptDeliveryAction(settings: ReceiptDeliverySettings) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tickets/schedule-settings`, {
      method: 'PATCH', headers: await getAuthHeaders(),
      body: JSON.stringify({ receiptDelivery: settings }), cache: 'no-store',
    });
    if (!response.ok) return { error: 'No se pudo guardar la configuración de comprobantes.' };
    revalidatePath('/admin/tickets');
    revalidatePath('/tickets');
    return { success: true };
  } catch { return { error: 'No se pudo conectar con el servidor.' }; }
}

export async function issueParkingReceiptAction(id: string, kind: 'ENTRY' | 'EXIT'): Promise<{ receipt?: IssuedParkingReceipt; disabled?: boolean; error?: string }> {
  try {
    const schedule = await getTicketSchedule();
    if (!schedule) return { error: 'No se pudo consultar la configuración de comprobantes.' };
    const settings = schedule.receiptDelivery;
    if (!settings || (!settings.whatsapp && !settings.qr && !settings.print)) return { disabled: true };
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tickets/registrations/${encodeURIComponent(id)}/receipt`, {
      method: 'POST', headers: await getAuthHeaders(), body: JSON.stringify({ kind }), cache: 'no-store',
    });
    if (!response.ok) return { error: 'La operación se registró, pero no se pudo obtener el comprobante.' };
    return { receipt: await response.json() };
  } catch { return { error: 'La operación se registró, pero no se pudo obtener el comprobante.' }; }
}
