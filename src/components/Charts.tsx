import { useEffect, useRef, useState } from 'react';
import { fmtShortDate } from '../utils';

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(320);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(200, e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export function LineChart({
  points,
  format,
  height = 200,
}: {
  points: { x: number; y: number }[];
  format: (y: number) => string;
  height?: number;
}) {
  const [ref, width] = useWidth();
  const [sel, setSel] = useState<number | null>(null);
  useEffect(() => setSel(null), [points.length, points[0]?.y]);

  if (points.length === 0) {
    return (
      <div ref={ref} className="chart-empty">
        No data yet
      </div>
    );
  }

  const padL = 44, padR = 14, padT = 16, padB = 26;
  const ys = points.map((p) => p.y);
  let lo = Math.min(...ys), hi = Math.max(...ys);
  if (lo === hi) {
    lo = lo * 0.9;
    hi = hi * 1.1 || 1;
  }
  const span = hi - lo;
  lo = Math.max(0, lo - span * 0.1);
  hi = hi + span * 0.1;
  const xs = points.map((p) => p.x);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const iw = width - padL - padR, ih = height - padT - padB;
  const sx = (x: number) => padL + (x1 === x0 ? iw / 2 : ((x - x0) / (x1 - x0)) * iw);
  const sy = (y: number) => padT + ih - ((y - lo) / (hi - lo)) * ih;
  const ticks = [0, 0.5, 1].map((t) => lo + (hi - lo) * t);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  const area = `${path} L${sx(points[points.length - 1].x)},${padT + ih} L${sx(points[0].x)},${padT + ih} Z`;
  const active = sel != null ? points[sel] : points[points.length - 1];

  return (
    <div ref={ref} className="chart">
      <div className="chart-readout">
        <strong>{format(active.y)}</strong>
        <span>{fmtShortDate(active.x)}</span>
      </div>
      <svg width={width} height={height} role="img" aria-label="Progress chart">
        <defs>
          <linearGradient id="lc-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={width - padR} y1={sy(t)} y2={sy(t)} className="grid" />
            <text x={padL - 6} y={sy(t) + 4} textAnchor="end" className="axis">
              {format(t).replace(/ (kg|lb|reps)$/, '')}
            </text>
          </g>
        ))}
        <text x={padL} y={height - 6} className="axis">
          {fmtShortDate(x0)}
        </text>
        {x1 !== x0 && (
          <text x={width - padR} y={height - 6} textAnchor="end" className="axis">
            {fmtShortDate(x1)}
          </text>
        )}
        {points.length > 1 && <path d={area} fill="url(#lc-fill)" />}
        <path d={path} className="line" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={sx(p.x)}
            cy={sy(p.y)}
            r={active === p ? 5 : 3}
            className={active === p ? 'dot active' : 'dot'}
          />
        ))}
        {/* invisible hit targets */}
        {points.map((p, i) => (
          <rect
            key={'h' + i}
            x={sx(p.x) - Math.max(6, iw / points.length / 2)}
            y={padT}
            width={Math.max(12, iw / points.length)}
            height={ih}
            fill="transparent"
            onMouseEnter={() => setSel(i)}
            onClick={() => setSel(i)}
          />
        ))}
      </svg>
    </div>
  );
}

export function BarChart({
  bars,
  height = 140,
}: {
  bars: { label: string; value: number }[];
  height?: number;
}) {
  const [ref, width] = useWidth();
  const max = Math.max(1, ...bars.map((b) => b.value));
  const padB = 20, padT = 16;
  const ih = height - padB - padT;
  const bw = width / bars.length;
  return (
    <div ref={ref} className="chart">
      <svg width={width} height={height} role="img" aria-label="Bar chart">
        {bars.map((b, i) => {
          const h = (b.value / max) * ih;
          return (
            <g key={i}>
              <rect
                x={i * bw + bw * 0.18}
                y={padT + ih - h}
                width={bw * 0.64}
                height={Math.max(h, b.value ? 2 : 0)}
                rx={4}
                className={i === bars.length - 1 ? 'bar current' : 'bar'}
              />
              {b.value > 0 && (
                <text x={i * bw + bw / 2} y={padT + ih - h - 4} textAnchor="middle" className="axis">
                  {b.value}
                </text>
              )}
              {(i % 2 === bars.length % 2 || bars.length <= 8) && (
                <text x={i * bw + bw / 2} y={height - 4} textAnchor="middle" className="axis">
                  {b.label}
                </text>
              )}
            </g>
          );
        })}
        <line x1={0} x2={width} y1={padT + ih} y2={padT + ih} className="grid" />
      </svg>
    </div>
  );
}
