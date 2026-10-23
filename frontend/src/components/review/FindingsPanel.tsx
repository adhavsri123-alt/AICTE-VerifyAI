import React from 'react';
import type { Finding, FindingSeverity } from '../../types';
import { SeverityBadge } from '../ui/SeverityBadge';
import { HelpTooltip } from '../ui/HelpTooltip';
import {
  FileText,
  Bookmark,
  ExternalLink,
  Info,
  Scale,
  CheckCircle,
  Search,
} from 'lucide-react';

interface FindingsPanelProps {
  findings: Finding[];
  activeFindingId: string | null;
  onSelectFinding: (finding: Finding) => void;
  activeDocumentName?: string;
  onNavigateToDocument: (documentId: string, pageNumber: number) => void;
  onInspectFinding?: (finding: Finding) => void;
}

export const FindingsPanel: React.FC<FindingsPanelProps> = ({
  findings,
  activeFindingId,
  onSelectFinding,
  activeDocumentName,
  onNavigateToDocument,
  onInspectFinding,
}) => {
  const [filterSeverity, setFilterSeverity] = React.useState<FindingSeverity | 'all'>('all');

  const filteredFindings = findings.filter((f) => {
    if (filterSeverity === 'all') return true;
    return f.severity === filterSeverity;
  });

  const criticalCount = findings.filter((f) => f.severity === 'critical').length;
  const majorCount = findings.filter((f) => f.severity === 'major').length;

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/70">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Scale size={16} className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <span>Regulatory Findings ({findings.length})</span>
              <HelpTooltip
                term="Finding"
                explanation="A possible issue that needs a reviewer to check; it is not a final decision or proof of non-compliance."
              />
            </h3>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            {criticalCount > 0 && (
              <span className="px-2 py-0.5 rounded-full font-semibold bg-red-100 text-red-700">
                {criticalCount} Critical
              </span>
            )}
            {majorCount > 0 && (
              <span className="px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-800">
                {majorCount} Major
              </span>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-3 leading-relaxed">
          Automated heuristic checks for reviewer scrutiny. Click any finding to inspect highlighted text or view full dossier details.
        </p>

        {/* Severity filter tabs */}
        <div className="flex gap-1 bg-slate-200/60 p-0.5 rounded-lg text-xs">
          {(['all', 'critical', 'major', 'minor'] as const).map((sev) => (
            <button
              key={sev}
              type="button"
              onClick={() => setFilterSeverity(sev)}
              className={`
                flex-1 py-1 px-2 rounded-md font-medium text-center capitalize transition-all
                ${filterSeverity === sev
                  ? 'bg-white text-blue-700 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
                }
              `}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Findings List */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {filteredFindings.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            <CheckCircle size={24} className="mx-auto mb-2 text-emerald-500" />
            No findings for the selected filter.
          </div>
        ) : (
          filteredFindings.map((finding) => {
            const isActive = finding.id === activeFindingId;
            const matchesActiveDoc = finding.documentName === activeDocumentName;

            return (
              <div
                key={finding.id}
                onClick={() => onSelectFinding(finding)}
                className={`
                  rounded-xl border p-4 cursor-pointer transition-all duration-150 relative
                  ${isActive
                    ? 'border-blue-500 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50/60'
                  }
                `}
              >
                {/* Top: Severity & Category */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <SeverityBadge severity={finding.severity} />
                    <span className="text-xs font-semibold text-slate-700">
                      {finding.category}
                    </span>
                  </div>
                  {isActive && (
                    <span className="text-[10px] font-bold tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full uppercase">
                      Active
                    </span>
                  )}
                </div>

                {/* Finding Description */}
                <p className="text-xs font-medium text-slate-800 leading-relaxed mb-2.5">
                  {finding.description}
                </p>

                {/* Reason Details */}
                {finding.reason && (
                  <div className="mb-2.5 p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-[11px] text-slate-600 leading-relaxed">
                    <div className="font-semibold text-slate-700 mb-0.5 flex items-center gap-1">
                      <Info size={11} className="text-blue-600" />
                      <span>Analysis Rationale:</span>
                    </div>
                    {finding.reason}
                  </div>
                )}

                {/* Rule Reference */}
                {finding.ruleOrCheck && (
                  <div className="mb-2.5 text-[11px] font-mono bg-slate-100/70 border border-slate-200 text-slate-700 rounded px-2 py-1 flex items-start gap-1.5">
                    <Bookmark size={12} className="text-blue-600 mt-0.5 shrink-0" />
                    <span className="leading-tight font-medium">{finding.ruleOrCheck}</span>
                  </div>
                )}

                {/* Document source & View / Inspect Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500 gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 truncate text-slate-600">
                    <FileText size={12} className={matchesActiveDoc ? 'text-blue-600' : 'text-slate-400'} />
                    <span className="truncate font-mono" title={finding.documentName}>
                      {finding.documentName ?? 'Source Document'}
                    </span>
                    {finding.pageNumber && (
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] shrink-0 font-medium">
                        Page {finding.pageNumber}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {onInspectFinding && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onInspectFinding(finding);
                        }}
                        className="text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded font-bold flex items-center gap-1 text-[10px] cursor-pointer"
                        title="Inspect full finding rationale, rule reference, and reviewer next steps"
                      >
                        <Search size={10} />
                        <span>Inspect Finding</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectFinding(finding);
                        if (finding.documentId && finding.pageNumber) {
                          onNavigateToDocument(finding.documentId, finding.pageNumber);
                        }
                      }}
                      className="shrink-0 text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 hover:underline text-[11px] cursor-pointer"
                      title="Scroll to highlighted text in the document viewer"
                    >
                      <span>View in Doc</span>
                      <ExternalLink size={10} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Safety Notice Footer */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-500 text-center leading-normal">
        <span className="font-semibold text-slate-700">Reviewer Advisory:</span> Automated findings indicate possible issues for a human to review. They are not proof of non-compliance or a final regulatory decision.
      </div>
    </div>
  );
};

