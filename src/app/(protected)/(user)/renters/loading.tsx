import { InquilinosCargando } from './components/cuenta/cargando';

// Inquilinos mientras carga: la forma de la pantalla, con el mismo contenedor que la página.
export default function Loading() {
  return <div className="container mx-auto max-w-7xl px-4 py-6 sm:p-8"><InquilinosCargando /></div>;
}
