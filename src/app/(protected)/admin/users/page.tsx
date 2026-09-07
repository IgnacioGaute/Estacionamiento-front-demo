export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { getUsers } from '@/services/users.service';
import { UsersTable } from './components/users-table';
import { userColumns } from './components/user-columns';
import { PageHeader } from '@/components/page-header';
import { PageTour } from '@/components/page-tour';

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
  const users = await getUsers();
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
      <UsersTable columns={userColumns} data={users?.data || []} />
    </div>
  );
}
