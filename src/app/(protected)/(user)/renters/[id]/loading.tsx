import { CuentaCargando } from '../components/cuenta/cargando';

// La cuenta de un inquilino mientras carga, con el mismo contenedor que la página.
export default function Loading() {
  return <div className="container mx-auto max-w-7xl px-4 py-6 sm:p-8"><CuentaCargando /></div>;
}
