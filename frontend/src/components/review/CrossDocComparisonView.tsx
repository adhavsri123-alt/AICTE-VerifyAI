import React, { useState } from 'react';
import type { CrossDocComparisonField } from '../../types';
import {
  GitCompare,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Info,
} from 'lucide-react';

interface CrossDocComparisonViewProps {
  comparisons?: CrossDocComparisonField[];
  onSelectDocumentByName?: (documentName: string) => void;
}

export const CrossDocComparisonView: React.FC<CrossDocComparisonViewProps> = ({
  comparisons = [],
  onSelectDocumentByName,
}) => {
  const [activeFieldIndex, setActiveFieldIndex] = useState<number>(0);

  if (comparisons.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
        No cross-document comparison fields available for this application.
      </div>
    );
  }

  const currentField = comparisons[activeFieldIndex] ?? comparisons[0];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <GitCompare size={18} className="text-blue-300" />
            <h3 className="font-bold text-sm md:text-base">
              Cross-Document Entity & Parameter Reconciliation
            </h3>
          </div>
          <span className="text-[11px] bg-blue-800/80 text-blue-200 px-2.5 py-0.5 rounded-full border border-blue-700 font-mono">
            Heuristic Alignment Engine
          </span>
        </div>
        <p className="text-xs text-blue-200 mt-1 leading-relaxed max-w-2xl">
          Automated comparison of extracted parameter values across independent statutory instruments (Land Deeds, Government NOCs, Applications, and Inspection Logs).
        </p>
      </div>

      {/* Field Selector Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto text-xs">
        {comparisons.map((comp, idx) => {
          const isActive = idx === activeFieldIndex;
          return (
            <button
              key={comp.fieldName}
              type="button"
              onClick={() => setActiveFieldIndex(idx)}
              className={`
                px-5 py-3 font-semibold whitespace-nowrap flex items-center gap-2 border-b-2 transition-all
                ${isActive
                  ? 'border-blue-600 text-blue-700 bg-white shadow-sm'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }
              `}
            >
              {comp.hasDiscrepancy ? (
                <AlertTriangle size={13} className="text-amber-500" />
              ) : (
                <CheckCircle2 size={13} className="text-emerald-500" />
              )}
              <span>{comp.fieldName}</span>
              {comp.hasDiscrepancy && (
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              )}
            </button>
          );
        })}
      </div>

      {/* Field Details & Table */}
      <div className="p-6 flex flex-col gap-5">
        {/* Field Status & Recommendation Banner */}
        <div className={`p-4 rounded-xl border flex flex-col md:flex-row gap-4 justify-between items-start ${
          currentField.hasDiscrepancy
            ? 'bg-amber-50/70 border-amber-200 text-amber-950'
            : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
        }`}>
          <div className="flex gap-3">
            <div className="mt-0.5">
              {currentField.hasDiscrepancy ? (
                <AlertTriangle size={20} className="text-amber-600" />
              ) : (
                <CheckCircle2 size={20} className="text-emerald-600" />
              )}
            </div>
            <div>
              <div className="font-bold text-sm mb-0.5 flex items-center gap-2">
                <span>{currentField.statusText}</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-700">
                {currentField.description}
              </p>
              <div className="mt-2 text-xs font-medium text-slate-900 bg-white/80 p-2.5 rounded-lg border border-slate-200">
                <span className="font-bold text-blue-800">Scrutiny Guidance: </span>
                {currentField.humanReviewRecommendation}
              </div>
            </div>
          </div>
        </div>

        {/* Comparison Matrix Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 w-[28%]">Submitted Document</th>
                <th className="px-3 py-3 w-[18%]">Instrument Type</th>
                <th className="px-4 py-3 w-[36%]">Extracted Parameter Value</th>
                <th className="px-3 py-3 w-[10%] text-center">Source Page</th>
                <th className="px-3 py-3 w-[8%] text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentField.entries.map((entry, idx) => (
                <tr
                  key={idx}
                  className={entry.isMismatched ? 'bg-amber-50/40' : 'bg-white hover:bg-slate-50/60'}
                >
                  <td className="px-4 py-3.5">
                    <button
                      type="button"
                      onClick={() => onSelectDocumentByName?.(entry.documentName)}
                      className="flex items-center gap-2 text-left hover:text-blue-600 transition-colors group"
                      title="Inspect this document in viewer"
                    >
                      <FileText size={14} className={entry.isMismatched ? 'text-amber-600' : 'text-blue-500'} />
                      <span className="font-semibold text-slate-800 font-mono text-xs group-hover:underline">
                        {entry.documentName}
                      </span>
                    </button>
                  </td>
                  <td className="px-3 py-3.5 text-slate-600 font-medium">
                    {entry.documentType}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-block font-mono px-2 py-1 rounded text-xs leading-relaxed ${
                      entry.isMismatched
                        ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                        : 'bg-slate-100 text-slate-800 font-medium'
                    }`}>
                      {entry.extractedValue}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-center font-mono text-slate-500">
                    Page {entry.sourcePage}
                  </td>
                  <td className="px-3 py-3.5 text-center">
                    {entry.isMismatched ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase border border-amber-300">
                        Mismatch
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase border border-emerald-200">
                        Match
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Disclaimer */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2 text-[11px] text-slate-500">
          <Info size={14} className="text-slate-400 mt-0.5 shrink-0" />
          <p className="leading-relaxed">
            <span className="font-semibold text-slate-700">Prototype Disclaimer: </span>
            Cross-document comparison utilizes heuristic pattern matching to surface potential discrepancies. It is designed to accelerate human regulatory review and does not constitute a judicial or final title determination.
          </p>
        </div>
      </div>
    </div>
  );
};
