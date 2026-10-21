import { SoloConCobro } from '@/components/solo-con-cobro';

// En una playa gratuita no se entregan comprobantes (ver SoloConCobro).
export default function Layout({ children }: { children: React.ReactNode }) {
  return <SoloConCobro seccion="Comprobantes">{children}</SoloConCobro>;
}
