export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { getUsers } from '@/services/users.service';
import { UsersTable } from './components/users-table';
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
    title: 'Buscar por email',
    desc: 'Filtrá la lista escribiendo el email de la cuenta que buscás.',
    radius: 6,
  },
  {
    key: 'table',
    selector: '[data-tour="users-table"]',
    title: 'Cuentas del sistema',
    desc: 'El badge indica el rol: Admin tiene acceso completo, Operador solo a las tareas del día a día. Desde el menú de cada fila podés editar la cuenta o eliminarla.',
    radius: 10,
  },
];

export default async function UserPage() {
  const [users, assignments] = await Promise.all([getUsers(), operatorAssignmentsAction()]);
  const total = users?.data?.length ?? 0;

  return (
    <div className="container mx-auto px-4 py-6 sm:p-8 max-w-7xl">
      <PageHeader
        breadcrumb={['Estacionamiento', 'Administración', 'Usuarios']}
        title="Usuarios del sistema"
        description={
          total > 0
            ? `${total} cuentas activas — operadores y administradores.`
            : 'Creá la primera cuenta para empezar a operar.'
        }
        actions={<PageTour steps={TOUR_STEPS} />}
      />
      {!assignments && <p role="alert" className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">No se pudieron consultar las playas asignadas. Actualizá la página para volver a intentarlo.</p>}
      <UsersTable assignments={assignments} data={users?.data || []} />
    </div>
  );
}
