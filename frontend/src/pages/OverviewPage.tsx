import React, { useEffect, useState } from 'react';
import type { Submission, DashboardMetrics, AuditEvent } from '../types';
import {
  fetchSubmissions,
  fetchDashboardMetrics,
  fetchAuditEvents,
} from '../services/api';
import { mockPipelineStages } from '../data/mockData';
import { MetricCard } from '../components/ui/MetricCard';
import { CaseSummaryPanel } from '../components/dashboard/CaseSummaryPanel';
import { PipelineProgress } from '../components/dashboard/PipelineProgress';
import { AuditEventFeed } from '../components/dashboard/AuditEventFeed';
import { HelpTooltip } from '../components/ui/HelpTooltip';
import { StatusBadge } from '../components/ui/StatusBadge';
import {
  FileStack,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  LayoutDashboard,
  Building2,
  ExternalLink,
  FlaskConical,
} from 'lucide-react';

// ─── Demo-timeline notice ─────────────────────────────────────────────────────
// All demo dates are anchored to November 2024 (Northstar case submission date).
const DEMO_TIMELINE_LABEL = 'Demo timeline: November 2024';

function LoadingRow() {
  return (
    <div className="animate-pulse flex gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-20 bg-slate-100 rounded-xl flex-1" />
      ))}
    </div>
  );
}

/** Compact single-row card for the top-priority cases list. */
function PriorityRow({
  sub,
  rank,
  onSelect,
  isSelected,
  onOpenReviewWorkspace,
}: {
  sub: Submission;
  rank: number;
  onSelect: (id: string) => void;
  isSelected: boolean;
  onOpenReviewWorkspace?: (id: string) => void;
}) {
  const criticals = sub.findings.filter((f) => f.severity === 'critical').length;

  return (
    <button
      type="button"
      onClick={() => onSelect(sub.id)}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '8px 12px',
        borderBottom: '1px solid #f1f5f9',
        background: isSelected ? '#eff6ff' : '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        cursor: 'pointer',
        transition: 'background 0.1s',
        borderLeft: isSelected ? '3px solid #2563eb' : '3px solid transparent',
      }}
    >
      {/* Rank badge */}
      <span
        style={{
          width: 20, height: 20,
          borderRadius: 5,
          background: rank === 1 ? '#dc2626' : rank === 2 ? '#d97706' : '#1e40af',
          color: '#fff',
          fontWeight: 700, fontSize: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {rank}
      </span>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-xs font-bold text-slate-800 truncate"
            style={{ color: isSelected ? '#1e40af' : '#1e293b' }}
          >
            {sub.institution.name}
          </span>
          {sub.isSyntheticDemo && (
            <span
              style={{
                fontSize: 9, fontWeight: 700, padding: '1px 5px',
                background: '#fffbeb', color: '#b45309',
                border: '1px solid #fde68a', borderRadius: 4,
                flexShrink: 0,
              }}
            >
              DEMO
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[10px] text-slate-400 font-mono">{sub.applicationId}</span>
          <StatusBadge status={sub.status} size="sm" />
          {criticals > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-red-600 font-semibold">
              <AlertTriangle size={9} />
              {criticals} critical
            </span>
          )}
        </div>
      </div>

      {/* Priority score */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div
          className="text-sm font-black"
          style={{
            color: sub.priorityScore >= 80 ? '#dc2626' : sub.priorityScore >= 55 ? '#d97706' : '#059669',
          }}
        >
          {sub.priorityScore}
        </div>
        <div className="text-[9px] text-slate-400 font-semibold uppercase">Priority</div>
      </div>

      {/* Open dossier */}
      {onOpenReviewWorkspace && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpenReviewWorkspace(sub.id); }}
          className="flex items-center gap-0.5 text-[10px] text-blue-600 hover:text-blue-800 font-bold shrink-0 transition-colors p-1"
          title="Open full evidence dossier"
        >
          <ExternalLink size={11} />
        </button>
      )}
    </button>
  );
}

interface OverviewPageProps {
  onOpenReviewWorkspace?: (id: string) => void;
  onNavigate?: (section: any) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  onOpenReviewWorkspace,
  onNavigate,
}) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [m, sr, ae] = await Promise.all([
      fetchDashboardMetrics(),
      fetchSubmissions(),
      fetchAuditEvents(8),
    ]);
    setMetrics(m);
    const sorted = [...sr.items].sort((a, b) => b.priorityScore - a.priorityScore);
    setSubmissions(sorted);
    setAuditEvents(ae);
    if (sorted.length > 0) setSelectedId(sorted[0].id);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const selectedSubmission = submissions.find((s) => s.id === selectedId) ?? null;
  // Top 5 highest-priority cases for the overview list
  const topCases = submissions.slice(0, 5);
  const totalPipeline = mockPipelineStages.reduce((a, b) => a + b.count, 0);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto" style={{ background: 'var(--page-bg)' }}>
      <div className="p-4 sm:p-5 max-w-[1550px] mx-auto flex flex-col gap-4">

        {/* ── Page heading ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <LayoutDashboard size={20} className="text-blue-600" />
              Control Room Overview
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
              Workload snapshot for this simulated compliance demo.{' '}
              <span className="font-medium text-slate-600">
                Escalated cases and critical findings surface automatically.
              </span>
            </p>
          </div>

          {/* Demo mode + count badge */}
          <div className="flex items-center gap-2 shrink-0">
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#fffbeb', border: '1px solid #fde68a',
                borderRadius: 20, padding: '4px 9px',
              }}
            >
              <FlaskConical size={11} className="text-amber-600" />
              <span className="text-[11px] font-semibold text-amber-700">
                {DEMO_TIMELINE_LABEL}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-blue-600 text-white rounded-xl px-3.5 py-2 shadow-sm">
              <FileStack size={14} />
              <span className="text-xs font-semibold">
                {loading ? '…' : metrics?.totalSubmissions} applications
              </span>
            </div>
          </div>
        </div>

        {/* ── Metrics row ────────────────────────────────────────────────── */}
        {loading ? (
          <LoadingRow />
        ) : metrics ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              label="Pending Review"
              value={metrics.pendingReview}
              subtext="Awaiting assignment"
              accentColor="text-indigo-700"
              icon={<Clock size={15} />}
              trend="up"
              trendLabel="Demo count"
            />
            <MetricCard
              label="Escalated"
              value={metrics.escalated}
              subtext="Needs senior attention"
              accentColor="text-amber-600"
              icon={<AlertTriangle size={15} />}
              trend="up"
              trendLabel="Demo count"
            />
            <MetricCard
              label="Approved This Month"
              value={metrics.approvedThisMonth}
              subtext="Applications cleared"
              accentColor="text-emerald-600"
              icon={<CheckCircle2 size={15} />}
              trend="neutral"
              trendLabel="Demo count"
            />
            <MetricCard
              label="Critical Findings"
              value={metrics.criticalFindings}
              subtext={`Avg. ${metrics.avgResolutionDays}d resolution`}
              accentColor="text-red-600"
              icon={<XCircle size={15} />}
              trend="down"
              trendLabel="Demo count"
            />
          </div>
        ) : null}

        {/* ── Top priority cases + compact summary panel ─────────────────── */}
        <div className="flex gap-4 items-start">
          {/* Left: top-5 cases list */}
          <div className="flex-1 min-w-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div
              style={{
                padding: '11px 14px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <div>
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <AlertTriangle size={13} className="text-red-500" />
                  Highest-Priority Cases
                  <HelpTooltip
                    term="Priority"
                    explanation="A guide to which application may need attention sooner based on risk, severity, and timeline. Not a final compliance decision."
                    align="left"
                  />
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Top {topCases.length} by priority score · click to inspect · all DEMO data
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate?.('pipeline')}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 transition-colors"
                title="Go to Submission Pipeline for the full list"
              >
                <Building2 size={12} />
                Full list in Pipeline →
              </button>
            </div>

            {loading ? (
              <div className="p-3 flex flex-col gap-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="animate-pulse h-10 bg-slate-100 rounded-lg" />
                ))}
              </div>
            ) : topCases.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                No submissions found in demo data.
              </div>
            ) : (
              topCases.map((sub, idx) => (
                <PriorityRow
                  key={sub.id}
                  sub={sub}
                  rank={idx + 1}
                  onSelect={setSelectedId}
                  isSelected={sub.id === selectedId}
                  onOpenReviewWorkspace={onOpenReviewWorkspace}
                />
              ))
            )}
          </div>

          {/* Right: compact selected-case summary panel */}
          <div className="shrink-0" style={{ width: 360 }}>
            {selectedSubmission ? (
              <CaseSummaryPanel
                submission={selectedSubmission}
                onOpenReviewWorkspace={onOpenReviewWorkspace}
              />
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-400 text-xs">
                Select a case above to view details
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom row: pipeline snapshot + audit feed ─────────────────── */}
        <div className="grid grid-cols-5 gap-4">
          <div className="col-span-2">
            <PipelineProgress stages={mockPipelineStages} total={totalPipeline} />
          </div>
          <div className="col-span-3">
            <AuditEventFeed
              events={auditEvents}
              maxEvents={4}
              onViewAll={() => onNavigate?.('audit-events')}
              helpTooltip={
                <HelpTooltip
                  term="Audit events"
                  explanation="A history of actions taken on applications — submissions received, reviews started, findings flagged, and decisions made."
                  align="right"
                />
              }
            />
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="text-center pb-4">
          <span className="text-[11px] text-slate-400">
            All application data is synthetic and for demonstration purposes only. ·{' '}
            <span className="text-blue-500">AICTE VerifyAI · SIH Prototype</span>
          </span>
        </div>
      </div>
    </div>
  );
};
