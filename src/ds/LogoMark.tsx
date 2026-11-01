import { useId } from 'react';

/**
 * The OneOfficeAutomation rings symbol, drawn from the master logo (public/brand/ooa-logo.svg): two shaded rings,
 * the blue one passing over the violet one. `tone="light"` is a flat white-and-lavender version for coloured backgrounds.
 * Each copy gets its own gradient ids, so several logos on one page never clash.
 */
export function LogoMark({ width = 40, tone = 'color', title }: { width?: number; tone?: 'color' | 'light'; title?: string }) {
  const id = useId().replace(/:/g, '');
  const b = `${id}b`, v = `${id}v`;
  const height = Math.round((width * 99) / 155);
  const blue = tone === 'light' ? '#FFFFFF' : `url(#${b})`;
  const violet = tone === 'light' ? '#D6C4FF' : `url(#${v})`;
  return (
    <svg width={width} height={height} viewBox="40 29 155 99" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true} focusable="false">
      {tone === 'color' && (
        <defs>
          <radialGradient id={b} gradientUnits="userSpaceOnUse" cx="89.5" cy="78.5" r="48.5">
            <stop offset="0.7856" stopColor="#004F80" /><stop offset="0.8242" stopColor="#07649C" /><stop offset="0.9099" stopColor="#1C77B0" /><stop offset="0.9614" stopColor="#07649C" /><stop offset="1" stopColor="#004F80" />
          </radialGradient>
          <radialGradient id={v} gradientUnits="userSpaceOnUse" cx="145.5" cy="78.5" r="48.5">
            <stop offset="0.7856" stopColor="#6A3FBF" /><stop offset="0.8242" stopColor="#8458D8" /><stop offset="0.9099" stopColor="#9668E2" /><stop offset="0.9614" stopColor="#8458D8" /><stop offset="1" stopColor="#6A3FBF" />
          </radialGradient>
        </defs>
      )}
      <circle cx="89.5" cy="78.5" r="43.3" fill="none" stroke={blue} strokeWidth="10.4" />
      <circle cx="145.5" cy="78.5" r="43.3" fill="none" stroke={violet} strokeWidth="10.4" />
      {/* the stretch of the blue ring that passes over the violet one */}
      <path d="M131.325,89.707 A43.3,43.3 0 0 1 107.799,117.743" fill="none" stroke={blue} strokeWidth="10.4" />
    </svg>
  );
}
