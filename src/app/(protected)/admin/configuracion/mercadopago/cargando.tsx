import { Cargando, EsqueletoSeccion, Hueso } from '@/components/esqueletos';

// Mercado Pago mientras carga: la tarjeta de la conexión (estado, cuenta y botón) y las secciones de
// abajo (verificación por alias, cajas con QR, comisiones).
export function MercadoPagoCargando({ conTitulo = false }: { conTitulo?: boolean }) {
  return (
    <Cargando texto="Cargando MercadoPago…" className="block space-y-5">
      {conTitulo && <EsqueletoSeccion />}
      <div className="space-y-4 rounded-2xl border border-gm-line bg-card p-5">
        <div className="flex items-center gap-3"><Hueso className="size-11 rounded-xl" /><div className="flex-1 space-y-2"><Hueso className="h-4 w-48" /><Hueso className="h-3 w-64 max-w-full" /></div><Hueso className="h-7 w-24 rounded-full" /></div>
        <Hueso className="h-11 w-44 rounded-md sm:h-9" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-3 rounded-2xl border border-gm-line bg-card p-5">
          <Hueso className="h-5 w-52" /><Hueso className="h-3 w-full" /><Hueso className="h-3 w-2/3" />
        </div>
      ))}
    </Cargando>
  );
}
