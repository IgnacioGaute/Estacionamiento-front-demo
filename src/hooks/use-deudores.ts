'use client';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useTenant } from '@/components/tenant-provider';
import { getDeudoresAction } from '@/actions/cuentas/cuentas.action';
import type { Deudores } from '@/types/cuenta.type';
import { useForegroundPoll } from './use-foreground-poll';

// Después de un cobro o de cargar abonos la tabla lo avisa y el contador del menú se actualiza.
export const EVENTO_CUENTAS_CAMBIARON = 'cuentas-cambiaron';

// Inquilinos con deuda vencida, para el contador rojo del menú: aparte de los avisos, no se marca
// como leído y baja cuando pagan. Solo administración y con la sección de inquilinos prendida.
// Si falla (sin red, empresa suspendida) no muestra nada: no es motivo para un error en pantalla.
export function useDeudores() {
  const { playaId, inquilinosEnabled } = useTenant();
  const { data: session } = useSession();
  const rol = session?.user?.role;
  const habilitado = !!playaId && !!inquilinosEnabled && (rol === 'ADMIN' || rol === 'SUPER_ADMIN');
  const [deudores, setDeudores] = useState<Deudores>(null);
  const actualizar = useCallback(() => {
    if (!habilitado) return;
    getDeudoresAction().then((r) => { if (r.data !== undefined) setDeudores(r.data); }).catch(() => {});
  }, [habilitado]);
  useEffect(() => {
    setDeudores(null);
    if (!habilitado) return;
    actualizar();
    window.addEventListener(EVENTO_CUENTAS_CAMBIARON, actualizar);
    return () => window.removeEventListener(EVENTO_CUENTAS_CAMBIARON, actualizar);
  }, [habilitado, playaId, actualizar]);
  useForegroundPoll(actualizar, 120000, { immediate: false, enabled: habilitado });
  return habilitado ? deudores : null;
}
