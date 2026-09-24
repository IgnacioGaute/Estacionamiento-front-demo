'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';

export interface TourStep {
  key: string;
  title: string;
  desc: string;
  /**
   * Se ejecuta al entrar al paso, antes de medir el elemento. Sirve para dejar
   * visible lo que el paso quiere mostrar: en celular las secciones viven en
   * pestañas, y sin esto el foco se dibuja sobre un elemento oculto (0×0).
   */
  onEnter?: () => void;
}

interface Pos {
  top: number;
  left: number;
  width: number;
  height: number;
}


function tooltipStyle(pos: Pos | null): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'fixed',
    zIndex: 50,
    width: 'min(320px, calc(100vw - 24px))',
    maxHeight: 'calc(100dvh - 28px)',
    overflowY: 'auto',
    background: 'hsl(32 22% 9%)',
    border: '1px solid hsl(34 16% 28%)',
    borderRadius: 12,
    padding: 18,
    boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
  };
  if (!pos) return { ...base, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' };
  const spaceBelow = window.innerHeight - (pos.top + pos.height);
  const top = spaceBelow > 220 ? pos.top + pos.height + 14 : Math.max(14, pos.top - 14 - 260);
  const left = Math.max(12, Math.min(Math.max(12, pos.left), window.innerWidth - 332));
  return { ...base, top, left };
}

export interface TourHandle {
  refFor: (key: string) => (el: HTMLElement | null) => void;
  isActive: (key: string) => boolean;
  node: React.ReactNode;
}

export function useTour(steps: TourStep[]): TourHandle {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [pos, setPos] = useState<Pos | null>(null);
  const [mounted, setMounted] = useState(false);
  const elsRef = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => { setMounted(true); }, []);

  // Reposition + resize + auto-scroll the target into view on smaller screens
  useEffect(() => {
    if (!open) return;
    setPos(null);
    let scrolled = false;

    // Si el paso necesita cambiar de pestaña para que su sección exista, esto lo
    // dispara antes de medir.
    steps[idx]?.onEnter?.();

    const snap = () => {
      const el = elsRef.current[steps[idx]?.key];
      // Puede no estar montado todavía (recién cambiamos de pestaña) o estar
      // oculto: en los dos casos medirlo daría 0×0 y el foco quedaría flotando.
      if (!el || el.getBoundingClientRect().width === 0) return false;
      if (!scrolled) {
        scrolled = true;
        const r0 = el.getBoundingClientRect();
        const fullyVisible = r0.top >= 0 && r0.bottom <= window.innerHeight;
        if (!fullyVisible) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const r = el.getBoundingClientRect();
      setPos({ top: r.top, left: r.left, width: r.width, height: r.height });
      return true;
    };

    // El cambio de pestaña de onEnter monta la sección un render después, así que
    // reintenta un rato antes de rendirse en vez de medir el vacío.
    let intentos = 12;
    let reloj: ReturnType<typeof setTimeout> | undefined;
    const intentar = () => {
      if (snap() || intentos-- <= 0) return;
      reloj = setTimeout(intentar, 60);
    };
    intentar();

    window.addEventListener('resize', snap);
    window.addEventListener('scroll', snap, true);
    return () => {
      if (reloj) clearTimeout(reloj);
      window.removeEventListener('resize', snap);
      window.removeEventListener('scroll', snap, true);
    };
  }, [open, idx, steps]);


  const close = () => { setOpen(false); setPos(null); };
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); setPos(null); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  const start = () => { setIdx(0); setOpen(true); };
  const next  = () => { if (idx + 1 >= steps.length) close(); else setIdx(prev => prev + 1); };
  const prev  = () => { if (idx > 0) setIdx(i => i - 1); };

  const refFor = (key: string) => (el: HTMLElement | null) => { elsRef.current[key] = el; };
  const isActive = (key: string) => open && steps[idx]?.key === key;

  const s = steps[idx] ?? steps[0];

  const node = (
    <>
      <button
        onClick={start}
        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-semibold transition-colors"
        style={
          open
            ? {
                color: 'hsl(46 92% 53%)',
                borderColor: 'hsl(46 92% 53% / 0.4)',
                background: 'hsl(46 92% 53% / 0.08)',
                animation: 'gm-tour-pulse 1.6s ease-in-out infinite',
              }
            : {
                color: 'hsl(46 92% 53%)',
                borderColor: 'hsl(46 92% 53% / 0.4)',
                background: 'hsl(46 92% 53% / 0.08)',
              }
        }
      >
        <HelpCircle size={14} />
        Ayuda
      </button>

      {mounted && open && createPortal(
        <>
          {/* Overlay */}
          <div
            onClick={close}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 40, cursor: 'pointer' }}
          />

          {/* Tooltip */}
          <div
            style={tooltipStyle(pos)}
            role="dialog"
            aria-label="Ayuda de Tickets"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(46 92% 53%)' }}>
                PASO {idx + 1} DE {steps.length}
              </span>
              <button
                aria-label="Cerrar recorrido de ayuda"
                onClick={close}
                style={{ background: 'transparent', border: 'none', color: 'hsl(34 12% 60%)', fontSize: 14, cursor: 'pointer', lineHeight: 1, padding: 0 }}
              >
                ✕
              </button>
            </div>

            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: 'hsl(38 36% 92%)' }}>{s.title}</h3>
            <p style={{ margin: '0 0 14px', fontSize: 13.5, lineHeight: 1.5, color: 'hsl(34 12% 70%)' }}>{s.desc}</p>

            {/* Progress bar */}
            <div style={{ height: 3, borderRadius: 2, background: 'hsl(34 18% 18%)', overflow: 'hidden', marginBottom: 14 }}>
              <div
                key={`${idx}-${open}`}
                style={{
                  height: '100%',
                  background: 'hsl(46 92% 53%)',
                  width: `${((idx + 1) / steps.length) * 100}%`,
                  transition: 'width 200ms ease',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                onClick={close}
                style={{ background: 'transparent', border: 'none', color: 'hsl(34 12% 60%)', fontSize: 13, cursor: 'pointer', padding: 0 }}
              >
                Saltar tour
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={prev}
                  disabled={idx === 0}
                  style={{
                    background: 'transparent',
                    border: '1px solid hsl(34 18% 18%)',
                    color: idx === 0 ? 'hsl(34 12% 35%)' : 'hsl(38 36% 92%)',
                    fontSize: 13, fontWeight: 500,
                    padding: '6px 14px', borderRadius: 7,
                    cursor: idx === 0 ? 'default' : 'pointer',
                  }}
                >
                  Anterior
                </button>
                <button
                  onClick={next}
                  style={{
                    background: 'hsl(46 92% 53%)',
                    border: 'none',
                    color: 'hsl(30 78% 7%)',
                    fontSize: 13, fontWeight: 700,
                    padding: '6px 14px',
                    borderRadius: 7, cursor: 'pointer',
                  }}
                >
                  {idx === steps.length - 1 ? 'Finalizar' : 'Siguiente'}
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body,
      )}
    </>
  );

  return { refFor, isActive, node };
}

/** Inline style for highlighted elements */
export const tourHighlight: React.CSSProperties = {
  boxShadow: '0 0 0 3px hsl(46 92% 53% / 0.95), 0 0 30px 6px hsl(46 92% 53% / 0.35)',
  zIndex: 45,
  transform: 'scale(1.012)',
  borderRadius: '1rem',
};

export const tourTransition: React.CSSProperties = {
  transition: 'box-shadow .25s ease, transform .25s ease',
  position: 'relative',
};
