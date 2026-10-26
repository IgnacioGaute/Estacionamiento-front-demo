'use client';

// Planes y cobros → el QR para que las empresas paguen el plan desde cualquier banco o billetera.
// Cobra en la cuenta de MercadoPago de la PLATAFORMA (la tuya), no en la que conectó cada empresa.
// MercadoPago pide una sucursal y una caja en esa cuenta, con dirección: se crea una vez, como la
// caja de una playa (con la ubicación del dispositivo; el formulario es el respaldo). Después
// «Pagar tu plan» ofrece «Pagar con QR».

import { useEffect, useState, useTransition } from 'react';
import { CheckCircle2, LocateFixed, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/lib/toast';
import type { CajaQrPlataforma } from '@/types/suscripcion.type';
import {
  crearCajaQrPlataformaAction,
  crearCajaQrPlataformaConUbicacionAction,
  getCajaQrPlataformaAction,
  getCiudadesQrPlataformaAction,
  getProvinciasQrPlataformaAction,
} from '@/actions/suscripciones/suscripciones.action';

type Borrador = { calle: string; numero: string; provincia: string; ciudad: string; latitud: string; longitud: string };
const vacio: Borrador = { calle: '', numero: '', provincia: '', ciudad: '', latitud: '', longitud: '' };
type Lugar = { id: string; nombre: string };

const selectClase = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60';

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

// A mano: provincia y ciudad del listado de MercadoPago (es lo que valida), con coordenadas.
function Formulario({ inicial, alCrear }: { inicial: Borrador; alCrear: (c: CajaQrPlataforma) => void }) {
  const [d, setD] = useState<Borrador>(inicial);
  const [provincias, setProvincias] = useState<Lugar[]>([]);
  const [ciudades, setCiudades] = useState<Lugar[]>([]);
  const [pendiente, startTransition] = useTransition();
  const [ubicando, setUbicando] = useState(false);
  const cambiar = (campo: keyof Borrador) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setD((v) => ({ ...v, [campo]: e.target.value }));

  useEffect(() => {
    void getProvinciasQrPlataformaAction().then((r) => (r.error ? toast.error(r.error) : setProvincias(r.data ?? [])));
  }, []);

  const provinciaId = provincias.find((p) => p.nombre === d.provincia)?.id;
  useEffect(() => {
    setCiudades([]);
    if (!provinciaId) return;
    void getCiudadesQrPlataformaAction(provinciaId).then((r) => (r.error ? toast.error(r.error) : setCiudades(r.data ?? [])));
  }, [provinciaId]);

  const lat = Number(d.latitud.replace(',', '.'));
  const lng = Number(d.longitud.replace(',', '.'));
  const completo =
    !!d.calle.trim() && !!d.numero.trim() && !!d.provincia && ciudades.some((c) => c.nombre === d.ciudad) &&
    !!d.latitud && !!d.longitud && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

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
      const r = await crearCajaQrPlataformaAction({
        calle: d.calle.trim(),
        numero: d.numero.trim(),
        ciudad: d.ciudad,
        provincia: d.provincia,
        latitud: lat,
        longitud: lng,
      });
      if (!r.data) {
        toast.error(r.error ?? 'No se pudo crear la caja.');
        return;
      }
      toast.success('Listo: las empresas ya pueden pagar el plan con QR.');
      alCrear(r.data);
    });

  return (
    <div className="space-y-3 rounded-lg border border-border bg-secondary/20 p-3">
      <p className="text-xs text-muted-foreground">
        La dirección de tu sucursal en MercadoPago. Provincia y ciudad salen de su listado, que es lo que valida.
      </p>
      <div className="grid gap-2 sm:grid-cols-[1fr_110px]">
        <Input placeholder="Calle" value={d.calle} onChange={cambiar('calle')} disabled={pendiente} />
        <Input placeholder="Número o S/N" value={d.numero} onChange={cambiar('numero')} disabled={pendiente} />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <select aria-label="Provincia" value={d.provincia} onChange={(e) => setD((v) => ({ ...v, provincia: e.target.value, ciudad: '' }))} disabled={pendiente || !provincias.length} className={selectClase}>
          <option value="">Provincia</option>
          {provincias.map((p) => (
            <option key={p.id} value={p.nombre}>{p.nombre}</option>
          ))}
        </select>
        <select aria-label="Ciudad" value={d.ciudad} onChange={cambiar('ciudad')} disabled={pendiente || !ciudades.length} className={selectClase}>
          <option value="">{d.provincia ? 'Ciudad' : 'Elegí la provincia'}</option>
          {ciudades.map((c) => (
            <option key={c.id} value={c.nombre}>{c.nombre}</option>
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

export function QrPlataforma() {
  const [estado, setEstado] = useState<CajaQrPlataforma | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activando, setActivando] = useState(false);
  const [formulario, setFormulario] = useState<Borrador | null>(null);

  useEffect(() => {
    void getCajaQrPlataformaAction().then((r) => (r.data ? setEstado(r.data) : setError(r.error ?? null)));
  }, []);

  const activar = async () => {
    setActivando(true);
    try {
      const u = await ubicacionActual();
      const r = await crearCajaQrPlataformaConUbicacionAction(u.latitud, u.longitud);
      if (!r.data) {
        toast.error(r.error ?? 'No se pudo crear la caja.');
        setFormulario({ ...vacio, latitud: u.latitud.toFixed(6), longitud: u.longitud.toFixed(6) });
        return;
      }
      if (r.data.creada === false) {
        const s = r.data.sugerencia;
        toast.error(r.data.motivo);
        setFormulario({ calle: s.calle, numero: s.numero, provincia: s.provincia ?? '', ciudad: '', latitud: s.latitud.toFixed(6), longitud: s.longitud.toFixed(6) });
        return;
      }
      toast.success('Listo: las empresas ya pueden pagar el plan con QR.');
      setEstado(r.data);
    } catch (error) {
      // Sin ubicación (permiso denegado, sin GPS): a mano.
      toast.error(error instanceof Error ? error.message : 'No se pudo obtener la ubicación.');
      setFormulario(vacio);
    } finally {
      setActivando(false);
    }
  };

  const activo = !!estado?.caja;

  return (
    <section className="rounded-xl border border-[#26231E] bg-[#161411] p-4 sm:p-5">
      <div className="flex flex-wrap items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gm-yellow/[0.12] text-gm-yellow">
          <QrCode className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="m-0 text-[15px] font-semibold">Pago del plan con QR</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            {activo
              ? `Activo. Las empresas pagan desde cualquier banco o billetera y la plata entra a tu cuenta de MercadoPago${estado?.caja?.direccion ? ` · sucursal: ${estado.caja.direccion}` : ''}.`
              : estado && !estado.configurado
                ? 'Primero configurá el MercadoPago de la plataforma (MERCADOPAGO_PLATAFORMA_ACCESS_TOKEN en el backend).'
                : 'Para ofrecer «Pagar con QR» en «Pagar tu plan», MercadoPago pide una sucursal y una caja en tu cuenta, con su dirección. Se crea una sola vez.'}
          </p>
        </div>
        {activo ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400">
            <CheckCircle2 className="size-4" aria-hidden /> Activo
          </span>
        ) : estado?.configurado ? (
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
        ) : null}
      </div>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      {!activo && estado?.configurado && formulario && (
        <div className="mt-3">
          <Formulario
            inicial={formulario}
            alCrear={(c) => {
              setFormulario(null);
              setEstado(c);
            }}
          />
        </div>
      )}
    </section>
  );
}
