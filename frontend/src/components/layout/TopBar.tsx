import { FlaskConical, Bell, Database } from 'lucide-react';
import type { ReviewerProfile } from '../../types';
import type { NavSection } from './LeftNav';

const SECTION_LABELS: Record<NavSection, string> = {
  overview: 'Overview · Control Room',
  pipeline: 'Submission Pipeline',
  'action-queue': 'Action Queue',
  'evidence-search': 'Evidence Search',
  'audit-events': 'Audit Events',
};

interface TopBarProps {
  section: NavSection;
  reviewer: ReviewerProfile | null;
  onOpenSourcesModal?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ section, reviewer, onOpenSourcesModal }) => {
  return (
    <header
      className="flex items-center justify-between px-6 py-3 shrink-0"
      style={{
        background: 'white',
        borderBottom: '1px solid #dde4f0',
        height: 60,
      }}
    >
      {/* Left: Section title */}
      <div>
        <h2 className="text-base font-semibold text-slate-800 leading-tight">
          {SECTION_LABELS[section]}
        </h2>
        <p className="text-[11px] text-slate-400 mt-0.5">
          AICTE · Technical Education Compliance
        </p>
      </div>

      {/* Right: Demo badge + Data Sources + notifications + reviewer */}
      <div className="flex items-center gap-3">
        {/* Data Sources & Demo Strategy Button */}
        {onOpenSourcesModal && (
          <button
            type="button"
            onClick={onOpenSourcesModal}
            className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 text-blue-800 rounded-full px-3 py-1 text-[11px] font-semibold transition-all shadow-xs cursor-pointer"
            title="Inspect official public reference sources and synthetic demo ethics"
          >
            <Database size={12} className="text-blue-600" />
            <span>Data Sources & Demo Data</span>
          </button>
        )}

        {/* DEMO indicator */}
        <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
          <FlaskConical size={12} className="text-amber-600" />
          <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide">
            Demo Mode
          </span>
        </div>

        {/* Notification bell */}
        <button className="relative w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors">
          <Bell size={14} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" />
        </button>

        {/* Reviewer avatar */}
        {reviewer && (
          <button className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-lg pl-1.5 pr-3 py-1.5 hover:bg-slate-100 transition-colors">
            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">
              {reviewer.avatarInitials}
            </div>
            <div className="text-left">
              <div className="text-xs font-semibold text-slate-700 leading-tight">
                {reviewer.name.split(' ')[0]}
              </div>
              <div className="text-[10px] text-slate-400 leading-tight">{reviewer.role.split(' ')[0]}</div>
            </div>
          </button>
        )}
      </div>
    </header>
  );
};
