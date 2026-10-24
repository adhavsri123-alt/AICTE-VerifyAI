import React, { useEffect, useState, useMemo } from 'react';
import type { Submission } from '../types';
import { fetchSubmissions } from '../services/api';
import { PipelineDetailPanel } from '../components/dashboard/PipelineDetailPanel';
import { StatusBadge } from '../components/ui/StatusBadge';
import { HelpTooltip } from '../components/ui/HelpTooltip';
import { InspectFindingModal } from '../components/common/InspectFindingModal';
import type { SubmissionStatus, Finding } from '../types';
import {
  RefreshCw,
  Search,
  ArrowUpDown,
  AlertTriangle,
  Clock,
  ExternalLink,
  Building2,
  FlaskConical,
} from 'lucide-react';
import { formatDate, daysUntil } from '../utils/helpers';

const STATUS_FILTERS: { label: string; value: SubmissionStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending_review' },
  { label: 'Under Review', value: 'under_review' },
  { label: 'Escalated', value: 'escalated' },
  { label: 'On Hold', value: 'on_hold' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

type SortKey = 'priority' | 'name' | 'due' | 'findings';

interface PipelinePageProps {
  onOpenReviewWorkspace?: (id: string) => void;
}

export const PipelinePage: React.FC<PipelinePageProps> = ({ onOpenReviewWorkspace }) => {
  const [all, setAll] = useState<Submission[]>([]);
  const [filter, setFilter] = useState<SubmissionStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('priority');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inspectingFinding, setInspectingFinding] = useState<{
    finding: Finding;
    submission: Submission;
  } | null>(null);

  const load = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    const result = await fetchSubmissions();
    const sorted = [...result.items].sort((a, b) => b.priorityScore - a.priorityScore);
    setAll(sorted);
    if (sorted.length > 0 && !selectedId) setSelectedId(sorted[0].id);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    all.forEach((s) => { counts[s.status] = (counts[s.status] ?? 0) + 1; });
    return counts;
  }, [all]);

  // Filter + search + sort
  const displayed = useMemo(() => {
    let items = filter === 'all' ? all : all.filter((s) => s.status === filter);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (s) =>
          s.institution.name.toLowerCase().includes(q) ||
          s.applicationId.toLowerCase().includes(q) ||
          s.institution.city.toLowerCase().includes(q) ||
          s.institution.state.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q),
      );
    }

    items = [...items].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'priority') cmp = b.priorityScore - a.priorityScore;
      else if (sortKey === 'name') cmp = a.institution.name.localeCompare(b.institution.name);
      else if (sortKey === 'due') cmp = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      else if (sortKey === 'findings') cmp = b.findings.length - a.findings.length;
      return sortAsc ? -cmp : cmp;
    });

    return items;
  }, [all, filter, searchQuery, sortKey, sortAsc]);

  const selected = all.find((s) => s.id === selectedId) ?? null;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(false); }
  };



  return (
    <div className="flex-1 min-h-0 overflow-y-auto" style={{ background: 'var(--page-bg)' }}>
      <div className="p-6 max-w-[1600px] mx-auto flex flex-col gap-5">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Submission Pipeline</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Complete list of all demo applications with search, filters, and sorting.
              Select a row to view the case detail panel.
            </p>
          </div>
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#fffbeb', border: '1px solid #fde68a',
              borderRadius: 20, padding: '5px 12px', flexShrink: 0,
            }}
          >
            <FlaskConical size={12} className="text-amber-600" />
            <span className="text-[11px] font-semibold text-amber-700">
              All demo data · no real applications
            </span>
          </div>
        </div>

        {/* ── Status count chips ──────────────────────────────────────────── */}
        {!loading && (
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => {
              const count = f.value === 'all' ? all.length : (statusCounts[f.value] ?? 0);
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFilter(f.value)}
                  className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition-all ${
                    filter === f.value
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                  }`}
                >
                  {f.label}
                  <span className={`ml-1.5 ${filter === f.value ? 'opacity-80' : 'opacity-50'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Search bar ─────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: '#fff', border: '1px solid #dde4f0',
            borderRadius: 10, padding: '8px 14px',
          }}
        >
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by institution name, application ID, city, state, or category…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1, border: 'none', outline: 'none',
              fontSize: 13, color: '#1e293b',
              background: 'transparent',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-slate-400 hover:text-slate-700 text-xs font-semibold transition-colors"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() => load(true)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition-colors ml-2"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* ── Content: table + detail panel ──────────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-5 items-start">
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="animate-pulse h-72 bg-slate-100 rounded-xl" />
            ) : displayed.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
                {searchQuery
                  ? `No applications match "${searchQuery}"`
                  : 'No submissions match the selected filter.'}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Column headers */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1.4fr 0.9fr 0.8fr 0.65fr 0.65fr 0.6fr',
                    padding: '8px 14px',
                    background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <button type="button" onClick={() => toggleSort('name')}
                    className={`flex items-center gap-0.5 text-[11px] font-semibold uppercase tracking-wide text-left transition-colors ${sortKey === 'name' ? 'text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}>
                    Institution <ArrowUpDown size={10} />
                  </button>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Category</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status</span>
                  <button type="button" onClick={() => toggleSort('due')}
                    className={`flex items-center gap-0.5 text-[11px] font-semibold uppercase tracking-wide text-left transition-colors ${sortKey === 'due' ? 'text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}>
                    Due <ArrowUpDown size={10} />
                  </button>
                  <button type="button" onClick={() => toggleSort('findings')}
                    className={`flex items-center gap-0.5 text-[11px] font-semibold uppercase tracking-wide text-left transition-colors ${sortKey === 'findings' ? 'text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}>
                    <HelpTooltip term="Finding" explanation="A possible issue for a human reviewer to check — not proof or a final decision." align="center">
                      <span>Flags</span>
                    </HelpTooltip>
                    <ArrowUpDown size={10} />
                  </button>
                  <button type="button" onClick={() => toggleSort('priority')}
                    className={`flex items-center gap-0.5 text-[11px] font-semibold uppercase tracking-wide text-left transition-colors ${sortKey === 'priority' ? 'text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}>
                    <HelpTooltip term="Priority" explanation="A guide to which application may need attention sooner. Not a compliance decision." align="center">
                      <span>Priority</span>
                    </HelpTooltip>
                    <ArrowUpDown size={10} />
                  </button>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 text-center">
                    <HelpTooltip term="Evidence dossier" explanation="The application and all its supporting documents, grouped together for review." align="right">
                      <span>Dossier</span>
                    </HelpTooltip>
                  </span>
                </div>

                {/* Rows */}
                {displayed.map((sub, idx) => {
                  const isSelected = sub.id === selectedId;
                  const dueIn = daysUntil(sub.dueDate);
                  const critical = sub.findings.filter((f) => f.severity === 'critical').length;

                  return (
                    <div
                      key={sub.id}
                      onClick={() => setSelectedId(sub.id)}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1.4fr 0.9fr 0.8fr 0.65fr 0.65fr 0.6fr',
                        padding: '10px 14px',
                        borderBottom: '1px solid #f1f5f9',
                        borderLeft: isSelected ? '3px solid #2563eb' : '3px solid transparent',
                        background: isSelected ? '#eff6ff' : idx % 2 === 0 ? '#fff' : '#f8fafc',
                        cursor: 'pointer',
                        alignItems: 'center',
                        gap: 8,
                        transition: 'background 0.1s',
                      }}
                    >
                      {/* Institution */}
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Building2 size={12} className="text-slate-300 shrink-0" />
                          <span className="text-xs font-bold text-slate-800 truncate">
                            {sub.institution.name}
                          </span>
                          {sub.isSyntheticDemo && (
                            <span style={{
                              fontSize: 8, fontWeight: 700, padding: '1px 4px',
                              background: '#fffbeb', color: '#b45309',
                              border: '1px solid #fde68a', borderRadius: 3, flexShrink: 0,
                            }}>DEMO</span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono truncate">
                          {sub.applicationId}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {sub.institution.city}, {sub.institution.state} · {sub.institution.type}
                        </span>
                      </div>

                      {/* Category */}
                      <span className="text-xs text-slate-600 leading-snug line-clamp-2">
                        {sub.category}
                      </span>

                      {/* Status */}
                      <StatusBadge status={sub.status} size="sm" />

                      {/* Due date */}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-slate-600">{formatDate(sub.dueDate)}</span>
                        {dueIn < 0 && (
                          <span className="text-[10px] font-semibold text-red-600 flex items-center gap-0.5">
                            <AlertTriangle size={9} />
                            {Math.abs(dueIn)}d overdue
                          </span>
                        )}
                        {dueIn >= 0 && dueIn <= 3 && (
                          <span className="text-[10px] font-semibold text-amber-600 flex items-center gap-0.5">
                            <Clock size={9} />
                            Due in {dueIn}d
                          </span>
                        )}
                      </div>

                      {/* Findings */}
                      <div className="flex flex-col items-start gap-0.5">
                        {sub.findings.length === 0 ? (
                          <span className="text-xs text-slate-300">—</span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectingFinding({ finding: sub.findings[0], submission: sub });
                            }}
                            className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors ${
                              critical > 0
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            }`}
                            title="Inspect finding"
                          >
                            {sub.findings.length}
                          </button>
                        )}
                        {critical > 0 && (
                          <span className="text-[9px] text-red-600 font-semibold">{critical} critical</span>
                        )}
                      </div>

                      {/* Priority */}
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className="text-sm font-black"
                          style={{
                            color: sub.priorityScore >= 80 ? '#dc2626' : sub.priorityScore >= 55 ? '#d97706' : '#059669',
                          }}
                        >
                          {sub.priorityScore}
                        </span>
                        <div className="w-10 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${sub.priorityScore}%`,
                              background: sub.priorityScore >= 80 ? '#dc2626' : sub.priorityScore >= 55 ? '#d97706' : '#059669',
                            }}
                          />
                        </div>
                      </div>

                      {/* Dossier button */}
                      <div className="flex justify-center">
                        {onOpenReviewWorkspace && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onOpenReviewWorkspace(sub.id); }}
                            className="px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white font-semibold text-[10px] transition-colors border border-blue-200 flex items-center gap-0.5 cursor-pointer"
                            title="Open full evidence dossier"
                          >
                            Open <ExternalLink size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Summary footer */}
                <div
                  style={{
                    padding: '8px 14px',
                    background: '#f8fafc',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <span className="text-[11px] text-slate-400">
                    Showing {displayed.length} of {all.length} applications
                    {searchQuery && ` matching "${searchQuery}"`}
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <FlaskConical size={10} className="text-amber-500" />
                    All demo / synthetic data
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Detail panel */}
          <div className="w-full lg:w-[380px] shrink-0">
            {selected ? (
              <PipelineDetailPanel
                submission={selected}
                onClose={() => setSelectedId(null)}
                onOpenReviewWorkspace={onOpenReviewWorkspace}
              />
            ) : (
              <div className="bg-white/80 rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-1.5 shadow-2xs">
                <span className="font-medium text-slate-600 text-sm">No Application Selected</span>
                <span>Select any row from the pipeline table to inspect compliance findings and evidence dossier</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inspect Finding Modal */}
      <InspectFindingModal
        isOpen={Boolean(inspectingFinding)}
        onClose={() => setInspectingFinding(null)}
        finding={inspectingFinding?.finding ?? null}
        submission={inspectingFinding?.submission ?? null}
        onOpenReviewWorkspace={onOpenReviewWorkspace}
      />
    </div>
  );
};
