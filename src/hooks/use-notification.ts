'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useRouter } from 'next/navigation';

const socket = io('https://garage-mitre-backend-production.up.railway.app', {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000
});

// useNotifications.ts
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const storedNotifications = localStorage.getItem('notifications');
      return storedNotifications ? JSON.parse(storedNotifications) : [];
    }
    return [];
  });

  const [hasNewNoteAlert, setHasNewNoteAlert] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('hasNewNoteAlert') === 'true';
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      socket.on('connect', () => {
        console.log('🔌 Conectado al WebSocket');
      });

      socket.on('notification', (data) => {
        console.log('Notificación recibida:', data);
        if (data.type === 'NEW_NOTE') {
          setNotifications((prev) => [...prev, data]);
          setHasNewNoteAlert(true);
          localStorage.setItem('hasNewNoteAlert', 'true');
        }
      });

      socket.on('disconnect', () => {
        console.log('⚠️ Desconectado del WebSocket');
      });

      return () => {
        socket.off('notification');
        socket.off('connect');
        socket.off('disconnect');
      };
    }
  }, []);

  const clearNotifications = () => {
    setNotifications([]);
    localStorage.removeItem('notifications');
  };

  const clearNoteAlert = () => {
    setHasNewNoteAlert(false);
    localStorage.setItem('hasNewNoteAlert', 'false');
  };

  return { notifications, hasNewNoteAlert, clearNotifications, clearNoteAlert };
};
