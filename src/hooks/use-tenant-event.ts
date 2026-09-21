'use client';
import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { io } from 'socket.io-client';
import { useTenant } from '@/components/tenant-provider';
export function useTenantEvent(event: string, callback: (data: any) => void) {
  const { data: session } = useSession();
  const { playaId } = useTenant();
  const handler = useRef(callback);
  useEffect(() => { handler.current = callback; });
  useEffect(() => {
    if (!session?.token || !playaId) return;
    const socket = io(process.env.NEXT_PUBLIC_API_URL, { transports: ['websocket'], auth: { token: session.token, playaId } });
    socket.on(event, data => handler.current(data));
    return () => { socket.disconnect(); };
  }, [event, session?.token, playaId]);
}
