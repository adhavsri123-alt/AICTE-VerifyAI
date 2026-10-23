import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface HelpTooltipProps {
  term?: string;
  explanation: string;
  children?: React.ReactNode;
  className?: string;
  align?: 'center' | 'left' | 'right';
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  term,
  explanation,
  children,
  className = '',
  align = 'center',
}) => {
  const [visible, setVisible] = useState(false);

  const alignClasses =
    align === 'left'
      ? 'left-0 translate-x-0'
      : align === 'right'
      ? 'right-0 translate-x-0'
      : 'left-1/2 -translate-x-1/2';

  const arrowClasses =
    align === 'left'
      ? 'left-4'
      : align === 'right'
      ? 'right-4'
      : 'left-1/2 -translate-x-1/2';

  return (
    <span
      className={`relative inline-flex items-center gap-1 group cursor-help ${className}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      tabIndex={0}
      title={`${term ? `${term}: ` : ''}${explanation}`}
    >
      {children ? (
        <span className="border-b border-dotted border-slate-400 group-hover:border-blue-500 transition-colors">
          {children}
        </span>
      ) : term ? (
        <span className="font-semibold">{term}</span>
      ) : null}

      <Info
        size={12}
        className="text-slate-400 group-hover:text-blue-600 transition-colors shrink-0"
      />

      {/* Popover Bubble */}
      <span
        className={`absolute bottom-full mb-2 w-64 p-2.5 rounded-lg bg-slate-900 text-white text-[11px] leading-relaxed shadow-xl border border-slate-700 pointer-events-none z-50 transition-all duration-150 ${alignClasses} ${
          visible ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'
        }`}
      >
        {term && <strong className="block text-blue-300 font-bold mb-0.5">{term}</strong>}
        <span className="text-slate-200">{explanation}</span>
        <span className={`absolute top-full -mt-1 border-4 border-transparent border-t-slate-900 ${arrowClasses}`} />
      </span>
    </span>
  );
};
