'use client';
import { DataLoading } from '@/components/ui/data-loading';

import { useEffect, useId, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

// El formulario de tarjeta de MercadoPago («Card Payment Brick»). Los campos de la tarjeta son de
// MercadoPago (se dibujan dentro de sus propios marcos): el panel nunca ve el número ni el código,
// solo recibe un token de un solo uso, que el backend usa para crear el débito automático. Por eso
// no hace falta cuenta de MercadoPago.

const SDK = 'https://sdk.mercadopago.com/js/v2';

type DatosTarjeta = { token: string; payer?: { email?: string } };
type ControladorBrick = { unmount: () => void };
type MercadoPagoSdk = new (
  clavePublica: string,
  opciones: { locale: string },
) => {
  bricks: () => {
    create: (tipo: 'cardPayment', contenedor: string, ajustes: unknown) => Promise<ControladorBrick>;
  };
};

declare global {
  interface Window {
    MercadoPago?: MercadoPagoSdk;
  }
}

// Se carga una sola vez y solo cuando alguien abre el formulario: el resto del panel no la necesita.
let cargando: Promise<MercadoPagoSdk> | null = null;
function cargarSdk() {
  if (window.MercadoPago) return Promise.resolve(window.MercadoPago);
  cargando ??= new Promise<MercadoPagoSdk>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SDK;
    script.async = true;
    script.onload = () => (window.MercadoPago ? resolve(window.MercadoPago) : reject(new Error('sin SDK')));
    script.onerror = () => {
      cargando = null;
      script.remove();
      reject(new Error('sin SDK'));
    };
    document.head.appendChild(script);
  });
  return cargando;
}

export function FormularioTarjeta({
  clavePublica,
  importe,
  email,
  alConfirmar,
}: {
  clavePublica: string;
  // Lo que se va a debitar por mes: MercadoPago lo usa para validar la tarjeta.
  importe: number;
  email: string;
  // Devuelve si quedó activo; si no, el formulario se habilita de nuevo para corregir la tarjeta.
  alConfirmar: (token: string, email: string) => Promise<boolean>;
}) {
  const contenedor = `tarjeta-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando');
  // El Brick se crea una vez; lo que cambie después se lee de acá.
  const confirmar = useRef(alConfirmar);
  confirmar.current = alConfirmar;

  useEffect(() => {
    let cancelado = false;
    let controlador: ControladorBrick | null = null;
    (async () => {
      try {
        const MercadoPago = await cargarSdk();
        if (cancelado) return;
        const mp = new MercadoPago(clavePublica, { locale: 'es-AR' });
        const creado = await mp.bricks().create('cardPayment', contenedor, {
          initialization: { amount: importe, payer: { email } },
          customization: {
            visual: {
              // El tema oscuro de MercadoPago es azul con botón turquesa: se lleva a los colores
              // del panel para que no parezca otra página.
              style: {
                theme: 'dark',
                customVariables: {
                  formBackgroundColor: '#14110D',
                  inputBackgroundColor: '#1B1915',
                  textPrimaryColor: '#F6F0E6',
                  textSecondaryColor: '#A79E8F',
                  baseColor: '#F5C219',
                  buttonTextColor: '#15120E',
                  outlinePrimaryColor: '#3A342B',
                  outlineSecondaryColor: '#2E2A23',
                  errorColor: '#FF8A8D',
                  borderRadiusSmall: '8px',
                  borderRadiusMedium: '12px',
                  borderRadiusLarge: '14px',
                  formPadding: '20px',
                },
              },
              texts: { formSubmit: 'Activar débito automático' },
            },
            // Un débito mensual no va en cuotas.
            paymentMethods: { maxInstallments: 1 },
          },
          callbacks: {
            onReady: () => !cancelado && setEstado('listo'),
            onSubmit: async (datos: DatosTarjeta) => {
              const ok = await confirmar.current(datos.token, datos.payer?.email || email);
              // Rechazar la promesa le devuelve el botón al formulario para que corrija la tarjeta.
              if (!ok) throw new Error('rechazada');
            },
            onError: () => !cancelado && setEstado((e) => (e === 'cargando' ? 'error' : e)),
          },
        });
        // Si el componente se fue mientras MercadoPago armaba el formulario, se desarma enseguida.
        if (cancelado) creado.unmount();
        else controlador = creado;
      } catch {
        if (!cancelado) setEstado('error');
      }
    })();
    return () => {
      cancelado = true;
      controlador?.unmount();
    };
  }, [clavePublica, contenedor, email, importe]);

  return (
    <div className="flex flex-col">
      {estado === 'cargando' && (
        <DataLoading label="Cargando formulario seguro…" className="p-5" />
      )}
      {estado === 'error' && (
        <p role="alert" className="m-0 px-5 py-5 text-[14px] leading-relaxed text-[#FF8A8D]">
          No pudimos abrir el formulario de tarjeta. Revisá tu conexión y recargá la página.
        </p>
      )}
      <div id={contenedor} className="min-h-[1px]" />
    </div>
  );
}
