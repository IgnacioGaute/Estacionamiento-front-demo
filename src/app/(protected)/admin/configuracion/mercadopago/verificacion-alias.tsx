'use client';

// Configuración → MercadoPago: activar la verificación de transferencias al alias y cargar el
// alias que ven los clientes. Separada del QR: el QR sigue funcionando igual tenga o no esto.
//
// Solo aparece activable si la plataforma habilitó el adicional para la empresa; el backend lo
// vuelve a verificar al guardar y en cada cobro.

import { useState, useTransition } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/lib/toast';
import { ConfiguracionAlias } from '@/types/verificacion-alias.type';
import { configurarAliasAction } from '@/actions/mercadopago/verificacion-alias.action';

const ALIAS_VALIDO = /^[A-Za-z0-9.-]{6,20}$/;

const fecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

export function VerificacionAliasConfig({ inicial }: { inicial: ConfiguracionAlias }) {
  const [config, setConfig] = useState(inicial);
  const [alias, setAlias] = useState(inicial.alias ?? '');
  const [activa, setActiva] = useState(inicial.activa);
  const [pendiente, startTransition] = useTransition();

  const aliasOk = ALIAS_VALIDO.test(alias.trim());
  const cambio = activa !== config.activa || alias.trim() !== (config.alias ?? '');

  const guardar = () =>
    startTransition(async () => {
      const r = await configurarAliasAction({ activa, ...(alias.trim() ? { alias: alias.trim() } : {}) });
      if (r.error || !r.datos) {
        toast.error(r.error ?? 'No se pudo guardar.');
        return;
      }
      setConfig(r.datos);
      setActiva(r.datos.activa);
      setAlias(r.datos.alias ?? '');
      toast.success(r.datos.activa ? 'Verificación por alias activada.' : 'Verificación por alias pausada.');
    });

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gm-yellow/[0.12] text-gm-yellow">
            <ArrowLeftRight className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Verificación de transferencias al alias</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Cuando el cajero cobra con «Transferencia al alias», el sistema detecta el ingreso en esta cuenta y registra
              la salida. Si hay dudas (dos transferencias iguales, dos autos del mismo importe), el cajero elige cuál es.
            </p>
          </div>
        </div>

        {!config.adicionalHabilitado ? (
          <p className="rounded-lg border border-border bg-secondary/30 p-3 text-sm text-muted-foreground">
            No está incluida en tu plan. Si querés usarla, pedísela a la plataforma.
          </p>
        ) : (
          <>
            <div className="space-y-1.5">
              <label htmlFor="alias-mp" className="text-sm font-medium">
                Alias de la cuenta
              </label>
              <Input
                id="alias-mp"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="playa.centro.mp"
                className="gm-mono"
                maxLength={20}
                disabled={pendiente}
                aria-invalid={!!alias && !aliasOk}
              />
              <p className="text-xs text-muted-foreground">
                {alias && !aliasOk
                  ? 'Entre 6 y 20 caracteres: letras, números, puntos o guiones.'
                  : 'Es el que se le muestra al cliente para transferir. MercadoPago no lo informa: copialo de tu cuenta.'}
              </p>
            </div>

            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-border p-3">
              <span>
                <span className="block text-sm font-medium">Ofrecer «Transferencia al alias» al cobrar</span>
                <span className="block text-xs text-muted-foreground">
                  {config.activa ? `Activada el ${fecha(config.cambiadaEl)}` : 'Pausada: el cajero no la ve.'}
                </span>
              </span>
              <Switch checked={activa} onCheckedChange={setActiva} disabled={pendiente} />
            </label>

            <div className="flex justify-end">
              <Button disabled={pendiente || !cambio || (activa && !aliasOk)} onClick={guardar}>
                {pendiente ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
