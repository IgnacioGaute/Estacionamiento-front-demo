'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { CarFront, Wallet } from 'lucide-react';
import { Segmento } from '@/components/ui/segmento';
import { useTenant } from '@/components/tenant-provider';

// Tickets por código de barras (BarcodeTicketsSetting) está oculto por ahora; volverá como pestaña.
const TABS = [
  { id: 'turnos', label: 'Turnos de caja', icon: Wallet },
  { id: 'vehiculos', label: 'Vehículos', icon: CarFront },
] as const;
type TabId = typeof TABS[number]['id'];

// Operación junta cosas que no dependen entre sí: los turnos de caja y los vehículos que recibe la
// playa. Cada una va en su pestaña; los enlaces existentes a #vehiculos abren la que corresponde.
export function OperationTabs({ panels }: { panels: Record<TabId, ReactNode> }) {
  // En una playa gratuita no hay turnos de caja: queda solo Vehículos.
  const { cobroHabilitado } = useTenant();
  const tabs = cobroHabilitado ? TABS : TABS.filter((item) => item.id !== 'turnos');
  const [tab, setTab] = useState<TabId>(cobroHabilitado ? 'turnos' : 'vehiculos');
  useEffect(() => {
    const read = () => { const hash = window.location.hash.slice(1); if (tabs.some(item => item.id === hash)) setTab(hash as TabId); };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);
  const choose = (id: TabId) => { setTab(id); window.history.replaceState(null, '', '#' + id); };
  return <div className="space-y-6">
    {/* Rubber Segment (ui/segmento): la pastilla se estira hacia la sección elegida. */}
    <Segmento aria-label="Secciones de operación" size="lg" ancho value={tab} onChange={(id) => choose(id as TabId)}
      items={tabs.map(({ id, label, icon: Icon }) => ({ value: id, label, icon: <Icon className="size-4 shrink-0" aria-hidden /> }))} />
    {tabs.map(({ id }) => <div key={id} role="tabpanel" id={'panel-' + id} aria-label={tabs.find((item) => item.id === id)?.label} hidden={tab !== id} className="space-y-6">{panels[id]}</div>)}
  </div>;
}
