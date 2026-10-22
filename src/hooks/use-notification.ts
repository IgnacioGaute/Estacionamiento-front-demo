'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useTenant } from '@/components/tenant-provider';
import { useTenantEvent } from './use-tenant-event';
import { unreadNotesAction } from '@/actions/notes/note-read.action';
import { useForegroundPoll } from './use-foreground-poll';

export function useNotifications() {
  const [unreadIds, setUnreadIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const { playaId } = useTenant();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const refreshRef = useRef<() => void>(() => {});
  useEffect(() => {
    let active = true;
    setUnreadIds([]);
    setLoaded(false);
    if (!playaId || !userId) return;
    let busy = false, again = false;
    const refresh = () => {
      if (!active || document.hidden || !navigator.onLine) return;
      if (busy) { again = true; return; }
      busy = true;
      unreadNotesAction().then(ids => { if (active) { setUnreadIds(ids); setLoaded(true); } }).catch(() => {}).finally(() => {
        busy = false;
        if (again) { again = false; refresh(); }
      });
    };
    refreshRef.current = refresh;
    refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('notes-read-changed', refresh);
    window.addEventListener('notes-notification', refresh);
    return () => { active = false; refreshRef.current = () => {}; window.removeEventListener('focus', refresh); window.removeEventListener('notes-read-changed', refresh); window.removeEventListener('notes-notification', refresh); };
  }, [playaId, userId]);
  useForegroundPoll(() => refreshRef.current(), 30000, { immediate: false, enabled: !!playaId && !!userId });
  useTenantEvent('notification', data => {
    if (data.type === 'NEW_NOTE') window.dispatchEvent(new Event('notes-notification'));
  }, () => refreshRef.current());
  // Navigation alone must never mark messages as read.
  const clearNoteAlert = useCallback(() => {}, []);
  return { unreadIds, loaded, notifications: unreadIds, hasNewNoteAlert: unreadIds.length > 0, clearNotifications: clearNoteAlert, clearNoteAlert };
}
