import React, { useEffect, useState, useMemo } from 'react';
import type { Submission } from '../types';
import { fetchSubmissions } from '../services/api';
import { PriorityCasePanel } from '../components/dashboard/PriorityCasePanel';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SeverityBadge } from '../components/ui/SeverityBadge';
import { formatDate, daysUntil } from '../utils/helpers';
import { AlertTriangle, Clock, Building2, Search, Zap } from 'lucide-react';

interface ActionQueuePageProps {
  onOpenReviewWorkspace?: (id: string) => void;
}

type ActionFilter = 'all' | 'escalated' | 'under_review' | 'on_hold';

export const ActionQueuePage: React.FC<ActionQueuePageProps> = ({ onOpenReviewWorkspace }) => {
  const [items, setItems] = useState<Submission[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ActionFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
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

  const filteredItems = useMemo(() => {
    return items.filter((sub) => {
      if (filter !== 'all' && sub.status !== filter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = sub.institution.name.toLowerCase().includes(q);
        const matchesId = sub.applicationId.toLowerCase().includes(q);
        const matchesCategory = sub.category.toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesCategory) return false;
      }
      return true;
    });
  }, [items, filter, searchQuery]);

  const selected = items.find((s) => s.id === selectedId) ?? null;

  const counts = useMemo(() => ({
    all: items.length,
    escalated: items.filter((s) => s.status === 'escalated').length,
    under_review: items.filter((s) => s.status === 'under_review').length,
    on_hold: items.filter((s) => s.status === 'on_hold').length,
  }), [items]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto" style={{ background: 'var(--page-bg)' }}>
      <div className="p-6 max-w-[1600px] mx-auto flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Zap size={20} className="text-[#C14E83]" />
              Action Queue
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Escalated, on-hold, and under-review submissions requiring immediate reviewer action.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-[#251421] text-white px-3.5 py-1.5 rounded-xl border border-[#351D31]">
            <span className="text-xs font-semibold">{filteredItems.length} actionable case{filteredItems.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Filter Pills and Search */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(
              [
                { id: 'all', label: 'All Actionable', count: counts.all },
                { id: 'escalated', label: 'Escalated', count: counts.escalated },
                { id: 'under_review', label: 'Under Review', count: counts.under_review },
                { id: 'on_hold', label: 'On Hold', count: counts.on_hold },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition-all ${
                  filter === tab.id
                    ? 'bg-[#251421] text-[#FFF5F7] border-[#351D31] shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-[#ECD9E2] hover:text-[#C14E83]'
                }`}
              >
                {tab.label}
                <span className={`ml-1.5 ${filter === tab.id ? 'text-[#FFD1E3]' : 'opacity-50'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative min-w-[240px]">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search in action queue…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#C14E83]"
            />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-5 items-start">
          {/* Queue list */}
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse h-24 bg-slate-100 rounded-xl" />
              ))
            ) : filteredItems.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
                No items match the current action queue filters.
              </div>
            ) : (
              filteredItems.map((sub) => {
                const isSelected = sub.id === selectedId;
                const dueIn = daysUntil(sub.dueDate);
                const criticals = sub.findings.filter((f) => f.severity === 'critical').length;

                return (
                  <button
                    key={sub.id}
                    onClick={() => setSelectedId(sub.id)}
                    className={`w-full text-left rounded-xl border p-4 transition-all duration-150 ${
                      isSelected
                        ? 'border-[#C14E83] bg-[#FFF5F7] shadow-sm ring-1 ring-[#C14E83]/20'
                        : 'border-slate-200 bg-white hover:border-[#ECD9E2] hover:bg-[#FFF5F7]/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <Building2 size={14} className="text-slate-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <div
                            className="text-sm font-semibold leading-tight truncate"
                            style={{ color: isSelected ? '#C14E83' : '#1e293b' }}
                          >
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
                          className="ml-auto text-[#C14E83] hover:text-[#AA4777] text-xs font-bold hover:underline"
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
          <div className="w-full lg:w-[380px] shrink-0">
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
