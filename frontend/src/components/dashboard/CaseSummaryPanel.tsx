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
          background: '#fff',
          border: '1px solid #dde4f0',
          borderRadius: 14,
          boxShadow: '0 2px 12px rgba(15,22,41,0.07)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ── Header: institution + priority + status ───────────────────── */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
            padding: '12px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 9, fontWeight: 700, color: '#93c5fd',
                  textTransform: 'uppercase', letterSpacing: '0.07em',
                  marginBottom: 4,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <HelpTooltip
                  term="Priority Case"
                  explanation="A guide to which application may need attention sooner based on risk and findings. Not a final compliance decision."
                >
                  <span style={{ color: '#bfdbfe' }}>Selected Case</span>
                </HelpTooltip>
              </div>
              <h3 style={{ color: '#fff', fontWeight: 800, fontSize: 14, lineHeight: 1.3, margin: 0 }}>
                {submission.institution.name}
              </h3>
              <p style={{ color: '#93c5fd', fontSize: 10, fontFamily: 'monospace', marginTop: 2 }}>
                {submission.applicationId}
              </p>
            </div>
            {/* Priority score pill */}
            <div
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                background: 'rgba(255,255,255,0.12)', borderRadius: 10,
                padding: '6px 10px', flexShrink: 0,
              }}
            >
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 18, lineHeight: 1 }}>
                {submission.priorityScore}
              </span>
              <span style={{ color: '#93c5fd', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Priority
              </span>
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <StatusBadge status={submission.status} />
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
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {onOpenReviewWorkspace && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => onOpenReviewWorkspace(submission.id)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      background: '#1d4ed8', color: '#fff',
                      border: 'none', borderRadius: 8, padding: '8px 10px',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      transition: 'background 0.15s',
                      boxShadow: '0 2px 6px rgba(29,78,216,0.25)',
                    }}
                    title="Open the full evidence dossier for this institution"
                  >
                    <FileStack size={12} />
                    Open Full Dossier
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenReviewWorkspace(submission.id)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      background: '#fff', color: '#1d4ed8',
                      border: '1.5px solid #2563eb', borderRadius: 8, padding: '8px 10px',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    title="Open Review Workspace with interactive findings, evidence checks, and actions"
                  >
                    <ExternalLink size={12} />
                    Open Review Workspace
                  </button>
                </div>
                <p style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', margin: 0 }}>
                  Full document list, PDF downloads, and reviewer decisions are inside the workspace
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
