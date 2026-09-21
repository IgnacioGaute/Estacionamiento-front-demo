'use client';

import { Children, useEffect, useRef, useState, type ReactNode } from 'react';
import styles from './animated-scroll-list.module.css';

// Inspired by React Bits Animated List; native buttons retain their normal keyboard behavior.
export function AnimatedScrollList({ children, label }: { children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ top: 0, bottom: 0 });
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        entry.target.setAttribute('data-visible', String(entry.isIntersecting && entry.intersectionRatio >= .5));
      });
    }, { root, threshold: .5 });
    Array.from(root.children).forEach(child => observer.observe(child));
    const updateEdges = () => setEdges({
      top: Math.min(root.scrollTop / 50, 1),
      bottom: Math.max(0, Math.min((root.scrollHeight - root.clientHeight - root.scrollTop) / 50, 1)),
    });
    updateEdges();
    root.addEventListener('scroll', updateEdges, { passive: true });
    const resize = new ResizeObserver(updateEdges);
    resize.observe(root);
    return () => { observer.disconnect(); resize.disconnect(); root.removeEventListener('scroll', updateEdges); };
  }, [children]);
  return <div className={styles.frame}>
    <div ref={ref} role="region" aria-label={label} tabIndex={0} className={styles.list}>
      {Children.toArray(children).map((child, index) => <div key={(child as { key?: string }).key ?? index} className={styles.item}><div>{child}</div></div>)}
    </div>
    <div aria-hidden className={styles.topFade} style={{ opacity: edges.top }} />
    <div aria-hidden className={styles.bottomFade} style={{ opacity: edges.bottom }} />
  </div>;
}
