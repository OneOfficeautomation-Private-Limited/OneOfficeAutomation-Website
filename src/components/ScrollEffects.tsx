import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

/*
 * Three small scroll effects for the whole public site, built to stay light (only transform and opacity change, nothing is measured on every frame):
 *  1. Reveal on scroll: blocks and cards ease in as they come into view, once. Grids of cards come in one after another.
 *  2. A thin progress line under the top of the screen showing how far down a long page you are.
 *  3. On phones, a slim "Book a demo / Try it free" bar once you have scrolled past the first screen.
 * Visitors who prefer reduced motion get no reveal (everything is simply there).
 */

const SKIP_INSIDE = '.hz-hero, .hs, .pf-parts, header, footer, .ck, [data-no-reveal], form[role=search]';
const NO_BAR = ['/contact', '/signup', '/signin', '/forgot', '/reset', '/account', '/partner/login', '/partner/forgot'];

function reveal(el: HTMLElement, delay: number) {
  el.setAttribute('data-rv', '1');
  // Once the entrance has played, hand the element back to its own styles (hover effects and so on).
  window.setTimeout(() => { el.removeAttribute('data-rv'); el.style.removeProperty('--rv-d'); }, 1300 + delay);
}

function useReveal(pathname: string) {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const main = document.getElementById('main');
    if (!main) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        io.unobserve(el);
        reveal(el, Number.parseInt(el.style.getPropertyValue('--rv-d') || '0', 10) || 0);
      }
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0 });

    const mark = (el: HTMLElement, i: number) => {
      if (el.hasAttribute('data-rv') || el.dataset.rvDone) return;
      const cs = getComputedStyle(el);
      // Leave alone anything that already animates itself, sticks, floats or is hidden.
      if (cs.animationName !== 'none' || cs.position === 'sticky' || cs.position === 'fixed' || cs.display === 'none' || el.offsetHeight < 8) return;
      // Already scrolled past (above the screen): never hide it, there would be nothing to trigger the reveal.
      if (el.getBoundingClientRect().bottom < 0) return;
      el.dataset.rvDone = '1';
      el.style.setProperty('--rv-d', `${Math.min(i, 6) * 70}ms`);
      el.setAttribute('data-rv', '0');
      io.observe(el);
    };

    const scan = () => {
      const first = main.querySelector('section');
      main.querySelectorAll<HTMLElement>('section > .ds-container > *, section > .ds-container > * > .hx-head').forEach((block) => {
        if (block.closest(SKIP_INSIDE) || (first && first.contains(block)) || block.closest('[data-rv]')?.hasAttribute('data-rv') && block.closest('[data-rv]') !== block) return;
        const kids = Array.from(block.children) as HTMLElement[];
        const cs = getComputedStyle(block);
        // A grid of cards: bring the cards in one after another instead of the whole grid at once.
        if (cs.display === 'grid' && kids.length >= 2 && kids.length <= 12) kids.forEach((k, i) => mark(k, i));
        else mark(block, 0);
      });
    };

    let timer = 0;
    const later = () => { window.clearTimeout(timer); timer = window.setTimeout(scan, 120); };
    scan();
    const mo = new MutationObserver(later);
    mo.observe(main, { childList: true, subtree: true });
    // Safety net: if anything is still hidden while on screen after a few seconds, show it.
    const safety = window.setTimeout(() => {
      main.querySelectorAll<HTMLElement>('[data-rv="0"]').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) { io.unobserve(el); reveal(el, 0); }
      });
    }, 3500);
    return () => { io.disconnect(); mo.disconnect(); window.clearTimeout(timer); window.clearTimeout(safety); main.querySelectorAll<HTMLElement>('[data-rv]').forEach((el) => { el.removeAttribute('data-rv'); el.style.removeProperty('--rv-d'); delete el.dataset.rvDone; }); };
  }, [pathname]);
}

export default function ScrollEffects() {
  const { pathname } = useLocation();
  const bar = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  useReveal(pathname);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (bar.current) {
        bar.current.style.transform = `scaleX(${p})`;
        bar.current.style.opacity = max > window.innerHeight * 1.2 && window.scrollY > 8 ? '1' : '0';
      }
      // The phone bar: after the first screen, away from the footer, and not over the cookie banner.
      const footer = document.querySelector('footer');
      const nearFooter = !!footer && footer.getBoundingClientRect().top < window.innerHeight - 8;
      const want = window.innerWidth <= 760 && window.innerHeight >= 480 && window.scrollY > window.innerHeight * 0.7 && !nearFooter && !document.querySelector('.ck') && !NO_BAR.includes(pathname);
      setShow((s) => (s === want ? s : want));
      doc.dataset.sd = want ? '1' : '0';
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.addEventListener('ooa-consent', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); window.removeEventListener('ooa-consent', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [pathname]);

  return (
    <>
      <div className="sp" ref={bar} aria-hidden="true" />
      {show && (
        <div className="sd" role="region" aria-label="Quick actions">
          <Link className="ds-btn ds-btn-grad" to="/contact">Book a demo</Link>
          <Link className="ds-btn ds-btn-outline" to="/signup">Try it free</Link>
        </div>
      )}
    </>
  );
}
