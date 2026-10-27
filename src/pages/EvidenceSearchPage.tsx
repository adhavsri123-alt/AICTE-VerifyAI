import React, { useEffect, useState, useMemo } from 'react';
import { fetchSubmissions } from '../services/api';
import type { EvidenceItem, Submission } from '../types';
import { Search, FileText, Building2, CheckCircle2, AlertCircle, Clock, HelpCircle, ExternalLink, Filter } from 'lucide-react';

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
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubmissions().then((res) => {
      setSubmissions(res.items);
      setLoading(false);
    });
  }, []);

  const allEvidence = useMemo(() => {
    const list: EvidenceResult[] = [];
    for (const sub of submissions) {
      for (const ev of sub.evidence) {
        list.push({ evidence: ev, submission: sub });
      }
    }
    return list;
  }, [submissions]);

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    return allEvidence.filter(({ evidence: ev, submission: sub }) => {
      if (statusFilter !== 'all' && ev.verificationStatus !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        ev.name.toLowerCase().includes(q) ||
        ev.type.toLowerCase().includes(q) ||
        (ev.issuer ?? '').toLowerCase().includes(q) ||
        (ev.filename ?? '').toLowerCase().includes(q) ||
        (ev.notes ?? '').toLowerCase().includes(q) ||
        sub.institution.name.toLowerCase().includes(q) ||
        sub.applicationId.toLowerCase().includes(q) ||
        sub.institution.city.toLowerCase().includes(q) ||
        sub.institution.state.toLowerCase().includes(q)
      );
    });
  }, [allEvidence, query, statusFilter]);

  const counts = useMemo(() => {
    return {
      all: allEvidence.length,
      verified: allEvidence.filter((r) => r.evidence.verificationStatus === 'verified').length,
      pending: allEvidence.filter((r) => r.evidence.verificationStatus === 'pending').length,
      disputed: allEvidence.filter((r) => r.evidence.verificationStatus === 'disputed').length,
      missing: allEvidence.filter((r) => r.evidence.verificationStatus === 'missing').length,
    };
  }, [allEvidence]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto" style={{ background: 'var(--page-bg)' }}>
      <div className="p-6 max-w-[1600px] mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Search size={20} className="text-[#C14E83]" />
              Evidence Search
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Deep search across all submitted documents, NOCs, land titles, building plans, and approval letters across 30 applications.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-[#251421] text-white px-3.5 py-1.5 rounded-xl border border-[#351D31]">
            <span className="text-xs font-semibold">{results.length} document{results.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Search bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by document name, type, issuer, filename, or institution name…"
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#C14E83]/30 focus:border-[#C14E83] transition-all"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-medium"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Quick query pills & status filters */}
        <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-slate-400 font-medium">Quick terms:</span>
            {['NOC', 'Fire Safety', 'Land Title', 'Faculty Cadre', 'Building Completion', 'Northstar'].map(
              (q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuery(q)}
                  className="px-2.5 py-1 rounded-full border border-slate-200 bg-white text-slate-600 hover:border-[#ECD9E2] hover:bg-[#FFF5F7] hover:text-[#C14E83] transition-colors"
                >
                  {q}
                </button>
              )
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 text-xs font-medium mr-1 flex items-center gap-1">
              <Filter size={12} /> Status:
            </span>
            {(
              [
                { id: 'all', label: 'All', count: counts.all },
                { id: 'verified', label: 'Verified', count: counts.verified },
                { id: 'pending', label: 'Pending', count: counts.pending },
                { id: 'disputed', label: 'Disputed', count: counts.disputed },
                { id: 'missing', label: 'Missing', count: counts.missing },
              ] as const
            ).map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`text-xs px-2.5 py-1 rounded-full font-semibold border transition-all ${
                  statusFilter === st.id
                    ? 'bg-[#251421] text-[#FFF5F7] border-[#351D31] shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-[#ECD9E2] hover:text-[#C14E83]'
                }`}
              >
                {st.label}
                <span className={`ml-1 text-[11px] ${statusFilter === st.id ? 'text-[#FFD1E3]' : 'opacity-50'}`}>
                  {st.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Results grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse h-28 bg-slate-100 rounded-xl" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
            <FileText size={40} className="mx-auto mb-3 opacity-30 text-[#C14E83]" />
            <p className="text-sm font-medium">No evidence documents match your query or filter</p>
            <p className="text-xs text-slate-400 mt-1">Try clearing your filters or searching for terms like "NOC" or "Faculty"</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map(({ evidence: ev, submission: sub }) => (
              <div
                key={ev.id}
                className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-[#ECD9E2] hover:shadow-xs transition-all"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-[#FFF5F7] border border-[#ECD9E2] flex items-center justify-center text-lg shrink-0">
                    📄
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-800 leading-tight truncate" title={ev.name}>
                        {ev.name}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {VERIFICATION_ICONS[ev.verificationStatus]}
                        <span className="text-xs text-slate-500 capitalize">
                          {ev.verificationStatus}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-slate-600 font-medium">
                        <Building2 size={11} className="text-[#C14E83]" />
                        <span className="truncate max-w-[200px]">{sub.institution.name}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {sub.applicationId}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {ev.filename && (
                        <span className="text-[10px] text-slate-400 font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                          {ev.filename}
                        </span>
                      )}
                      {ev.issuer && (
                        <span className="text-[11px] text-slate-500">Issuer: {ev.issuer}</span>
                      )}
                      <span className="text-[10px] bg-[#FFF5F7] text-[#AA4777] font-semibold px-2 py-0.5 rounded-full capitalize border border-[#ECD9E2]">
                        {ev.type.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {ev.notes && (
                      <p className="text-xs text-amber-700 mt-2 bg-amber-50/70 border border-amber-200/50 rounded px-2 py-1">
                        ⚠ {ev.notes}
                      </p>
                    )}
                  </div>
                </div>

                {onOpenReviewWorkspace && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {sub.institution.city}, {sub.institution.state}
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenReviewWorkspace(sub.id)}
                      className="text-xs font-bold text-[#C14E83] hover:text-[#AA4777] flex items-center gap-1 transition-colors"
                    >
                      <span>Open Dossier</span>
                      <ExternalLink size={11} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
