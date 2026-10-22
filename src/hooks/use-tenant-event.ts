'use client';
import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { subscribeTenantEvent } from '@/lib/tenant-socket-client';
import { useTenant } from '@/components/tenant-provider';
// `onConnect` corre en cada conexión, también la primera: entre que el servidor armó la página y
// el socket se conectó (o mientras estuvo caído) pudo pasar algo de lo que no llegó aviso.
export function useTenantEvent(event: string, callback: (data: any) => void, onConnect?: () => void) {
  const { data: session } = useSession();
  const { playaId } = useTenant();
  const handler = useRef(callback);
  const alConectar = useRef(onConnect);
  useEffect(() => { handler.current = callback; alConectar.current = onConnect; });
  useEffect(() => {
    if (!session?.token || !playaId) return;
    return subscribeTenantEvent(session.token, playaId, event, data => handler.current(data), () => alConectar.current?.());
  }, [event, session?.token, playaId]);
}
