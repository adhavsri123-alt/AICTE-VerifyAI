import React from 'react';
import {
  LayoutDashboard,
  ListFilter,
  ClipboardCheck,
  Search,
  ScrollText,
  ShieldCheck,
  ChevronRight,
  BarChart3,
  LogOut,
} from 'lucide-react';

export type NavSection =
  | 'overview'
  | 'pipeline'
  | 'action-queue'
  | 'evidence-search'
  | 'audit-events'
  | 'analytics';

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
  backendOnline?: boolean;
  onLogout?: () => void;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={16} /> },
  { id: 'pipeline', label: 'Submission Pipeline', icon: <ListFilter size={16} /> },
  { id: 'action-queue', label: 'Action Queue', icon: <ClipboardCheck size={16} /> },
  { id: 'evidence-search', label: 'Evidence Search', icon: <Search size={16} /> },
  { id: 'audit-events', label: 'Audit Events', icon: <ScrollText size={16} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={16} /> },
];

export const LeftNav: React.FC<LeftNavProps> = ({
  activeSection,
  onNavigate,
  pendingCount,
  escalatedCount,
  backendOnline = false,
  onLogout,
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
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #8A2F5B 0%, #C14E83 100%)',
            boxShadow: '0 3px 12px rgba(193, 78, 131, 0.4)',
          }}
        >
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
          style={{ color: '#9B7C93' }}
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
                style={{ color: isActive ? 'var(--cherry-rose)' : 'inherit' }}
              >
                {item.icon}
              </span>
              <span className="text-sm font-medium flex-1 leading-tight">{item.label}</span>
              {badge !== undefined && badge > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                  style={{
                    background: item.id === 'action-queue' ? '#9E1628' : '#AA4777',
                    color: 'white',
                  }}
                >
                  {badge}
                </span>
              )}
              {isActive && (
                <ChevronRight size={12} style={{ color: 'var(--cherry-rose)' }} className="shrink-0" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Backend status + footer */}
      <div
        className="px-5 py-4 mt-auto"
        style={{ borderTop: '1px solid var(--nav-border)' }}
      >
        {/* Status indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: backendOnline ? '#22c55e' : '#f59e0b',
            boxShadow: backendOnline
              ? '0 0 6px rgba(34, 197, 94, 0.7)'
              : '0 0 6px rgba(245, 158, 11, 0.7)',
            flexShrink: 0,
          }} />
          <div style={{ fontSize: 10, fontWeight: 600, color: backendOnline ? '#22c55e' : '#f59e0b' }}>
            {backendOnline ? 'Backend Connected' : 'Demo Mode'}
          </div>
        </div>
        <div className="text-[10px] font-medium" style={{ color: '#896F81' }}>
          AICTE VerifyAI · SIH Prototype
        </div>
        <div className="text-[10px] mt-0.5" style={{ color: '#6E4966' }}>
          Synthetic demo data
        </div>

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-2 mt-3 pt-2.5 w-full text-left transition-colors group"
            style={{
              borderTop: '1px solid rgba(193,78,131,0.18)',
              background: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              borderBottom: 'none',
              cursor: 'pointer',
              color: '#B0406F',
              fontSize: 11.5,
              fontWeight: 600,
              padding: '6px 0 0 0',
            }}
            title="Sign out of Reviewer Workspace"
          >
            <LogOut size={13} className="shrink-0 transition-transform group-hover:translate-x-0.5" />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </aside>
  );
};
