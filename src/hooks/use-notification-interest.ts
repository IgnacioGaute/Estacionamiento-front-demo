'use client';
import { useState, useEffect } from 'react';
import { useTenant } from '@/components/tenant-provider';
import { useTenantEvent } from './use-tenant-event';
export function useNotificationsInterest() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const { playaId } = useTenant();
  useEffect(() => { setNotifications([]); }, [playaId]);
  useTenantEvent('notification-interest', data => { if (data.type === 'INTEREST_PROCESSED') setNotifications(prev => [...prev, data]); });
  return { notifications, clearNotifications: () => setNotifications([]), removeNotification: (id: string) => setNotifications(prev => prev.filter(n => n.id !== id)) };
}
