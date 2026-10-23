import React from 'react';
import type { AuditEvent } from '../../types';
import { timeAgo } from '../../utils/helpers';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileSearch,
  ArrowUpCircle,
  MessageSquare,
  PlusCircle,
  Send,
} from 'lucide-react';

const ACTION_CONFIG: Record<
  string,
  { icon: React.ReactNode; color: string; bg: string }
> = {
  submission_received: {
    icon: <PlusCircle size={12} />,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  review_started: {
    icon: <FileSearch size={12} />,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
  finding_flagged: {
    icon: <AlertTriangle size={12} />,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  escalated: {
    icon: <ArrowUpCircle size={12} />,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
  },
  decision_approved: {
    icon: <CheckCircle2 size={12} />,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  decision_rejected: {
    icon: <XCircle size={12} />,
    color: 'text-red-600',
    bg: 'bg-red-50',
  },
  comment_added: {
    icon: <MessageSquare size={12} />,
    color: 'text-slate-600',
    bg: 'bg-slate-50',
  },
  evidence_requested: {
    icon: <Send size={12} />,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
};

interface AuditEventFeedProps {
  events: AuditEvent[];
}

export const AuditEventFeed: React.FC<AuditEventFeedProps> = ({ events }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-800">Recent Audit Events</h3>
        <p className="text-xs text-slate-400 mt-0.5">System and reviewer actions</p>
      </div>

      <div className="divide-y divide-slate-50">
        {events.map((event) => {
          const cfg = ACTION_CONFIG[event.action] ?? {
            icon: <FileSearch size={12} />,
            color: 'text-slate-500',
            bg: 'bg-slate-50',
          };
          return (
            <div key={event.id} className="px-5 py-3.5 flex items-start gap-3 hover:bg-slate-50 transition-colors">
              {/* Icon */}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg} ${cfg.color}`}
              >
                {cfg.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-700 leading-tight line-clamp-2 flex-1">
                    {event.institutionName}
                  </span>
                  <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">
                    {timeAgo(event.timestamp)}
                  </span>
                </div>
                {event.details && (
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-tight line-clamp-2">
                    {event.details}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-[10px] font-semibold ${cfg.color}`}
                  >
                    {event.action.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] text-slate-300">·</span>
                  <span className="text-[10px] text-slate-400">{event.performedBy}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
