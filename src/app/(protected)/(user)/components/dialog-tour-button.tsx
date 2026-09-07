'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';

const DURATION = 7000;

// Any pointerdown landing on an element with this attribute is treated as
// "inside" the dialog by DialogContent's onPointerDownOutside guard — see
// payment-summary-customer-table.tsx.
export const TOUR_POPUP_ATTR = 'data-gm-tour-popup';

const STEPS = [
  {
    key: 'header',
    selector: '[data-dialog-tour="header"]',
    title: 'Información del cliente',
    desc: 'Nombre, tipo, cocheras asignadas, teléfono y estado de mora. El badge naranja indica cuántos días de atraso tiene.',
    radius: 4,
  },
  {
    key: 'timeline',
    selector: '[data-dialog-tour="timeline"]',
    title: 'Estado de cuenta',
    desc: 'Cada tarjeta es un mes. Verde = pagado, naranja = pendiente. Hacé click en un mes para filtrar el saldo en el panel derecho.',
    radius: 8,
  },
  {
    key: 'receipts',
    selector: '[data-dialog-tour="receipts"]',
    title: 'Recibos emitidos',
    desc: 'Todos los recibos del cliente con número, estado, fecha e importe.',
    radius: 8,
  },
  {
    key: 'receipt-actions',
    selector: '[data-dialog-tour="receipt-actions"]',
    title: 'Acciones del recibo',
    desc: 'Desde este menú podés imprimir el recibo, registrar el pago, ver movimientos o cancelarlo.',
    radius: 6,
  },
  {
    key: 'sidebar',
    selector: '[data-dialog-tour="sidebar"]',
    title: 'Saldo y datos del abono',
    desc: 'Saldo total pendiente o importe del mes seleccionado. Registrá el pago o enviá un recordatorio por WhatsApp directamente desde acá.',
    radius: 8,
  },
];

function getTooltipStyle(
  pos: { top: number; left: number; width: number; height: number } | null,
): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
    width: 300,
    background: 'hsl(32 22% 9%)',
    border: '1px solid hsl(34 16% 28%)',
    borderRadius: 12,
    padding: 18,
    boxShadow: '0 12px 40px rgba(0,0,0,0.85)',
    // Modal Dialog sets `document.body.style.pointerEvents = 'none'` while
    // open and only re-enables it on the dialog's own layer node. Since this
    // tooltip is portaled to document.body as a sibling, it inherits that
    // `none` and would otherwise swallow every click on it.
    pointerEvents: 'auto',
  };
  if (!pos) return { ...base, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' };
  const spaceBelow = window.innerHeight - (pos.top + pos.height);
  const top = spaceBelow > 220 ? pos.top + pos.height + 14 : Math.max(14, pos.top - 14 - 260);
  const left = Math.min(Math.max(14, pos.left + pos.width - 300), window.innerWidth - 314);
  return { ...base, top, left };
}

export function DialogTourButton() {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const pausedRef = useRef(false);
  const prevElRef = useRef<HTMLElement | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) {
      if (prevElRef.current) {
        prevElRef.current.style.outline = '';
        prevElRef.current = null;
      }
      setPos(null);
      return;
    }

    let scrolled = false;

    const snap = () => {
      if (prevElRef.current) {
        prevElRef.current.style.outline = '';
        prevElRef.current = null;
      }

      const step = STEPS[idx];
      const el = document.querySelector<HTMLElement>(step.selector);

      if (!el) {
        setPos(null);
        if (idx + 1 < STEPS.length) {
          setIdx(prev => prev + 1);
        } else {
          setOpen(false);
        }
        return;
      }

      // Lleva el elemento a la vista una sola vez por paso (dentro del
      // contenedor scrolleable del diálogo), así no hay que bajar a mano.
      if (!scrolled) {
        scrolled = true;
        const r0 = el.getBoundingClientRect();
        const fullyVisible = r0.top >= 0 && r0.bottom <= window.innerHeight;
        if (!fullyVisible) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }

      el.style.outline = '2px solid transparent';
      prevElRef.current = el;

      const r = el.getBoundingClientRect();
      setPos({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    snap();
    window.addEventListener('resize', snap);
    window.addEventListener('scroll', snap, true);
    return () => {
      window.removeEventListener('resize', snap);
      window.removeEventListener('scroll', snap, true);
    };
  }, [open, idx]);

  useEffect(() => {
    if (!open) return;
    pausedRef.current = false;
    let tick = 0;
    const timer = setInterval(() => {
      if (pausedRef.current) return;
      tick += 100;
      if (tick >= DURATION) {
        tick = 0;
        if (idx + 1 >= STEPS.length) {
          setOpen(false);
        } else {
          setIdx(prev => prev + 1);
        }
      }
    }, 100);
    return () => clearInterval(timer);
  }, [open, idx]);

  const close = () => {
    if (prevElRef.current) {
      prevElRef.current.style.outline = '';
      prevElRef.current = null;
    }
    setOpen(false);
    setIdx(0);
    setPos(null);
  };
  const start = () => { setIdx(0); setOpen(true); };
  const next = () => { if (idx + 1 >= STEPS.length) close(); else setIdx(prev => prev + 1); };
  const prev = () => { if (idx > 0) setIdx(i => i - 1); };

  const s = STEPS[idx] ?? STEPS[0];

  return (
    <>
      <button
        onClick={start}
        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-semibold transition-colors"
        style={
          open
            ? { color: 'hsl(46 92% 53%)', borderColor: 'hsl(46 92% 53% / 0.4)', background: 'hsl(46 92% 53% / 0.08)', animation: 'gm-tour-pulse 1.6s ease-in-out infinite' }
            : { color: 'hsl(46 92% 53%)', borderColor: 'hsl(46 92% 53% / 0.4)', background: 'hsl(46 92% 53% / 0.08)' }
        }
      >
        <HelpCircle size={14} />
        Ayuda
      </button>

      {/*
        Both the ring and the tooltip are portaled straight to document.body
        and positioned with real viewport coordinates. DialogContent has a
        translate transform, which makes it the containing block for any
        `position: fixed` descendant rendered INSIDE it — that used to send
        the tooltip's Anterior/Siguiente buttons off to the wrong spot and
        clip them under the dialog's overflow-hidden. Portaling sidesteps
        that entirely; DialogContent's onPointerDownOutside (see
        payment-summary-customer-table.tsx) is told to ignore clicks on
        anything tagged with TOUR_POPUP_ATTR so Radix doesn't treat them as
        an outside click and close the dialog.
      */}
      {mounted && open && pos && createPortal(
        <div
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: pos.width,
            height: pos.height,
            borderRadius: s.radius ?? 8,
            boxShadow: '0 0 0 3px hsl(46 92% 53% / 0.95), 0 0 30px 6px hsl(46 92% 53% / 0.35)',
            zIndex: 9994,
            pointerEvents: 'none',
          }}
        />,
        document.body,
      )}

      {mounted && open && createPortal(
        <div
          {...{ [TOUR_POPUP_ATTR]: true }}
          style={getTooltipStyle(pos)}
          onMouseEnter={() => { pausedRef.current = true; }}
          onMouseLeave={() => { pausedRef.current = false; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(46 92% 53%)' }}>
              PASO {idx + 1} DE {STEPS.length}
            </span>
            <button onClick={close} style={{ background: 'transparent', border: 'none', color: 'hsl(34 12% 60%)', fontSize: 14, cursor: 'pointer', lineHeight: 1, padding: 0 }}>✕</button>
          </div>

          <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: 'hsl(38 36% 92%)' }}>{s.title}</h3>
          <p style={{ margin: '0 0 14px', fontSize: 13, lineHeight: 1.5, color: 'hsl(34 12% 70%)' }}>{s.desc}</p>

          <div style={{ height: 3, borderRadius: 2, background: 'hsl(34 18% 18%)', overflow: 'hidden', marginBottom: 14 }}>
            <div
              key={`${idx}-${open}`}
              style={{ height: '100%', background: 'hsl(46 92% 53%)', animation: `gm-tour-progress ${DURATION}ms linear forwards` }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={close} style={{ background: 'transparent', border: 'none', color: 'hsl(34 12% 60%)', fontSize: 12, cursor: 'pointer', padding: 0 }}>Saltar tour</button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={prev}
                disabled={idx === 0}
                style={{ background: 'transparent', border: '1px solid hsl(34 18% 18%)', color: idx === 0 ? 'hsl(34 12% 35%)' : 'hsl(38 36% 92%)', fontSize: 12, fontWeight: 500, padding: '5px 12px', borderRadius: 7, cursor: idx === 0 ? 'default' : 'pointer' }}
              >
                Anterior
              </button>
              <button
                onClick={next}
                style={{ background: 'hsl(46 92% 53%)', border: 'none', color: 'hsl(30 78% 7%)', fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 7, cursor: 'pointer' }}
              >
                {idx === STEPS.length - 1 ? 'Finalizar' : 'Siguiente'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
