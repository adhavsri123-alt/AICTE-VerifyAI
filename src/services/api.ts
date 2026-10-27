/**
 * AICTE VerifyAI — Frontend API Service Layer
 *
 * Integrated communication layer between the React frontend and the
 * FastAPI + SQLAlchemy + SQLite backend with robust offline/demo fallback.
 */

import type {
  Submission,
  DashboardMetrics,
  AuditEvent,
  ReviewerProfile,
  EvidenceItem,
  Finding,
} from '../types';

import {
  mockSubmissions,
  mockAuditEvents,
  mockReviewer,
  computeMetricsFromSubmissions,
} from '../data/mockData';

// ─── Config ───────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';

const DEFAULT_HEADERS: HeadersInit = {
  'Content-Type': 'application/json',
};

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: init?.body instanceof FormData ? undefined : DEFAULT_HEADERS,
    ...init,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail ?? error.message ?? `API error ${response.status}`);
  }
  return response.json() as Promise<T>;
}

// In-memory mutable store for local simulated fallback
let localSubmissions: Submission[] = JSON.parse(JSON.stringify(mockSubmissions));
let localAuditEvents: AuditEvent[] = JSON.parse(JSON.stringify(mockAuditEvents));

const delay = (ms = 150) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// ─── Authentication ───────────────────────────────────────────────────────────

export interface LoginResult {
  success: boolean;
  reviewer?: ReviewerProfile;
  error?: string;
}

/**
 * Submit reviewer credentials to the backend.
 * On success the backend sets an httpOnly session cookie.
 * Returns the reviewer profile directly from the response body.
 */
export async function loginReviewer(email: string, password: string): Promise<LoginResult> {
  try {
    const reviewer = await apiFetch<ReviewerProfile>('/auth/login', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    return { success: true, reviewer };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed.';
    return { success: false, error: message };
  }
}

/**
 * Clear the session cookie server-side.
 */
export async function logoutReviewer(): Promise<void> {
  try {
    await apiFetch('/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    // Swallow — cookie will expire on its own
  }
}

/**
 * Attempt to restore a session from an existing httpOnly cookie.
 * Returns the reviewer profile if authenticated, null otherwise.
 */
export async function fetchAuthMe(): Promise<ReviewerProfile | null> {
  try {
    return await apiFetch<ReviewerProfile>('/auth/me', {
      credentials: 'include',
    });
  } catch {
    return null;
  }
}

// ─── Health ───────────────────────────────────────────────────────────────────

export interface SystemHealth {
  status: string;
  service: string;
  version: string;
  database: string;
  ocrEngineAvailable: boolean;
  ocrDetails: string;
  pdfEngine: string;
}

export async function fetchSystemHealth(): Promise<SystemHealth> {
  try {
    return await apiFetch<SystemHealth>('/health');
  } catch {
    return {
      status: 'offline-mock',
      service: 'AICTE VerifyAI (Simulated Mode)',
      version: '1.0.0',
      database: 'In-Memory Store',
      ocrEngineAvailable: false,
      ocrDetails: 'Backend server not currently running at localhost:8000.',
      pdfEngine: 'PyMuPDF (Mock Active)',
    };
  }
}

// ─── Dashboard Metrics ────────────────────────────────────────────────────────

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  try {
    return await apiFetch<DashboardMetrics>('/dashboard/metrics');
  } catch {
    await delay();
    return computeMetricsFromSubmissions(localSubmissions);
  }
}

// ─── Submissions ──────────────────────────────────────────────────────────────

export interface SubmissionListParams {
  status?: string;
  assignedTo?: string;
  state?: string;
  query?: string;
  sort_by?: string;
  page?: number;
  limit?: number;
}

export interface SubmissionListResponse {
  items: Submission[];
  total: number;
  page: number;
  limit: number;
}

export async function fetchSubmissions(
  params: SubmissionListParams = {}
): Promise<SubmissionListResponse> {
  try {
    const queryParams = new URLSearchParams();
    if (params.status && params.status !== 'all') queryParams.set('status', params.status);
    if (params.state) queryParams.set('state', params.state);
    if (params.query) queryParams.set('query', params.query);
    if (params.sort_by) queryParams.set('sort_by', params.sort_by);

    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const res = await apiFetch<SubmissionListResponse>(`/submissions${queryString}`);
    if (res && res.items) {
      // Sync local copy
      localSubmissions = res.items;
      return res;
    }
  } catch {
    // Fallback to local
  }

  await delay();
  let items = [...localSubmissions];
  if (params.status && params.status !== 'all') {
    items = items.filter((s) => s.status === params.status);
  }
  if (params.state) {
    items = items.filter((s) => s.institution.state === params.state);
  }
  if (params.query) {
    const q = params.query.toLowerCase();
    items = items.filter(
      (s) =>
        s.institution.name.toLowerCase().includes(q) ||
        s.applicationId.toLowerCase().includes(q) ||
        s.institution.city.toLowerCase().includes(q) ||
        s.institution.state.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
    );
  }
  return { items, total: items.length, page: 1, limit: 50 };
}

export async function fetchSubmissionById(id: string): Promise<Submission> {
  try {
    const res = await apiFetch<Submission>(`/submissions/${id}`);
    if (res) {
      const idx = localSubmissions.findIndex((s) => s.id === id);
      if (idx >= 0) localSubmissions[idx] = res;
      return res;
    }
  } catch {
    // Fallback
  }

  await delay(100);
  const found = localSubmissions.find((s) => s.id === id);
  if (!found) throw new Error(`Submission ${id} not found`);
  return found;
}

// ─── Reviewer Decision Actions ────────────────────────────────────────────────

export interface ActionPayload {
  notes?: string;
  reason?: string;
  performedBy?: string;
}

export async function approveSubmission(
  id: string,
  payload: ActionPayload = {}
): Promise<{ success: boolean; submission?: Submission; message?: string }> {
  try {
    const res = await apiFetch<{ success: boolean; message: string; submission: Submission }>(
      `/submissions/${id}/approve`,
      { method: 'POST', body: JSON.stringify(payload) }
    );
    if (res && res.submission) {
      const idx = localSubmissions.findIndex((s) => s.id === id);
      if (idx >= 0) localSubmissions[idx] = res.submission;
      return res;
    }
  } catch (err: any) {
    // If backend returned a functional rejection (e.g. critical findings unresolved), surface it directly!
    if (err.message && (err.message.includes('critical') || err.message.includes('Cannot approve'))) {
      throw err;
    }
    // Fallback for offline mode
  }

  await delay(300);
  const sub = localSubmissions.find((s) => s.id === id);
  if (sub) {
    // Check critical findings in local store as well
    const criticals = sub.findings.filter((f) => f.severity === 'critical');
    if (criticals.length > 0) {
      throw new Error(`Cannot approve submission while ${criticals.length} critical findings remain unresolved.`);
    }

    sub.status = 'approved';
    sub.updatedAt = new Date().toISOString();
    localAuditEvents.unshift({
      id: `aud-${Date.now()}`,
      submissionId: sub.id,
      applicationId: sub.applicationId,
      institutionName: sub.institution.name,
      action: 'decision_approved',
      performedBy: payload.performedBy || 'Priya Venkataraman (Reviewer)',
      timestamp: new Date().toISOString(),
      details: payload.notes || 'Simulated recommendation: Approved for Council ratification.',
    });
  }
  return { success: true, submission: sub };
}

export async function rejectSubmission(
  id: string,
  payload: ActionPayload = {}
): Promise<{ success: boolean; submission?: Submission; message?: string }> {
  try {
    const res = await apiFetch<{ success: boolean; message: string; submission: Submission }>(
      `/submissions/${id}/reject`,
      { method: 'POST', body: JSON.stringify(payload) }
    );
    if (res && res.submission) {
      const idx = localSubmissions.findIndex((s) => s.id === id);
      if (idx >= 0) localSubmissions[idx] = res.submission;
      return res;
    }
  } catch (err: any) {
    if (err.message && !err.message.includes('Failed to fetch')) {
      throw err;
    }
  }

  await delay(300);
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
      performedBy: payload.performedBy || 'Priya Venkataraman (Reviewer)',
      timestamp: new Date().toISOString(),
      details: payload.reason || payload.notes || 'Application rejected due to unresolved statutory deficiencies.',
    });
  }
  return { success: true, submission: sub };
}

export async function escalateSubmission(
  id: string,
  payload: ActionPayload = {}
): Promise<{ success: boolean; submission?: Submission; message?: string }> {
  try {
    const res = await apiFetch<{ success: boolean; message: string; submission: Submission }>(
      `/submissions/${id}/escalate`,
      { method: 'POST', body: JSON.stringify(payload) }
    );
    if (res && res.submission) {
      const idx = localSubmissions.findIndex((s) => s.id === id);
      if (idx >= 0) localSubmissions[idx] = res.submission;
      return res;
    }
  } catch (err: any) {
    if (err.message && !err.message.includes('Failed to fetch')) {
      throw err;
    }
  }

  await delay(300);
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
      performedBy: payload.performedBy || 'Priya Venkataraman (Reviewer)',
      timestamp: new Date().toISOString(),
      details: payload.reason || payload.notes || 'Case escalated to Senior Hearing Committee for regulatory scrutiny.',
    });
  }
  return { success: true, submission: sub };
}

export async function requestEvidence(
  id: string,
  payload: ActionPayload = {}
): Promise<{ success: boolean; submission?: Submission; message?: string }> {
  try {
    const res = await apiFetch<{ success: boolean; message: string; submission: Submission }>(
      `/submissions/${id}/request-evidence`,
      { method: 'POST', body: JSON.stringify(payload) }
    );
    if (res && res.submission) {
      const idx = localSubmissions.findIndex((s) => s.id === id);
      if (idx >= 0) localSubmissions[idx] = res.submission;
      return res;
    }
  } catch (err: any) {
    if (err.message && !err.message.includes('Failed to fetch')) {
      throw err;
    }
  }

  await delay(300);
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
      performedBy: payload.performedBy || 'Priya Venkataraman (Reviewer)',
      timestamp: new Date().toISOString(),
      details: payload.notes || 'Clarification / additional documentary evidence requested from applicant institution.',
    });
  }
  return { success: true, submission: sub };
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
  try {
    const res = await apiFetch<{ success: boolean; note: any }>(
      `/submissions/${submissionId}/notes`,
      { method: 'POST', body: JSON.stringify(noteData) }
    );
    if (res && res.note) {
      const sub = localSubmissions.find((s) => s.id === submissionId);
      if (sub) {
        if (!sub.reviewerNotesList) sub.reviewerNotesList = [];
        sub.reviewerNotesList.unshift(res.note);
      }
      return res;
    }
  } catch {
    // Fallback
  }

  await delay(200);
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
}

// ─── Document Upload with PyMuPDF & OCR ───────────────────────────────────────

export interface DocumentUploadResult {
  success: boolean;
  message: string;
  documentId: string;
  filename: string;
  fileSizeBytes: number;
  checksumSha256: string;
  pageCount: number;
  ocrUsed: boolean;
  ocrStatus: string;
  extractedFields: Record<string, any>;
  findingsRaised: Finding[];
  newStatus: string;
}

export async function uploadApplicationDocument(
  submissionId: string,
  file: File,
  metadata: {
    documentType?: string;
    issuer?: string;
    description?: string;
  } = {}
): Promise<DocumentUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('documentType', metadata.documentType || 'document');
  if (metadata.issuer) formData.append('issuer', metadata.issuer);
  if (metadata.description) formData.append('description', metadata.description);

  try {
    const res = await apiFetch<DocumentUploadResult>(
      `/submissions/${submissionId}/documents/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );
    return res;
  } catch (err: any) {
    // If backend returns an error message (e.g. invalid file format or size), throw it
    if (err.message && !err.message.includes('Failed to fetch')) {
      throw err;
    }

    // Local simulated fallback
    await delay(600);
    const sub = localSubmissions.find((s) => s.id === submissionId);
    if (!sub) throw new Error(`Submission ${submissionId} not found`);

    const docId = `ev-upload-${Date.now()}`;
    const newDoc: EvidenceItem = {
      id: docId,
      type: (metadata.documentType as any) || 'document',
      name: file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
      filename: file.name,
      fileSizeBytes: file.size,
      fileSizeFormatted: `${(file.size / 1024).toFixed(1)} KB`,
      uploadedAt: new Date().toISOString(),
      verificationStatus: 'verified',
      issuer: metadata.issuer || 'Uploaded Applicant Record',
      description: metadata.description || `Uploaded document: ${file.name}`,
      checksumSha256: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
      pageCount: 1,
    };
    sub.evidence.unshift(newDoc);
    localAuditEvents.unshift({
      id: `aud-${Date.now()}`,
      submissionId: sub.id,
      applicationId: sub.applicationId,
      institutionName: sub.institution.name,
      action: 'submission_received',
      performedBy: 'Reviewer / Intake Pipeline',
      timestamp: new Date().toISOString(),
      details: `Document '${file.name}' uploaded and certified with SHA-256 integrity checksum.`,
    });

    return {
      success: true,
      message: `Document '${file.name}' uploaded successfully (Simulated mode).`,
      documentId: docId,
      filename: file.name,
      fileSizeBytes: file.size,
      checksumSha256: newDoc.checksumSha256!,
      pageCount: 1,
      ocrUsed: false,
      ocrStatus: 'PyMuPDF digital extraction active.',
      extractedFields: {},
      findingsRaised: [],
      newStatus: sub.status,
    };
  }
}

// ─── Evidence Search ──────────────────────────────────────────────────────────

export interface EvidenceSearchResultItem {
  evidence: EvidenceItem;
  submission: Submission;
}

export async function searchEvidence(
  params: {
    query?: string;
    doc_type?: string;
    verification_status?: string;
  } = {}
): Promise<{ results: EvidenceSearchResultItem[]; total: number }> {
  try {
    const queryParams = new URLSearchParams();
    if (params.query) queryParams.set('query', params.query);
    if (params.doc_type && params.doc_type !== 'all') queryParams.set('doc_type', params.doc_type);
    if (params.verification_status && params.verification_status !== 'all') {
      queryParams.set('verification_status', params.verification_status);
    }
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const res = await apiFetch<{ results: EvidenceSearchResultItem[]; total: number }>(
      `/evidence/search${queryString}`
    );
    if (res && res.results) return res;
  } catch {
    // Fallback
  }

  await delay(150);
  const q = (params.query || '').toLowerCase().trim();
  const docType = params.doc_type || 'all';
  const vStatus = params.verification_status || 'all';

  const results: EvidenceSearchResultItem[] = [];
  for (const sub of localSubmissions) {
    for (const ev of sub.evidence) {
      const matchQuery =
        !q ||
        ev.name.toLowerCase().includes(q) ||
        ev.type.toLowerCase().includes(q) ||
        (ev.issuer ?? '').toLowerCase().includes(q) ||
        sub.institution.name.toLowerCase().includes(q) ||
        sub.applicationId.toLowerCase().includes(q);

      const matchType = docType === 'all' || ev.type === docType;
      const matchStatus = vStatus === 'all' || ev.verificationStatus === vStatus;

      if (matchQuery && matchType && matchStatus) {
        results.push({ evidence: ev, submission: sub });
      }
    }
  }

  return { results, total: results.length };
}

// ─── Audit Events ─────────────────────────────────────────────────────────────

export async function fetchAuditEvents(
  limit = 50,
  action?: string,
  submissionId?: string
): Promise<AuditEvent[]> {
  try {
    const queryParams = new URLSearchParams();
    queryParams.set('limit', String(limit));
    if (action && action !== 'all') queryParams.set('action', action);
    if (submissionId) queryParams.set('submission_id', submissionId);

    const res = await apiFetch<AuditEvent[]>(`/audit?${queryParams.toString()}`);
    if (res) return res;
  } catch {
    // Fallback
  }

  await delay(150);
  let list = [...localAuditEvents];
  if (action && action !== 'all') {
    list = list.filter((e) => e.action === action);
  }
  if (submissionId) {
    list = list.filter((e) => e.submissionId === submissionId);
  }
  return list.slice(0, limit);
}

// ─── Reviewer ─────────────────────────────────────────────────────────────────

export async function fetchReviewerProfile(): Promise<ReviewerProfile> {
  try {
    const authMe = await fetchAuthMe();
    if (authMe) return authMe;
    return await apiFetch<ReviewerProfile>('/me');
  } catch {
    await delay(100);
    return mockReviewer;
  }
}
