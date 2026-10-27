import React, { useState, useEffect, useId } from 'react';
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  FileSearch,
  GitCompare,
  CheckCircle2,
  FlaskConical,
} from 'lucide-react';
import { loginReviewer } from '../../services/api';
import type { ReviewerProfile } from '../../types';

interface LoginScreenProps {
  onAuthenticated: (reviewer: ReviewerProfile) => void;
}

// ─── SVG document-network illustration ────────────────────────────────────────

function DocumentNetworkSVG() {
  return (
    <svg
      viewBox="0 0 340 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: 280, maxHeight: 180, opacity: 0.92, display: 'block' }}
      aria-hidden="true"
    >
      {/* Connection lines */}
      <line x1="170" y1="90" x2="80"  y2="155" stroke="rgba(193,78,131,0.35)" strokeWidth="1.2" strokeDasharray="4 3"/>
      <line x1="170" y1="90" x2="260" y2="155" stroke="rgba(193,78,131,0.35)" strokeWidth="1.2" strokeDasharray="4 3"/>
      <line x1="80"  y1="155" x2="50"  y2="240" stroke="rgba(193,78,131,0.25)" strokeWidth="1" strokeDasharray="4 3"/>
      <line x1="80"  y1="155" x2="170" y2="245" stroke="rgba(193,78,131,0.25)" strokeWidth="1" strokeDasharray="4 3"/>
      <line x1="260" y1="155" x2="170" y2="245" stroke="rgba(193,78,131,0.25)" strokeWidth="1" strokeDasharray="4 3"/>
      <line x1="260" y1="155" x2="295" y2="240" stroke="rgba(193,78,131,0.25)" strokeWidth="1" strokeDasharray="4 3"/>

      {/* Nodes (document icons) */}
      {/* Top centre – main document */}
      <rect x="148" y="54" width="44" height="54" rx="5" fill="rgba(193,78,131,0.12)" stroke="rgba(193,78,131,0.55)" strokeWidth="1.4"/>
      <line x1="158" y1="72" x2="182" y2="72" stroke="rgba(193,78,131,0.7)" strokeWidth="1.2"/>
      <line x1="158" y1="79" x2="182" y2="79" stroke="rgba(193,78,131,0.5)" strokeWidth="1.2"/>
      <line x1="158" y1="86" x2="174" y2="86" stroke="rgba(193,78,131,0.4)" strokeWidth="1.2"/>
      {/* corner fold */}
      <polyline points="183,54 192,54 192,64" stroke="rgba(193,78,131,0.5)" strokeWidth="1.2" fill="none"/>

      {/* Left mid – document */}
      <rect x="52" y="122" width="38" height="48" rx="5" fill="rgba(138,47,91,0.12)" stroke="rgba(138,47,91,0.5)" strokeWidth="1.2"/>
      <line x1="61" y1="137" x2="81" y2="137" stroke="rgba(138,47,91,0.7)" strokeWidth="1.2"/>
      <line x1="61" y1="144" x2="81" y2="144" stroke="rgba(138,47,91,0.5)" strokeWidth="1.2"/>
      <line x1="61" y1="151" x2="74" y2="151" stroke="rgba(138,47,91,0.4)" strokeWidth="1.2"/>

      {/* Right mid – document */}
      <rect x="248" y="122" width="38" height="48" rx="5" fill="rgba(138,47,91,0.12)" stroke="rgba(138,47,91,0.5)" strokeWidth="1.2"/>
      <line x1="257" y1="137" x2="277" y2="137" stroke="rgba(138,47,91,0.7)" strokeWidth="1.2"/>
      <line x1="257" y1="144" x2="277" y2="144" stroke="rgba(138,47,91,0.5)" strokeWidth="1.2"/>
      <line x1="257" y1="151" x2="270" y2="151" stroke="rgba(138,47,91,0.4)" strokeWidth="1.2"/>

      {/* Bottom documents */}
      <rect x="22" y="210" width="32" height="40" rx="4" fill="rgba(53,29,49,0.3)" stroke="rgba(193,78,131,0.3)" strokeWidth="1"/>
      <line x1="30" y1="222" x2="46" y2="222" stroke="rgba(193,78,131,0.5)" strokeWidth="1"/>
      <line x1="30" y1="229" x2="46" y2="229" stroke="rgba(193,78,131,0.35)" strokeWidth="1"/>

      <rect x="151" y="214" width="38" height="48" rx="4" fill="rgba(53,29,49,0.3)" stroke="rgba(193,78,131,0.3)" strokeWidth="1"/>
      <line x1="159" y1="226" x2="181" y2="226" stroke="rgba(193,78,131,0.5)" strokeWidth="1"/>
      <line x1="159" y1="233" x2="181" y2="233" stroke="rgba(193,78,131,0.35)" strokeWidth="1"/>

      <rect x="283" y="210" width="32" height="40" rx="4" fill="rgba(53,29,49,0.3)" stroke="rgba(193,78,131,0.3)" strokeWidth="1"/>
      <line x1="291" y1="222" x2="307" y2="222" stroke="rgba(193,78,131,0.5)" strokeWidth="1"/>
      <line x1="291" y1="229" x2="307" y2="229" stroke="rgba(193,78,131,0.35)" strokeWidth="1"/>

      {/* Verification tick circles on connection nodes */}
      <circle cx="170" cy="155" r="18" fill="rgba(193,78,131,0.18)" stroke="rgba(193,78,131,0.6)" strokeWidth="1.5"/>
      <polyline points="162,155 168,162 180,148" stroke="#C14E83" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>

      <circle cx="80" cy="200" r="8" fill="rgba(193,78,131,0.15)" stroke="rgba(193,78,131,0.4)" strokeWidth="1"/>
      <polyline points="76,200 79,203 85,196" stroke="#C14E83" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>

      <circle cx="260" cy="200" r="8" fill="rgba(193,78,131,0.15)" stroke="rgba(193,78,131,0.4)" strokeWidth="1"/>
      <polyline points="256,200 259,203 265,196" stroke="#C14E83" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

// ─── Animated background shapes ───────────────────────────────────────────────

function LeftPanelBg() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {/* Radial glow top */}
      <div style={{
        position: 'absolute', top: '-60px', left: '-40px',
        width: 320, height: 320,
        background: 'radial-gradient(circle, rgba(193,78,131,0.12) 0%, transparent 70%)',
        borderRadius: '50%',
      }} />
      {/* Bottom right glow */}
      <div style={{
        position: 'absolute', bottom: '-40px', right: '-40px',
        width: 260, height: 260,
        background: 'radial-gradient(circle, rgba(138,47,91,0.15) 0%, transparent 70%)',
        borderRadius: '50%',
      }} />
      {/* Subtle grid */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06 }} aria-hidden="true">
        <defs>
          <pattern id="lg-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#C14E83" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#lg-grid)"/>
      </svg>
    </div>
  );
}

// ─── Feature pill ─────────────────────────────────────────────────────────────

function FeaturePill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7,
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(193,78,131,0.22)',
      borderRadius: 8, padding: '6px 12px',
    }}>
      <span style={{ color: '#C14E83', flexShrink: 0, opacity: 0.85 }}>{icon}</span>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.01em' }}>{label}</span>
    </div>
  );
}

// ─── Main Login Screen ────────────────────────────────────────────────────────

export const LoginScreen: React.FC<LoginScreenProps> = ({ onAuthenticated }) => {
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPw, setShowPw]         = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);
  const [pwTouched, setPwTouched]   = useState(false);
  const [visible, setVisible]       = useState(false);

  const emailId   = useId();
  const passwordId = useId();

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 40);
    return () => clearTimeout(t);
  }, []);

  // ── Validation ──────────────────────────────────────────────────────────────
  const emailError = emailTouched && !email.trim()
    ? 'Email is required.'
    : emailTouched && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? 'Enter a valid email address.'
    : null;

  const pwError = pwTouched && !password
    ? 'Password is required.'
    : null;

  const canSubmit = !emailError && !pwError && email.trim() && password && !loading;

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailTouched(true);
    setPwTouched(true);
    if (!email.trim() || !password) return;

    setLoading(true);
    setError(null);

    const result = await loginReviewer(email.trim(), password);

    setLoading(false);

    if (result.success && result.reviewer) {
      setVisible(false);
      setTimeout(() => onAuthenticated(result.reviewer!), 260);
    } else {
      setError(result.error ?? 'Sign-in failed. Please try again.');
    }
  };

  // ── Input style factory ─────────────────────────────────────────────────────
  const inputBase: React.CSSProperties = {
    width: '100%',
    background: '#FFFAFC',
    border: '1.5px solid #ECD9E2',
    borderRadius: 10,
    padding: '12px 14px',
    fontSize: 14,
    color: '#351D31',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.18s, box-shadow 0.18s',
    boxSizing: 'border-box',
  };

  const inputError: React.CSSProperties = {
    ...inputBase,
    borderColor: '#E74C6E',
    boxShadow: '0 0 0 3px rgba(231,76,110,0.12)',
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes loginFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseRing {
          0%,100% { box-shadow: 0 0 0 0 rgba(193,78,131,0.25); }
          50%      { box-shadow: 0 0 0 8px rgba(193,78,131,0); }
        }
        @keyframes dashMove {
          to { stroke-dashoffset: -20; }
        }
        .ls-input:focus {
          border-color: #C14E83 !important;
          box-shadow: 0 0 0 3px rgba(193,78,131,0.15) !important;
        }
        .ls-btn-primary:hover:not(:disabled) {
          transform: translateY(-1px) !important;
          box-shadow: 0 8px 24px rgba(193,78,131,0.38) !important;
        }
        .ls-btn-primary:active:not(:disabled) {
          transform: translateY(0) !important;
        }
        .ls-btn-primary:disabled {
          opacity: 0.72;
          cursor: not-allowed;
        }
        .ls-pw-toggle:hover {
          color: #C14E83 !important;
        }
        @media (max-width: 860px) {
          .ls-left-panel { display: none !important; }
          .ls-mobile-brand { display: flex !important; }
          .ls-card {
            max-width: 460px !important;
            margin: 16px auto !important;
            border-radius: 18px !important;
          }
          .ls-right-panel {
            padding: 28px 24px !important;
          }
        }
      `}</style>

      {/* Full-screen overlay with safe vertical scroll & auto-centering */}
      <div
        className="ls-root"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'linear-gradient(135deg, #FFF5F7 0%, #FFF0F4 60%, #FDF2F8 100%)',
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: 'clamp(16px, 2.5vh, 28px) clamp(16px, 2.5vw, 32px)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.28s ease',
          boxSizing: 'border-box',
        }}
      >
        {/* Top accent bar */}
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 10000,
          background: 'linear-gradient(90deg, #1A0D18 0%, #8A2F5B 40%, #C14E83 60%, #8A2F5B 80%, #1A0D18 100%)',
        }} />

        {/* Two-column card: margin 'auto 0' gives safe vertical centering without clipping */}
        <div
          className="ls-card"
          style={{
            display: 'flex',
            width: '100%',
            maxWidth: 960,
            margin: 'auto 0',
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: '0 24px 64px rgba(53,29,49,0.16), 0 6px 20px rgba(193,78,131,0.08)',
            animation: visible ? 'loginFadeUp 0.45s cubic-bezier(0.16,1,0.3,1) both' : 'none',
            flexShrink: 0,
          }}
        >

          {/* ── Left panel: brand identity ──────────────────────────────────── */}
          <div
            className="ls-left-panel"
            style={{
              flex: '0 0 45%',
              background: 'linear-gradient(155deg, #1A0D18 0%, #2A1226 40%, #351D31 80%, #3D1A35 100%)',
              padding: 'clamp(28px, 3.6vh, 40px) clamp(24px, 3vw, 36px)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <LeftPanelBg />

            {/* Brand mark */}
            <div style={{ position: 'relative', zIndex: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 'clamp(20px, 2.5vh, 28px)' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 11,
                  background: 'linear-gradient(135deg, #8A2F5B 0%, #C14E83 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(193,78,131,0.32)',
                  animation: 'pulseRing 3.5s ease-in-out infinite',
                  flexShrink: 0,
                }}>
                  <ShieldCheck size={22} color="#fff" strokeWidth={1.8} />
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>VerifyAI</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.48)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>AICTE Compliance</div>
                </div>
              </div>

              {/* Headline */}
              <h1 style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: 'clamp(22px, 2.6vw, 28px)',
                fontWeight: 400,
                color: '#fff',
                lineHeight: 1.22,
                margin: '0 0 10px',
                letterSpacing: '-0.015em',
              }}>
                Trust Every Application.<br />Verify Every Detail.
              </h1>

              <p style={{
                fontSize: 12.5, color: 'rgba(255,255,255,0.62)',
                lineHeight: 1.58, margin: '0 0 clamp(16px, 2vh, 22px)',
                maxWidth: 340,
              }}>
                Structured application validation, evidence inspection and
                cross-document reconciliation — surfacing discrepancies and risk
                indicators for human decision-making.
              </p>

              {/* Feature pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 'clamp(14px, 1.8vh, 18px)' }}>
                <FeaturePill icon={<FileSearch  size={11} />} label="Evidence Inspection"      />
                <FeaturePill icon={<GitCompare  size={11} />} label="Cross-Doc Reconciliation" />
                <FeaturePill icon={<CheckCircle2 size={11} />} label="Reviewer Workflow"       />
                <FeaturePill icon={<ShieldCheck  size={11} />} label="Full Audit Trail"        />
              </div>
            </div>

            {/* Central illustration */}
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', zIndex: 2, padding: '4px 0', minHeight: 0,
            }}>
              <DocumentNetworkSVG />
            </div>

            {/* Footer descriptor */}
            <div style={{
              position: 'relative', zIndex: 2,
              borderTop: '1px solid rgba(193,78,131,0.15)',
              paddingTop: 12,
            }}>
              <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.32)', margin: 0, letterSpacing: '0.04em' }}>
                AICTE VerifyAI · Smart India Hackathon 2026 · Synthetic Prototype
              </p>
            </div>
          </div>

          {/* ── Right panel: sign-in form ───────────────────────────────────── */}
          <div
            className="ls-right-panel"
            style={{
              flex: 1,
              background: '#FFFAFC',
              padding: 'clamp(28px, 3.8vh, 42px) clamp(28px, 4.2vw, 48px)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            {/* Mobile-only brand header */}
            <div className="ls-mobile-brand" style={{ display: 'none', alignItems: 'center', gap: 11, marginBottom: 20 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: 'linear-gradient(135deg, #8A2F5B 0%, #C14E83 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(193,78,131,0.25)',
              }}>
                <ShieldCheck size={20} color="#fff" strokeWidth={1.8} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#351D31' }}>VerifyAI</div>
                <div style={{ fontSize: 10, color: '#896F81', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>AICTE Compliance</div>
              </div>
            </div>

            {/* Form heading */}
            <div style={{ marginBottom: 'clamp(18px, 2.4vh, 26px)' }}>
              <h2 style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: 'clamp(24px, 2.8vw, 32px)',
                fontWeight: 400, color: '#351D31',
                margin: '0 0 6px', letterSpacing: '-0.015em',
              }}>
                Welcome back
              </h2>
              <p style={{ fontSize: 13.5, color: '#896F81', margin: 0, lineHeight: 1.45 }}>
                Sign in to your reviewer workspace.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              {/* Email field */}
              <div style={{ marginBottom: 16 }}>
                <label
                  htmlFor={emailId}
                  style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#55223F', marginBottom: 6, letterSpacing: '0.01em' }}
                >
                  Work Email
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
                    color: emailError ? '#E74C6E' : '#B8929E', pointerEvents: 'none',
                  }}>
                    <Mail size={15} />
                  </span>
                  <input
                    id={emailId}
                    className="ls-input"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(null); }}
                    onBlur={() => setEmailTouched(true)}
                    placeholder="reviewer@aicte-verifyai.demo"
                    style={{
                      ...(emailError ? inputError : inputBase),
                      padding: '11px 14px 11px 40px',
                    }}
                    aria-invalid={!!emailError}
                    aria-describedby={emailError ? `${emailId}-error` : undefined}
                    disabled={loading}
                  />
                </div>
                {emailError && (
                  <p id={`${emailId}-error`} style={{ margin: '4px 0 0', fontSize: 11.5, color: '#E74C6E', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <AlertCircle size={11} style={{ flexShrink: 0 }} /> {emailError}
                  </p>
                )}
              </div>

              {/* Password field */}
              <div style={{ marginBottom: 20 }}>
                <label
                  htmlFor={passwordId}
                  style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#55223F', marginBottom: 6, letterSpacing: '0.01em' }}
                >
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
                    color: pwError ? '#E74C6E' : '#B8929E', pointerEvents: 'none',
                  }}>
                    <Lock size={15} />
                  </span>
                  <input
                    id={passwordId}
                    className="ls-input"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(null); }}
                    onBlur={() => setPwTouched(true)}
                    placeholder="••••••••••••"
                    style={{
                      ...(pwError ? inputError : inputBase),
                      padding: '11px 44px 11px 40px',
                    }}
                    aria-invalid={!!pwError}
                    aria-describedby={pwError ? `${passwordId}-error` : undefined}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="ls-pw-toggle"
                    onClick={() => setShowPw(v => !v)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#B8929E', padding: 4,
                      display: 'flex', alignItems: 'center',
                      transition: 'color 0.15s',
                    }}
                    tabIndex={0}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {pwError && (
                  <p id={`${passwordId}-error`} style={{ margin: '4px 0 0', fontSize: 11.5, color: '#E74C6E', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <AlertCircle size={11} style={{ flexShrink: 0 }} /> {pwError}
                  </p>
                )}
              </div>

              {/* Server-side error */}
              {error && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  background: 'rgba(231,76,110,0.07)',
                  border: '1px solid rgba(231,76,110,0.25)',
                  borderRadius: 9, padding: '9px 12px', marginBottom: 16,
                }}>
                  <AlertCircle size={14} style={{ color: '#C0294A', flexShrink: 0, marginTop: 1 }} />
                  <p style={{ margin: 0, fontSize: 12.5, color: '#9E1628', lineHeight: 1.45 }}>{error}</p>
                </div>
              )}

              {/* Sign In button */}
              <button
                id="ls-signin-btn"
                type="submit"
                className="ls-btn-primary"
                disabled={!canSubmit}
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                  background: 'linear-gradient(135deg, #8A2F5B 0%, #B0406F 50%, #C14E83 100%)',
                  color: '#fff', border: 'none', borderRadius: 10,
                  padding: '12px 20px', fontSize: 14, fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.01em',
                  boxShadow: '0 6px 18px rgba(193,78,131,0.28)',
                  transition: 'transform 0.17s ease, box-shadow 0.17s ease, opacity 0.15s',
                  fontFamily: 'inherit',
                  marginBottom: 16,
                }}
                aria-busy={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>

            {/* Prototype disclosure */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              background: '#FFFBF0',
              border: '1px solid rgba(253,186,116,0.45)',
              borderRadius: 8, padding: '8px 12px',
            }}>
              <FlaskConical size={12} style={{ color: '#92400E', flexShrink: 0, marginTop: 1.5 }} />
              <p style={{ fontSize: 11, color: '#78350F', margin: 0, lineHeight: 1.5 }}>
                <strong>Prototype environment.</strong>{' '}
                All institutions, applications and documents are synthetic demo data.
                Reviewer credentials are provisioned via environment configuration.
              </p>
            </div>

            {/* Footer */}
            <p style={{
              marginTop: 'clamp(14px, 1.8vh, 20px)', fontSize: 11, color: '#C0A8B4',
              textAlign: 'center', letterSpacing: '0.03em', margin: '14px 0 0',
            }}>
              AICTE VerifyAI · Smart India Hackathon 2026
            </p>
          </div>

        </div>
      </div>

      {/* Spin keyframe for loader */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
};
