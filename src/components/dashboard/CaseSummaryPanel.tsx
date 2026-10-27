import React, { useState } from 'react';
import type { Submission, Finding } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { SeverityBadge } from '../ui/SeverityBadge';
import { HelpTooltip } from '../ui/HelpTooltip';
import { InspectFindingModal } from '../common/InspectFindingModal';
import { formatDate } from '../../utils/helpers';
import {
  AlertTriangle,
  ExternalLink,
  MapPin,
  Tag,
  Calendar,
  Building2,
  Search,
  FileStack,
  ChevronRight,
} from 'lucide-react';

interface CaseSummaryPanelProps {
  submission: Submission;
  onOpenReviewWorkspace?: (id: string) => void;
}

/**
 * CaseSummaryPanel — compact Overview variant.
 *
 * Shows only what a reviewer needs to decide next action:
 * - Institution identity + status + priority score
 * - Key metadata (type, location, category, due date)
 * - Up to 2 top findings with Inspect Finding
 * - Two action buttons: Open Full Dossier, Open Review Workspace
 *
 * The full evidence document list and reviewer decision actions
 * belong in the dossier/workspace, not here.
 */
export const CaseSummaryPanel: React.FC<CaseSummaryPanelProps> = ({
  submission,
  onOpenReviewWorkspace,
}) => {
  const [inspectingFinding, setInspectingFinding] = useState<Finding | null>(null);

  // Show at most 2 findings: critical first
  const sortedFindings = [
    ...submission.findings.filter((f) => f.severity === 'critical'),
    ...submission.findings.filter((f) => f.severity === 'major'),
    ...submission.findings.filter((f) => f.severity === 'minor'),
  ].slice(0, 2);

  const hiddenCount = submission.findings.length - sortedFindings.length;

  return (
    <>
      <div
        style={{
          background: '#FFFAFC',
          border: '1px solid #ECD9E2',
          borderRadius: 14,
          boxShadow: '0 4px 16px rgba(53, 29, 49, 0.06)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ── Header: institution + priority + status (Cherry Blossom Noir) ───── */}
        <div
          style={{
            background: 'linear-gradient(135deg, #251421 0%, #351D31 60%, #481B38 100%)',
            padding: '14px 16px',
            borderBottom: '1px solid rgba(236, 217, 226, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 9, fontWeight: 700, color: '#F8C8DC',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  marginBottom: 4,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <HelpTooltip
                  term="Priority Case"
                  explanation="A guide to which application may need attention sooner based on risk and findings. Not a final compliance decision."
                >
                  <span style={{ color: '#F8C8DC' }}>Selected Case</span>
                </HelpTooltip>
                {submission.isSyntheticDemo && (
                  <span style={{
                    fontSize: 9, padding: '2px 6px', borderRadius: 4,
                    background: 'rgba(255, 200, 220, 0.22)',
                    color: '#FFD6E8',
                    border: '1px solid rgba(255, 180, 210, 0.5)',
                    fontWeight: 800,
                    letterSpacing: '0.05em',
                  }}>DEMO DATA</span>
                )}
              </div>
              {/* Institution name — forced bright white for dark background */}
              <h3 style={{
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: 14,
                lineHeight: 1.3,
                margin: 0,
                fontFamily: "'DM Serif Display', Georgia, serif",
                textShadow: '0 1px 3px rgba(0,0,0,0.4)',
                WebkitFontSmoothing: 'antialiased',
              }}>
                {submission.institution.name}
              </h3>
              {/* Application ID — light pink-white for legibility */}
              <p style={{
                color: '#E8C8DA',
                fontSize: 10,
                fontFamily: 'monospace',
                marginTop: 4,
                letterSpacing: '0.03em',
                opacity: 1,
              }}>
                {submission.applicationId}
              </p>
            </div>
            {/* Priority score pill */}
            <div
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                background: 'rgba(255,255,255,0.12)', borderRadius: 10,
                border: '1px solid rgba(248, 200, 220, 0.5)',
                padding: '6px 10px', flexShrink: 0,
              }}
            >
              <span style={{ color: '#FFFFFF', fontWeight: 800, fontSize: 20, lineHeight: 1, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                {submission.priorityScore}
              </span>
              <span style={{ color: '#F8C8DC', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>
                Priority
              </span>
            </div>
          </div>
          {/* Status badge row */}
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <StatusBadge status={submission.status} />
            {/* "NEEDS ATTENTION" chip — only for escalated/critical */}
            {(submission.status === 'escalated' || (submission.findings.filter(f => f.severity === 'critical').length > 0)) && (
              <span style={{
                fontSize: 9, fontWeight: 800,
                color: '#FBBF24',
                background: 'rgba(251, 191, 36, 0.18)',
                border: '1px solid rgba(251, 191, 36, 0.45)',
                borderRadius: 4, padding: '2px 7px',
                textTransform: 'uppercase', letterSpacing: '0.07em',
              }}>Needs Attention</span>
            )}
          </div>
        </div>

        {/* ── Scrollable body ───────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 380px)' }}>

          {/* Key metadata — compact 2×2 grid */}
          <div
            style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: '8px 12px', padding: '12px 16px',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            {[
              { icon: <Building2 size={11} />, label: 'Type', value: submission.institution.type },
              { icon: <MapPin size={11} />, label: 'Location', value: `${submission.institution.city}, ${submission.institution.state}` },
              { icon: <Tag size={11} />, label: 'Category', value: submission.category },
              { icon: <Calendar size={11} />, label: 'Due', value: formatDate(submission.dueDate) },
            ].map(({ icon, label, value }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <span style={{ color: '#94a3b8', marginTop: 2, flexShrink: 0 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 11, color: '#334155', fontWeight: 500, lineHeight: 1.3, marginTop: 1 }}>
                    {value}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Why it needs attention */}
          {(submission.reviewNotes || sortedFindings.length > 0) && (
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <h4
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: 10, fontWeight: 700, color: '#475569',
                    textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0,
                  }}
                >
                  <AlertTriangle size={11} style={{ color: '#f59e0b' }} />
                  Why This Needs Attention
                </h4>
                <HelpTooltip
                  term="Finding"
                  explanation="A possible issue for a human reviewer to check. Not proof of non-compliance — an advisory flag only."
                  align="right"
                >
                  <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Finding info</span>
                </HelpTooltip>
              </div>

              {/* Review summary note */}
              {submission.reviewNotes && (
                <div
                  style={{
                    background: '#fffbeb', border: '1px solid #fde68a',
                    borderRadius: 8, padding: '8px 10px', marginBottom: 8,
                  }}
                >
                  <p style={{ fontSize: 11, color: '#92400e', lineHeight: 1.5, margin: 0 }}>
                    {submission.reviewNotes}
                  </p>
                </div>
              )}

              {/* Top 2 findings */}
              {sortedFindings.map((finding) => (
                <div
                  key={finding.id}
                  style={{
                    borderRadius: 8,
                    border: `1px solid ${finding.severity === 'critical' ? '#fca5a5' : finding.severity === 'major' ? '#fcd34d' : '#bfdbfe'}`,
                    background: finding.severity === 'critical' ? '#fff5f5' : finding.severity === 'major' ? '#fffbeb' : '#eff6ff',
                    padding: '9px 11px',
                    marginBottom: 6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#334155' }}>
                      {finding.category}
                    </span>
                    <SeverityBadge severity={finding.severity} />
                  </div>
                  <p style={{ fontSize: 11, color: '#334155', lineHeight: 1.45, margin: 0, marginBottom: 6 }}>
                    {finding.description}
                  </p>
                  <button
                    type="button"
                    onClick={() => setInspectingFinding(finding)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 10, fontWeight: 700,
                      color: '#1d4ed8', background: 'rgba(255,255,255,0.9)',
                      border: '1px solid #bfdbfe', borderRadius: 6,
                      padding: '3px 8px', cursor: 'pointer',
                    }}
                    title="Inspect finding: explanation, rule reference, recommended next step"
                  >
                    <Search size={9} />
                    Inspect Finding
                  </button>
                </div>
              ))}

              {/* "…and N more" link to workspace */}
              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => onOpenReviewWorkspace?.(submission.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: 11, color: '#2563eb', fontWeight: 600,
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: 0, marginTop: 2,
                  }}
                >
                  <ChevronRight size={12} />
                  +{hiddenCount} more finding{hiddenCount > 1 ? 's' : ''} — open dossier to view all
                </button>
              )}
            </div>
          )}

          {/* Evidence count summary — not the full list */}
          {submission.evidence.length > 0 && (
            <div
              style={{
                padding: '10px 16px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileStack size={13} style={{ color: '#2563eb' }} />
                <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>
                  {submission.evidence.length} evidence document{submission.evidence.length !== 1 ? 's' : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onOpenReviewWorkspace?.(submission.id)}
                style={{
                  fontSize: 10, color: '#2563eb', fontWeight: 700,
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: 0, display: 'flex', alignItems: 'center', gap: 3,
                }}
              >
                View &amp; download → <ChevronRight size={10} />
              </button>
            </div>
          )}

          {/* ── Action buttons ─────────────────────────────────────────── */}
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8, background: '#FFFAFC', borderTop: '1px solid #ECD9E2' }}>
            {onOpenReviewWorkspace && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => onOpenReviewWorkspace(submission.id)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      background: 'linear-gradient(135deg, #351D31 0%, #55223F 100%)', color: '#fff',
                      border: '1px solid #55223F', borderRadius: 8, padding: '9px 12px',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 2px 8px rgba(53, 29, 49, 0.18)',
                    }}
                    title="Open the full evidence dossier for this institution"
                  >
                    <FileStack size={12} className="text-[#F8E5ED]" />
                    <span>Open Dossier</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenReviewWorkspace(submission.id)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      background: '#fff', color: '#351D31',
                      border: '1.5px solid #ECD9E2', borderRadius: 8, padding: '9px 12px',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    title="Open Review Workspace with interactive findings, evidence checks, and actions"
                  >
                    <ExternalLink size={12} className="text-[#C14E83]" />
                    <span>Review Workspace</span>
                  </button>
                </div>
                <p style={{ fontSize: 10, color: '#896F81', textAlign: 'center', margin: 0 }}>
                  Full document dossiers, PDF downloads, and compliance actions inside workspace
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Inspect Finding Modal — stays functional */}
      <InspectFindingModal
        isOpen={Boolean(inspectingFinding)}
        onClose={() => setInspectingFinding(null)}
        finding={inspectingFinding}
        submission={submission}
        onOpenReviewWorkspace={onOpenReviewWorkspace}
      />
    </>
  );
};
