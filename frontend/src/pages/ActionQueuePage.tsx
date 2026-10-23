import React, { useEffect, useState } from 'react';
import type { Submission } from '../types';
import { fetchSubmissions } from '../services/api';
import { PriorityCasePanel } from '../components/dashboard/PriorityCasePanel';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SeverityBadge } from '../components/ui/SeverityBadge';
import { formatDate, daysUntil } from '../utils/helpers';
import { AlertTriangle, Clock, Building2 } from 'lucide-react';

interface ActionQueuePageProps {
  onOpenReviewWorkspace?: (id: string) => void;
}

export const ActionQueuePage: React.FC<ActionQueuePageProps> = ({ onOpenReviewWorkspace }) => {
  const [items, setItems] = useState<Submission[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const result = await fetchSubmissions();
    // Only submissions needing action
    const actionable = result.items.filter((s) =>
      ['escalated', 'on_hold', 'under_review'].includes(s.status)
    ).sort((a, b) => b.priorityScore - a.priorityScore);
    setItems(actionable);
    if (actionable.length > 0) setSelectedId(actionable[0].id);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const selected = items.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto" style={{ background: 'var(--page-bg)' }}>
      <div className="p-6 max-w-[1600px] mx-auto flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Action Queue</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Escalated, on-hold, and under-review submissions requiring immediate reviewer action.
          </p>
        </div>

        <div className="flex gap-5 items-start">
          {/* Queue list */}
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse h-24 bg-slate-100 rounded-xl" />
              ))
            ) : items.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
                No items in the action queue.
              </div>
            ) : (
              items.map((sub) => {
                const isSelected = sub.id === selectedId;
                const dueIn = daysUntil(sub.dueDate);
                const criticals = sub.findings.filter((f) => f.severity === 'critical').length;

                return (
                  <button
                    key={sub.id}
                    onClick={() => setSelectedId(sub.id)}
                    className={`w-full text-left rounded-xl border p-4 transition-all duration-150 ${
                      isSelected
                        ? 'border-blue-400 bg-blue-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <Building2 size={14} className="text-slate-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-800 leading-tight truncate">
                            {sub.institution.name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {sub.applicationId}
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={sub.status} size="sm" />
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="text-xs text-slate-600">{sub.category}</span>
                      {criticals > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-red-600 font-medium">
                          <AlertTriangle size={10} />
                          {criticals} critical finding{criticals > 1 ? 's' : ''}
                        </span>
                      )}
                      <span className={`flex items-center gap-1 text-[11px] font-medium ${dueIn < 0 ? 'text-red-600' : dueIn <= 3 ? 'text-amber-600' : 'text-slate-400'}`}>
                        <Clock size={10} />
                        {dueIn < 0 ? `${Math.abs(dueIn)}d overdue` : `Due ${formatDate(sub.dueDate)}`}
                      </span>
                      {sub.findings.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {sub.findings.slice(0, 2).map((f) => (
                            <SeverityBadge key={f.id} severity={f.severity} showIcon={false} />
                          ))}
                        </div>
                      )}
                      {onOpenReviewWorkspace && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenReviewWorkspace(sub.id);
                          }}
                          className="ml-auto text-blue-600 hover:text-blue-800 text-xs font-bold hover:underline"
                        >
                          Review Dossier →
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Detail */}
          <div className="shrink-0" style={{ width: 340 }}>
            {selected ? (
              <PriorityCasePanel
                submission={selected}
                onActionComplete={load}
                onOpenReviewWorkspace={onOpenReviewWorkspace}
              />
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-400 text-sm">
                Select a case to review
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
