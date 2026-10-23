/**
 * AICTE VerifyAI — Frontend API Service Layer
 *
 * This file is the single integration point between the React frontend and the
 * Python / FastAPI backend being developed by the backend teammate.
 *
 * CONTRACT AGREEMENT NEEDED:
 * ──────────────────────────
 * The following details should be confirmed with the backend teammate before
 * switching from mock to real API calls:
 *
 *  1. Base URL and environment variable name (currently VITE_API_BASE_URL)
 *  2. Authentication scheme — Bearer token, session cookie, or API key
 *  3. Exact response envelope: { data, meta, error } vs flat shape
 *  4. Pagination params: page/limit or cursor-based?
 *  5. Filter params for submissions: status, assignedTo, dateRange, state
 *  6. Whether AuditEvent list endpoint is paginated or windowed (last N)
 *  7. Whether DashboardMetrics is a single endpoint or composed client-side
 *  8. Submission detail endpoint: GET /submissions/:id returns full evidence list?
 *  9. Action endpoints:
 *       POST /submissions/:id/approve
 *       POST /submissions/:id/reject
 *       POST /submissions/:id/escalate
 *       POST /submissions/:id/request-evidence
 *  10. Error response shape for validation failures (HTTP 422)
 *
 * When switching to real API: replace each `return mock*` line with the
 * corresponding `fetch(...)` call below it (already written, just commented out).
 */

import type {
  Submission,
  DashboardMetrics,
  AuditEvent,
  ReviewerProfile,
} from '../types';

import {
  mockSubmissions,
  mockMetrics,
  mockAuditEvents,
  mockReviewer,
} from '../data/mockData';

// ─── Config ───────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';

const DEFAULT_HEADERS: HeadersInit = {
  'Content-Type': 'application/json',
  // Authorization: `Bearer ${getToken()}`,  // uncomment when auth is ready
};

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: DEFAULT_HEADERS,
    ...init,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message ?? `API error ${response.status}`);
  }
  return response.json() as Promise<T>;
}

// Simulated network delay for mock mode (makes the UI feel realistic)
const delay = (ms = 350) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// ─── Dashboard Metrics ────────────────────────────────────────────────────────

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  await delay();
  return mockMetrics;
  // Real: return apiFetch<DashboardMetrics>('/dashboard/metrics');
}

// ─── Submissions ──────────────────────────────────────────────────────────────

export interface SubmissionListParams {
  status?: string;
  assignedTo?: string;
  state?: string;
  page?: number;
  limit?: number;
}

export interface SubmissionListResponse {
  items: Submission[];
  total: number;
  page: number;
  limit: number;
}

// In-memory mutable store for local simulated demo
const localSubmissions: Submission[] = JSON.parse(JSON.stringify(mockSubmissions));
const localAuditEvents: AuditEvent[] = JSON.parse(JSON.stringify(mockAuditEvents));

export async function fetchSubmissions(
  params: SubmissionListParams = {}
): Promise<SubmissionListResponse> {
  await delay();
  let items = [...localSubmissions];
  if (params.status) items = items.filter((s) => s.status === params.status);
  if (params.state)
    items = items.filter((s) => s.institution.state === params.state);
  return { items, total: items.length, page: 1, limit: 50 };
  // Real: return apiFetch<SubmissionListResponse>(`/submissions?${new URLSearchParams(params as Record<string, string>)}`);
}

export async function fetchSubmissionById(id: string): Promise<Submission> {
  await delay(200);
  const found = localSubmissions.find((s) => s.id === id);
  if (!found) throw new Error(`Submission ${id} not found`);
  return found;
  // Real: return apiFetch<Submission>(`/submissions/${id}`);
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export interface ActionPayload {
  notes?: string;
  reason?: string;
}

export async function approveSubmission(
  id: string,
  payload: ActionPayload = {}
): Promise<{ success: boolean; submission?: Submission }> {
  await delay(400);
  console.info('[MOCK] Approve submission (Simulated)', id, payload);
  const sub = localSubmissions.find((s) => s.id === id);
  if (sub) {
    sub.status = 'approved';
    sub.updatedAt = new Date().toISOString();
    localAuditEvents.unshift({
      id: `aud-${Date.now()}`,
      submissionId: sub.id,
      applicationId: sub.applicationId,
      institutionName: sub.institution.name,
      action: 'decision_approved',
      performedBy: 'Priya Venkataraman (Reviewer)',
      timestamp: new Date().toISOString(),
      details: payload.notes || 'Simulated recommendation: Approved for Council ratification.',
    });
  }
  return { success: true, submission: sub };
  // Real: return apiFetch(`/submissions/${id}/approve`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function rejectSubmission(
  id: string,
  payload: ActionPayload = {}
): Promise<{ success: boolean; submission?: Submission }> {
  await delay(400);
  console.info('[MOCK] Reject submission (Simulated)', id, payload);
  const sub = localSubmissions.find((s) => s.id === id);
  if (sub) {
    sub.status = 'rejected';
    sub.updatedAt = new Date().toISOString();
    localAuditEvents.unshift({
      id: `aud-${Date.now()}`,
      submissionId: sub.id,
      applicationId: sub.applicationId,
      institutionName: sub.institution.name,
      action: 'decision_rejected',
      performedBy: 'Priya Venkataraman (Reviewer)',
      timestamp: new Date().toISOString(),
      details: payload.reason || payload.notes || 'Simulated recommendation: Rejected due to unresolved deficiencies.',
    });
  }
  return { success: true, submission: sub };
  // Real: return apiFetch(`/submissions/${id}/reject`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function escalateSubmission(
  id: string,
  payload: ActionPayload = {}
): Promise<{ success: boolean; submission?: Submission }> {
  await delay(400);
  console.info('[MOCK] Escalate submission (Simulated)', id, payload);
  const sub = localSubmissions.find((s) => s.id === id);
  if (sub) {
    sub.status = 'escalated';
    sub.updatedAt = new Date().toISOString();
    localAuditEvents.unshift({
      id: `aud-${Date.now()}`,
      submissionId: sub.id,
      applicationId: sub.applicationId,
      institutionName: sub.institution.name,
      action: 'escalated',
      performedBy: 'Priya Venkataraman (Reviewer)',
      timestamp: new Date().toISOString(),
      details: payload.reason || payload.notes || 'Case escalated to Senior Hearing Committee for regulatory scrutiny.',
    });
  }
  return { success: true, submission: sub };
  // Real: return apiFetch(`/submissions/${id}/escalate`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function requestEvidence(
  id: string,
  payload: ActionPayload = {}
): Promise<{ success: boolean; submission?: Submission }> {
  await delay(400);
  console.info('[MOCK] Request evidence (Simulated)', id, payload);
  const sub = localSubmissions.find((s) => s.id === id);
  if (sub) {
    sub.status = 'on_hold';
    sub.updatedAt = new Date().toISOString();
    localAuditEvents.unshift({
      id: `aud-${Date.now()}`,
      submissionId: sub.id,
      applicationId: sub.applicationId,
      institutionName: sub.institution.name,
      action: 'evidence_requested',
      performedBy: 'Priya Venkataraman (Reviewer)',
      timestamp: new Date().toISOString(),
      details: payload.notes || 'Clarification / additional documentary evidence requested from applicant institution.',
    });
  }
  return { success: true, submission: sub };
  // Real: return apiFetch(`/submissions/${id}/request-evidence`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function addReviewerNote(
  submissionId: string,
  noteData: {
    author: string;
    role: string;
    text: string;
    category: 'general' | 'inspection' | 'legal' | 'faculty' | 'infrastructure';
  }
): Promise<{ success: boolean; note: any }> {
  await delay(300);
  const sub = localSubmissions.find((s) => s.id === submissionId);
  const newNote = {
    id: `note-${Date.now()}`,
    ...noteData,
    timestamp: new Date().toISOString(),
  };
  if (sub) {
    if (!sub.reviewerNotesList) sub.reviewerNotesList = [];
    sub.reviewerNotesList.unshift(newNote);
    localAuditEvents.unshift({
      id: `aud-${Date.now()}`,
      submissionId: sub.id,
      applicationId: sub.applicationId,
      institutionName: sub.institution.name,
      action: 'comment_added',
      performedBy: `${noteData.author} (${noteData.role})`,
      timestamp: new Date().toISOString(),
      details: `Reviewer remark added: "${noteData.text.slice(0, 80)}..."`,
    });
  }
  return { success: true, note: newNote };
  // Real: return apiFetch(`/submissions/${submissionId}/notes`, { method: 'POST', body: JSON.stringify(noteData) });
}

// ─── Audit Events ─────────────────────────────────────────────────────────────

export async function fetchAuditEvents(limit = 20): Promise<AuditEvent[]> {
  await delay(250);
  return localAuditEvents.slice(0, limit);
  // Real: return apiFetch<AuditEvent[]>(`/audit?limit=${limit}`);
}

// ─── Reviewer ─────────────────────────────────────────────────────────────────

export async function fetchReviewerProfile(): Promise<ReviewerProfile> {
  await delay(150);
  return mockReviewer;
  // Real: return apiFetch<ReviewerProfile>('/me');
}
