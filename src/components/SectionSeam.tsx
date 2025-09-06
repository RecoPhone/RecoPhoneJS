export default function SectionSeam({
  from = '#edfbe2',   
  to = '#ffffff',     
  height = 84,
  opacity = 1,
}: {
  from?: string; to?: string; height?: number; opacity?: number;
}) {
  return (
    <div aria-hidden className="relative pointer-events-none" style={{ height }}>
      <svg viewBox="0 0 1440 84" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id="seamGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        {/* fondu vertical */}
        <rect x="0" y="0" width="1440" height="84" fill="url(#seamGrad)" opacity={opacity} />
        {/* courbe douce quasi plate */}
        <path d="M0,50 C260,90 540,10 760,44 C1020,86 1200,22 1440,54 L1440,84 L0,84 Z" fill={to} opacity={0.9} />
      </svg>
    </div>
  );
}
