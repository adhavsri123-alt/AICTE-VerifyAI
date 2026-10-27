import React, { useEffect, useState } from 'react';
import { fetchSubmissions, fetchDashboardMetrics } from '../services/api';
import type { Submission, DashboardMetrics } from '../types';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  MapPin,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce(
    (acc, item) => {
      const k = key(item);
      if (!acc[k]) acc[k] = [];
      acc[k].push(item);
      return acc;
    },
    {} as Record<string, T[]>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────

interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

const DonutChart: React.FC<{ slices: DonutSlice[]; size?: number; thickness?: number; title: string; total: number }> = ({
  slices,
  size = 120,
  thickness = 22,
  title,
  total,
}) => {
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  let cumulative = 0;
  const paths = slices
    .filter((s) => s.value > 0)
    .map((slice) => {
      const fraction = slice.value / total;
      const offset = circumference * (1 - fraction);
      const rotationDeg = 360 * cumulative - 90;
      cumulative += fraction;
      return { ...slice, fraction, offset, rotationDeg };
    });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#896F81', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {title}
      </div>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {paths.map((p, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={p.color}
              strokeWidth={thickness}
              strokeDasharray={circumference}
              strokeDashoffset={p.offset}
              transform={`rotate(${p.rotationDeg}, ${cx}, ${cy})`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />
          ))}
        </svg>
        <div
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 24, fontWeight: 400, fontFamily: "'DM Serif Display', Georgia, serif", color: '#351D31' }}>{total}</span>
          <span style={{ fontSize: 10, color: '#A892A2', fontWeight: 500 }}>total</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', justifyContent: 'center' }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: '#896F81' }}>
              {s.label} <strong style={{ color: '#351D31' }}>{s.value}</strong>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Horizontal Bar ───────────────────────────────────────────────────────────

const HBar: React.FC<{ label: string; value: number; max: number; color: string; suffix?: string }> = ({
  label, value, max, color, suffix = '',
}) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#55223F', fontWeight: 500, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#351D31' }}>{value}{suffix}</span>
      </div>
      <div style={{ height: 8, background: '#F8EBF1', borderRadius: 4, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: color,
            borderRadius: 4,
            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>
    </div>
  );
};

// ─── Section Header ───────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; sub?: string }> = ({ icon, title, sub }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
    <div style={{
      width: 32, height: 32, borderRadius: 8,
      background: '#FDF0F5', color: '#AA4777',
      border: '1px solid rgba(193, 78, 131, 0.15)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#351D31', fontFamily: "'DM Serif Display', Georgia, serif" }}>{title}</div>
      {sub && <div style={{ fontSize: 11, color: '#896F81' }}>{sub}</div>}
    </div>
  </div>
);

// ─── Card wrapper ─────────────────────────────────────────────────────────────

const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{
    background: '#FFFAFC',
    borderRadius: 14,
    border: '1px solid #ECD9E2',
    padding: '20px 22px',
    boxShadow: '0 2px 10px rgba(53, 29, 49, 0.035), 0 6px 20px rgba(53, 29, 49, 0.04)',
    ...style,
  }}>
    {children}
  </div>
);

// ─── Sparkline ────────────────────────────────────────────────────────────────

const Sparkline: React.FC<{ data: number[]; color: string; width?: number; height?: number }> = ({
  data, color, width = 100, height = 36,
}) => {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={(data.length - 1) / (data.length - 1) * width}
        cy={height - ((data[data.length - 1] - min) / range) * (height - 4) - 2}
        r={3}
        fill={color}
      />
    </svg>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending_review: '#AA4777',
  under_review: '#C14E83',
  escalated: '#92400E',
  approved: '#065F46',
  rejected: '#9E1628',
  on_hold: '#55223F',
};

const STATUS_LABELS: Record<string, string> = {
  pending_review: 'Pending',
  under_review: 'Under Review',
  escalated: 'Escalated',
  approved: 'Approved',
  rejected: 'Rejected',
  on_hold: 'On Hold',
};

const FINDING_COLORS: Record<string, string> = {
  critical: '#9E1628',
  major: '#92400E',
  minor: '#AA4777',
  info: '#896F81',
};

export const AnalyticsPage: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchSubmissions(), fetchDashboardMetrics()])
      .then(([submRes, metricsRes]) => {
        setSubmissions(submRes.items);
        setMetrics(metricsRes);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse" style={{ height: 120, background: '#F8EBF1', borderRadius: 14 }} />
        ))}
      </div>
    );
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  const total = submissions.length;

  // Status distribution
  const byStatus = groupBy(submissions, (s) => s.status);
  const statusSlices: DonutSlice[] = Object.entries(STATUS_LABELS).map(([k, label]) => ({
    label,
    value: (byStatus[k] ?? []).length,
    color: STATUS_COLORS[k] ?? '#A892A2',
  })).filter((s) => s.value > 0);

  // Institution type distribution
  const byType = groupBy(submissions, (s) => s.institution.type);
  const typeSlices: DonutSlice[] = Object.entries(byType).map(([k, arr]) => ({
    label: k.charAt(0).toUpperCase() + k.slice(1),
    value: arr.length,
    color: k === 'university' ? '#AA4777' : k === 'college' ? '#C14E83' : k === 'polytechnic' ? '#92400E' : '#55223F',
  }));

  // Findings by category
  const allFindings = submissions.flatMap((s) => s.findings);
  const byFindingCategory = groupBy(allFindings, (f) => f.category);
  const topCategories = Object.entries(byFindingCategory)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 6);
  const maxCatCount = topCategories[0]?.[1]?.length ?? 1;

  // Severity breakdown
  const bySeverity = groupBy(allFindings, (f) => f.severity);
  const severitySlices: DonutSlice[] = (['critical', 'major', 'minor', 'info'] as const).map((sev) => ({
    label: sev.charAt(0).toUpperCase() + sev.slice(1),
    value: (bySeverity[sev] ?? []).length,
    color: FINDING_COLORS[sev],
  })).filter((s) => s.value > 0);

  // Findings per severity count
  const totalFindings = allFindings.length;
  const critCount = (bySeverity.critical ?? []).length;
  const majorCount = (bySeverity.major ?? []).length;

  // State distribution
  const byState = groupBy(submissions, (s) => s.institution.state);
  const topStates = Object.entries(byState)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 8);
  const maxStateCount = topStates[0]?.[1]?.length ?? 1;

  // Category of application
  const byCategory = groupBy(submissions, (s) => s.category);
  const topAppCategories = Object.entries(byCategory)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 5);
  const maxAppCat = topAppCategories[0]?.[1]?.length ?? 1;

  // Mock trend data (last 6 months)
  const trendData = [3, 5, 4, 7, metrics?.totalSubmissions ?? 5, (metrics?.totalSubmissions ?? 5) + 2];
  const approvalRate =
    total > 0
      ? Math.round(((metrics?.approvedThisMonth ?? 0) / total) * 100)
      : 0;

  // Priority distribution
  const highPriority = submissions.filter((s) => s.priorityScore >= 70).length;
  const medPriority = submissions.filter((s) => s.priorityScore >= 40 && s.priorityScore < 70).length;
  const lowPriority = submissions.filter((s) => s.priorityScore < 40).length;

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BarChart3 size={22} color="#C14E83" />
          <h1 style={{ fontSize: 24, fontWeight: 400, color: '#351D31', fontFamily: "'DM Serif Display', Georgia, serif", margin: 0 }}>
            Compliance Analytics
          </h1>
        </div>
        <p style={{ fontSize: 13, color: '#896F81', margin: '4px 0 0', paddingLeft: 32 }}>
          Aggregate insights across all {total} submission{total !== 1 ? 's' : ''} in the pipeline.
        </p>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          {
            label: 'Total Submissions',
            value: total,
            color: '#351D31',
            bg: '#FDF0F5',
            iconColor: '#AA4777',
            icon: <Building2 size={16} />,
            sub: `${metrics?.underReview ?? 0} active reviews`,
          },
          {
            label: 'Critical Findings',
            value: critCount,
            color: '#9E1628',
            bg: '#FDE8E8',
            iconColor: '#9E1628',
            icon: <AlertTriangle size={16} />,
            sub: `${majorCount} major · ${totalFindings} total`,
          },
          {
            label: 'Approval Rate',
            value: `${approvalRate}%`,
            color: '#065F46',
            bg: '#DEF7EC',
            iconColor: '#065F46',
            icon: <CheckCircle2 size={16} />,
            sub: `${metrics?.approvedThisMonth ?? 0} approved`,
          },
          {
            label: 'Avg. Resolution',
            value: `${metrics?.avgResolutionDays ?? 0}d`,
            color: '#55223F',
            bg: '#F8E5ED',
            iconColor: '#55223F',
            icon: <Clock size={16} />,
            sub: 'Average days to decision',
          },
        ].map((kpi, i) => (
          <Card key={i} style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#896F81' }}>{kpi.label}</span>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: kpi.bg, color: kpi.iconColor,
                border: '1px solid rgba(193, 78, 131, 0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {kpi.icon}
              </div>
            </div>
            <div style={{ fontSize: 30, fontWeight: 400, fontFamily: "'DM Serif Display', Georgia, serif", color: kpi.color, letterSpacing: '-0.02em' }}>
              {kpi.value}
            </div>
            <div style={{ fontSize: 11, color: '#A892A2', marginTop: 2 }}>{kpi.sub}</div>
          </Card>
        ))}
      </div>

      {/* Row 1: Donut charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <DonutChart slices={statusSlices} total={total} title="Status Distribution" size={130} />
        </Card>
        <Card style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <DonutChart slices={typeSlices} total={total} title="Institution Types" size={130} />
        </Card>
        <Card style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <DonutChart slices={severitySlices} total={totalFindings || 1} title="Finding Severity" size={130} />
        </Card>
      </div>

      {/* Row 2: Bars + Trend */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Top Finding Categories */}
        <Card>
          <SectionHeader icon={<AlertTriangle size={15} />} title="Top Finding Categories" sub="By frequency" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topCategories.length === 0 ? (
              <div style={{ fontSize: 12, color: '#A892A2' }}>No findings recorded.</div>
            ) : (
              topCategories.map(([cat, arr]) => (
                <HBar
                  key={cat}
                  label={cat}
                  value={arr.length}
                  max={maxCatCount}
                  color={arr.some((f) => f.severity === 'critical') ? '#9E1628' : arr.some((f) => f.severity === 'major') ? '#92400E' : '#AA4777'}
                />
              ))
            )}
          </div>
        </Card>

        {/* State Distribution */}
        <Card>
          <SectionHeader icon={<MapPin size={15} />} title="Applications by State" sub="Geographic spread" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topStates.length === 0 ? (
              <div style={{ fontSize: 12, color: '#A892A2' }}>No data.</div>
            ) : (
              topStates.map(([state, arr]) => (
                <HBar key={state} label={state} value={arr.length} max={maxStateCount} color="#C14E83" />
              ))
            )}
          </div>
        </Card>

        {/* Application Categories */}
        <Card>
          <SectionHeader icon={<BarChart3 size={15} />} title="Application Categories" sub="By submission type" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topAppCategories.length === 0 ? (
              <div style={{ fontSize: 12, color: '#A892A2' }}>No data.</div>
            ) : (
              topAppCategories.map(([cat, arr]) => (
                <HBar key={cat} label={cat} value={arr.length} max={maxAppCat} color="#AA4777" />
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Row 3: Priority + Trend */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Priority Breakdown */}
        <Card>
          <SectionHeader icon={<TrendingUp size={15} />} title="Priority Breakdown" sub="Cases by risk tier" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <HBar label="High Risk (70–100)" value={highPriority} max={total || 1} color="#9E1628" />
            <HBar label="Medium Risk (40–69)" value={medPriority} max={total || 1} color="#92400E" />
            <HBar label="Low Risk (0–39)" value={lowPriority} max={total || 1} color="#065F46" />
          </div>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { label: 'High Risk', count: highPriority, pct: total ? Math.round((highPriority / total) * 100) : 0, color: '#9E1628' },
              { label: 'Medium Risk', count: medPriority, pct: total ? Math.round((medPriority / total) * 100) : 0, color: '#92400E' },
              { label: 'Low Risk', count: lowPriority, pct: total ? Math.round((lowPriority / total) * 100) : 0, color: '#065F46' },
            ].map((tier) => (
              <div key={tier.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: tier.color, fontWeight: 600 }}>{tier.label}</span>
                <span style={{ color: '#896F81' }}>{tier.count} case{tier.count !== 1 ? 's' : ''} ({tier.pct}%)</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Pipeline Trend Sparkline */}
        <Card>
          <SectionHeader icon={<TrendingUp size={15} />} title="Submission Trend" sub="Last 6 months (simulated)" />
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, marginTop: 8 }}>
            <Sparkline data={trendData} color="#C14E83" width={320} height={80} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Pending Review', value: metrics?.pendingReview ?? 0, color: '#AA4777' },
              { label: 'Under Review', value: metrics?.underReview ?? 0, color: '#C14E83' },
              { label: 'Escalated', value: metrics?.escalated ?? 0, color: '#92400E' },
              { label: 'Rejected', value: metrics?.rejectedThisMonth ?? 0, color: '#9E1628' },
            ].map((item) => (
              <div key={item.label} style={{
                padding: '10px 14px',
                borderRadius: 10,
                background: '#FFFAFC',
                border: '1px solid #ECD9E2',
                display: 'flex', flexDirection: 'column', gap: 2,
              }}>
                <span style={{ fontSize: 20, fontWeight: 400, fontFamily: "'DM Serif Display', Georgia, serif", color: item.color }}>{item.value}</span>
                <span style={{ fontSize: 11, color: '#896F81' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Footer note */}
      <div style={{
        marginTop: 20, padding: '10px 16px',
        background: '#FFF7F0', border: '1px solid #F8DEC9',
        borderRadius: 10, fontSize: 11, color: '#9A4B1A',
      }}>
        ⚠ Analytics are computed from {total} synthetic demo submission{total !== 1 ? 's' : ''}. All institution names, findings, and evidence records are simulated for the SIH prototype.
      </div>
    </div>
  );
};
