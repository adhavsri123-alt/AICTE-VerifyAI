"""FastAPI application factory."""

from __future__ import annotations

import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.database import Base, engine, ensure_schema_compatibility
from app.routes import (
    applications,
    audit,
    compliance,
    dashboard,
    documents,
    health,
    reviewer,
)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application lifespan — runs on startup and shutdown."""
    settings = get_settings()
    # Ensure private storage directory exists
    os.makedirs(settings.storage_dir, exist_ok=True)

    # Startup: create tables and synchronize schema
    import app.models as _models  # noqa: F841
    Base.metadata.create_all(bind=engine)
    ensure_schema_compatibility(engine)
    yield
    # Shutdown: cleanup if needed


def create_app() -> FastAPI:
    """Build and return the configured FastAPI application instance."""
    settings = get_settings()

    app = FastAPI(
        title=settings.app_title,
        version=settings.app_version,
        description=(
            "AI-Powered Application Validation, Document Authentication "
            "and Regulatory Compliance Verification for AICTE."
        ),
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    # ------------------------------------------------------------------
    # CORS
    # ------------------------------------------------------------------
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ------------------------------------------------------------------
    # Global exception handler — never leak stack traces to clients
    # ------------------------------------------------------------------
    @app.exception_handler(Exception)
    async def _unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content={"detail": "An internal server error occurred."},
        )

    # ------------------------------------------------------------------
    # Routers — all under the /api prefix
    # ------------------------------------------------------------------
    api_prefix = "/api"
    app.include_router(health.router, prefix=api_prefix)
    app.include_router(applications.router, prefix=api_prefix)
    app.include_router(documents.router, prefix=api_prefix)
    app.include_router(dashboard.router, prefix=api_prefix)
    app.include_router(compliance.router, prefix=api_prefix)
    app.include_router(audit.router, prefix=api_prefix)
    app.include_router(reviewer.router, prefix=api_prefix)

    return app


app = create_app()
