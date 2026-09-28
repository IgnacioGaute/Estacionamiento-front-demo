import { redirect } from 'next/navigation';

// Los filtros y la paginación anteriores siguen funcionando en Caja.
export default async function OtherPaymentsRedirect({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (typeof value === 'string') params.set(key, value);
  params.set('tab', 'movimientos');
  redirect('/admin/caja?' + params.toString());
}
