import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

interface HelpTooltipProps {
  term?: string;
  explanation: string;
  children?: React.ReactNode;
  className?: string;
  align?: 'center' | 'left' | 'right';
}

/**
 * HelpTooltip — Electric Cobalt themed, portal-based tooltip.
 *
 * Uses ReactDOM.createPortal to render the bubble at document.body level,
 * so it is never clipped by overflow:hidden containers (tables, cards, drawers).
 * Position is calculated from the trigger element's bounding rect.
 */
export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  term,
  explanation,
  children,
  className = '',
  align = 'center',
}) => {
  const [visible, setVisible] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const TOOLTIP_W = 260;
    const MARGIN = 8;

    let left: number;
    if (align === 'left') {
      left = rect.left;
    } else if (align === 'right') {
      left = rect.right - TOOLTIP_W;
    } else {
      left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
    }

    // Clamp to viewport
    left = Math.max(MARGIN, Math.min(left, window.innerWidth - TOOLTIP_W - MARGIN));

    const top = rect.top + window.scrollY - 4; // place above trigger; final offset in CSS

    setPos({ top, left });
  };

  const show = () => {
    updatePosition();
    setVisible(true);
  };

  const hide = () => setVisible(false);

  // Re-calc on scroll / resize in case user scrolls while tooltip is open
  useEffect(() => {
    if (!visible) return;
    const handler = () => updatePosition();
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [visible]);

  const TOOLTIP_W = 260;

  const bubble = visible
    ? createPortal(
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            top: pos.top,
            left: pos.left,
            width: TOOLTIP_W,
            zIndex: 9999,
            transform: 'translateY(-100%)',
            marginBottom: 6,
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              display: 'block',
              background: '#fff',
              border: '1px solid #c7d6f0',
              borderRadius: 10,
              boxShadow: '0 8px 24px rgba(15,22,41,0.14), 0 2px 6px rgba(37,99,235,0.08)',
              padding: '10px 12px',
              fontSize: 11.5,
              lineHeight: 1.55,
              color: '#1e293b',
            }}
          >
            {term && (
              <strong
                style={{
                  display: 'block',
                  color: '#1d4ed8',
                  fontWeight: 700,
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: 3,
                }}
              >
                {term}
              </strong>
            )}
            <span>{explanation}</span>
          </span>
          {/* Arrow */}
          <span
            style={{
              display: 'block',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid #c7d6f0',
              position: 'absolute',
              bottom: -7,
              left:
                align === 'left'
                  ? 14
                  : align === 'right'
                  ? TOOLTIP_W - 20
                  : TOOLTIP_W / 2 - 6,
            }}
          />
          <span
            style={{
              display: 'block',
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid #fff',
              position: 'absolute',
              bottom: -6,
              left:
                align === 'left'
                  ? 15
                  : align === 'right'
                  ? TOOLTIP_W - 19
                  : TOOLTIP_W / 2 - 5,
            }}
          />
        </span>,
        document.body,
      )
    : null;

  return (
    <>
      <span
        ref={triggerRef}
        className={`relative inline-flex items-center gap-1 cursor-help ${className}`}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        tabIndex={0}
        aria-describedby={visible ? 'tooltip' : undefined}
      >
        {children ? (
          <span
            style={{
              borderBottom: visible ? '1px solid #2563eb' : '1px dotted #94a3b8',
              transition: 'border-color 0.15s',
            }}
          >
            {children}
          </span>
        ) : term ? (
          <span style={{ fontWeight: 600 }}>{term}</span>
        ) : null}

        <Info
          size={12}
          style={{ color: visible ? '#2563eb' : '#94a3b8', transition: 'color 0.15s', flexShrink: 0 }}
        />
      </span>
      {bubble}
    </>
  );
};
