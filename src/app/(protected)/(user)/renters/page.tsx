export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { InquilinosPanel } from './components/cuenta/inquilinos-panel';

// La sección de inquilinos. Los datos de cuenta los pide el panel (y los vuelve a pedir después
// de cada cobro).
export default async function RenterPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 sm:p-8">
      <InquilinosPanel />
    </div>
  );
}
