# SIH26261 — AICTE VerifyAI
## AI-Powered Application Validation, Document Authentication and Regulatory Compliance Verification

AICTE VerifyAI automates the validation of institutional applications, authenticates supporting compliance documents, extracts key regulatory data, audits submissions against AICTE norms, screens for anomalies/tampering, and provides decision-support issuer verification, regulatory compliance assistance, and reviewer workflow queues.

---

### Project Structure

- `backend/`: FastAPI backend service (Python 3.11+, SQLAlchemy 2.x, SQLite, PyMuPDF, Pytesseract).
  - Documentation: [`backend/README.md`](file:///c:/Users/Namith%20Singh/OneDrive/Documents/SIH3RDATTEMPT/backend/README.md)
  - Integration API Contract: [`backend/docs/api-contract.md`](file:///c:/Users/Namith%20Singh/OneDrive/Documents/SIH3RDATTEMPT/backend/docs/api-contract.md)
- `frontend/`: React 19 + TypeScript + Vite frontend application (Lucide icons, Tailwind CSS).
  - Documentation: [`frontend/README.md`](file:///c:/Users/Namith%20Singh/OneDrive/Documents/SIH3RDATTEMPT/frontend/README.md)
- `docs/`: Full-stack integration architecture and API specifications.
  - Integration Guide: [`docs/frontend-backend-integration.md`](file:///c:/Users/Namith%20Singh/OneDrive/Documents/SIH3RDATTEMPT/docs/frontend-backend-integration.md)
  - API Contract: [`docs/api-contract.md`](file:///c:/Users/Namith%20Singh/OneDrive/Documents/SIH3RDATTEMPT/docs/api-contract.md)

---

### Quick Start Guide

#### 1. Backend Service (FastAPI)
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# Install dependencies:
pip install -r requirements.txt
# Run automated test suite:
python -m pytest -v
# Start development server on port 8000:
python -m uvicorn app.main:app --reload --port 8000
```
- Interactive Swagger UI: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/health`

#### 2. Frontend Application (React + Vite)
```bash
cd frontend
# Install dependencies:
npm install
# Build & verify type checking:
npm run build
# Start Vite development server on port 5173:
npm run dev
```
- Web Application: `http://localhost:5173`
