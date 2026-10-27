import React, { useState } from 'react';
import type { Submission, Finding } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { HelpTooltip } from '../ui/HelpTooltip';
import { InspectFindingModal } from '../common/InspectFindingModal';
import { formatDate, daysUntil } from '../../utils/helpers';
import { AlertTriangle, Clock, Search, ExternalLink } from 'lucide-react';

interface SubmissionsTableProps {
  submissions: Submission[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpenReviewWorkspace?: (id: string) => void;
}

export const SubmissionsTable: React.FC<SubmissionsTableProps> = ({
  submissions,
  selectedId,
  onSelect,
  onOpenReviewWorkspace,
}) => {
  const [inspectingFinding, setInspectingFinding] = useState<{ finding: Finding; submission: Submission } | null>(null);

  const criticalCount = (s: Submission) =>
    s.findings.filter((f) => f.severity === 'critical').length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Table header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Active Submissions</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {submissions.length} applications · sorted by priority
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            Priority score
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide w-[34%]">
                Institution / Application
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide w-[18%]">
                Category
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide w-[13%]">
                Status
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide w-[12%]">
                Due Date
              </th>
              <th className="text-center px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide w-[11%]">
                <HelpTooltip
                  term="Finding"
                  explanation="A possible issue that needs a reviewer to check; it is not a final decision."
                >
                  <span>Findings</span>
                </HelpTooltip>
              </th>
              <th className="text-center px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide w-[10%]">
                <HelpTooltip
                  term="Priority"
                  explanation="A guide to which application may need attention sooner based on risk, severity, and timeline."
                >
                  <span>Priority</span>
                </HelpTooltip>
              </th>
              <th className="text-center px-3 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide w-[12%]">
                <HelpTooltip
                  term="Evidence dossier"
                  explanation="The application and its supporting documents grouped together."
                  align="right"
                >
                  <span>Dossier</span>
                </HelpTooltip>
              </th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((sub, idx) => {
              const isSelected = sub.id === selectedId;
              const dueIn = daysUntil(sub.dueDate);
              const isOverdue = dueIn < 0;
              const isDueSoon = dueIn >= 0 && dueIn <= 3;
              const critical = criticalCount(sub);

              return (
                <tr
                  key={sub.id}
                  onClick={() => onSelect(sub.id)}
                  className={`
                    border-b border-slate-50 cursor-pointer transition-all duration-100
                    ${isSelected
                      ? 'bg-[#FFF5F7] border-l-[3px] border-l-[#C14E83]'
                      : idx % 2 === 0
                      ? 'bg-white hover:bg-slate-50'
                      : 'bg-slate-50/40 hover:bg-slate-50'
                    }
                  `}
                >
                  {/* Institution column */}
                  <td className="px-5 py-3.5">
                    <div className="flex flex-col gap-0.5">
                      <span className={`font-semibold text-sm leading-tight ${isSelected ? 'text-[#C14E83]' : 'text-slate-800'}`}>
                        {sub.institution.name}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono leading-tight">
                        {sub.applicationId}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {sub.institution.city}, {sub.institution.state}
                      </span>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3.5">
                    <span className="text-xs text-slate-600 leading-tight block max-w-[160px]">
                      {sub.category}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5">
                    <StatusBadge status={sub.status} size="sm" />
                  </td>

                  {/* Due date */}
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-slate-600">{formatDate(sub.dueDate)}</span>
                      {isOverdue && (
                        <span className="text-[10px] font-semibold text-red-600 flex items-center gap-0.5">
                          <AlertTriangle size={9} />
                          {Math.abs(dueIn)}d overdue
                        </span>
                      )}
                      {isDueSoon && !isOverdue && (
                        <span className="text-[10px] font-semibold text-amber-600 flex items-center gap-0.5">
                          <Clock size={9} />
                          Due in {dueIn}d
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Findings */}
                  <td className="px-4 py-3.5 text-center">
                    {sub.findings.length === 0 ? (
                      <span className="text-xs text-slate-300">—</span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectingFinding({ finding: sub.findings[0], submission: sub });
                        }}
                        className="inline-flex flex-col items-center gap-0.5 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer group"
                        title="Click to inspect this finding's explanation, statutory rule, and next steps"
                      >
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          critical > 0
                            ? 'bg-red-100 text-red-700 group-hover:bg-red-200'
                            : 'bg-amber-100 text-amber-800 group-hover:bg-amber-200'
                        }`}>
                          <Search size={10} />
                          <span>{sub.findings.length} Flag{sub.findings.length > 1 ? 's' : ''}</span>
                        </span>
                        {critical > 0 && (
                          <span className="text-[10px] text-red-600 font-semibold">{critical} critical</span>
                        )}
                      </button>
                    )}
                  </td>

                  {/* Priority score */}
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className={`text-sm font-bold ${
                          sub.priorityScore >= 80
                            ? 'text-red-600'
                            : sub.priorityScore >= 55
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {sub.priorityScore}
                      </span>
                      {/* Mini bar */}
                      <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            sub.priorityScore >= 80
                              ? 'bg-red-500'
                              : sub.priorityScore >= 55
                              ? 'bg-amber-400'
                              : 'bg-emerald-400'
                          }`}
                          style={{ width: `${sub.priorityScore}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Review Workspace Action */}
                  <td className="px-3 py-3.5 text-center">
                    {onOpenReviewWorkspace && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenReviewWorkspace(sub.id);
                        }}
                        className="px-2.5 py-1 rounded bg-[#FFF5F7] text-[#C14E83] hover:bg-[#C14E83] hover:text-white font-semibold text-[11px] transition-colors border border-[#ECD9E2] flex items-center justify-center gap-1 mx-auto cursor-pointer"
                        title="Full Evidence Dossier: The application and its supporting documents grouped together"
                      >
                        <span>Dossier</span>
                        <ExternalLink size={11} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Inspect Finding Modal */}
      <InspectFindingModal
        isOpen={Boolean(inspectingFinding)}
        onClose={() => setInspectingFinding(null)}
        finding={inspectingFinding?.finding ?? null}
        submission={inspectingFinding?.submission ?? null}
        onOpenReviewWorkspace={onOpenReviewWorkspace}
      />
    </div>
  );
};

