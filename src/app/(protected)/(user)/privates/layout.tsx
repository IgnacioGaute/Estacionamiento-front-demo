import { SoloConCobro } from '@/components/solo-con-cobro';

// Sección de dinero: en una playa gratuita se reemplaza por una explicación (ver SoloConCobro).
export default function Layout({ children }: { children: React.ReactNode }) {
  return <SoloConCobro seccion="Particulares">{children}</SoloConCobro>;
}
