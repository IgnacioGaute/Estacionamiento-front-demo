'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useTenant } from '@/components/tenant-provider';
import { useTenantEvent } from './use-tenant-event';
import { unreadNotesAction } from '@/actions/notes/note-read.action';

export function useNotifications() {
  const [unreadIds, setUnreadIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const { playaId } = useTenant();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  useEffect(() => {
    let active = true;
    setUnreadIds([]);
    setLoaded(false);
    if (!playaId || !userId) return;
    let request = 0;
    const refresh = () => { const current = ++request; unreadNotesAction().then(ids => { if (active && current === request) { setUnreadIds(ids); setLoaded(true); } }).catch(() => {}); };
    refresh();
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    window.addEventListener('notes-read-changed', refresh);
    window.addEventListener('notes-notification', refresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener('notes-read-changed', refresh); window.removeEventListener('notes-notification', refresh); };
  }, [playaId, userId]);
  useTenantEvent('notification', data => {
    if (data.type === 'NEW_NOTE' && data.authorId !== userId) window.dispatchEvent(new Event('notes-notification'));
  });
  // Navigation alone must never mark messages as read.
  const clearNoteAlert = useCallback(() => {}, []);
  return { unreadIds, loaded, notifications: unreadIds, hasNewNoteAlert: unreadIds.length > 0, clearNotifications: clearNoteAlert, clearNoteAlert };
}
