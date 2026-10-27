import React, { useEffect, useRef, useState } from 'react';

interface MetricCardProps {
  label: string;
  value: number | string;
  subtext?: string;
  accentColor?: string; // tailwind text color, e.g. text-indigo-700, text-red-700
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  gradient?: boolean;
}

function useCountUp(target: number, duration = 800) {
  const [count, setCount] = useState(0);
  const startTime = useRef<number | null>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0 || isNaN(target)) {
      setCount(0);
      return;
    }
    startTime.current = null;

    const animate = (ts: number) => {
      if (!startTime.current) startTime.current = ts;
      const elapsed = ts - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [target, duration]);

  return count;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  accentColor = 'text-plum-primary',
  icon,
  trend,
  trendLabel,
  gradient = false,
}) => {
  const numericValue = typeof value === 'number' ? value : parseInt(String(value), 10);
  const isNumeric = !isNaN(numericValue);
  const animatedValue = useCountUp(isNumeric ? numericValue : 0);
  const displayValue = isNumeric ? animatedValue : value;

  const trendColor =
    trend === 'up' ? 'text-emerald-700' : trend === 'down' ? 'text-rose-700' : 'text-slate-500';
  const trendSymbol = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '–';

  if (gradient) {
    return (
      <div
        className="rounded-xl p-5 flex flex-col gap-3 shadow-md hover:shadow-lg transition-all duration-200 text-white relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #55223F 0%, #8A2F5B 50%, #C14E83 100%)',
          boxShadow: '0 4px 18px rgba(85, 34, 63, 0.25)',
        }}
      >
        <div className="flex items-start justify-between">
          <span className="text-sm font-medium text-pink-100 leading-tight">{label}</span>
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: 'rgba(255, 255, 255, 0.18)',
              color: '#FFFFFF',
            }}
          >
            {icon}
          </div>
        </div>
        <div>
          <div
            className="text-3xl font-bold tracking-tight text-white"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '2.15rem' }}
          >
            {displayValue}
          </div>
          {subtext && <div className="text-xs text-pink-200 mt-0.5">{subtext}</div>}
        </div>
        {trend && trendLabel && (
          <div className="text-xs font-semibold text-pink-100 flex items-center gap-1">
            <span>{trendSymbol}</span>
            <span>{trendLabel}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-slate-500 leading-tight">{label}</span>
        <div className="w-9 h-9 rounded-lg bg-[#FFF5F7] border border-[#ECD9E2] flex items-center justify-center text-[#C14E83] shrink-0">
          {icon}
        </div>
      </div>
      <div>
        <div className={`text-3xl font-bold tracking-tight ${accentColor}`}>{displayValue}</div>
        {subtext && <div className="text-xs text-slate-400 mt-0.5">{subtext}</div>}
      </div>
      {trend && trendLabel && (
        <div className={`text-xs font-medium ${trendColor} flex items-center gap-1`}>
          <span>{trendSymbol}</span>
          <span>{trendLabel}</span>
        </div>
      )}
    </div>
  );
};
