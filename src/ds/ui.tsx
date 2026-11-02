import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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

/*
 * Counts a figure like "945", "3,500" or "80%" up from zero once it scrolls into view, keeping its prefix and suffix.
 * Screen readers get the final figure; reduced motion shows it straight away.
 */
export function CountUp({ value, ms = 2200, delay = 0 }: { value: string; ms?: number; delay?: number }) {
  const m = value.match(/^([^0-9]*)([0-9][0-9,.]*)(.*)$/);
  const still = typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const { ref, seen } = useSeen<HTMLSpanElement>();
  const [shown, setShown] = useState(m && !still ? `${m[1]}0${m[3]}` : value);
  useEffect(() => {
    if (!m || still) { setShown(value); return; }
    if (!seen) return;
    const target = parseFloat(m[2].replace(/,/g, ''));
    const decimals = (m[2].split('.')[1] || '').length;
    const start = performance.now() + delay;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.max(0, Math.min(1, (t - start) / ms));
      // Ease in and out (a gentle start and a soft landing) rather than a fast burst at the beginning.
      const n = target * (0.5 - Math.cos(Math.PI * p) / 2);
      const txt = n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
      setShown(`${m[1]}${txt}${m[3]}`);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, seen]); // eslint-disable-line react-hooks/exhaustive-deps
  // Reserve the final width so the words next to the number don't slide as digits are added.
  return <span ref={ref} className="ds-count" style={{ minWidth: `${value.length}ch` }}><span aria-hidden="true">{shown}</span><span className="ds-sr">{value}</span></span>;
}

/*
 * For heroes that fill the screen below the header: keeps --hz-top on the element set to where it starts on the page,
 * so CSS can size it to calc(100vh - var(--hz-top)). Re-measures when the window or the page above it changes size
 * (for example when the announcement bar appears after the content loads).
 */
export function useHeroTop<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let last = '';
    const measure = () => {
      const top = `${Math.round(el.getBoundingClientRect().top + window.scrollY)}px`;
      if (top !== last) { last = top; el.style.setProperty('--hz-top', top); }
    };
    measure();
    window.addEventListener('resize', measure);
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    return () => { window.removeEventListener('resize', measure); ro.disconnect(); };
  }, []);
  return ref;
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

/* A search box's placeholder that types out each example, waits, erases it and moves on (swaps whole examples for reduced motion). */
export function useTypedPlaceholder(examples: string[], paused: boolean) {
  const [shown, setShown] = useState(examples[0] ?? '');
  useEffect(() => {
    if (paused || !examples.length) return;
    if ((typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      let n = 0;
      const t = window.setInterval(() => { n = (n + 1) % examples.length; setShown(examples[n]); }, 3200);
      return () => window.clearInterval(t);
    }
    let n = 0, len = 0, erasing = false, timer = 0;
    const step = () => {
      const full = examples[n];
      if (!erasing && len < full.length) { len += 1; timer = window.setTimeout(step, 42 + Math.random() * 40); }
      else if (!erasing) { erasing = true; timer = window.setTimeout(step, 1700); }
      else if (len > 0) { len -= 1; timer = window.setTimeout(step, 18); }
      else { erasing = false; n = (n + 1) % examples.length; timer = window.setTimeout(step, 350); }
      setShown(examples[n].slice(0, len));
    };
    timer = window.setTimeout(step, 900);
    return () => window.clearTimeout(timer);
  }, [examples.join('|'), paused]); // eslint-disable-line react-hooks/exhaustive-deps
  return shown;
}
