import React from 'react';
import {
  LayoutDashboard,
  ListFilter,
  ClipboardCheck,
  Search,
  ScrollText,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

export type NavSection =
  | 'overview'
  | 'pipeline'
  | 'action-queue'
  | 'evidence-search'
  | 'audit-events';

interface NavItem {
  id: NavSection;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  badgeColor?: string;
}

interface LeftNavProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  pendingCount: number;
  escalatedCount: number;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={16} /> },
  { id: 'pipeline', label: 'Submission Pipeline', icon: <ListFilter size={16} /> },
  { id: 'action-queue', label: 'Action Queue', icon: <ClipboardCheck size={16} /> },
  { id: 'evidence-search', label: 'Evidence Search', icon: <Search size={16} /> },
  { id: 'audit-events', label: 'Audit Events', icon: <ScrollText size={16} /> },
];

export const LeftNav: React.FC<LeftNavProps> = ({
  activeSection,
  onNavigate,
  pendingCount,
  escalatedCount,
}) => {
  const getBadge = (id: NavSection) => {
    if (id === 'pipeline') return pendingCount;
    if (id === 'action-queue') return escalatedCount;
    return undefined;
  };

  return (
    <aside
      className="flex flex-col shrink-0"
      style={{
        width: 232,
        minHeight: '100vh',
        background: 'var(--nav-bg)',
        borderRight: '1px solid var(--nav-border)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-5 py-5"
        style={{ borderBottom: '1px solid var(--nav-border)' }}
      >
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-lg">
          <ShieldCheck size={16} className="text-white" />
        </div>
        <div>
          <div className="text-white font-bold text-sm leading-tight">VerifyAI</div>
          <div className="text-[10px] font-medium" style={{ color: 'var(--nav-text)' }}>
            AICTE Compliance
          </div>
        </div>
      </div>

      {/* Nav section label */}
      <div className="px-5 pt-5 pb-2">
        <span
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: '#4a5d8a' }}
        >
          Workspace
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-0.5 px-3 flex-1">
        {NAV_ITEMS.map((item) => {
          const isActive = activeSection === item.id;
          const badge = getBadge(item.id);
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left w-full group transition-all duration-150"
              style={{
                background: isActive ? 'var(--nav-active-bg)' : 'transparent',
                borderLeft: isActive
                  ? '3px solid var(--nav-active-border)'
                  : '3px solid transparent',
                color: isActive ? 'var(--nav-text-active)' : 'var(--nav-text)',
              }}
            >
              <span
                className="shrink-0"
                style={{ color: isActive ? '#3b82f6' : 'inherit' }}
              >
                {item.icon}
              </span>
              <span className="text-sm font-medium flex-1 leading-tight">{item.label}</span>
              {badge !== undefined && badge > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                  style={{
                    background: item.id === 'action-queue' ? '#b45309' : '#1e40af',
                    color: 'white',
                  }}
                >
                  {badge}
                </span>
              )}
              {isActive && (
                <ChevronRight size={12} style={{ color: '#3b82f6' }} className="shrink-0" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div
        className="px-5 py-4 mt-auto"
        style={{ borderTop: '1px solid var(--nav-border)' }}
      >
        <div className="text-[10px] font-medium" style={{ color: '#4a5d8a' }}>
          SIH 2024 · Team NEXUS
        </div>
        <div className="text-[10px] mt-0.5" style={{ color: '#2e3f63' }}>
          Prototype v0.1
        </div>
      </div>
    </aside>
  );
};
