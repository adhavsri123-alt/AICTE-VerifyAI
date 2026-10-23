import React, { useEffect, useState } from 'react';
import type { AuditEvent } from '../types';
import { fetchAuditEvents } from '../services/api';
import { formatDateTime, timeAgo } from '../utils/helpers';
import { ScrollText } from 'lucide-react';

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  submission_received: { label: 'Submission Received', color: 'text-blue-600' },
  review_started: { label: 'Review Started', color: 'text-indigo-600' },
  finding_flagged: { label: 'Finding Flagged', color: 'text-amber-600' },
  escalated: { label: 'Escalated', color: 'text-orange-600' },
  decision_approved: { label: 'Approved', color: 'text-emerald-600' },
  decision_rejected: { label: 'Rejected', color: 'text-red-600' },
  comment_added: { label: 'Comment Added', color: 'text-slate-600' },
  evidence_requested: { label: 'Evidence Requested', color: 'text-purple-600' },
};

export const AuditEventsPage: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditEvents(20).then((e) => {
      setEvents(e);
      setLoading(false);
    });
  }, []);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto" style={{ background: 'var(--page-bg)' }}>
      <div className="p-6 max-w-[900px] mx-auto flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ScrollText size={20} className="text-blue-600" />
            Audit Events
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Immutable log of all system and reviewer actions across submissions.
          </p>
        </div>

        {loading ? (
          <div className="animate-pulse flex flex-col gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide w-[26%]">
                    Institution
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide w-[18%]">
                    Action
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide w-[30%]">
                    Details
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide w-[14%]">
                    Performed By
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide w-[12%]">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev, idx) => {
                  const actionCfg = ACTION_LABELS[ev.action] ?? { label: ev.action, color: 'text-slate-600' };
                  return (
                    <tr
                      key={ev.id}
                      className={`border-b border-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="text-xs font-semibold text-slate-800 leading-tight">
                          {ev.institutionName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {ev.applicationId}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-semibold ${actionCfg.color}`}>
                          {actionCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-slate-600 leading-relaxed">
                          {ev.details ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-slate-600">{ev.performedBy}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-xs text-slate-500">{timeAgo(ev.timestamp)}</div>
                        <div className="text-[10px] text-slate-300 mt-0.5">
                          {formatDateTime(ev.timestamp).split(',')[0]}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
