# ─── backend/auth.py ─────────────────────────────────────────────────────────
# Reviewer authentication module for AICTE VerifyAI.
# Uses PBKDF2-HMAC-SHA256 (Python stdlib hashlib) for password hashing.
# Uses HMAC-SHA256 (Python stdlib hmac) for token signing.
# No third-party auth dependencies required.
# ─────────────────────────────────────────────────────────────────────────────
import hashlib
import hmac
import secrets
import time
import os
import json
from typing import Optional, Tuple


# ── Signing secret ────────────────────────────────────────────────────────────
# In production this MUST come from an env var / secrets manager.
# For the SIH prototype it falls back to a dev-time constant if the env var
# is absent so that local demo works out of the box without config steps.
_SIGNING_SECRET: str = os.environ.get(
    "VERIFYAI_TOKEN_SECRET",
    "sih-verifyai-dev-secret-do-not-use-in-production-2026"
)
TOKEN_TTL_SECONDS = 8 * 60 * 60  # 8 hours


# ── Password hashing (PBKDF2-HMAC-SHA256) ────────────────────────────────────
def hash_password(plaintext: str) -> str:
    """Return a salted PBKDF2-HMAC-SHA256 hash in the format salt$hash."""
    salt = secrets.token_hex(16)          # 128-bit random salt
    dk = hashlib.pbkdf2_hmac(
        "sha256",
        plaintext.encode("utf-8"),
        salt.encode("utf-8"),
        iterations=260_000,               # OWASP 2023 minimum recommendation
    )
    return f"{salt}${dk.hex()}"


def verify_password(plaintext: str, stored_hash: str) -> bool:
    """Constant-time comparison to resist timing attacks."""
    try:
        salt, dk_hex = stored_hash.split("$", 1)
    except ValueError:
        return False
    dk_candidate = hashlib.pbkdf2_hmac(
        "sha256",
        plaintext.encode("utf-8"),
        salt.encode("utf-8"),
        iterations=260_000,
    )
    return hmac.compare_digest(dk_candidate.hex(), dk_hex)


# ── Token generation / verification (HMAC-SHA256) ────────────────────────────
def generate_token(reviewer_id: str) -> str:
    """Return a signed token: base64url(payload) || . || signature."""
    expires_at = int(time.time()) + TOKEN_TTL_SECONDS
    payload = f"{reviewer_id}:{expires_at}"
    sig = hmac.new(
        _SIGNING_SECRET.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    import base64
    encoded_payload = base64.urlsafe_b64encode(payload.encode()).decode()
    return f"{encoded_payload}.{sig}"


def verify_token(token: str) -> Optional[str]:
    """
    Validate token signature and expiry.
    Returns the reviewer_id on success, None on failure.
    """
    import base64
    try:
        encoded_payload, sig = token.rsplit(".", 1)
        payload = base64.urlsafe_b64decode(encoded_payload.encode()).decode()
        reviewer_id, expires_at_str = payload.split(":", 1)
        expires_at = int(expires_at_str)
    except Exception:
        return None

    # Recompute signature and compare in constant time
    expected_sig = hmac.new(
        _SIGNING_SECRET.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected_sig, sig):
        return None

    if int(time.time()) > expires_at:
        return None  # token expired

    return reviewer_id
