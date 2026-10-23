import React, { useEffect, useState } from 'react';
import type { Submission } from '../types';
import { fetchSubmissions } from '../services/api';
import { SubmissionsTable } from '../components/dashboard/SubmissionsTable';
import { PriorityCasePanel } from '../components/dashboard/PriorityCasePanel';
import type { SubmissionStatus } from '../types';
import { Filter, RefreshCw } from 'lucide-react';

const STATUS_FILTERS: { label: string; value: SubmissionStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending Review', value: 'pending_review' },
  { label: 'Under Review', value: 'under_review' },
  { label: 'Escalated', value: 'escalated' },
  { label: 'On Hold', value: 'on_hold' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

interface PipelinePageProps {
  onOpenReviewWorkspace?: (id: string) => void;
}

export const PipelinePage: React.FC<PipelinePageProps> = ({ onOpenReviewWorkspace }) => {
  const [all, setAll] = useState<Submission[]>([]);
  const [filter, setFilter] = useState<SubmissionStatus | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    const result = await fetchSubmissions();
    const sorted = [...result.items].sort((a, b) => b.priorityScore - a.priorityScore);
    setAll(sorted);
    if (sorted.length > 0 && !selectedId) setSelectedId(sorted[0].id);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === 'all' ? all : all.filter((s) => s.status === filter);
  const selected = all.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto" style={{ background: 'var(--page-bg)' }}>
      <div className="p-6 max-w-[1600px] mx-auto flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Submission Pipeline</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Filter and review all application submissions across states and categories.
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter size={13} />
            <span>Status:</span>
          </div>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-all ${
                filter === f.value
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
              }`}
            >
              {f.label}
              {f.value !== 'all' && (
                <span className="ml-1.5 opacity-60">
                  {all.filter((s) => s.status === f.value).length}
                </span>
              )}
            </button>
          ))}
          <button
            onClick={() => load(true)}
            className="ml-auto flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition-colors"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Content split */}
        <div className="flex gap-5 items-start">
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="animate-pulse h-72 bg-slate-100 rounded-xl" />
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
                No submissions match the selected filter.
              </div>
            ) : (
              <SubmissionsTable
                submissions={filtered}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onOpenReviewWorkspace={onOpenReviewWorkspace}
              />
            )}
          </div>
          <div className="shrink-0" style={{ width: 340 }}>
            {selected ? (
              <PriorityCasePanel
                submission={selected}
                onActionComplete={() => load(true)}
                onOpenReviewWorkspace={onOpenReviewWorkspace}
              />
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-400 text-sm">
                Select a submission
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
