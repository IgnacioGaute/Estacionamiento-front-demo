export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronRight, CreditCard, ReceiptText, Settings2 } from 'lucide-react';
import { currentUser } from '@/lib/auth';
import { PageHeader } from '@/components/page-header';

const sections = [
  { href: '/admin/configuracion/operacion', icon: Settings2, title: 'Operación', description: 'Tipos de vehículo, tarjetas físicas y turnos de caja. Elegí qué necesita esta playa.' },
  { href: '/admin/configuracion/comprobantes', icon: ReceiptText, title: 'Comprobantes', description: 'Elegí cómo entregar comprobantes y recibos: WhatsApp, QR o impresión.' },
  { href: '/admin/configuracion/mercadopago', icon: CreditCard, title: 'Cobro con MercadoPago', description: 'La cuenta donde entra el dinero de los cobros con QR. Vale para todas las playas de la empresa.' },
];
export default async function ConfigurationPage() {
  const user = await currentUser();
  if (user?.role?.toUpperCase() !== 'ADMIN') redirect('/tickets');
  return <div className="container mx-auto max-w-4xl space-y-6 px-4 py-6">
    <PageHeader title="Configuración" breadcrumb={['Administración', 'Configuración']} description="Las opciones de trabajo y entrega de comprobantes de esta playa." />
    <div className="grid gap-4">{sections.map(({ href, icon: Icon, title, description }) => <Link key={href} href={href} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 transition-colors hover:bg-secondary/30 sm:p-6">
      <Icon className="size-5 shrink-0 text-gm-yellow" />
      <div className="min-w-0 flex-1"><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </Link>)}</div>
    <p className="text-sm text-muted-foreground">Para cambiar los importes o la forma de cobrar, entrá en <Link href="/admin/tarifas" className="font-semibold text-gm-yellow underline underline-offset-4">Tarifas</Link>.</p>
  </div>;
}
