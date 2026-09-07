'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';

export interface PageTourStep {
  key: string;
  selector: string;
  title: string;
  desc: string;
  radius?: number;
  /**
   * Se ejecuta una vez al entrar a este paso, antes de buscar el elemento —
   * pensado para cambiar de pestaña (u otro estado) cuando lo que hay que
   * mostrar vive en un <TabsContent> que todavía no está montado.
   */
  onEnter?: () => void;
}

const DURATION = 7000;

function tooltipStyle(
  pos: { top: number; left: number; width: number; height: number } | null,
): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
    width: 320,
    background: 'hsl(32 22% 9%)',
    border: '1px solid hsl(34 16% 28%)',
    borderRadius: 12,
    padding: 18,
    boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
  };
  if (!pos) return { ...base, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' };
  const spaceBelow = window.innerHeight - (pos.top + pos.height);
  const top = spaceBelow > 220 ? pos.top + pos.height + 14 : Math.max(14, pos.top - 14 - 260);
  const left = Math.min(Math.max(14, pos.left), window.innerWidth - 334);
  return { ...base, top, left };
}

interface Props {
  steps: PageTourStep[];
}

/**
 * Tour de ayuda genérico y reutilizable — mismo diseño y comportamiento que
 * CustomerPageTour (owners/renters/privates) y ticket-tour, pero recibiendo
 * los pasos por prop en vez de tenerlos hardcodeados, así cada página del
 * admin puede definir sus propias funcionalidades a explicar.
 */
export function PageTour({ steps }: Props) {
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
        prevElRef.current.style.zIndex = '';
        prevElRef.current.style.position = '';
        prevElRef.current = null;
      }
      setPos(null);
      return;
    }

    let scrolled = false;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    // Si el paso necesita otra pestaña (u otro estado) para que su elemento
    // exista, esto lo dispara antes de buscar — p. ej. cambiar de tab.
    steps[idx]?.onEnter?.();

    const snap = (attemptsLeft = 10) => {
      if (cancelled) return;

      if (prevElRef.current) {
        prevElRef.current.style.zIndex = '';
        prevElRef.current.style.position = '';
        prevElRef.current = null;
      }

      const step = steps[idx];
      const el = document.querySelector<HTMLElement>(step.selector);

      if (!el) {
        // El elemento puede no estar montado todavía (p. ej. justo después de
        // cambiar de pestaña) — reintenta unas cuantas veces antes de asumir
        // que el paso no aplica y saltarlo.
        if (attemptsLeft > 0) {
          retryTimer = setTimeout(() => snap(attemptsLeft - 1), 60);
          return;
        }
        setPos(null);
        if (idx + 1 < steps.length) {
          setIdx(prev => prev + 1);
        } else {
          setOpen(false);
        }
        return;
      }

      // Lleva el elemento a la vista una sola vez por paso, así el usuario no
      // tiene que scrollear a mano para seguir el tour.
      if (!scrolled) {
        scrolled = true;
        const r0 = el.getBoundingClientRect();
        const fullyVisible = r0.top >= 0 && r0.bottom <= window.innerHeight;
        if (!fullyVisible) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }

      const computedPos = window.getComputedStyle(el).position;
      if (computedPos === 'static') el.style.position = 'relative';
      el.style.zIndex = '9995';
      prevElRef.current = el;

      const r = el.getBoundingClientRect();
      setPos({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    const reposition = () => snap(0);

    snap();
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open, idx, steps]);

  useEffect(() => {
    if (!open) return;
    pausedRef.current = false;
    let tick = 0;
    const timer = setInterval(() => {
      if (pausedRef.current) return;
      tick += 100;
      if (tick >= DURATION) {
        tick = 0;
        if (idx + 1 >= steps.length) {
          setOpen(false);
        } else {
          setIdx(prev => prev + 1);
        }
      }
    }, 100);
    return () => clearInterval(timer);
  }, [open, idx, steps.length]);

  const close = () => {
    if (prevElRef.current) {
      prevElRef.current.style.zIndex = '';
      prevElRef.current.style.position = '';
      prevElRef.current = null;
    }
    setOpen(false);
    setIdx(0);
    setPos(null);
  };
  const start = () => { setIdx(0); setOpen(true); };
  const next = () => { if (idx + 1 >= steps.length) close(); else setIdx(prev => prev + 1); };
  const prev = () => { if (idx > 0) setIdx(i => i - 1); };

  const s = steps[idx] ?? steps[0];

  if (!s) return null;

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

      {mounted && open && createPortal(
        <>
          <div onClick={close} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 9990, cursor: 'pointer' }} />

          {pos && (
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
            />
          )}

          <div
            style={tooltipStyle(pos)}
            onMouseEnter={() => { pausedRef.current = true; }}
            onMouseLeave={() => { pausedRef.current = false; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(46 92% 53%)' }}>
                PASO {idx + 1} DE {steps.length}
              </span>
              <button onClick={close} style={{ background: 'transparent', border: 'none', color: 'hsl(34 12% 60%)', fontSize: 14, cursor: 'pointer', lineHeight: 1, padding: 0 }}>✕</button>
            </div>

            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: 'hsl(38 36% 92%)' }}>{s.title}</h3>
            <p style={{ margin: '0 0 14px', fontSize: 13.5, lineHeight: 1.5, color: 'hsl(34 12% 70%)' }}>{s.desc}</p>

            <div style={{ height: 3, borderRadius: 2, background: 'hsl(34 18% 18%)', overflow: 'hidden', marginBottom: 14 }}>
              <div
                key={`${idx}-${open}`}
                style={{ height: '100%', background: 'hsl(46 92% 53%)', animation: `gm-tour-progress ${DURATION}ms linear forwards` }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button onClick={close} style={{ background: 'transparent', border: 'none', color: 'hsl(34 12% 60%)', fontSize: 13, cursor: 'pointer', padding: 0 }}>Saltar tour</button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={prev} disabled={idx === 0} style={{ background: 'transparent', border: '1px solid hsl(34 18% 18%)', color: idx === 0 ? 'hsl(34 12% 35%)' : 'hsl(38 36% 92%)', fontSize: 13, fontWeight: 500, padding: '6px 14px', borderRadius: 7, cursor: idx === 0 ? 'default' : 'pointer' }}>Anterior</button>
                <button onClick={next} style={{ background: 'hsl(46 92% 53%)', border: 'none', color: 'hsl(30 78% 7%)', fontSize: 13, fontWeight: 700, padding: '6px 14px', borderRadius: 7, cursor: 'pointer' }}>
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
}
