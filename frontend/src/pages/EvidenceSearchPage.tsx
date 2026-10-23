import React, { useState } from 'react';
import { mockSubmissions } from '../data/mockData';
import type { EvidenceItem, Submission } from '../types';
import { Search, FileText, Building2, CheckCircle2, AlertCircle, Clock, HelpCircle } from 'lucide-react';

const VERIFICATION_ICONS: Record<string, React.ReactNode> = {
  verified: <CheckCircle2 size={13} className="text-emerald-500" />,
  pending: <Clock size={13} className="text-amber-500" />,
  disputed: <AlertCircle size={13} className="text-red-500" />,
  missing: <HelpCircle size={13} className="text-slate-400" />,
};

interface EvidenceResult {
  evidence: EvidenceItem;
  submission: Submission;
}

interface EvidenceSearchPageProps {
  onOpenReviewWorkspace?: (id: string) => void;
}

export const EvidenceSearchPage: React.FC<EvidenceSearchPageProps> = ({ onOpenReviewWorkspace }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<EvidenceResult[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = () => {
    const q = query.toLowerCase().trim();
    if (!q) return;
    const found: EvidenceResult[] = [];
    for (const sub of mockSubmissions) {
      for (const ev of sub.evidence) {
        if (
          ev.name.toLowerCase().includes(q) ||
          ev.type.toLowerCase().includes(q) ||
          (ev.issuer ?? '').toLowerCase().includes(q) ||
          sub.institution.name.toLowerCase().includes(q)
        ) {
          found.push({ evidence: ev, submission: sub });
        }
      }
    }
    setResults(found);
    setSearched(true);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto" style={{ background: 'var(--page-bg)' }}>
      <div className="p-6 max-w-[960px] mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Evidence Search</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Search across all submitted documents, NOCs, affidavits, and approval letters.
          </p>
        </div>

        {/* Search bar */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by document name, type, issuer, or institution…"
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            Search
          </button>
        </div>

        {/* Quick filters */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-slate-400">Quick:</span>
          {['NOC', 'inspection report', 'affidavit', 'financial report', 'faculty', 'Northstar'].map(
            (q) => (
              <button
                key={q}
                onClick={() => { setQuery(q); }}
                className="px-2.5 py-1 rounded-full border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                {q}
              </button>
            )
          )}
        </div>

        {/* Results */}
        {searched && (
          <div>
            <div className="text-xs text-slate-500 mb-3">
              {results.length === 0
                ? 'No results found.'
                : `${results.length} evidence item${results.length > 1 ? 's' : ''} found`}
            </div>
            <div className="flex flex-col gap-3">
              {results.map(({ evidence: ev, submission: sub }) => (
                <div
                  key={ev.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-4 hover:border-blue-200 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-xl shrink-0">
                    📄
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm font-semibold text-slate-800 leading-tight">
                        {ev.name}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {VERIFICATION_ICONS[ev.verificationStatus]}
                        <span className="text-xs text-slate-500 capitalize">
                          {ev.verificationStatus}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Building2 size={11} />
                        {sub.institution.name}
                      </span>
                      {ev.issuer && (
                        <span className="text-xs text-slate-400">Issuer: {ev.issuer}</span>
                      )}
                      <span className="text-[11px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full capitalize">
                        {ev.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {ev.notes && (
                      <p className="text-xs text-amber-700 mt-1.5 bg-amber-50 rounded px-2 py-1">
                        ⚠ {ev.notes}
                      </p>
                    )}
                    {onOpenReviewWorkspace && (
                      <div className="mt-2 pt-2 border-t border-slate-100 flex justify-end">
                        <button
                          type="button"
                          onClick={() => onOpenReviewWorkspace(sub.id)}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                        >
                          Open in Evidence Review Workspace →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!searched && (
          <div className="text-center py-12 text-slate-400">
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Enter a search term above to find evidence documents</p>
          </div>
        )}
      </div>
    </div>
  );
};
