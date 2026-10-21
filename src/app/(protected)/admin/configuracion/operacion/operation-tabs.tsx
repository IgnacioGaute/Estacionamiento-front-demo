'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { CarFront, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
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
    <div role="tablist" aria-label="Secciones de operación" className={cn("grid gap-1 rounded-2xl border border-gm-line bg-gm-surface p-1", tabs.length === 2 ? "grid-cols-2" : "grid-cols-1")}>
      {tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" role="tab" id={'tab-' + id} aria-selected={tab === id} aria-controls={'panel-' + id} onClick={() => choose(id)}
        className={cn('flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-center text-[12.5px] font-semibold leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gm-yellow sm:flex-row sm:gap-2 sm:text-sm',
          tab === id ? 'bg-gm-surface-3 text-foreground shadow-[inset_0_0_0_1px_hsl(var(--gm-line-strong))]' : 'text-muted-foreground hover:bg-gm-surface-2 hover:text-foreground')}>
        <Icon className={cn('size-4 shrink-0', tab === id && 'text-gm-yellow')} aria-hidden />{label}
      </button>)}
    </div>
    {tabs.map(({ id }) => <div key={id} role="tabpanel" id={'panel-' + id} aria-labelledby={'tab-' + id} hidden={tab !== id} className="space-y-6">{panels[id]}</div>)}
  </div>;
}
