'use client';

// Configuración → MercadoPago: el QR que se paga desde cualquier banco o billetera. Para eso cada
// playa necesita su caja de MercadoPago, y MercadoPago pide la dirección completa de la sucursal
// (con coordenadas). Se carga una vez por playa. Sin caja, el QR sigue siendo el link de siempre,
// que solo paga la app de MercadoPago o la cámara del celular.

import { useEffect, useState, useTransition } from 'react';
import { CheckCircle2, LocateFixed, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/lib/toast';
import { CajasQr, DireccionCaja } from '@/types/mercadopago.type';
import { crearCajaQrAction, getCajasQrAction } from '@/actions/mercadopago/mercadopago.action';

const PROVINCIAS = [
  'Buenos Aires',
  'Capital Federal',
  'Catamarca',
  'Chaco',
  'Chubut',
  'Córdoba',
  'Corrientes',
  'Entre Ríos',
  'Formosa',
  'Jujuy',
  'La Pampa',
  'La Rioja',
  'Mendoza',
  'Misiones',
  'Neuquén',
  'Río Negro',
  'Salta',
  'San Juan',
  'San Luis',
  'Santa Cruz',
  'Santa Fe',
  'Santiago del Estero',
  'Tierra del Fuego',
  'Tucumán',
];

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

function FormularioCaja({ playaId, alCrear }: { playaId: string; alCrear: (c: CajasQr) => void }) {
  const [d, setD] = useState({ calle: '', numero: '', ciudad: '', provincia: '', latitud: '', longitud: '', referencia: '' });
  const [pendiente, startTransition] = useTransition();
  const [ubicando, setUbicando] = useState(false);
  const cambiar = (campo: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setD((v) => ({ ...v, [campo]: e.target.value }));

  const lat = Number(d.latitud.replace(',', '.'));
  const lng = Number(d.longitud.replace(',', '.'));
  const completo =
    d.calle.trim() && d.numero.trim() && d.ciudad.trim() && d.provincia &&
    d.latitud && d.longitud && Number.isFinite(lat) && Number.isFinite(lng) &&
    Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

  // El administrador suele estar en la playa: la ubicación del dispositivo alcanza.
  const ubicarme = () => {
    if (!navigator.geolocation) {
      toast.error('Este dispositivo no da la ubicación. Copiá las coordenadas desde Google Maps.');
      return;
    }
    setUbicando(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUbicando(false);
        setD((v) => ({ ...v, latitud: pos.coords.latitude.toFixed(6), longitud: pos.coords.longitude.toFixed(6) }));
      },
      () => {
        setUbicando(false);
        toast.error('No se pudo obtener la ubicación. Copiá las coordenadas desde Google Maps.');
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const crear = () =>
    startTransition(async () => {
      const direccion: DireccionCaja = {
        calle: d.calle.trim(),
        numero: d.numero.trim(),
        ciudad: d.ciudad.trim(),
        provincia: d.provincia,
        latitud: lat,
        longitud: lng,
        ...(d.referencia.trim() ? { referencia: d.referencia.trim() } : {}),
      };
      const r = await crearCajaQrAction(playaId, direccion);
      if (r.error || !r.cajas) {
        toast.error(r.error ?? 'No se pudo crear la caja.');
        return;
      }
      toast.success('Caja creada: el QR de esta playa ya se paga desde cualquier banco o billetera.');
      alCrear(r.cajas);
    });

  return (
    <div className="space-y-3 rounded-lg border border-border bg-secondary/20 p-3">
      <p className="text-xs text-muted-foreground">
        MercadoPago pide la dirección de la playa para crear su sucursal y su caja. Se carga una sola vez.
      </p>
      <div className="grid gap-2 sm:grid-cols-[1fr_110px]">
        <Input placeholder="Calle" value={d.calle} onChange={cambiar('calle')} disabled={pendiente} />
        <Input placeholder="Número" value={d.numero} onChange={cambiar('numero')} disabled={pendiente} inputMode="numeric" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input placeholder="Ciudad" value={d.ciudad} onChange={cambiar('ciudad')} disabled={pendiente} />
        <select
          aria-label="Provincia"
          value={d.provincia}
          onChange={cambiar('provincia')}
          disabled={pendiente}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Provincia</option>
          {PROVINCIAS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Input placeholder="Latitud (ej. -34.6037)" value={d.latitud} onChange={cambiar('latitud')} disabled={pendiente} className="gm-mono" />
        <Input placeholder="Longitud (ej. -58.3816)" value={d.longitud} onChange={cambiar('longitud')} disabled={pendiente} className="gm-mono" />
        <Button type="button" variant="outline" onClick={ubicarme} disabled={pendiente || ubicando}>
          <LocateFixed className="mr-2 size-4" />
          {ubicando ? 'Ubicando…' : 'Usar mi ubicación'}
        </Button>
      </div>
      <Input placeholder="Referencia (opcional, ej. «frente a la plaza»)" value={d.referencia} onChange={cambiar('referencia')} disabled={pendiente} />
      <div className="flex justify-end">
        <Button onClick={crear} disabled={pendiente || !completo}>
          {pendiente ? 'Creando en MercadoPago…' : 'Crear caja'}
        </Button>
      </div>
    </div>
  );
}

export function CajasQrConfig() {
  const [cajas, setCajas] = useState<CajasQr | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);

  useEffect(() => {
    void getCajasQrAction().then((r) => (r.error ? setError(r.error) : setCajas(r.cajas ?? null)));
  }, []);

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gm-yellow/[0.12] text-gm-yellow">
            <QrCode className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">QR para cualquier banco o billetera</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Con la caja de MercadoPago de la playa, el QR del cobro se paga desde la app de cualquier banco o
              billetera (MODO, BNA+, Ualá, Cuenta DNI, MercadoPago…), y el sistema igual detecta el pago solo. Sin
              caja, el QR solo lo paga la app de MercadoPago o la cámara del celular.
            </p>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {!cajas && !error && <p className="text-sm text-muted-foreground">Cargando playas…</p>}

        {cajas?.playas.map((p) => (
          <div key={p.playaId} className="space-y-3 rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{p.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  {p.caja
                    ? `Caja creada el ${fecha(p.caja.creadaEl)}${p.caja.direccion ? ` · ${p.caja.direccion.calle} ${p.caja.direccion.numero}, ${p.caja.direccion.ciudad}` : ''}`
                    : 'Sin caja: el QR es el link de MercadoPago'}
                </p>
              </div>
              {p.caja ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400">
                  <CheckCircle2 className="size-4" /> Cualquier banco
                </span>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setAbierta(abierta === p.playaId ? null : p.playaId)}>
                  {abierta === p.playaId ? 'Cerrar' : 'Crear caja'}
                </Button>
              )}
            </div>
            {!p.caja && abierta === p.playaId && (
              <FormularioCaja
                playaId={p.playaId}
                alCrear={(c) => {
                  setCajas(c);
                  setAbierta(null);
                }}
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
