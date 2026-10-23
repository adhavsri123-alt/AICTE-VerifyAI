import React, { useEffect, useState } from 'react';
import type { Submission, DashboardMetrics, AuditEvent } from '../types';
import {
  fetchSubmissions,
  fetchDashboardMetrics,
  fetchAuditEvents,
} from '../services/api';
import { mockPipelineStages } from '../data/mockData';
import { MetricCard } from '../components/ui/MetricCard';
import { SubmissionsTable } from '../components/dashboard/SubmissionsTable';
import { PriorityCasePanel } from '../components/dashboard/PriorityCasePanel';
import { PipelineProgress } from '../components/dashboard/PipelineProgress';
import { AuditEventFeed } from '../components/dashboard/AuditEventFeed';
import {
  FileStack,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Zap,
} from 'lucide-react';

function LoadingRow() {
  return (
    <div className="animate-pulse flex gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 bg-slate-100 rounded-xl flex-1" />
      ))}
    </div>
  );
}

interface OverviewPageProps {
  onOpenReviewWorkspace?: (id: string) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onOpenReviewWorkspace }) => {
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
      fetchAuditEvents(6),
    ]);
    setMetrics(m);
    // sort by priority descending
    const sorted = [...sr.items].sort((a, b) => b.priorityScore - a.priorityScore);
    setSubmissions(sorted);
    setAuditEvents(ae);
    // auto-select highest priority
    if (sorted.length > 0) setSelectedId(sorted[0].id);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const selectedSubmission = submissions.find((s) => s.id === selectedId) ?? null;
  const totalPipeline = mockPipelineStages.reduce((a, b) => a + b.count, 0);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto" style={{ background: 'var(--page-bg)' }}>
      <div className="p-6 max-w-[1600px] mx-auto flex flex-col gap-6">

        {/* Page heading */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Zap size={22} className="text-blue-600" />
              Signal over Noise
            </h1>
            <p className="text-sm text-slate-500 mt-1 max-w-xl">
              Real-time compliance oversight across AICTE-affiliated technical institutions.
              Escalated cases and critical findings surface automatically.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2.5 shadow-md shrink-0">
            <FileStack size={15} />
            <span className="text-sm font-semibold">
              {loading ? '…' : metrics?.totalSubmissions} applications
            </span>
          </div>
        </div>

        {/* Metrics row */}
        {loading ? (
          <LoadingRow />
        ) : metrics ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Pending Review"
              value={metrics.pendingReview}
              subtext="Awaiting assignment"
              accentColor="text-indigo-700"
              icon={<Clock size={16} />}
              trend="up"
              trendLabel="12 since last week"
            />
            <MetricCard
              label="Escalated"
              value={metrics.escalated}
              subtext="Needs senior attention"
              accentColor="text-amber-600"
              icon={<AlertTriangle size={16} />}
              trend="up"
              trendLabel="3 new this week"
            />
            <MetricCard
              label="Approved This Month"
              value={metrics.approvedThisMonth}
              subtext="Applications cleared"
              accentColor="text-emerald-600"
              icon={<CheckCircle2 size={16} />}
              trend="neutral"
              trendLabel="On track"
            />
            <MetricCard
              label="Critical Findings"
              value={metrics.criticalFindings}
              subtext={`Avg. ${metrics.avgResolutionDays}d resolution`}
              accentColor="text-red-600"
              icon={<XCircle size={16} />}
              trend="down"
              trendLabel="4 resolved today"
            />
          </div>
        ) : null}

        {/* Main split: table + priority panel */}
        <div className="flex gap-5 items-start">
          {/* Left: table (takes remaining space) */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="animate-pulse h-72 bg-slate-100 rounded-xl" />
            ) : (
              <SubmissionsTable
                submissions={submissions}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onOpenReviewWorkspace={onOpenReviewWorkspace}
              />
            )}
          </div>

          {/* Right: priority panel */}
          <div className="shrink-0" style={{ width: 340 }}>
            {selectedSubmission ? (
              <PriorityCasePanel
                submission={selectedSubmission}
                onActionComplete={load}
                onOpenReviewWorkspace={onOpenReviewWorkspace}
              />
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-400 text-sm">
                Select a submission to view details
              </div>
            )}
          </div>
        </div>

        {/* Bottom row: pipeline + audit */}
        <div className="grid grid-cols-5 gap-5">
          <div className="col-span-2">
            <PipelineProgress
              stages={mockPipelineStages}
              total={totalPipeline}
            />
          </div>
          <div className="col-span-3">
            <AuditEventFeed events={auditEvents} />
          </div>
        </div>

        {/* Footer note */}
        <div className="text-center pb-4">
          <span className="text-[11px] text-slate-400">
            All data is synthetic and for demonstration purposes only. ·{' '}
            <span className="text-blue-500">SIH 2024 · Team NEXUS</span>
          </span>
        </div>
      </div>
    </div>
  );
};
