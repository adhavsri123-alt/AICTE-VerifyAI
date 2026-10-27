import React, { useEffect, useState, useMemo } from 'react';
import type { AuditEvent } from '../types';
import { fetchAuditEvents } from '../services/api';
import { formatDateTime, timeAgo } from '../utils/helpers';
import { ScrollText, Search, Filter, ShieldCheck, X } from 'lucide-react';

const ACTION_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  submission_received: { label: 'Submission Received', color: 'text-[#8B315B]', bg: 'bg-[#FFF5F7] border-[#ECD9E2]' },
  review_started: { label: 'Review Started', color: 'text-[#C14E83]', bg: 'bg-[#FFF5F7] border-[#ECD9E2]' },
  finding_flagged: { label: 'Finding Flagged', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  escalated: { label: 'Escalated', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  decision_approved: { label: 'Approved', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  decision_rejected: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  comment_added: { label: 'Comment Added', color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
  evidence_requested: { label: 'Evidence Requested', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
};

export const AuditEventsPage: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  useEffect(() => {
    fetchAuditEvents(50).then((e) => {
      setEvents(e);
      setLoading(false);
    });
  }, []);

  const filteredEvents = useMemo(() => {
    const q = query.toLowerCase().trim();
    return events.filter((ev) => {
      if (actionFilter !== 'all' && ev.action !== actionFilter) return false;
      if (!q) return true;
      return (
        ev.institutionName.toLowerCase().includes(q) ||
        ev.applicationId.toLowerCase().includes(q) ||
        (ev.details ?? '').toLowerCase().includes(q) ||
        ev.performedBy.toLowerCase().includes(q) ||
        ev.action.toLowerCase().includes(q)
      );
    });
  }, [events, query, actionFilter]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto" style={{ background: 'var(--page-bg)' }}>
      <div className="p-6 max-w-[1600px] mx-auto flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ScrollText size={20} className="text-[#C14E83]" />
              Audit History & Compliance Trail
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Comprehensive chronological trail of simulated intake, OCR extraction, AI rule evaluations, and reviewer actions.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-[#251421] text-white px-3.5 py-1.5 rounded-xl border border-[#351D31]">
            <ShieldCheck size={14} className="text-[#C14E83]" />
            <span className="text-xs font-semibold">{filteredEvents.length} recorded event{filteredEvents.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by institution, application ID, actor, or details…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#C14E83]"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 text-xs font-medium mr-1 flex items-center gap-1">
              <Filter size={12} /> Action:
            </span>
            {[
              { id: 'all', label: 'All' },
              { id: 'finding_flagged', label: 'Flagged' },
              { id: 'review_started', label: 'Started' },
              { id: 'escalated', label: 'Escalated' },
              { id: 'decision_approved', label: 'Approved' },
              { id: 'decision_rejected', label: 'Rejected' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActionFilter(f.id)}
                className={`text-xs px-2.5 py-1 rounded-full font-semibold border transition-all ${
                  actionFilter === f.id
                    ? 'bg-[#251421] text-[#FFF5F7] border-[#351D31] shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-[#ECD9E2] hover:text-[#C14E83]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse flex flex-col gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-xl" />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
            No audit events match your current filter.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide w-[25%]">
                    Institution / Case
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide w-[18%]">
                    Action Type
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide w-[32%]">
                    Compliance Event Details
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide w-[13%]">
                    Actor / Role
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide w-[12%]">
                    Recorded At
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((ev, idx) => {
                  const actionCfg = ACTION_LABELS[ev.action] ?? {
                    label: ev.action.replace(/_/g, ' '),
                    color: 'text-slate-700',
                    bg: 'bg-slate-50 border-slate-200',
                  };
                  return (
                    <tr
                      key={ev.id}
                      onClick={() => setSelectedEvent(ev)}
                      className={`border-b border-slate-50 cursor-pointer hover:bg-[#FFF5F7]/40 transition-colors ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                      }`}
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
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${actionCfg.bg} ${actionCfg.color}`}>
                          {actionCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                          {ev.details ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-slate-700 font-medium">{ev.performedBy}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-xs text-slate-600 font-medium">{timeAgo(ev.timestamp)}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
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

        {/* Click to inspect audit event modal */}
        {selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 flex flex-col gap-4 animate-fadeIn">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#AA4777] uppercase tracking-wider">
                    Audit Event Detail
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    {selectedEvent.institutionName}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">{selectedEvent.applicationId}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Action:</span>
                  <span className="font-semibold text-slate-800 capitalize">
                    {selectedEvent.action.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Performed by:</span>
                  <span className="font-semibold text-slate-800">{selectedEvent.performedBy}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Timestamp:</span>
                  <span className="font-mono text-slate-700">{formatDateTime(selectedEvent.timestamp)}</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-700">Detailed Description:</span>
                <p className="text-xs text-slate-600 mt-1.5 p-3 rounded-xl bg-[#FFF5F7] border border-[#ECD9E2] leading-relaxed">
                  {selectedEvent.details ?? 'No additional narrative provided.'}
                </p>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="px-4 py-2 bg-[#251421] hover:bg-[#351D31] text-white text-xs font-semibold rounded-xl"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
