'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTenant } from '@/components/tenant-provider';
import { getOperationUpdatesAction } from '@/actions/tickets/operation-updates.action';
import type { TicketsOperationSnapshot } from '@/types/tickets-operation.type';
import CardTicket from './ticket.card';

export function TicketsLiveData(props: { initial: TicketsOperationSnapshot; isAdmin: boolean }) {
  const { playaId } = useTenant();
  const { data: session } = useSession();
  return <ScopedTickets key={`${session?.user?.id}:${playaId}`} {...props} />;
}

function ScopedTickets({ initial, isAdmin }: { initial: TicketsOperationSnapshot; isAdmin: boolean }) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initial);
  const current = useRef(initial);
  const generation = useRef(0);
  const busy = useRef(false);
  const again = useRef(false);
  useEffect(() => {
    generation.current++;
    again.current = false;
    current.current = initial;
    setSnapshot(initial);
    return () => { generation.current++; };
  }, [initial]);
  const refresh = useCallback(async () => {
    if (document.hidden || !navigator.onLine) return;
    if (busy.current) { again.current = true; return; }
    busy.current = true;
    const requestGeneration = generation.current;
    try {
      const result = await getOperationUpdatesAction(current.current.revisions);
      if (generation.current !== requestGeneration) return;
      if (result.refreshAccess) { router.refresh(); return; }
      if (!result.changes || !result.revisions) return;
      if (Object.keys(result.changes).length) {
        const next = { data: { ...current.current.data, ...result.changes }, revisions: result.revisions };
        current.current = next;
        setSnapshot(next);
      }
    } catch {
      // Se conserva la pantalla y se reintenta al volver o en el siguiente control.
    } finally {
      busy.current = false;
      if (again.current && generation.current === requestGeneration) { again.current = false; void refresh(); }
    }
  }, [router]);
  return <CardTicket {...snapshot.data} isAdmin={isAdmin} barcodeTicketsEnabled={snapshot.data.schedule?.barcodeTicketsEnabled ?? false} onResync={refresh} />;
}
