import { UserRole } from '@/types/user.type';
import { currentRole } from '@/lib/auth';
import { redirect } from 'next/navigation';

interface RoleGateProps {
  children: React.ReactNode;
  allowedRole: UserRole;
}

export async function RoleGate({ children, allowedRole }: RoleGateProps) {
  const role = await currentRole();

  if (role !== allowedRole && !(role === 'SUPER_ADMIN' && allowedRole === 'ADMIN')) {
    return redirect('/');
  }

  return <>{children}</>;
}
