'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ColumnDef } from '@tanstack/react-table';
import { Note } from '@/types/note.type';
import { CreateNoteDialog } from './create-note-dialog';
import { UpdateNoteDialog } from './update-note-dialog';
import { DeleteNoteDialog } from './delete-note-dialog';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, MessageSquare } from 'lucide-react';
import { useNotifications } from '@/hooks/use-notification';
import { readNoteAction } from '@/actions/notes/note-read.action';
import { listNotesAction } from '@/actions/notes/list-notes.action';

export function NotesTable({ data }: { columns: ColumnDef<Note>[]; data: Note[] }) {
  const [notes, setNotes] = useState(data);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reading, setReading] = useState<string | null>(null);
  const { unreadIds, loaded } = useNotifications();
  const { data: session } = useSession();
  useEffect(() => {
    const refresh = () => setRevision(v => v + 1);
    window.addEventListener('new-note-created', refresh);
    window.addEventListener('notes-notification', refresh);
    return () => { window.removeEventListener('new-note-created', refresh); window.removeEventListener('notes-notification', refresh); };
  }, []);
  useEffect(() => { setRevision(v => v + 1); }, [data]);
  useEffect(() => {
    let active = true; setLoading(true);
    const timer = setTimeout(() => {
      listNotesAction(page, search).then(result => {
        if (!active) return;
        setNotes(result.data); setPages(Math.max(1, result.meta.totalPages)); setError('');
      }).catch(() => { if (active) setError('No se pudieron cargar los avisos. Volvé a intentar.'); })
        .finally(() => { if (active) setLoading(false); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [page, search, revision]);
  async function read(id: string) {
    setReading(id);
    try { await readNoteAction(id); window.dispatchEvent(new Event('notes-read-changed')); }
    catch { setError('No se pudo guardar la lectura. Volvé a intentar.'); }
    finally { setReading(null); }
  }
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-gm-surface-2 p-4">
      <div><h2 className="font-semibold">Cartelera del equipo</h2><p className="text-sm text-muted-foreground">Los avisos son de esta playa. Cada persona confirma su lectura.</p></div>
      <span data-tour="avisos-crear"><CreateNoteDialog /></span>
    </div>
    <label data-tour="avisos-filtro" className="block space-y-2 text-sm"><span>Buscar un aviso</span><input className="h-11 w-full rounded-lg border border-border bg-background px-3" placeholder="Escribí una palabra o una fecha…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></label>
    {error && <p role="alert" className="text-sm text-destructive">{error} <Button variant="ghost" onClick={() => setRevision(v => v + 1)}>Reintentar</Button></p>}
    {loading ? <p className="py-8 text-center text-muted-foreground">Cargando avisos…</p> : <div data-tour="avisos-tabla" className="grid items-start gap-4 md:grid-cols-2">
      {notes.map(note => {
        const own = note.user?.id === session?.user?.id;
        const unread = !own && unreadIds.includes(note.id);
        return <article key={note.id} className={`min-w-0 rounded-xl border p-4 sm:p-5 ${unread ? 'border-gm-yellow/60 bg-gm-yellow/5' : 'border-border bg-gm-surface-2/40'}`}>
          <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="break-words font-semibold">{own ? 'Vos' : [note.user?.firstName, note.user?.lastName].filter(Boolean).join(' ') || 'Equipo'}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(note.createdAt).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short', timeStyle: 'short' })}</p></div>
            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Acciones del aviso"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><UpdateNoteDialog note={note} /><DeleteNoteDialog note={note} /></DropdownMenuContent></DropdownMenu>
          </div>
          <p className="my-5 whitespace-pre-wrap break-words text-sm leading-relaxed">{note.description}</p>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3"><span className={`text-xs font-medium ${unread ? 'text-gm-yellow' : 'text-muted-foreground'}`}>{own ? 'Publicado por vos' : !loaded ? 'Consultando lectura...' : unread ? 'Pendiente de leer' : 'Leído'}</span>{unread && <Button size="sm" variant="outline" disabled={reading !== null} onClick={() => read(note.id)}>{reading === note.id ? 'Guardando…' : 'Marcar como leído'}</Button>}</div>
        </article>;
      })}
      {!notes.length && <div className="rounded-xl border border-dashed border-border p-8 text-center md:col-span-2"><MessageSquare className="mx-auto mb-3 size-6 text-muted-foreground" /><p>{search ? 'No encontramos avisos con esa búsqueda.' : 'Todavía no hay avisos. Publicá el primero para tu equipo.'}</p></div>}
    </div>}
    {pages > 1 && <nav aria-label="Páginas de avisos" className="flex items-center justify-between gap-3"><Button variant="outline" disabled={loading || page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button><span className="text-sm">{page} / {pages}</span><Button variant="outline" disabled={loading || page >= pages} onClick={() => setPage(p => p + 1)}>Siguiente</Button></nav>}
  </div>;
}
