# AICTE VerifyAI — Frontend Integration API Contract
**Version:** 0.6.0 (Phase 6)  
**Target Consumer:** React + Vite Frontend Application  
**Base URL:** `http://localhost:8000/api`  
**Interactive Documentation (Swagger):** `http://localhost:8000/docs`  
**OpenAPI Specification:** `http://localhost:8000/openapi.json`

---

## 1. Overview & Architectural Principles

AICTE VerifyAI is an AI-powered application validation, document authentication, and regulatory compliance verification backend for the All India Council for Technical Education (AICTE).

### Key Frontend Guiding Principles:
1. **Decision Support, Not Automated Adjudication:** Findings, verification matches, and compliance reports are decision-support aids for regulatory officers. They never claim official verification unless connected to an authorized government provider.
2. **Mock vs. Real Distinction:** The mock issuer verification provider is synthetic and deterministic. The frontend must display the `is_mock` badge and the prominent advisory disclaimer. `is_officially_verified` is strictly `false` for mock providers.
3. **Evidence vs. Non-Compliance:** A missing document or failed field extraction is flagged as `INSUFFICIENT_EVIDENCE` or `PARTIALLY_SATISFIED`, never as fraudulent or confirmed non-compliance.
4. **Human Review Safeguard & No Auto-Rejection:** An institution is NEVER automatically rejected. All adverse decisions require regulatory officer determination.
5. **Demonstration Environment Disclaimer:** The reviewer workflow and audit logging endpoints are designed for Smart India Hackathon evaluation. They identify actors as system/demo actors and do not claim cryptographic tamper-proofing or production-level officer identity management.

---

## 2. Enumerated Types & Status Codes

### A. Reviewer Workflow Statuses (`ReviewStatus`)
| Value | Description | Allowed Next Transitions |
|---|---|---|
| `pending` | Application awaiting initial review assignment | `in_review`, `needs_information`, `reviewed`, `escalated` |
| `in_review` | Officer is actively inspecting documents and findings | `needs_information`, `reviewed`, `escalated`, `pending` |
| `needs_information` | Clarification or re-upload requested from institution | `in_review`, `reviewed`, `escalated` |
| `reviewed` | Officer has completed review and cleared/annotated findings | `in_review`, `escalated` (re-opening allowed) |
| `escalated` | Flagged to senior AICTE committee / grievance officer | `in_review`, `reviewed`, `needs_information` |

### B. Issuer Verification Outcomes (`IssuerVerificationOutcome`)
| Value | Meaning | UI Badge / Recommendation |
|---|---|---|
| `VERIFIED_BY_CONFIGURED_PROVIDER` | Successfully verified against an authorized live provider | Green badge: "Verified by Live Provider" |
| `MOCK_MATCH` | Matches a synthetic demonstration record in the configured mock registry. **Not official verification.** | Amber/Blue badge: "Mock Registry Match (Demo)" |
| `NO_MATCH` | No matching record found in the mock registry for the supplied reference number | Gray badge: "No Mock Record Found" |
| `MISMATCH` | Issuer or institution name contradicts the registered certificate holder | Red badge: "Entity Mismatch" (Review Required) |
| `INSUFFICIENT_INFORMATION` | Missing reference number or issuer name in document extraction | Orange badge: "Insufficient Extracted Data" |
| `UNAVAILABLE` | Live or mock verification service is unreachable or disabled | Gray badge: "Provider Offline / Unavailable" |
| `MANUAL_REVIEW_REQUIRED` | Inconclusive extraction or data conflict requiring manual visual clearance | Yellow badge: "Officer Review Required" |

### C. Regulatory Compliance Statuses (`ComplianceStatus`)
| Value | Meaning | Action Needed |
|---|---|---|
| `SATISFIED` | All required documents and fields are present, valid, and unexpired | None (Requirement Met) |
| `NOT_SATISFIED` | Demonstrated non-compliance (e.g. expired document, conflicting institution name, critical alteration) | Regulatory Action / Clarification |
| `PARTIALLY_SATISFIED` | Document is present, but some fields could not be extracted automatically | Officer visual confirmation of scan |
| `INSUFFICIENT_EVIDENCE` | Required document is missing from submission or failed OCR/file processing | Applicant re-upload required |
| `NOT_APPLICABLE` | Rule does not apply to this application's category or academic year | N/A (Rule bypassed) |
| `MANUAL_REVIEW_REQUIRED` | Document flagged with anomaly or alteration indicator needing clearance | Officer manual inspection |

### D. Finding Severities (`FindingSeverity`)
- `critical`, `high`, `medium`, `low`, `info`

---

## 3. Phase 6 API Endpoints Specification

### 3.1. Dashboard APIs

#### `GET /api/dashboard/stats`
Returns complete real-time database-backed aggregate metrics, status breakdowns, review queues, mock verification statistics, compliance rule summaries, recent applications, and recent activities.
- **Method:** `GET`
- **Response Code:** `200 OK`

**Response Example (`200 OK`):**
```json
{
  "total_applications": 12,
  "status_breakdown": {
    "submitted": 8,
    "under_review": 3,
    "validated": 1
  },
  "applications_by_category": {
    "New Institution": 5,
    "Extension of Approval": 7
  },
  "total_documents": 36,
  "documents_by_processing_status": {
    "uploaded": 4,
    "completed": 30,
    "failed": 2
  },
  "documents_by_type": {
    "land_document": 12,
    "building_plan": 10,
    "payment_receipt": 14
  },
  "total_findings": 18,
  "findings_by_severity": {
    "critical": 2,
    "high": 6,
    "medium": 7,
    "low": 3
  },
  "findings_by_status": {
    "pending": 14,
    "confirmed": 3,
    "dismissed": 1
  },
  "applications_requiring_review": 5,
  "issuer_verification_counts": {
    "MOCK_MATCH": 15,
    "NO_MATCH": 3,
    "MISMATCH": 1
  },
  "issuer_verification_mock_count": 19,
  "compliance_outcome_counts": {
    "SATISFIED": 42,
    "NOT_SATISFIED": 3,
    "PARTIALLY_SATISFIED": 5,
    "INSUFFICIENT_EVIDENCE": 6,
    "NOT_APPLICABLE": 18
  },
  "recent_applications": [
    {
      "id": "e4b6c8d2-1234-4567-89ab-cdef01234567",
      "institution_name": "Indian Institute of Science",
      "application_category": "New Institution",
      "academic_year": "2025-2026",
      "status": "submitted",
      "review_status": "in_review",
      "created_at": "2026-10-24T01:40:00Z"
    }
  ],
  "recent_activities": [
    {
      "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "timestamp": "2026-10-24T01:42:00Z",
      "event_type": "reviewer_action_recorded",
      "application_id": "e4b6c8d2-1234-4567-89ab-cdef01234567",
      "document_id": null,
      "summary": "Review status changed from 'pending' to 'in_review'. Note: Beginning examination of land and fee documents.",
      "actor": "officer_demo_1"
    }
  ]
}
```

---

#### `GET /api/dashboard/recent-activity`
Paginated recent activity timeline.
- **Method:** `GET`
- **Query Params:** `page` (int, default 1), `page_size` (int, default 20, max 100)
- **Response Code:** `200 OK`

---

### 3.2. Audit Trail APIs

#### `GET /api/audit-trail`
Retrieves paginated audit events across all applications. Sensitive credentials, raw document streams, and secrets are strictly stripped.
- **Method:** `GET`
- **Query Params:**
  - `page` (int, default 1, min 1)
  - `page_size` (int, default 20, min 1, max 100)
  - `application_id` (UUID string, optional)
  - `event_type` (string, optional)
  - `start_date` (ISO 8601 UTC datetime, optional)
  - `end_date` (ISO 8601 UTC datetime, optional)
- **Response Code:** `200 OK`

**Response Example (`200 OK`):**
```json
{
  "items": [
    {
      "id": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
      "timestamp": "2026-10-24T01:45:00Z",
      "created_at": "2026-10-24T01:45:00Z",
      "event_type": "reviewer_action_recorded",
      "application_id": "e4b6c8d2-1234-4567-89ab-cdef01234567",
      "document_id": null,
      "actor": "officer_demo_1",
      "summary": "Review status changed from 'pending' to 'in_review'.",
      "details": "Review status changed from 'pending' to 'in_review'. Note: Inspecting land registration certificates.",
      "metadata": {
        "previous_review_status": "pending",
        "new_review_status": "in_review",
        "action": "reviewer_decision"
      }
    }
  ],
  "total": 45,
  "page": 1,
  "page_size": 20,
  "total_pages": 3,
  "notice": "Notice: Demonstration audit log. Events are database-recorded for accountability."
}
```

#### `GET /api/applications/{application_id}/audit-trail`
Retrieves chronological audit events associated specifically with the requested application.
- **Method:** `GET`
- **Path Params:** `application_id` (UUID string)
- **Query Params:** `page` (int, default 1), `page_size` (int, default 20), `event_type` (string, optional)
- **Response Code:** `200 OK` (or `404 Not Found` if application does not exist)

---

### 3.3. Reviewer Workflow APIs

#### `GET /api/reviewer/applications`
Lists applications that require human review, sorted by newest first.
- **Method:** `GET`
- **Query Params:**
  - `page` (int, default 1, min 1)
  - `page_size` (int, default 20, max 100)
  - `review_status` (string, optional: `pending`, `in_review`, `needs_information`, `reviewed`, `escalated`)
  - `category` (string, optional)
- **Response Code:** `200 OK`

**Response Item Example:**
```json
{
  "id": "e4b6c8d2-1234-4567-89ab-cdef01234567",
  "institution_name": "Indian Institute of Science",
  "application_category": "New Institution",
  "academic_year": "2025-2026",
  "status": "submitted",
  "review_status": "in_review",
  "review_notes": "Beginning examination of land and fee documents.",
  "reviewed_at": "2026-10-24T01:42:00Z",
  "reviewer_actor": "officer_demo_1",
  "critical_findings_count": 0,
  "high_findings_count": 4,
  "unresolved_findings_count": 4,
  "issuer_issues_count": 0,
  "compliance_issues_count": 1,
  "requires_human_review": true,
  "created_at": "2026-10-24T01:40:00Z",
  "updated_at": "2026-10-24T01:42:00Z"
}
```

---

#### `GET /api/applications/{application_id}/combined-findings`
Unified single-pane-of-glass reviewer view. Combines application metadata, machine validation findings, PDF anomaly observations, issuer verification checks, regulatory compliance evaluations, and reviewer action history.
- **Method:** `GET`
- **Path Params:** `application_id` (UUID string)
- **Response Code:** `200 OK` (or `404 Not Found`)

**Response Structure (`200 OK`):**
```json
{
  "application": {
    "id": "e4b6c8d2-1234-4567-89ab-cdef01234567",
    "institution_name": "Indian Institute of Science",
    "application_category": "New Institution",
    "academic_year": "2025-2026",
    "status": "submitted",
    "review_status": "in_review",
    "review_notes": "Examining documents.",
    "reviewed_at": "2026-10-24T01:42:00Z",
    "reviewer_actor": "officer_demo_1",
    "created_at": "2026-10-24T01:40:00Z",
    "updated_at": "2026-10-24T01:42:00Z"
  },
  "review_status": "in_review",
  "review_notes": "Examining documents.",
  "reviewed_at": "2026-10-24T01:42:00Z",
  "reviewer_actor": "officer_demo_1",
  "validation_summary": {
    "total_findings": 4,
    "findings_by_severity": { "high": 4 },
    "findings_requiring_review": 4,
    "checks_completed": 5,
    "checks_inconclusive": 0,
    "overall_status": "action_required"
  },
  "validation_findings": [ ... ],
  "anomaly_observations": [ ... ],
  "issuer_verifications": [ ... ],
  "compliance_summary": { ... },
  "compliance_rule_results": [ ... ],
  "review_history": [
    {
      "id": "3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f",
      "application_id": "e4b6c8d2-1234-4567-89ab-cdef01234567",
      "previous_status": "pending",
      "new_status": "in_review",
      "note": "Examining documents.",
      "actor": "officer_demo_1",
      "created_at": "2026-10-24T01:42:00Z"
    }
  ],
  "requires_human_review": true,
  "recommendation": "Officer inspection required: 4 critical/high validation findings detected. Examine physical documents or issue a clarification request before final approval.",
  "disclaimer": "Notice: Automated verification assistance findings are advisory for regulatory officers. Adverse decisions require human officer determination and cannot be automated."
}
```

---

#### `POST /api/applications/{application_id}/review`
Submits an officer review decision and observation note. Enforces allowed status transitions, creates an immutable `ReviewAction` record, updates application review status, and appends an entry to the audit trail.
- **Method:** `POST`
- **Path Params:** `application_id` (UUID string)
- **Request Body:**
```json
{
  "new_status": "needs_information",
  "note": "Land conversion certificate is missing page 2 stamp. Please re-upload.",
  "actor": "officer_demo_1"
}
```
- **Response Code:** `200 OK`
- **Error Codes:**
  - `400 Bad Request`: If target status equals current status, or if the status transition is not permitted (e.g. `reviewed` directly to `pending`).
  - `404 Not Found`: If application ID does not exist.
  - `422 Unprocessable Content`: If status is not one of `pending`, `in_review`, `needs_information`, `reviewed`, `escalated`, or if note is empty.

**Response Example (`200 OK`):**
```json
{
  "id": "7a8b9c0d-1e2f-3a4b-5c6d-7e8f9a0b1c2d",
  "application_id": "e4b6c8d2-1234-4567-89ab-cdef01234567",
  "previous_status": "in_review",
  "new_status": "needs_information",
  "note": "Land conversion certificate is missing page 2 stamp. Please re-upload.",
  "actor": "officer_demo_1",
  "created_at": "2026-10-24T01:46:00Z"
}
```

---

#### `GET /api/applications/{application_id}/review-history`
Lists all recorded reviewer status updates and notes for an application, newest first.
- **Method:** `GET`
- **Path Params:** `application_id` (UUID string)
- **Response Code:** `200 OK` (list of `ReviewActionResponse`)

---

## 4. Phase 1–5 Endpoints Summary

| Method | Path | Summary |
|---|---|---|
| `GET` | `/api/health` | Service health, version (`0.6.0`), and environment |
| `POST` | `/api/applications` | Create new institutional application |
| `GET` | `/api/applications` | List applications with pagination (`page`, `page_size`, `status`) |
| `GET` | `/api/applications/{id}` | Get application details |
| `POST` | `/api/applications/{id}/documents` | Secure upload supporting document (PDF, PNG, JPEG) |
| `GET` | `/api/applications/{id}/documents` | List uploaded documents for application |
| `GET` | `/api/documents/{id}` | Document metadata (file size, SHA-256 hash, MIME) |
| `GET` | `/api/documents/{id}/extraction` | Extracted text and structured fields |
| `GET` | `/api/documents/{id}/metadata-analysis` | PDF authoring metadata, chronology, tamper screening |
| `POST` | `/api/documents/{id}/verify-issuer` | Run issuer verification against mock registry |
| `GET` | `/api/documents/{id}/issuer-verification` | Retrieve latest issuer verification outcome |
| `POST` | `/api/applications/{id}/validate` | Execute validation engine + anomalies + issuer checks |
| `GET` | `/api/applications/{id}/results` | Retrieve persisted validation findings |
| `POST` | `/api/applications/{id}/compliance-check` | Execute regulatory compliance evaluation |
| `GET` | `/api/applications/{id}/compliance-results` | Retrieve persisted compliance evaluation report |
| `GET` | `/api/compliance/rules` | List active regulatory compliance rules |

---

## 5. Local Frontend Setup & CORS Configuration

### A. CORS Configuration
The backend is pre-configured with FastAPI's `CORSMiddleware` supporting credentials and standard headers:
- Default allowed origins: `http://localhost:3000` (React dev server) and `http://localhost:5173` (Vite dev server).
- Configurable via the `CORS_ORIGINS` environment variable in `backend/.env`:
  ```ini
  CORS_ORIGINS=http://localhost:5173,http://localhost:3000
  ```
- Unrestricted wildcards (`*`) are strictly avoided when `allow_credentials=True` is enabled.

### B. Recommended React Integration Flow

```
+--------------------------------------------------------------------------------+
|                             React + Vite Frontend                              |
+--------------------------------------------------------------------------------+
                                       |
    1. Dashboard Overview              | GET /api/dashboard/stats
       (Aggregates, Statuses, Counts)  | GET /api/dashboard/recent-activity
                                       v
    2. Reviewer Worklist               | GET /api/reviewer/applications?review_status=pending
       (Priority Review Queue)         |
                                       v
    3. Application Review View         | GET /api/applications/{id}/combined-findings
       (Single-Pane-of-Glass View)     | GET /api/applications/{id}/documents
                                       v
    4. Action & Audit Logging          | POST /api/applications/{id}/review
       (Submit Decision & Notes)       | GET /api/applications/{id}/audit-trail
+--------------------------------------------------------------------------------+
```

### C. Frontend Component Recommendations:
1. **Overview Dashboard Screen:**
   - Display statistic cards for `total_applications`, `total_documents`, `applications_requiring_review`, `total_findings`.
   - Pie/bar charts for `applications_by_category` and `status_breakdown`.
   - Mini activity feed widget displaying `recent_activities`.
2. **Reviewer Queue Screen:**
   - Table displaying applications with urgency indicators (`critical_findings_count`, `compliance_issues_count`).
   - Filter dropdowns for `review_status` (`pending`, `in_review`, `needs_information`, `reviewed`, `escalated`).
   - "Open Review" button routing to `/reviewer/applications/{id}`.
3. **Application Review Screen (`combined-findings`):**
   - **Header:** Institution Name, Category, Academic Year, and current Review Status badge.
   - **Tabs:**
     - *Validation Findings:* List findings grouped by severity (Critical in red, High in orange).
     - *Issuer Verification:* Show certificate matches with the required **Mock Demonstration Match** badge and disclaimer box.
     - *Regulatory Compliance:* Show compliance cards with Satisfied, Partially Satisfied, or Insufficient Evidence chips.
     - *Audit & Action History:* Chronological timeline of review decisions and notes.
   - **Action Bar:** "Update Review Status" modal button triggering `POST /api/applications/{id}/review`.
