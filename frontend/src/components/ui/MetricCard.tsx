import React from 'react';

interface MetricCardProps {
  label: string;
  value: number | string;
  subtext?: string;
  accentColor?: string; // tailwind text color
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  accentColor = 'text-cobalt-600',
  icon,
  trend,
  trendLabel,
}) => {
  const trendColor =
    trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-500' : 'text-slate-500';
  const trendSymbol = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '–';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-slate-500 leading-tight">{label}</span>
        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
          {icon}
        </div>
      </div>
      <div>
        <div className={`text-3xl font-bold tracking-tight ${accentColor}`}>{value}</div>
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
