"use client";

export function BandDial({ value = 7, size = 280 }: { value?: number; size?: number }) {
  const radius = size / 2 - 18;
  const center = size / 2;
  const startAngle = -220;
  const endAngle = 40;
  const totalAngle = endAngle - startAngle;
  const pct = (value - 0) / 9;
  const valueAngle = startAngle + totalAngle * pct;

  const polar = (angleDeg: number, r: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    // Rounded: Math.cos/sin can differ in the last digit between the server and the browser, which breaks hydration.
    const round = (n: number) => Math.round(n * 100) / 100;
    return { x: round(center + r * Math.cos(rad)), y: round(center + r * Math.sin(rad)) };
  };

  const arcPath = (a1: number, a2: number, r: number) => {
    const p1 = polar(a1, r);
    const p2 = polar(a2, r);
    const largeArc = a2 - a1 > 180 ? 1 : 0;
    return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${largeArc} 1 ${p2.x} ${p2.y}`;
  };

  const ticks = Array.from({ length: 10 }, (_, i) => i);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <path d={arcPath(startAngle, endAngle, radius)} fill="none" stroke="var(--color-primary-soft)" strokeWidth={14} strokeLinecap="round" />
        <path
          d={arcPath(startAngle, valueAngle, radius)}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={14}
          strokeLinecap="round"
        />
        {ticks.map((t) => {
          const angle = startAngle + totalAngle * (t / 9);
          const p1 = polar(angle, radius - 22);
          const p2 = polar(angle, radius - 14);
          return (
            <line
              key={t}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke="var(--color-ink-soft)"
              strokeWidth={1.5}
              opacity={0.5}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-5xl font-medium text-ink">{value.toFixed(1)}</span>
        <span className="mt-1 text-xs uppercase tracking-wide text-ink-soft">Target band</span>
      </div>
    </div>
  );
}
