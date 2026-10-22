export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronRight, CreditCard, ReceiptText, Settings2 } from 'lucide-react';
import { currentUser } from '@/lib/auth';
import { PageHeader } from '@/components/page-header';
import { modalidadActual } from '@/lib/modalidad.server';

const sections = [
  { href: '/admin/configuracion/operacion', icon: Settings2, title: 'Operación', description: 'Turnos de caja y tipos de vehículo. Elegí qué necesita esta playa.' },
  { href: '/admin/configuracion/comprobantes', icon: ReceiptText, title: 'Comprobantes', description: 'Elegí cómo entregar comprobantes y recibos: WhatsApp, QR o impresión.' },
  { href: '/admin/configuracion/mercadopago', icon: CreditCard, title: 'Cobro con MercadoPago', description: 'La cuenta donde entra el dinero de los cobros con QR. Vale para todas las playas de la empresa.' },
];
export default async function ConfigurationPage() {
  const user = await currentUser();
  if (!['ADMIN', 'SUPER_ADMIN'].includes(user?.role ?? '')) redirect('/tickets');
  // En una playa gratuita no hay cobros ni comprobantes: ni MercadoPago, turnos de caja ni Tarifas.
  const gratuita = (await modalidadActual()) === 'GRATUITO';
  const disponibles = user?.role === 'SUPER_ADMIN' ? sections.filter(s => s.href !== '/admin/configuracion/mercadopago') : sections;
  const visibles = gratuita
    ? disponibles.filter((s) => s.href !== '/admin/configuracion/mercadopago' && s.href !== '/admin/configuracion/comprobantes').map((s) => s.href === '/admin/configuracion/operacion' ? { ...s, description: 'Tipos de vehículo de esta playa.' } : s)
    : disponibles;
  return <div className="container mx-auto max-w-4xl space-y-6 px-4 py-6">
    <PageHeader title="Configuración" breadcrumb={['Administración', 'Configuración']} description="Las opciones de trabajo y entrega de comprobantes de esta playa." />
    <div className="grid gap-4">{visibles.map(({ href, icon: Icon, title, description }) => <Link key={href} href={href} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 transition-colors hover:bg-secondary/30 sm:p-6">
      <Icon className="size-5 shrink-0 text-gm-yellow" />
      <div className="min-w-0 flex-1"><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </Link>)}</div>
    {!gratuita && <p className="text-sm text-muted-foreground">Para cambiar los importes o la forma de cobrar, entrá en <Link href="/admin/tarifas" className="font-semibold text-gm-yellow underline underline-offset-4">Tarifas</Link>.</p>}
  </div>;
}
