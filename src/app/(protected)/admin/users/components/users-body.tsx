'use client';

import { useState } from 'react';
import { Inbox, Search } from 'lucide-react';
import { RolAvatar, estiloRol } from '@/components/rol-avatar';
import { cn } from '@/lib/utils';
import { User } from '@/types/user.type';
import {
  CabeceraTabla, PieTabla, SelectorSegmentado, TarjetaResumen, tarjetaPlanilla, tdPlanilla, thPlanilla,
} from '@/components/planilla/planilla-ui';
import { AssignPlayaDialog } from './assign-playa-dialog';
import { UpdateUserDailog } from './update-user-dialog';
import { DeleteUserDialog } from './delete-user-dialog';

type Asignaciones = Record<string, { id: string; nombre: string } | null> | null;
type FiltroRol = 'TODOS' | 'ADMIN' | 'USER';
const POR_PAGINA = 20;

// Mismo armado que Vehículos y Frecuentes (planilla-ui): resumen, filtros, tabla y tarjetas en el
// celular. La lista llega entera del servidor, así que filtrar y paginar es local.
export function UsersBody({ data, assignments }: { data: User[]; assignments: Asignaciones }) {
  const [filtro, setFiltro] = useState<FiltroRol>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(0);

  const admins = data.filter((u) => u.role === 'ADMIN').length;
  const operadores = data.filter((u) => u.role === 'USER');
  const sinPlaya = assignments ? operadores.filter((u) => !assignments[u.id]).length : null;
  const texto = busqueda.trim().toLowerCase();
  const filtrados = data.filter((u) =>
    (filtro === 'TODOS' || u.role === filtro) &&
    (!texto || [u.firstName, u.lastName, u.username, u.email].some((v) => v?.toLowerCase().includes(texto))));
  const ultima = Math.max(0, Math.ceil(filtrados.length / POR_PAGINA) - 1);
  const actual = Math.min(pagina, ultima);
  const visibles = filtrados.slice(actual * POR_PAGINA, (actual + 1) * POR_PAGINA);
  const cambiarFiltro = (f: FiltroRol) => { setFiltro(f); setPagina(0); };

  const etiquetaRol = (u: User) => {
    const { etiqueta } = estiloRol(u.role);
    return (
      <span className={cn('inline-flex h-[26px] items-center rounded-full px-2.5 text-[12.5px] font-semibold',
        u.role === 'ADMIN' ? 'bg-gm-yellow/15 text-gm-yellow' : 'bg-gm-surface-3 text-[#D9D1C3]')}>{etiqueta}</span>
    );
  };
  const playa = (u: User) =>
    u.role !== 'USER' ? <span className="text-xs text-muted-foreground">Todas las playas</span>
      : !assignments ? <span className="text-xs text-muted-foreground">No disponible</span>
        : <AssignPlayaDialog user={u} assigned={assignments[u.id] ?? null} />;
  // Botones a la vista (como «Ver historial» en Frecuentes) y no un menú: un diálogo dentro de un
  // menú se cerraba junto con él al guardar, y con eso desaparecía el error del cambio de rol.
  const acciones = (u: User) => (
    <div className="flex items-center justify-end gap-1.5">
      <UpdateUserDailog user={u} />
      <DeleteUserDialog user={u} />
    </div>
  );
  const persona = (u: User) => (
    <div className="flex min-w-0 items-center gap-3">
      <RolAvatar role={u.role} className="size-9 rounded-[10px]" />
      <div className="min-w-0">
        <p className="truncate text-[13.5px] font-semibold">{u.firstName} {u.lastName}</p>
        <p className="gm-mono truncate text-xs text-muted-foreground">@{u.username}</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <section aria-label="Resumen" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TarjetaResumen destacada etiqueta="Usuarios" valor={data.length} detalle="cuentas activas" />
        <TarjetaResumen etiqueta="Admins" valor={admins} detalle="ven todas las playas" />
        <TarjetaResumen etiqueta="Operadores" valor={operadores.length} detalle="cada uno en su playa" />
        <TarjetaResumen etiqueta="Sin playa" valor={sinPlaya ?? '—'} detalle={sinPlaya === null ? 'no disponible' : sinPlaya ? 'operadores sin asignar' : 'todos asignados'} />
      </section>

      <div data-tour="users-filter" className={cn(tarjetaPlanilla, 'flex flex-col gap-3 p-3.5 md:flex-row md:items-center')}>
        <SelectorSegmentado etiqueta="Rol" valor={filtro} onChange={cambiarFiltro} opciones={[
          { id: 'TODOS', label: 'Todos', cantidad: data.length },
          { id: 'ADMIN', label: 'Admins', cantidad: admins },
          { id: 'USER', label: 'Operadores', cantidad: operadores.length },
        ]} />
        <label className="flex h-11 min-w-0 shrink-0 items-center md:flex-1 gap-2.5 rounded-xl border border-gm-line-strong bg-background px-3.5">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <input type="search" aria-label="Buscar usuario" placeholder="Nombre, usuario o email" value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setPagina(0); }}
            className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        </label>
      </div>

      <section data-tour="users-table" aria-label="Usuarios" className={cn(tarjetaPlanilla, 'overflow-hidden')}>
        <CabeceraTabla titulo="Usuarios" cantidad={filtrados.length} />
        {!visibles.length ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <Inbox className="size-8 text-muted-foreground" aria-hidden />
            <h3 className="font-semibold">{data.length ? 'No encontramos usuarios' : 'Todavía no hay usuarios'}</h3>
            <p className="text-sm text-muted-foreground">{data.length ? 'Probá con otro nombre o cambiá el rol.' : 'Creá la primera cuenta para empezar a operar.'}</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[820px] border-collapse text-sm">
                <thead className="bg-[#15130F]">
                  <tr>
                    <th scope="col" className={thPlanilla}>Usuario</th>
                    <th scope="col" className={thPlanilla}>Email</th>
                    <th scope="col" className={thPlanilla}>Rol</th>
                    <th scope="col" className={thPlanilla}>Playa</th>
                    <th scope="col" className={cn(thPlanilla, 'text-right')}><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((u) => (
                    <tr key={u.id} className="border-t border-gm-line transition-colors hover:bg-gm-surface-2">
                      <td className={tdPlanilla}>{persona(u)}</td>
                      <td className={tdPlanilla}><span className="gm-mono text-[12.5px] text-muted-foreground">{u.email}</span></td>
                      <td className={tdPlanilla}>{etiquetaRol(u)}</td>
                      <td className={tdPlanilla}>{playa(u)}</td>
                      <td className={cn(tdPlanilla, 'text-right')}>{acciones(u)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="flex flex-col gap-2 p-3 md:hidden">
              {visibles.map((u) => (
                <li key={u.id} className="flex flex-col gap-2.5 rounded-2xl border border-gm-line bg-gm-surface-2 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    {persona(u)}
                    {acciones(u)}
                  </div>
                  <p className="gm-mono truncate text-xs text-muted-foreground">{u.email}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2">{etiquetaRol(u)}{playa(u)}</div>
                </li>
              ))}
            </ul>
          </>
        )}
        <PieTabla pagina={actual} porPagina={POR_PAGINA} total={filtrados.length} mostrados={visibles.length} onCambiar={setPagina} />
      </section>
    </div>
  );
}
