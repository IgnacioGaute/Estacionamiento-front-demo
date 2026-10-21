export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { getUsers } from '@/services/users.service';
import { UsersBody } from './components/users-body';
import { CreateUserDialog } from './components/create-user-dialog';
import { PageHeader } from '@/components/page-header';
import { PageTour } from '@/components/page-tour';
import { operatorAssignmentsAction } from '@/actions/tenancy/context.action';

const TOUR_STEPS = [
  {
    key: 'create',
    selector: '[data-tour="users-create"]',
    title: 'Nuevo usuario',
    desc: 'Creá una cuenta de operador o administrador con nombre de usuario, email y contraseña.',
    radius: 6,
  },
  {
    key: 'filter',
    selector: '[data-tour="users-filter"]',
    title: 'Filtrar la lista',
    desc: 'Mostrá solo administradores u operadores, o buscá por nombre, usuario o email.',
    radius: 10,
  },
  {
    key: 'table',
    selector: '[data-tour="users-table"]',
    title: 'Cuentas del sistema',
    desc: 'Administrador tiene acceso completo; Operador, solo a las tareas del día a día en su playa. Desde el menú de cada fila podés editar la cuenta, cambiarle el rol o eliminarla.',
    radius: 10,
  },
];

export default async function UserPage() {
  const [users, assignments] = await Promise.all([getUsers(), operatorAssignmentsAction()]);

  return (
    <div className="container mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:p-8">
      <PageHeader
        breadcrumb={['Estacionamiento', 'Administración', 'Usuarios']}
        title="Usuarios del sistema"
        description="Operadores y administradores de la empresa, su rol y su playa."
        actions={<><PageTour steps={TOUR_STEPS} /><CreateUserDialog /></>}
      />
      {!assignments && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">No se pudieron consultar las playas asignadas. Actualizá la página para volver a intentarlo.</p>}
      <UsersBody assignments={assignments} data={users?.data || []} />
    </div>
  );
}
