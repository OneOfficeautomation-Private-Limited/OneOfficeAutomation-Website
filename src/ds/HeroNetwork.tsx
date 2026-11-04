import { useEffect, useRef } from 'react';

/*
 * The faint "agent network" behind the home hero: nodes drift slowly, nearby nodes are linked,
 * and small pulses of light travel along the links like data moving between systems.
 * Nodes near the pointer brighten. It pauses off screen and in background tabs, and is drawn
 * once, without motion, for visitors who prefer reduced motion.
 */
type Node = { x: number; y: number; vx: number; vy: number; r: number };
type Pulse = { a: number; b: number; t: number; speed: number };

const LINK = 150;          // px: nodes closer than this are linked
const BLUE = '143, 184, 255';
const VIOLET = '183, 156, 255';

export function HeroNetwork() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0, h = 0, raf = 0, visible = true, last = performance.now();
    let nodes: Node[] = [];
    let pulses: Pulse[] = [];
    const pointer = { x: -9999, y: -9999 };

    const setup = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.5 : 2);
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(18, Math.min(64, Math.round((w * h) / 22000)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.12, vy: (Math.random() - 0.5) * 0.12, r: 1 + Math.random() * 1.6,
      }));
      pulses = [];
    };

    const draw = (dt: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const n of nodes) {
        n.x += n.vx * dt; n.y += n.vy * dt;
        if (n.x < -20) n.x = w + 20; else if (n.x > w + 20) n.x = -20;
        if (n.y < -20) n.y = h + 20; else if (n.y > h + 20) n.y = -20;
      }
      const links: [number, number][] = [];
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d > LINK) continue;
          links.push([i, j]);
          ctx.strokeStyle = `rgba(${BLUE}, ${(1 - d / LINK) * 0.16})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      for (const n of nodes) {
        const near = Math.max(0, 1 - Math.hypot(n.x - pointer.x, n.y - pointer.y) / 180);
        ctx.fillStyle = `rgba(${near > 0.05 ? VIOLET : BLUE}, ${0.35 + near * 0.5})`;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r + near * 1.8, 0, Math.PI * 2); ctx.fill();
      }
      // Start a pulse on a random link now and then; move the others along their link.
      if (!still && links.length && pulses.length < 6 && Math.random() < 0.035) {
        const [a, b] = links[Math.floor(Math.random() * links.length)];
        pulses.push({ a, b, t: 0, speed: 0.0007 + Math.random() * 0.0006 });
      }
      pulses = pulses.filter((p) => p.t <= 1);
      for (const p of pulses) {
        p.t += p.speed * dt;
        const a = nodes[p.a], b = nodes[p.b];
        if (Math.hypot(a.x - b.x, a.y - b.y) > LINK) { p.t = 2; continue; }
        const x = a.x + (b.x - a.x) * p.t, y = a.y + (b.y - a.y) * p.t;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 7);
        g.addColorStop(0, `rgba(${VIOLET}, .9)`); g.addColorStop(1, `rgba(${VIOLET}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(now - last, 50); last = now;
      if (visible && !document.hidden) draw(dt);
      raf = requestAnimationFrame(loop);
    };

    setup();
    if (still) { draw(0); } else { raf = requestAnimationFrame(loop); }

    const onResize = () => { setup(); if (still) draw(0); };
    const ro = new ResizeObserver(onResize);
    ro.observe(canvas);
    const io = new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); last = performance.now(); });
    io.observe(canvas);
    const hero = canvas.parentElement;
    const onMove = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top; };
    const onLeave = () => { pointer.x = -9999; pointer.y = -9999; };
    hero?.addEventListener('pointermove', onMove);
    hero?.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      hero?.removeEventListener('pointermove', onMove); hero?.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return <canvas ref={ref} className="hz-net" aria-hidden="true" />;
}
