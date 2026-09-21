'use client';
import { Fragment, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTenant } from '@/components/tenant-provider';
import { assistantChatAction } from '@/actions/assistant/chat.action';
import { captureScreenContext } from './screen-context';
import './assistant-widget.css';
import './assistant-font.css';

// `sinAnimar`: el texto ya se mostró mientras llegaba en streaming, así que al
// guardarlo como mensaje no hay que volver a animarlo palabra por palabra.
type Message = { role: 'user' | 'assistant'; text: string; consulted?: boolean; sinAnimar?: boolean };
type Point = { x: number; y: number };
const greeting: Message = { role: 'assistant', text: 'Hola. Soy el asistente de la playa. Preguntame cómo registrar una entrada, cobrar una salida o manejar turnos y abonos.' };
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, Math.max(min, max)));

export function AssistantWidget() {
  const { data: session } = useSession();
  const { playaId } = useTenant();
  const scope = `${session?.user?.id ?? ''}:${session?.user?.role ?? ''}:${playaId}`;
  if (!playaId || !session?.user || session.user.role === 'SUPER_ADMIN') return null;
  return <ScopedAssistant key={scope} />;
}

function RobotAvatar({ thinking = false }: { thinking?: boolean }) {
  return <span aria-hidden="true" className={`ai-avatar${thinking ? ' ai-avatar-thinking' : ''}`}>
    {thinking && <span className="ai-think-ring" />}
    <span className="ai-avatar-visor"><span /><span /></span>
  </span>;
}

function AnimatedText({ text }: { text: string }) {
  let word = 0;
  return <>{text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    const bold = part.startsWith('**') && part.endsWith('**');
    const content = (bold ? part.slice(2, -2) : part).split(/(\s+)/).map((token, i) => /^\s+$/.test(token) ? <Fragment key={i}>{token}</Fragment> : <span key={i} className="ai-word" style={{ animationDelay: `${Math.min(word++ * 30, 900)}ms` }}>{token}</span>);
    return bold ? <strong key={index}>{content}</strong> : <Fragment key={index}>{content}</Fragment>;
  })}</>;
}

function ScopedAssistant() {
  const pathname = usePathname();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Point | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0, top: 0, left: 0 });
  const [dragging, setDragging] = useState(false);
  const [messages, setMessages] = useState<Message[]>([greeting]);
  const [question, setQuestion] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  // Texto que va llegando del stream: se muestra sin animar y, al terminar, se
  // guarda como un mensaje más.
  const [parcial, setParcial] = useState('');
  const conversation = useRef<string | undefined>(undefined);
  const busy = useRef(false);
  const alive = useRef(true);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ startX: number; startY: number; x: number; y: number; moved: boolean } | undefined>(undefined);
  const suppressClick = useRef(false);
  useEffect(() => {
    alive.current = true;
    const fit = () => {
      const v = window.visualViewport;
      setViewport({ width: v?.width ?? innerWidth, height: v?.height ?? innerHeight, top: v?.offsetTop ?? 0, left: v?.offsetLeft ?? 0 });
      setPosition(p => p ? { x: clamp(p.x, 8, innerWidth - 80), y: clamp(p.y, 8, innerHeight - 64) } : null);
    };
    fit();
    try { const saved = JSON.parse(localStorage.getItem('assistant-position') || 'null'); if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) setPosition({ x: clamp(saved.x, 8, innerWidth - 80), y: clamp(saved.y, 8, innerHeight - 64) }); } catch {}
    window.addEventListener('resize', fit);
    window.visualViewport?.addEventListener('resize', fit);
    window.visualViewport?.addEventListener('scroll', fit);
    return () => { alive.current = false; window.removeEventListener('resize', fit); window.visualViewport?.removeEventListener('resize', fit); window.visualViewport?.removeEventListener('scroll', fit); };
  }, []);
  useEffect(() => { if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight; }, [messages, parcial, pending, error, open]);
  function close() { setOpen(false); launcher.current?.focus(); }
  const save = (p: Point) => { setPosition(p); try { localStorage.setItem('assistant-position', JSON.stringify(p)); } catch {} };
  async function send(text = question) {
    const q = text.trim();
    if (busy.current || !q) return;
    busy.current = true; setPending(true); setError(''); setQuestion(''); setParcial('');
    setMessages(m => [...m, { role: 'user', text: q }]);

    // Camino de respaldo: la acción de servidor de siempre, que devuelve la
    // respuesta completa. Se usa si el streaming no está disponible o falla.
    const completo = async () => {
      const result = await assistantChatAction(q, pathname, conversation.current, captureScreenContext());
      if (!alive.current) return;
      if (result.error || !result.answer) { setError(result.error || 'No se pudo responder.'); setQuestion(q); return; }
      conversation.current = result.conversationId;
      setMessages(m => [...m, { role: 'assistant', text: result.answer!, consulted: !!result.consulted?.length }]);
    };

    // Fuera del try: si el stream se corta a mitad, lo ya recibido sirve y evita
    // volver a preguntarle a Gemini, que sería pagar dos veces la misma consulta.
    let acumulado = '';

    // Se quedó por la mitad: si alcanzó a llegar texto, se muestra lo que hay; si
    // no llegó nada, recién ahí se vuelve a preguntar por el camino completo.
    const rescatar = async () => {
      if (acumulado) { setMessages(m => [...m, { role: 'assistant', text: acumulado, sinAnimar: true }]); return; }
      await completo();
    };

    try {
      const respuesta = await fetch('/api/assistant/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q, screen: pathname.slice(0, 160), conversationId: conversation.current, screenContext: captureScreenContext()?.slice(0, 8000) }),
      });
      if (!respuesta.ok || !respuesta.body || !(respuesta.headers.get('content-type') ?? '').includes('text/event-stream')) throw new Error('sin stream');

      const lector = respuesta.body.getReader();
      const decodificador = new TextDecoder();
      let resto = '';
      let cerrado = false;

      for (;;) {
        const { done, value } = await lector.read();
        if (done) break;
        if (!alive.current) { await lector.cancel().catch(() => {}); return; }
        resto += decodificador.decode(value, { stream: true });
        const lineas = resto.split('\n');
        resto = lineas.pop() ?? '';
        for (const linea of lineas) {
          if (!linea.startsWith('data:')) continue;
          let evento: any;
          try { evento = JSON.parse(linea.slice(5).trim()); } catch { continue; }

          if (evento.error) { setError(evento.error); setQuestion(q); setParcial(''); cerrado = true; continue; }
          if (evento.reinicio) { acumulado = ''; setParcial(''); continue; }
          if (evento.fin) {
            conversation.current = evento.conversationId ?? conversation.current;
            const texto = typeof evento.answer === 'string' && evento.answer ? evento.answer : acumulado;
            setParcial('');
            if (texto) setMessages(m => [...m, { role: 'assistant', text: texto, consulted: !!evento.consulted?.length, sinAnimar: true }]);
            else setError('No se pudo responder.');
            cerrado = true;
            continue;
          }
          if (typeof evento.texto === 'string') {
            acumulado += evento.texto;
            setPending(false);
            setParcial(acumulado);
          }
        }
      }
      // El stream cortó sin decir ni "fin" ni error.
      if (!cerrado) { setParcial(''); await rescatar(); }
    } catch {
      if (alive.current) { setParcial(''); await rescatar(); }
    } finally {
      if (alive.current) { busy.current = false; setPending(false); }
    }
  }
  if (!viewport.width) return null;
  const x = clamp(position?.x ?? viewport.width - 90, viewport.left + 8, viewport.left + viewport.width - 80);
  const y = clamp(position?.y ?? viewport.height - 90, viewport.top + 8, viewport.top + viewport.height - 64);
  // The source's 316 × 430 content box has a 1px border on each side.
  const width = Math.min(318, viewport.width - 24);
  const height = Math.min(432, viewport.height - 24);
  const px = clamp(x + 74 - width, viewport.left + 12, viewport.left + viewport.width - width - 12);
  const py = y - viewport.top > height + 18 ? y - height - 10 : clamp(y + 68, viewport.top + 12, viewport.top + viewport.height - height - 12);
  const examples = pathname.startsWith('/admin')
    ? ['¿Cómo cambio las tarifas?', '¿Cómo asigno una playa a un operador?', '¿Cómo reviso un cierre de caja?']
    : ['¿Cómo cierro mi turno?', '¿Cómo busco un auto por patente?', '¿Cómo registro un gasto?'];
  return createPortal(<div data-assistant-ui className="ai-widget">
    {open && <section role="dialog" aria-modal="false" aria-labelledby={`${panelId}-title`} id={panelId} className="ai-panel-position" style={{ left: px, top: py, width, height }} onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } }}>
      <div className="ai-panel">
        <header className="ai-header"><span aria-hidden="true" className="ai-header-star">✦</span><div className="ai-heading"><h2 id={`${panelId}-title`}>Asistente</h2><span>Asistente del sistema</span></div><button type="button" className="ai-close" aria-label="Cerrar asistente" onClick={close}>✕</button></header>
        <div ref={scroller} role="log" aria-label="Conversación con el asistente" aria-live="polite" aria-relevant="additions" className="ai-messages">
          {messages.map((m, i) => <div key={i} className={`ai-message ai-message-${m.role}`}>
            {m.role === 'assistant' && <RobotAvatar />}
            <div className="ai-bubble"><span className="sr-only">{m.role === 'user' ? 'Vos: ' : 'Asistente: '}</span>{m.sinAnimar ? m.text : <AnimatedText text={m.text} />}</div>
          </div>)}
          {parcial && <div className="ai-message ai-message-assistant">
            <RobotAvatar />
            <div className="ai-bubble"><span className="sr-only">Asistente: </span>{parcial}</div>
          </div>}
          {pending && <div role="status" aria-label="El asistente está pensando" className="ai-thinking"><RobotAvatar thinking /><div className="ai-thinking-bubble"><span className="ai-thinking-label">Pensando</span><span className="ai-dots" aria-hidden="true"><span /><span /><span /></span></div></div>}
          {error && <p role="alert" className="ai-error">
            {error}
            {/* La pregunta quedó escrita en el campo: el botón la reenvía sin que
                el operador tenga que volver a tipearla. */}
            {!!question.trim() && <button type="button" className="ai-retry" onClick={() => void send()}>Reintentar</button>}
          </p>}
        </div>
        {messages.length === 1 && !question.trim() && !pending && <div className="ai-chips">{examples.map(text => <button type="button" key={text} onClick={() => void send(text)}>{text}</button>)}</div>}
        <form onSubmit={e => { e.preventDefault(); void send(); }} className="ai-compose">
          <input ref={input} aria-label="Tu pregunta" value={question} disabled={pending} maxLength={1500} onChange={e => setQuestion(e.target.value)} placeholder="Preguntá sobre el sistema…" />
          <button type="submit" aria-label="Enviar pregunta" disabled={pending || !question.trim()}>↑</button>
        </form>
      </div>
    </section>}
    <div className={`ai-orb-position${dragging ? ' ai-dragging' : ''}`} style={{ left: x, top: y }}>
      <button ref={launcher} type="button" className="ai-orb" aria-expanded={open} aria-controls={panelId} aria-label="Abrir o cerrar asistente. Arrastrá para mover o usá las flechas del teclado." title="Asistente · arrastrá para mover"
        onPointerDown={e => { if (e.button !== 0) return; drag.current = { startX: e.clientX, startY: e.clientY, x, y, moved: false }; suppressClick.current = false; e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={e => { const d = drag.current; if (!d) return; const dx = e.clientX - d.startX, dy = e.clientY - d.startY; if (Math.abs(dx) + Math.abs(dy) > 5) d.moved = true; if (d.moved) { setDragging(true); setPosition({ x: clamp(d.x + dx, 8, innerWidth - 80), y: clamp(d.y + dy, 8, innerHeight - 64) }); } }}
        onPointerUp={e => { const d = drag.current; if (!d) return; suppressClick.current = d.moved; if (d.moved) save({ x: clamp(d.x + e.clientX - d.startX, 8, innerWidth - 80), y: clamp(d.y + e.clientY - d.startY, 8, innerHeight - 64) }); drag.current = undefined; setDragging(false); setTimeout(() => { suppressClick.current = false; }, 0); }}
        onPointerCancel={() => { drag.current = undefined; setDragging(false); suppressClick.current = false; }}
        onKeyDown={e => { if (e.key === 'Escape') { close(); return; } const delta: Record<string, [number, number]> = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] }; if (!delta[e.key]) return; e.preventDefault(); save({ x: clamp(x + delta[e.key][0], 8, innerWidth - 80), y: clamp(y + delta[e.key][1], 8, innerHeight - 64) }); }}
        onClick={e => { if (suppressClick.current) { suppressClick.current = false; return; } setOpen(v => !v); if (e.detail === 0 && !open) requestAnimationFrame(() => input.current?.focus()); }}>
        <span className="ai-halo" aria-hidden="true" /><span className="ai-visor" aria-hidden="true"><span className="ai-eyes"><span /><span /></span></span><span className="ai-smile" aria-hidden="true" />
      </button>
    </div>
  </div>, document.body);
}
