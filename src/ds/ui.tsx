import { useEffect, useRef, useState } from 'react';
import { LogoMark } from './LogoMark';
/* Small shared pieces for the redesigned pages. */

export function Icon({ d, size = 20, stroke = 1.8 }: { d: string; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export const I = {
  arrow: 'M5 12h14M13 6l6 6-6 6',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  code: 'M8 7l-5 5 5 5M16 7l5 5-5 5',
  play: 'M7 4.5l12 7.5-12 7.5z',
  shield: 'M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7zM9 12l2 2 4-4',
  network: 'M12 3.5a2 2 0 110 4 2 2 0 010-4zM5 16.5a2 2 0 110 4 2 2 0 010-4zM19 16.5a2 2 0 110 4 2 2 0 010-4zM12 7.5v4.5M12 12l-6 4.5M12 12l6 4.5',
  spark: 'M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.8 2 2 .8-2 .8L19 21l-.8-2.4-2-.8 2-.8z',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  rule: 'M12 3l9 9-9 9-9-9zM12 9v3M12 15h.01',
  doc: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h4',
  db: 'M5 6c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3zM5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3',
  lock: 'M6 11h12v10H6zM8.5 11V8a3.5 3.5 0 017 0v3M12 15v2',
  key: 'M15 7a3 3 0 11-6 0 3 3 0 016 0zM5 21v-1a7 7 0 0114 0v1',
  audit: 'M9 4h6M9 4a2 2 0 00-2 2H5v15h14V6h-2a2 2 0 00-2-2M9 13l2 2 4-4',
  agent: 'M7 8h10a3 3 0 013 3v5a3 3 0 01-3 3H7a3 3 0 01-3-3v-5a3 3 0 013-3zM12 4v4M9.5 13h.01M14.5 13h.01M9.5 16h5',
  chat: 'M4 5h16v11H9l-5 4z',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
};

/** The logo's rings symbol (see LogoMark). `light` = white and lavender, for coloured backgrounds. */
export function Rings({ width = 40, light = false }: { width?: number; light?: boolean }) {
  return <LogoMark width={width} tone={light ? 'light' : 'color'} />;
}


/* Steps through 0..count-1 on a timer. Pauses while hovered and for a while after a click; off for reduced motion. */
export function useAutoplay(count: number, ms = 4200) {
  const [i, setI] = useState(0);
  const [hover, setHover] = useState(false);
  const [on, setOn] = useState(false);
  const last = useRef(0);
  useEffect(() => { setOn(!window.matchMedia('(prefers-reduced-motion: reduce)').matches); }, []);
  useEffect(() => {
    if (!on || count < 2) return;
    const t = window.setInterval(() => {
      if (hover || Date.now() - last.current < 9000) return;
      setI((x) => (x + 1) % count);
    }, ms);
    return () => window.clearInterval(t);
  }, [on, hover, count, ms]);
  const go = (n: number) => { last.current = Date.now(); setI(((n % count) + count) % count); };
  return { i: Math.min(i, Math.max(0, count - 1)), go, running: on && !hover, bind: { onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false) } };
}

/* Adds data-seen="1" once the element scrolls into view, for one-time reveal animations. */
export function useSeen<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) { setSeen(true); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, seen };
}
