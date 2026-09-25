/**
 * Platform backdrop (Project Owner request 2026-09-25): soft green/cyan waves with line-art herbs, spices and kitchen
 * objects kept to the edges and corners, so the centre stays calm behind content. Used by the landing page, sign-in,
 * the tenant and platform consoles and the status pages — never by a restaurant's public website, which paints its
 * own theme on its own page wrapper (ADR-013 §6).
 *
 * - Pure vector, no image files: sharp at every density, a few kilobytes, nothing to download.
 * - Every colour is a brand token at low alpha (`--primary` green, `--accent`/`--secondary`), so the same artwork is
 *   pastel on the light theme and a faint glow on the dark theme with no extra palette (design tokens, ADR-013/018).
 * - Decorative only: `aria-hidden`, `pointer-events-none`, behind everything (`-z-10` inside the page's isolated
 *   stacking context), fixed to the viewport so it never adds scroll width.
 */

const LINE_GREEN = "rgb(var(--primary) / 0.55)";
const LINE_CYAN = "rgb(var(--accent) / 0.55)";

/** Shared stroke style for the line art. */
function Art({ children, className, viewBox = "0 0 200 200" }: { children: React.ReactNode; className: string; viewBox?: string }) {
  return (
    <svg viewBox={viewBox} fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden focusable="false">
      {children}
    </svg>
  );
}

function Leaf({ x, y, r = 0, s = 1, color = LINE_GREEN }: { x: number; y: number; r?: number; s?: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} stroke={color}>
      <path d="M0 0 C 10 -14, 30 -16, 44 -2 C 30 12, 10 12, 0 0 Z" />
      <path d="M2 0 L 40 -2 M14 -1 L 20 -8 M24 -1 L 31 -8 M14 1 L 21 7 M26 0 L 32 6" />
    </g>
  );
}

function Sprig({ x, y, r = 0, s = 1, color = LINE_GREEN }: { x: number; y: number; r?: number; s?: number; color?: string }) {
  // A coriander-like sprig: a stem with rounded lobed leaves.
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} stroke={color}>
      <path d="M0 60 C 6 40, 10 22, 22 4" />
      <path d="M10 34 C 2 30, -6 32, -8 40 C -2 44, 6 42, 10 34 Z" />
      <path d="M14 22 C 22 16, 32 18, 34 26 C 26 30, 18 28, 14 22 Z" />
      <path d="M20 8 C 14 0, 18 -8, 26 -8 C 30 -2, 26 6, 20 8 Z" />
    </g>
  );
}

function Chilli({ x, y, r = 0, s = 1 }: { x: number; y: number; r?: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} stroke="rgb(var(--danger) / 0.45)">
      <path d="M6 6 C 20 10, 40 30, 56 64 C 58 70, 52 70, 48 64 C 34 40, 18 22, 2 14 Z" />
      <path d="M6 6 C 2 0, 4 -6, 10 -8 M6 6 C 10 2, 16 2, 18 6" stroke={LINE_GREEN} />
    </g>
  );
}

function Bowl({ x, y, s = 1, color = LINE_CYAN }: { x: number; y: number; s?: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={color}>
      <path d="M0 30 H 80 C 78 52, 62 64, 40 64 C 18 64, 2 52, 0 30 Z" />
      <path d="M28 66 H 52" />
      <path d="M26 22 C 20 14, 32 10, 26 2 M40 22 C 34 12, 46 8, 40 -2 M54 22 C 48 14, 60 10, 54 2" />
    </g>
  );
}

function Cutlery({ x, y, s = 1, color = LINE_CYAN }: { x: number; y: number; s?: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={color}>
      <path d="M8 0 V 18 M14 0 V 18 M20 0 V 18 M8 18 C 8 26, 20 26, 20 18 M14 24 L 44 90" />
      <path d="M52 0 C 40 0, 38 22, 50 26 L 20 90" />
      <path d="M52 0 C 64 2, 62 24, 50 26" />
    </g>
  );
}

function Mortar({ x, y, s = 1, color = LINE_CYAN }: { x: number; y: number; s?: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={color}>
      <path d="M0 30 H 90 C 88 58, 70 72, 45 72 C 20 72, 2 58, 0 30 Z" />
      <path d="M30 76 H 60 M26 80 H 64" />
      <path d="M52 30 L 86 -10 C 90 -14, 96 -8, 92 -4 L 60 32" />
    </g>
  );
}

function Wheat({ x, y, r = 0, s = 1, color = "rgb(var(--warning) / 0.4)" }: { x: number; y: number; r?: number; s?: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} stroke={color}>
      <path d="M0 90 C 4 60, 8 30, 14 0" />
      {[10, 24, 38, 52].map((t) => (
        <g key={t}>
          <path d={`M${12 - t / 12} ${t} C ${2 - t / 12} ${t - 4}, ${0 - t / 12} ${t + 6}, ${10 - t / 12} ${t + 10}`} />
          <path d={`M${13 - t / 12} ${t} C ${24 - t / 12} ${t - 4}, ${26 - t / 12} ${t + 6}, ${15 - t / 12} ${t + 10}`} />
        </g>
      ))}
    </g>
  );
}

function ChefHat({ x, y, s = 1, color = LINE_GREEN }: { x: number; y: number; s?: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={color}>
      <path d="M14 44 C -4 42, -2 14, 18 16 C 20 0, 44 -4, 50 10 C 60 -2, 84 4, 80 24 C 96 26, 94 48, 78 46 V 66 H 14 Z" />
      <path d="M14 56 H 78 M34 46 V 66 M58 46 V 66" />
    </g>
  );
}

function Tomato({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke="rgb(var(--danger) / 0.4)">
      <circle cx="24" cy="24" r="22" />
      <circle cx="24" cy="24" r="16" />
      <path d="M24 8 V 40 M10 24 H 38 M14 14 L 34 34 M34 14 L 14 34" strokeDasharray="2 5" />
    </g>
  );
}

function Seeds({ points }: { points: ReadonlyArray<readonly [number, number, number]> }) {
  return (
    <g>
      {points.map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={i % 3 === 0 ? "rgb(var(--danger) / 0.35)" : i % 3 === 1 ? "rgb(var(--primary) / 0.35)" : "rgb(var(--warning) / 0.35)"} />
      ))}
    </g>
  );
}

export function FoodBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden print:hidden">
      {/* Soft waves: green from the top-left, cyan from the bottom and right. */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false">
        <path d="M0 0 H 620 C 540 120, 600 260, 420 330 C 260 390, 120 330, 0 420 Z" fill="rgb(var(--primary) / 0.10)" />
        <path d="M0 0 H 360 C 300 90, 320 180, 180 220 C 90 246, 40 230, 0 260 Z" fill="rgb(var(--primary) / 0.08)" />
        <path d="M1600 0 V 380 C 1480 400, 1400 320, 1300 250 C 1180 170, 1120 80, 1040 0 Z" fill="rgb(var(--accent) / 0.12)" />
        <path d="M0 900 V 560 C 160 520, 300 600, 420 660 C 560 730, 700 700, 840 780 C 920 830, 960 870, 1000 900 Z" fill="rgb(var(--accent) / 0.12)" />
        <path d="M1600 900 V 520 C 1500 560, 1420 640, 1300 670 C 1180 700, 1100 780, 1060 900 Z" fill="rgb(var(--primary) / 0.10)" />
        <path d="M0 900 V 700 C 120 680, 220 740, 320 800 C 380 836, 420 870, 440 900 Z" fill="rgb(var(--accent) / 0.10)" />
        {/* Light bokeh — only visible on the light theme. */}
        <g className="opacity-60 dark:opacity-0">
          <circle cx="640" cy="90" r="46" fill="rgb(255 255 255 / 0.55)" />
          <circle cx="500" cy="260" r="34" fill="rgb(255 255 255 / 0.45)" />
          <circle cx="760" cy="820" r="52" fill="rgb(255 255 255 / 0.4)" />
          <circle cx="1240" cy="520" r="38" fill="rgb(255 255 255 / 0.4)" />
        </g>
      </svg>

      {/* Line art in the corners, sized to the viewport so phones get small, faint versions. */}
      <div className="absolute -left-4 -top-4 w-[clamp(9rem,26vw,24rem)] opacity-70 dark:opacity-35">
        <Art className="h-auto w-full">
          <Sprig x={18} y={70} r={-20} s={1.3} />
          <Leaf x={70} y={40} r={-30} s={1.2} />
          <Leaf x={120} y={70} r={20} s={0.9} color={LINE_CYAN} />
          <Sprig x={130} y={110} r={30} s={0.9} />
          <Seeds points={[[40, 150, 3], [60, 170, 2.5], [90, 140, 2], [150, 30, 2.5], [20, 120, 2]]} />
        </Art>
      </div>

      <div className="absolute -right-2 -top-2 w-[clamp(9rem,26vw,24rem)] opacity-70 dark:opacity-35">
        <Art className="h-auto w-full">
          <ChefHat x={70} y={30} s={0.9} />
          <Chilli x={150} y={10} r={10} s={0.8} />
          <Tomato x={150} y={110} s={0.9} />
          <Sprig x={40} y={120} r={-30} s={1} color={LINE_CYAN} />
          <Seeds points={[[30, 40, 2.5], [120, 150, 3], [180, 170, 2], [60, 180, 2]]} />
        </Art>
      </div>

      <div className="absolute -bottom-2 -left-2 w-[clamp(10rem,30vw,28rem)] opacity-70 dark:opacity-35">
        <Art className="h-auto w-full">
          <Wheat x={110} y={30} r={40} s={1} />
          <Mortar x={30} y={100} s={1} />
          <Leaf x={140} y={150} r={-60} s={1} color={LINE_CYAN} />
          <Sprig x={0} y={130} r={-10} s={0.9} />
          <Seeds points={[[160, 110, 2.5], [180, 130, 2], [20, 90, 2.5]]} />
        </Art>
      </div>

      <div className="absolute -bottom-2 -right-2 w-[clamp(10rem,30vw,28rem)] opacity-70 dark:opacity-35">
        <Art className="h-auto w-full">
          <Bowl x={20} y={110} s={1} />
          <Cutlery x={120} y={70} s={0.9} />
          <Leaf x={160} y={40} r={-80} s={1} />
          <Leaf x={10} y={70} r={-20} s={0.8} color={LINE_CYAN} />
          <Seeds points={[[100, 60, 2.5], [110, 180, 2], [190, 150, 2.5]]} />
        </Art>
      </div>
    </div>
  );
}
