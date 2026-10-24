# AICTE VerifyAI — Backend

> **SIH26261** — AI-Powered Application Validation, Document Authentication and Regulatory Compliance Verification.

AICTE VerifyAI automates the validation of institutional applications, authenticates supporting compliance documents, extracts key regulatory data, audits submissions against AICTE norms, screens for anomalies/tampering, and provides decision-support issuer verification, regulatory compliance assistance, and reviewer workflow queues.

---

## Roadmap & Status

| Phase | Focus | Status |
|---|---|---|
| **Phase 1** | Foundation: Modular FastAPI application, SQLAlchemy ORM models, Pydantic v2 schemas, REST endpoints, database-backed dashboard stats, CORS, error handling. | ✅ Completed (19 tests) |
| **Phase 2** | Secure Document Upload, OCR, Text Extraction, Document Classification, Structured Field Extraction, and Audit Trail. | ✅ Completed (53 tests) |
| **Phase 3** | Explainable Validation Engine: Configurable Checklists, Missing/Incomplete Detection, Expiry & Date Validation, Cross-Document Consistency, Duplicate SHA-256 Checks, Structured Findings, and Validation APIs. | ✅ Completed (69 tests) |
| **Phase 3 Fix** | Regression fix for SQLite schema desynchronization during duplicate validation (`OperationalError: table validation_findings has no column named title`). Startup schema compatibility synchronization. | ✅ Completed (70 tests) |
| **Phase 4** | Anomaly Detection, PDF Metadata Inspection, Timestamp Chronology Analysis, Near-Duplicate Text Similarity Screening, and Document Alteration Indicators. | ✅ Completed (89 tests) |
| **Phase 5** | Issuer Verification Assistance (Provider Abstraction & Synthetic Mock Registry) + Regulatory Compliance Assistance (Configurable Rules, Evidence Distinctions, Human Review Workflow). | ✅ Completed (112 tests) |
| **Phase 6** | Dashboard Aggregates, Paginated Audit Trail, Reviewer Workflow & Queue, Single-Pane Combined Findings, Safe Metadata Handling, and React Frontend Integration Contract. | ✅ Completed (132 tests) |

---

## Phase 6: Dashboard APIs, Audit Trail, Reviewer Workflows & Frontend Integration

Phase 6 prepares the AICTE VerifyAI backend for full demonstration and seamless integration with the React + Vite frontend application.

> [!IMPORTANT]
> **Advisory Nature & Reviewer Safeguards:**
> 1. **Decision Support Only:** Verification findings, compliance checklists, and issuer matches are advisory decision-support tools for human regulatory officers.
> 2. **No Automatic Rejection:** An institution is NEVER automatically rejected. Adverse findings flag applications for officer examination.
> 3. **Demonstration Environment:** Reviewer endpoints and audit logging are demonstration-oriented for hackathon evaluation and do not claim cryptographic tamper-proofing or production government authorization.

---

### 1. Database-Backed Dashboard Aggregates (`GET /api/dashboard/stats`, `GET /api/dashboard/recent-activity`)
- **Real Database Counts:** All counts are calculated in real time using SQL aggregations (`func.count`, `group_by`, `distinct`). No mock or hardcoded counts.
- **Breakdowns:**
  - Applications by status (`submitted`, `under_review`, `validated`) and category (`New Institution`, `Extension of Approval`, etc.).
  - Documents by processing status (`uploaded`, `completed`, `failed`) and document type.
  - Validation findings by severity (`critical`, `high`, `medium`, `low`, `info`) and review status.
  - Issuer verification outcome counts (`MOCK_MATCH`, `NO_MATCH`, etc.) and dedicated `issuer_verification_mock_count`.
  - Compliance rule outcome counts (`SATISFIED`, `NOT_SATISFIED`, `INSUFFICIENT_EVIDENCE`, `PARTIALLY_SATISFIED`, `NOT_APPLICABLE`).
- **Review Queue Urgency Metric (`applications_requiring_review`):**
  - Accurately counts distinct applications needing review (flagged with critical/high findings, issuer mismatches, or unmet compliance rules) without double-counting.
- **Recent Feeds:** Real-time latest 5 applications and 10 recent activities, with dedicated paginated endpoint `GET /api/dashboard/recent-activity`.

---

### 2. Audit Trail System (`GET /api/audit-trail`, `GET /api/applications/{id}/audit-trail`)
- **System-Wide & Per-Application:** Query chronological audit logs across all submissions or filtered by specific `application_id`.
- **Filtering & Pagination:** Supports `page`, `page_size` (max 100), `event_type`, `start_date`, and `end_date`.
- **Stable Tie-Breaking:** Sorted by `created_at.desc(), id.desc()`.
- **Privacy & Security Safeguards:**
  - Automated recursive sanitizer strips sensitive keys (`password`, `secret`, `token`, `key`, `auth`, `credential`, `private`, `content`, `raw_bytes`, `extracted_text`, `traceback`).
  - Fallback non-authenticated actors default to `"system"` or `"demo_reviewer"`, never fabricating official officer credentials.

---

### 3. Reviewer Workflow & Queue (`app/routes/reviewer.py`)
- **Reviewer Queue (`GET /api/reviewer/applications`):**
  - Prioritized worklist of applications requiring review with finding summaries (`critical_findings_count`, `high_findings_count`, `unresolved_findings_count`, `compliance_issues_count`).
  - Filterable by `review_status` (`pending`, `in_review`, `needs_information`, `reviewed`, `escalated`) and `category`.
- **Review Decision Submission (`POST /api/applications/{id}/review`):**
  - Submits reviewer decision and mandatory observation note.
  - Enforces valid lifecycle state transitions (e.g., `pending` -> `in_review` -> `needs_information` -> `reviewed`).
  - Disallows duplicate status transitions or invalid jumps (returns HTTP 400).
  - Appends an immutable `ReviewAction` history entry and automatically generates an `AuditEvent`.
  - Updates application `review_status`, `review_notes`, `reviewed_at`, and `reviewer_actor`.
- **Review History (`GET /api/applications/{id}/review-history`):**
  - Retrieves chronological history of all reviewer status transitions and notes.
- **Combined Findings (`GET /api/applications/{id}/combined-findings`):**
  - Single-pane-of-glass endpoint combining application metadata, machine validation findings, PDF anomaly observations, issuer verification checks, regulatory compliance evaluations, and reviewer action history.
  - Provides concise executive summary recommendation and advisory disclaimers.

---

### 4. Non-Destructive Schema Compatibility (`app/database.py`)
- The startup lifespan executes `ensure_schema_compatibility()`.
- Automatically checks database tables and runs safe `ALTER TABLE ... ADD COLUMN` for any newly added model columns (such as `review_status`, `review_notes`, `reviewed_at`, `reviewer_actor`, `document_id`, `metadata_payload`).
- Automatically creates new tables (such as `review_actions`).
- Fully tested on legacy SQLite databases without deleting or corrupting existing records.

---

## API Endpoints Reference

All endpoints are versioned under the `/api` prefix.

| Method | Path | Summary | Phase |
|---|---|---|---|
| `GET` | `/api/health` | System health, version (`0.6.0`), and environment | Phase 1 |
| `POST` | `/api/applications` | Create a new AICTE application | Phase 1 |
| `GET` | `/api/applications` | List applications with pagination (`page`, `page_size`, `status`) | Phase 1 |
| `GET` | `/api/applications/{id}` | Retrieve application details by ID | Phase 1 |
| `POST` | `/api/applications/{id}/documents` | Upload a supporting document (multipart `file`) | Phase 2 |
| `GET` | `/api/applications/{id}/documents` | List all documents attached to an application | Phase 2 |
| `GET` | `/api/documents/{id}` | Retrieve document metadata (safe, private path omitted) | Phase 2 |
| `GET` | `/api/documents/{id}/extraction` | Retrieve extracted text, fields, and confidence | Phase 2 |
| `GET` | `/api/documents/{id}/metadata-analysis` | Detailed PDF metadata and alteration inspection | Phase 4 |
| `POST` | `/api/documents/{id}/verify-issuer` | Run issuer verification assistance for a document | Phase 5 |
| `GET` | `/api/documents/{id}/issuer-verification` | Retrieve latest issuer verification result for a document | Phase 5 |
| `POST` | `/api/applications/{id}/validate` | Run validation engine + Phase 4 anomalies + Phase 5 checks | Phase 3/4/5 |
| `GET` | `/api/applications/{id}/results` | Retrieve persisted validation findings and summary | Phase 3/4/5 |
| `POST` | `/api/applications/{id}/compliance-check` | Evaluate regulatory compliance requirements | Phase 5 |
| `GET` | `/api/applications/{id}/compliance-results` | Retrieve persisted compliance evaluation results | Phase 5 |
| `GET` | `/api/compliance/rules` | List active configurable compliance rules | Phase 5 |
| `GET` | `/api/dashboard/stats` | Aggregated dashboard statistics (real DB counts) | **Phase 6** |
| `GET` | `/api/dashboard/recent-activity` | Paginated recent activity timeline | **Phase 6** |
| `GET` | `/api/audit-trail` | System-wide paginated audit trail with filters | **Phase 6** |
| `GET` | `/api/applications/{id}/audit-trail` | Application-specific paginated audit trail | **Phase 6** |
| `GET` | `/api/reviewer/applications` | Reviewer worklist queue of applications needing review | **Phase 6** |
| `GET` | `/api/applications/{id}/combined-findings` | Unified single-pane-of-glass reviewer findings view | **Phase 6** |
| `POST` | `/api/applications/{id}/review` | Submit reviewer decision, note, and status transition | **Phase 6** |
| `GET` | `/api/applications/{id}/review-history` | Chronological reviewer action history for application | **Phase 6** |

---

## Running Automated Tests

```bash
cd backend
python -m pytest -v
```

**Test Results:** **132 passed** in ~6.5 seconds with 0 failures, 0 errors, and 0 warnings:
- `tests/test_phase6_dashboard.py`: 4 tests (Real DB aggregates, zero state, review-required distinct counting, activity pagination)
- `tests/test_phase6_audit.py`: 6 tests (Audit log listing, pagination, sorting, filters, 404 handling, sensitive metadata stripping)
- `tests/test_phase6_reviewer.py`: 6 tests (Reviewer queue, decision lifecycle, invalid transitions, 404s, combined findings, machine finding preservation)
- `tests/test_phase6_schema_compatibility.py`: 1 test (Non-destructive legacy SQLite migration and read/write verification)
- `tests/test_phase6_cors.py`: 3 tests (Vite 5173 preflight, React 3000 preflight, unauthorized origin rejection)
- `tests/test_issuer_verification.py`: 11 tests (Mock provider matches, mismatches, offline handling, API endpoints, audit events)
- `tests/test_compliance.py`: 12 tests (Complete compliance pass, missing documents, failed OCR, missing fields, category scoping, persistence)
- `tests/test_anomaly.py`: 19 tests (Metadata analysis, timestamps, near-duplicates, alterations, single-doc API)
- `tests/test_validation.py`: 16 tests (Checklists, missing docs, dates, consistency, duplicates, schema regression fix)
- `tests/test_documents.py`: 20 tests (Uploads, PyMuPDF, OCR fallback, path traversal, security)
- `tests/test_classifier_and_fields.py`: 14 tests (Category registry, field regex, sanitization)
- `tests/test_applications.py`: 13 tests (Application CRUD & pagination)
- `tests/test_dashboard.py`: 4 tests (Original dashboard regression tests)
- `tests/test_health.py`: 3 tests (Health endpoint, version 0.6.0)

---

## Manual Swagger Verification Steps

1. Start the FastAPI development server:
   ```bash
   cd backend
   uvicorn app.main:app --reload --port 8000
   ```
2. Open Swagger UI at `http://localhost:8000/docs`.
3. **Test Dashboard Aggregates:**
   - Call `GET /api/dashboard/stats`. Confirm all counts, breakdowns, `applications_requiring_review`, and `recent_activities` populate from the database.
4. **Test Audit Trail:**
   - Call `GET /api/audit-trail` with `page=1&page_size=10`.
   - Verify that newest events appear first with timestamp and actor.
5. **Test Reviewer Queue:**
   - Call `GET /api/reviewer/applications`. Confirm flagged applications are listed with critical/high finding counts.
6. **Test Combined Findings:**
   - Call `GET /api/applications/{application_id}/combined-findings`. Verify the unified payload includes validation findings, compliance evaluation, and reviewer history.
7. **Test Reviewer Decision:**
   - Call `POST /api/applications/{application_id}/review` with:
     ```json
     {
       "new_status": "in_review",
       "note": "Beginning examination of land documents.",
       "actor": "officer_demo_1"
     }
     ```
   - Verify response status 200, then call `GET /api/applications/{application_id}/review-history` to see the recorded action.
8. **Test Transition Validation:**
   - Try calling `POST /api/applications/{application_id}/review` with `"new_status": "in_review"` again. Confirm HTTP 400 with explanation.
