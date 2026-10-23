import type { SubmissionStatus, FindingSeverity } from '../types';

// ─── Status helpers ───────────────────────────────────────────────────────────

interface StatusConfig {
  label: string;
  bg: string;
  text: string;
  dot: string;
}

export const STATUS_CONFIG: Record<SubmissionStatus, StatusConfig> = {
  pending_review: {
    label: 'Pending Review',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    dot: 'bg-indigo-400',
  },
  under_review: {
    label: 'Under Review',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    dot: 'bg-blue-400',
  },
  escalated: {
    label: 'Escalated',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-400',
  },
  approved: {
    label: 'Approved',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-400',
  },
  rejected: {
    label: 'Rejected',
    bg: 'bg-red-50',
    text: 'text-red-700',
    dot: 'bg-red-400',
  },
  on_hold: {
    label: 'On Hold',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    dot: 'bg-purple-400',
  },
};

// ─── Severity helpers ─────────────────────────────────────────────────────────

interface SeverityConfig {
  label: string;
  bg: string;
  text: string;
  border: string;
  icon: string;
}

export const SEVERITY_CONFIG: Record<FindingSeverity, SeverityConfig> = {
  critical: {
    label: 'Critical',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: '⛔',
  },
  major: {
    label: 'Major',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: '⚠️',
  },
  minor: {
    label: 'Minor',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: 'ℹ️',
  },
  info: {
    label: 'Info',
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    border: 'border-slate-200',
    icon: '📋',
  },
};

// ─── Date helpers (Fixed Demo Timeline Reference: 20 Nov 2024) ───────────────

export const DEMO_DATE_ISO = '2024-11-20T12:00:00Z';
export const DEMO_DATE_LABEL = '20 Nov 2024';
export const DEMO_TIMELINE_NOTICE = 'Fixed Demo Timeline Anchor: 20 Nov 2024';

export function getDemoCurrentTime(): number {
  return new Date(DEMO_DATE_ISO).getTime();
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function daysUntil(iso: string, referenceTime = getDemoCurrentTime()): number {
  const diff = new Date(iso).getTime() - referenceTime;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function timeAgo(iso: string, referenceTime = getDemoCurrentTime()): string {
  const diffMs = referenceTime - new Date(iso).getTime();
  const seconds = Math.floor(diffMs / 1000);

  if (seconds < 0) {
    const futureDays = Math.ceil(-diffMs / (1000 * 60 * 60 * 24));
    return futureDays === 0 ? 'today' : `in ${futureDays}d`;
  }

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '1d ago (yesterday)';
  return `${days}d ago`;
}

