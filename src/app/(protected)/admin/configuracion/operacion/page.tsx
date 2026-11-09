'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ConfigTurnosCargando } from '../cargando';

// Operación se dividió en Turnos de caja y Tipos de vehículo. Los enlaces guardados a
// /admin/configuracion/operacion#vehiculos siguen funcionando; el # sólo se lee en el navegador.
export default function OperacionRedirect() {
  const router = useRouter();
  useEffect(() => {
    const destino = window.location.hash === '#vehiculos' ? 'vehiculos' : 'turnos';
    router.replace('/admin/configuracion/' + destino);
  }, [router]);
  return <ConfigTurnosCargando />;
}
