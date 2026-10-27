import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  FileSearch,
  GitCompare,
  CheckCircle2,
  ArrowRight,
  FlaskConical,
} from 'lucide-react';

interface WelcomeScreenProps {
  onEnter: () => void;
}

function FeaturePill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: 'rgba(255, 245, 247, 0.9)',
      border: '1px solid #ECD9E2', borderRadius: 10, padding: '8px 14px',
    }}>
      <span style={{ color: '#C14E83', flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#351D31' }}>{label}</span>
    </div>
  );
}

const PETALS = [
  { top: '7%',  left: '3%',  size: 54, rotate: 25,  opacity: 0.13 },
  { top: '16%', left: '91%', size: 40, rotate: -15, opacity: 0.10 },
  { top: '71%', left: '5%',  size: 46, rotate: 42,  opacity: 0.11 },
  { top: '80%', left: '88%', size: 62, rotate: -30, opacity: 0.09 },
  { top: '47%', left: '96%', size: 32, rotate: 10,  opacity: 0.12 },
  { top: '54%', left: '1%',  size: 38, rotate: -20, opacity: 0.10 },
  { top: '34%', left: '4%',  size: 25, rotate: 55,  opacity: 0.08 },
  { top: '27%', left: '93%', size: 30, rotate: -44, opacity: 0.09 },
];

function Petal({ top, left, size, rotate, opacity }: (typeof PETALS)[number]) {
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} style={{
      position: 'absolute', top, left,
      transform: `rotate(${rotate}deg)`, opacity, pointerEvents: 'none',
    }}>
      <ellipse cx="30" cy="15" rx="10" ry="16" fill="#C14E83" />
      <ellipse cx="30" cy="45" rx="10" ry="16" fill="#C14E83" />
      <ellipse cx="15" cy="30" rx="16" ry="10" fill="#AA4777" />
      <ellipse cx="45" cy="30" rx="16" ry="10" fill="#AA4777" />
      <circle  cx="30" cy="30" r="7"            fill="#F8E5ED" />
    </svg>
  );
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onEnter }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  const handleEnter = () => {
    setVisible(false);
    setTimeout(onEnter, 300);
  };

  return (
    <>
      <style>{`
        @keyframes wsFadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes logoPulse {
          0%,100% { box-shadow: 0 0 0 0   rgba(193,78,131,0.22); }
          50%      { box-shadow: 0 0 0 12px rgba(193,78,131,0); }
        }
        #ws-enter-btn:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 10px 30px rgba(193,78,131,0.45) !important;
        }
        #ws-enter-btn:active {
          transform: translateY(0) !important;
        }
      `}</style>

      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'linear-gradient(160deg, #FFF5F7 0%, #FFF0F4 45%, #FDF2F8 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}>
        {/* Top accent bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 4,
          background: 'linear-gradient(90deg, #8A2F5B 0%, #C14E83 50%, #8A2F5B 100%)',
        }} />

        {/* Decorative petals */}
        {PETALS.map((p, i) => <Petal key={i} {...p} />)}

        {/* Main card */}
        <div style={{
          background: '#FFFAFC',
          border: '1px solid #ECD9E2',
          borderRadius: 22,
          boxShadow: '0 24px 64px rgba(53,29,49,0.13), 0 4px 16px rgba(193,78,131,0.07)',
          padding: 'clamp(32px,5vw,52px) clamp(28px,5vw,54px)',
          maxWidth: 560, width: '90%',
          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
          animation: visible ? 'wsFadeIn 0.55s cubic-bezier(0.16,1,0.3,1) both' : 'none',
          position: 'relative',
        }}>
          {/* Logo */}
          <div style={{
            width: 70, height: 70, borderRadius: 18,
            background: 'linear-gradient(135deg, #8A2F5B 0%, #C14E83 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 22,
            animation: 'logoPulse 3s ease-in-out infinite',
            boxShadow: '0 8px 24px rgba(193,78,131,0.28)',
          }}>
            <ShieldCheck size={34} color="#FFFFFF" strokeWidth={1.8} />
          </div>

          {/* Eyebrow */}
          <div style={{
            fontSize: 11, fontWeight: 700, color: '#C14E83',
            letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8,
          }}>
            AICTE VerifyAI
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: 'clamp(22px, 3.5vw, 30px)',
            fontWeight: 400, color: '#351D31',
            lineHeight: 1.25, margin: '0 0 14px',
            letterSpacing: '-0.01em',
          }}>
            Application Review Intelligence
          </h1>

          {/* Description */}
          <p style={{
            fontSize: 13.5, color: '#6B4A60',
            lineHeight: 1.65, margin: '0 0 26px', maxWidth: 420,
          }}>
            Assists AICTE compliance reviewers with structured application validation,
            evidence inspection and cross-document reconciliation — surfacing discrepancies
            and risk indicators for human decision-making.
          </p>

          {/* Feature pills */}
          <div style={{
            display: 'flex', flexWrap: 'wrap',
            gap: 8, justifyContent: 'center', marginBottom: 32,
          }}>
            <FeaturePill icon={<FileSearch  size={13} />} label="Evidence Inspection" />
            <FeaturePill icon={<GitCompare  size={13} />} label="Cross-Doc Reconciliation" />
            <FeaturePill icon={<CheckCircle2 size={13} />} label="Reviewer Workflow" />
            <FeaturePill icon={<ShieldCheck  size={13} />} label="Audit Trail" />
          </div>

          {/* CTA */}
          <button
            id="ws-enter-btn"
            type="button"
            onClick={handleEnter}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: 'linear-gradient(135deg, #351D31 0%, #5C2348 50%, #C14E83 100%)',
              color: '#FFFFFF', border: 'none', borderRadius: 12,
              padding: '14px 32px', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', letterSpacing: '0.02em',
              boxShadow: '0 6px 20px rgba(193,78,131,0.34)',
              transition: 'transform 0.18s ease, box-shadow 0.18s ease',
              marginBottom: 18,
            }}
          >
            Enter Reviewer Workspace
            <ArrowRight size={16} />
          </button>

          {/* Disclosure */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            background: '#FFFBEB', border: '1px solid #FDE68A',
            borderRadius: 10, padding: '9px 13px', maxWidth: 430,
          }}>
            <FlaskConical size={12} style={{ color: '#92400E', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 11, color: '#78350F', margin: 0, lineHeight: 1.55, textAlign: 'left' }}>
              <strong>Prototype environment.</strong>{' '}
              All institutions, applications, findings and documents are synthetic
              reference data for evaluation. No real AICTE applications or private
              institutional data are present.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          position: 'absolute', bottom: 18, left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 11, color: '#B8929E', letterSpacing: '0.04em', whiteSpace: 'nowrap',
        }}>
          AICTE VerifyAI · Smart India Hackathon Prototype · 2026
        </div>
      </div>
    </>
  );
};
