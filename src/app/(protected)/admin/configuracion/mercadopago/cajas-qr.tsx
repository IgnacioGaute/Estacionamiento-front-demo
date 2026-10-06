'use client';

// Configuración → MercadoPago: el QR que se paga desde cualquier banco o billetera. Cada playa
// necesita su caja de MercadoPago, y MercadoPago pide la dirección de la sucursal. Se activa con
// un toque: se toma la ubicación del dispositivo y el sistema arma la dirección (provincia y ciudad
// como las acepta MercadoPago; calle y número, de la dirección de la playa). El formulario queda
// solo para cuando la ubicación no alcanza. Sin caja, el QR sigue siendo el link de siempre.

import { useEffect, useState, useTransition } from 'react';
import { CheckCircle2, LocateFixed, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/lib/toast';
import { CajasQr, DireccionCaja, UbicacionMp } from '@/types/mercadopago.type';
import {
  crearCajaQrAction,
  crearCajaQrConUbicacionAction,
  getCajasQrAction,
  getCiudadesQrAction,
  getProvinciasQrAction,
} from '@/actions/mercadopago/mercadopago.action';

type Borrador = {
  calle: string;
  numero: string;
  provincia: string;
  ciudad: string;
  latitud: string;
  longitud: string;
};

const vacio: Borrador = { calle: '', numero: '', provincia: '', ciudad: '', latitud: '', longitud: '' };

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

// La ubicación del dispositivo, como promesa.
function ubicacionActual(): Promise<{ latitud: number; longitud: number }> {
  return new Promise((resolver, rechazar) => {
    if (!navigator.geolocation) {
      rechazar(new Error('Este dispositivo no da la ubicación.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolver({ latitud: pos.coords.latitude, longitud: pos.coords.longitude }),
      () => rechazar(new Error('No se pudo obtener la ubicación. Revisá el permiso de ubicación del navegador.')),
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  });
}

const selectClase = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60';

// El respaldo: la dirección a mano, con provincia y ciudad elegidas del listado de MercadoPago (es
// lo único que valida; escritas a mano, «Lujan de Cuyo» sin tilde lo rechaza).
function FormularioCaja({
  playaId,
  inicial,
  alCrear,
}: {
  playaId: string;
  inicial: Borrador;
  alCrear: (c: CajasQr) => void;
}) {
  const [d, setD] = useState<Borrador>(inicial);
  const [provincias, setProvincias] = useState<UbicacionMp[]>([]);
  const [ciudades, setCiudades] = useState<UbicacionMp[]>([]);
  const [pendiente, startTransition] = useTransition();
  const [ubicando, setUbicando] = useState(false);
  const cambiar = (campo: keyof Borrador) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setD((v) => ({ ...v, [campo]: e.target.value }));

  useEffect(() => {
    void getProvinciasQrAction().then((r) => (r.error ? toast.error(r.error) : setProvincias(r.lista ?? [])));
  }, []);

  // Al elegir (o traer) la provincia, sus ciudades.
  const provinciaId = provincias.find((p) => p.nombre === d.provincia)?.id;
  useEffect(() => {
    setCiudades([]);
    if (!provinciaId) return;
    void getCiudadesQrAction(provinciaId).then((r) => (r.error ? toast.error(r.error) : setCiudades(r.lista ?? [])));
  }, [provinciaId]);

  const lat = Number(d.latitud.replace(',', '.'));
  const lng = Number(d.longitud.replace(',', '.'));
  const completo =
    !!d.calle.trim() && !!d.numero.trim() && !!d.provincia && ciudades.some((c) => c.nombre === d.ciudad) &&
    !!d.latitud && !!d.longitud && Number.isFinite(lat) && Number.isFinite(lng) &&
    Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

  const ubicarme = async () => {
    setUbicando(true);
    try {
      const u = await ubicacionActual();
      setD((v) => ({ ...v, latitud: u.latitud.toFixed(6), longitud: u.longitud.toFixed(6) }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo obtener la ubicación.');
    } finally {
      setUbicando(false);
    }
  };

  const crear = () =>
    startTransition(async () => {
      const direccion: DireccionCaja = {
        calle: d.calle.trim(),
        numero: d.numero.trim(),
        ciudad: d.ciudad,
        provincia: d.provincia,
        latitud: lat,
        longitud: lng,
      };
      const r = await crearCajaQrAction(playaId, direccion);
      if (r.error || !r.cajas) {
        toast.error(r.error ?? 'No se pudo crear la caja.');
        return;
      }
      toast.success('Listo: el QR de esta playa ya se paga desde cualquier banco o billetera.');
      alCrear(r.cajas);
    });

  return (
    <div className="space-y-3 rounded-lg border border-border bg-secondary/20 p-3">
      <p className="text-xs text-muted-foreground">
        Completá lo que falta. Provincia y ciudad salen del listado de MercadoPago, que es lo que valida.
      </p>
      <div className="grid gap-2 sm:grid-cols-[1fr_110px]">
        <Input placeholder="Calle" value={d.calle} onChange={cambiar('calle')} disabled={pendiente} />
        <Input placeholder="Número o S/N" value={d.numero} onChange={cambiar('numero')} disabled={pendiente} />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <select aria-label="Provincia" value={d.provincia} onChange={(e) => setD((v) => ({ ...v, provincia: e.target.value, ciudad: '' }))} disabled={pendiente || !provincias.length} className={selectClase}>
          <option value="">Provincia</option>
          {provincias.map((p) => (
            <option key={p.id} value={p.nombre}>
              {p.nombre}
            </option>
          ))}
        </select>
        <select aria-label="Ciudad" value={d.ciudad} onChange={cambiar('ciudad')} disabled={pendiente || !ciudades.length} className={selectClase}>
          <option value="">{d.provincia ? 'Ciudad' : 'Elegí la provincia'}</option>
          {ciudades.map((c) => (
            <option key={c.id} value={c.nombre}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Input placeholder="Latitud" value={d.latitud} onChange={cambiar('latitud')} disabled={pendiente} className="gm-mono" />
        <Input placeholder="Longitud" value={d.longitud} onChange={cambiar('longitud')} disabled={pendiente} className="gm-mono" />
        <Button type="button" variant="outline" onClick={() => void ubicarme()} disabled={pendiente || ubicando}>
          <LocateFixed className="mr-2 size-4" />
          {ubicando ? 'Ubicando…' : 'Usar mi ubicación'}
        </Button>
      </div>
      <div className="flex justify-end">
        <Button onClick={crear} disabled={pendiente || !completo}>
          {pendiente ? 'Creando en MercadoPago…' : 'Crear caja'}
        </Button>
      </div>
    </div>
  );
}

function FilaPlaya({
  playa,
  alCambiar,
}: {
  playa: CajasQr['playas'][number];
  alCambiar: (c: CajasQr) => void;
}) {
  const [activando, setActivando] = useState(false);
  // Abierto con lo que se haya detectado: el formulario es solo el respaldo.
  const [formulario, setFormulario] = useState<Borrador | null>(null);

  const activar = async () => {
    setActivando(true);
    try {
      const u = await ubicacionActual();
      const r = await crearCajaQrConUbicacionAction(playa.playaId, u.latitud, u.longitud);
      if (r.error || !r.resultado) {
        toast.error(r.error ?? 'No se pudo crear la caja.');
        setFormulario({ ...vacio, latitud: u.latitud.toFixed(6), longitud: u.longitud.toFixed(6) });
        return;
      }
      if (r.resultado.creada) {
        const caja = r.resultado.playas.find((p) => p.playaId === playa.playaId)?.caja;
        toast.success(
          caja?.direccion
            ? `Listo: QR activado en ${caja.direccion.calle} ${caja.direccion.numero}, ${caja.direccion.ciudad}.`
            : 'Listo: el QR de esta playa ya se paga desde cualquier banco o billetera.',
        );
        alCambiar(r.resultado);
        return;
      }
      const s = r.resultado.sugerencia;
      toast.error(r.resultado.motivo);
      setFormulario({
        calle: s.calle,
        numero: s.numero,
        provincia: s.provincia ?? '',
        ciudad: '',
        latitud: s.latitud.toFixed(6),
        longitud: s.longitud.toFixed(6),
      });
    } catch (error) {
      // Sin ubicación (permiso denegado, sin GPS): a mano.
      toast.error(error instanceof Error ? error.message : 'No se pudo obtener la ubicación.');
      setFormulario(vacio);
    } finally {
      setActivando(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{playa.nombre}</p>
          <p className="text-xs text-muted-foreground">
            {playa.caja
              ? `Activado el ${fecha(playa.caja.creadaEl)}${playa.caja.direccion ? ` · ${playa.caja.direccion.calle} ${playa.caja.direccion.numero}, ${playa.caja.direccion.ciudad}` : ''}`
              : 'Sin activar: el QR solo lo paga la app de MercadoPago'}
          </p>
        </div>
        {playa.caja ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400">
            <CheckCircle2 className="size-4" /> Cualquier banco
          </span>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => void activar()} disabled={activando}>
              <LocateFixed className="mr-2 size-4" />
              {activando ? 'Activando…' : 'Activar con mi ubicación'}
            </Button>
            {!formulario && (
              <button type="button" onClick={() => setFormulario(vacio)} className="text-xs text-muted-foreground underline">
                A mano
              </button>
            )}
          </div>
        )}
      </div>
      {!playa.caja && formulario && (
        <FormularioCaja
          playaId={playa.playaId}
          inicial={formulario}
          alCrear={(c) => {
            setFormulario(null);
            alCambiar(c);
          }}
        />
      )}
    </div>
  );
}

export function CajasQrConfig() {
  const [cajas, setCajas] = useState<CajasQr | null>(null);
  const [error, setError] = useState<string | null>(null);

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
              Activalo en cada playa, desde la playa: se usa la ubicación del dispositivo para crear su caja en
              MercadoPago. Después el QR del cobro se paga desde la app de cualquier banco o billetera (MODO, BNA+,
              Prex, Ualá, Cuenta DNI, MercadoPago…) y el sistema igual detecta el pago solo.
            </p>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {!cajas && !error && <p className="text-sm text-muted-foreground">Cargando playas…</p>}

        {cajas?.playas.map((p) => <FilaPlaya key={p.playaId} playa={p} alCambiar={setCajas} />)}
      </div>
    </section>
  );
}
