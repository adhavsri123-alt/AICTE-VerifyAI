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
      <div
        className="rounded-xl border p-8 text-center text-sm"
        style={{
          background: '#FFFFFF',
          borderColor: 'var(--border-soft)',
          color: 'var(--text-secondary)',
        }}
      >
        No cross-document reconciliation records available for this application.
      </div>
    );
  }

  const currentField = comparisons[activeFieldIndex] ?? comparisons[0];

  return (
    <div
      className="rounded-xl border shadow-xs overflow-hidden flex flex-col"
      style={{
        background: '#FFFFFF',
        borderColor: 'var(--border-soft)',
      }}
    >
      {/* Header - Cherry Blossom Noir */}
      <div
        className="p-5 border-b text-white"
        style={{
          background: 'linear-gradient(135deg, #1A0D18 0%, #351D31 60%, #55223F 100%)',
          borderBottom: '1px solid #55223F',
        }}
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <GitCompare size={18} className="text-[#C14E83]" />
            <h3 className="font-bold text-sm md:text-base tracking-tight">
              Cross-Document Entity & Parameter Reconciliation
            </h3>
          </div>
          <span
            className="text-[11px] px-2.5 py-0.5 rounded-full font-mono font-medium"
            style={{
              background: 'rgba(193, 78, 131, 0.25)',
              color: '#F8E5ED',
              border: '1px solid rgba(193, 78, 131, 0.4)',
            }}
          >
            Statutory Alignment Engine
          </span>
        </div>
        <p className="text-xs mt-1.5 leading-relaxed max-w-2xl" style={{ color: '#F8E5ED' }}>
          Automated comparison of extracted parameter values across independent statutory instruments (Land Deeds, Government NOCs, Applications, and Inspection Logs).
        </p>
      </div>

      {/* Field Selector Tabs */}
      <div
        className="flex border-b overflow-x-auto text-xs"
        style={{
          background: 'var(--surface-alt)',
          borderColor: 'var(--border-soft)',
        }}
      >
        {comparisons.map((comp, idx) => {
          const isActive = idx === activeFieldIndex;
          return (
            <button
              key={comp.fieldName}
              type="button"
              onClick={() => setActiveFieldIndex(idx)}
              className="px-5 py-3 font-semibold whitespace-nowrap flex items-center gap-2 border-b-2 transition-all cursor-pointer"
              style={{
                borderColor: isActive ? '#C14E83' : 'transparent',
                color: isActive ? '#351D31' : '#896F81',
                background: isActive ? '#FFFFFF' : 'transparent',
                boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.03)' : undefined,
              }}
            >
              {comp.hasDiscrepancy ? (
                <AlertTriangle size={13} className="text-amber-600" />
              ) : (
                <CheckCircle2 size={13} className="text-emerald-600" />
              )}
              <span>{comp.fieldName}</span>
              {comp.hasDiscrepancy && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
              )}
            </button>
          );
        })}
      </div>

      {/* Field Details & Table */}
      <div className="p-6 flex flex-col gap-5">
        {/* Field Status & Recommendation Banner */}
        <div
          className="p-4 rounded-xl border flex flex-col md:flex-row gap-4 justify-between items-start"
          style={{
            background: currentField.hasDiscrepancy ? '#FEF3C7' : '#DEF7EC',
            borderColor: currentField.hasDiscrepancy ? '#FDE68A' : '#B4E7D0',
            color: currentField.hasDiscrepancy ? '#92400E' : '#065F46',
          }}
        >
          <div className="flex gap-3">
            <div className="mt-0.5">
              {currentField.hasDiscrepancy ? (
                <AlertTriangle size={20} className="text-amber-700" />
              ) : (
                <CheckCircle2 size={20} className="text-emerald-700" />
              )}
            </div>
            <div>
              <div className="font-bold text-sm mb-0.5 flex items-center gap-2">
                <span>{currentField.statusText}</span>
              </div>
              <p className="text-xs leading-relaxed opacity-95">
                {currentField.description}
              </p>
              <div
                className="mt-2.5 text-xs font-medium p-3 rounded-lg border"
                style={{
                  background: '#FFFFFF',
                  borderColor: currentField.hasDiscrepancy ? '#FDE68A' : '#B4E7D0',
                  color: '#351D31',
                }}
              >
                <span className="font-bold text-[#8A2F5B]">Scrutiny Guidance: </span>
                {currentField.humanReviewRecommendation}
              </div>
            </div>
          </div>
        </div>

        {/* Comparison Matrix Table */}
        <div
          className="rounded-xl overflow-hidden shadow-xs border"
          style={{ borderColor: 'var(--border-soft)' }}
        >
          <table className="w-full text-xs text-left">
            <thead
              className="border-b text-[11px] font-semibold uppercase tracking-wider"
              style={{
                background: 'var(--surface-alt)',
                borderColor: 'var(--border-soft)',
                color: '#896F81',
              }}
            >
              <tr>
                <th className="px-4 py-3 w-[28%]">Submitted Instrument</th>
                <th className="px-3 py-3 w-[18%]">Instrument Type</th>
                <th className="px-4 py-3 w-[36%]">Extracted Parameter Value</th>
                <th className="px-3 py-3 w-[10%] text-center">Source Page</th>
                <th className="px-3 py-3 w-[8%] text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-soft)' }}>
              {currentField.entries.map((entry, idx) => (
                <tr
                  key={idx}
                  className={entry.isMismatched ? 'bg-amber-50/50' : 'bg-white hover:bg-slate-50/60'}
                >
                  <td className="px-4 py-3.5">
                    <button
                      type="button"
                      onClick={() => onSelectDocumentByName?.(entry.documentName)}
                      className="flex items-center gap-2 text-left hover:text-[#C14E83] transition-colors group cursor-pointer"
                      title="Inspect this document in viewer"
                    >
                      <FileText size={14} className={entry.isMismatched ? 'text-amber-600' : 'text-[#C14E83]'} />
                      <span className="font-semibold text-slate-800 font-mono text-xs group-hover:underline">
                        {entry.documentName}
                      </span>
                    </button>
                  </td>
                  <td className="px-3 py-3.5 text-slate-600 font-medium">
                    {entry.documentType}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-block font-mono px-2 py-1 rounded text-xs leading-relaxed ${
                        entry.isMismatched
                          ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                          : 'bg-slate-100 text-slate-800 font-medium'
                      }`}
                    >
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
        <div
          className="p-3.5 rounded-xl border flex items-start gap-2.5 text-[11px]"
          style={{
            background: 'var(--surface-alt)',
            borderColor: 'var(--border-soft)',
            color: '#896F81',
          }}
        >
          <Info size={14} className="text-[#AA4777] mt-0.5 shrink-0" />
          <p className="leading-relaxed">
            <span className="font-bold text-[#351D31]">Reconciliation Advisory: </span>
            Cross-document comparison matches extracted parameters across submitted legal documents and declarations. Discrepancies represent matters for reviewer verification, not final legal judgment or forgery assertions.
          </p>
        </div>
      </div>
    </div>
  );
};
