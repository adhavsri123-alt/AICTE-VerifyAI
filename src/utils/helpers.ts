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

// ─── Date helpers (Dynamic Live Reference with Simulated Anchor) ──────────────

export const DEMO_DATE_ISO = '2026-10-26T21:00:00Z';
export const DEMO_DATE_LABEL = '26 Oct 2026';
export const DEMO_TIMELINE_NOTICE = 'AICTE Regulatory Cycle: Academic Year 2026–2027';

export function getDemoCurrentTime(): number {
  return Date.now();
}

export function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '—';
  }
}

export function daysUntil(iso: string, referenceTime = getDemoCurrentTime()): number {
  try {
    const target = new Date(iso).getTime();
    if (isNaN(target)) return 0;
    const diff = target - referenceTime;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

export function timeAgo(iso: string, referenceTime = getDemoCurrentTime()): string {
  try {
    const target = new Date(iso).getTime();
    if (isNaN(target)) return '—';
    const diffMs = referenceTime - target;
    const seconds = Math.floor(diffMs / 1000);

    // Minor clock skew (< 60s ahead) -> treat as just now
    if (seconds >= -60 && seconds < 60) return 'just now';

    if (seconds < -60) {
      const futureDays = Math.ceil(-diffMs / (1000 * 60 * 60 * 24));
      return futureDays === 0 ? 'today' : `in ${futureDays}d`;
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return '1d ago (yesterday)';
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  } catch {
    return '—';
  }
}

