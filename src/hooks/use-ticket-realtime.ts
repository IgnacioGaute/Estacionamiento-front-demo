'use client';

import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { TicketRegistration } from '@/types/ticket-registration.type';

const socket = io(process.env.NEXT_PUBLIC_API_URL, {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
});

// Escucha el evento `new-registration` que el backend ya emite en cada entrada, salida y
// guardado de estadía planificada. No guarda estado propio: solo reenvía cada registro
// recibido al callback, así quien lo usa decide cómo mezclarlo con su propio estado.
export const useTicketRealtime = (onNewRegistration: (registration: TicketRegistration) => void) => {
  const callbackRef = useRef(onNewRegistration);

  useEffect(() => {
    callbackRef.current = onNewRegistration;
  });

  useEffect(() => {
    const handler = (data: TicketRegistration) => callbackRef.current(data);
    socket.on('new-registration', handler);
    return () => {
      socket.off('new-registration', handler);
    };
  }, []);
};
