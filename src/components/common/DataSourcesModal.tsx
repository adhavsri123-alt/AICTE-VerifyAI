import React, { useState } from 'react';
import {
  PROVENANCE_SOURCES,
  PUBLIC_REFERENCE_DIRECTORY,
  SYNTHETIC_DEMO_NOTICE,
} from '../../data/provenance';
import {
  X,
  Database,
  BookOpen,
  Building2,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Info,
  CheckCircle2,
  FileText,
  Download,
  Globe,
  FlaskConical,
} from 'lucide-react';

interface DataSourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Real public records with view/download metadata ─────────────────────────
// These records point to real, publicly accessible pages/PDFs from official sources.
// "View original" opens the official page in a new tab. "Download" opens the direct file.
// If only a webpage (not a PDF) is available, it is labelled "Webpage".
// If no verifiable direct file is available, only "View page" is offered.

interface PublicRecord {
  id: string;
  institutionName: string;
  state: string;
  documentTitle: string;
  documentType: 'Mandatory Disclosure' | 'Webpage' | 'AICTE Portal' | 'Official Portal';
  academicYear?: string;
  issuingOrg: string;
  sourceUrl: string;
  directFileUrl?: string; // if a direct PDF/doc is publicly available
  retrievalDate: string;
  note: string;
  canViewInApp: boolean; // whether the URL is expected to load in an iframe (most AICTE pages block this)
}

const OFFICIAL_PUBLIC_RECORDS: PublicRecord[] = [
  {
    id: 'pub-psg',
    institutionName: 'PSG College of Technology',
    state: 'Tamil Nadu',
    documentTitle: 'Mandatory Disclosure — PSG College of Technology',
    documentType: 'Mandatory Disclosure',
    academicYear: '2024–25',
    issuingOrg: 'PSG College of Technology (self-published, AICTE requirement)',
    sourceUrl: 'https://www.psgtech.edu/approval.php',
    retrievalDate: '2026-10-23',
    note: 'Official mandatory disclosure page. AICTE permanent ID 1-4165514 is listed here.',
    canViewInApp: false,
  },
  {
    id: 'pub-coep',
    institutionName: 'COEP Technological University (formerly College of Engineering, Pune)',
    state: 'Maharashtra',
    documentTitle: 'Official Portal — COEP Technological University',
    documentType: 'Official Portal',
    academicYear: '2024–25',
    issuingOrg: 'COEP Technological University',
    sourceUrl: 'https://www.coeptech.ac.in',
    retrievalDate: '2026-10-23',
    note: 'Official website. AICTE permanent ID 1-14626132. Mandatory disclosure linked from portal.',
    canViewInApp: false,
  },
  {
    id: 'pub-dtu',
    institutionName: 'Delhi Technological University',
    state: 'Delhi',
    documentTitle: 'Official Portal — Delhi Technological University',
    documentType: 'Official Portal',
    academicYear: '2024–25',
    issuingOrg: 'Delhi Technological University',
    sourceUrl: 'https://www.dtu.ac.in',
    retrievalDate: '2026-10-23',
    note: 'Official website. AICTE permanent ID 1-837103261. AICTE compliance section accessible from portal.',
    canViewInApp: false,
  },
  {
    id: 'pub-vjti',
    institutionName: 'Veermata Jijabai Technological Institute (VJTI)',
    state: 'Maharashtra',
    documentTitle: 'Official Portal — VJTI Mumbai',
    documentType: 'Official Portal',
    academicYear: '2024–25',
    issuingOrg: 'VJTI Mumbai',
    sourceUrl: 'https://vjti.ac.in',
    retrievalDate: '2026-10-23',
    note: 'Official website. AICTE permanent ID 1-5149491. Mandatory disclosure accessible from portal.',
    canViewInApp: false,
  },
  {
    id: 'pub-bmsce',
    institutionName: 'BMS College of Engineering',
    state: 'Karnataka',
    documentTitle: 'Mandatory Disclosure — BMS College of Engineering',
    documentType: 'Mandatory Disclosure',
    academicYear: '2024–25',
    issuingOrg: 'BMS College of Engineering (self-published, AICTE requirement)',
    sourceUrl: 'https://bmsce.ac.in/home/Mandatory-Disclosure',
    retrievalDate: '2026-10-23',
    note: 'AICTE mandatory disclosure page. AICTE permanent ID 1-5884543.',
    canViewInApp: false,
  },
  {
    id: 'pub-aicte-dash',
    institutionName: '(AICTE National Registry)',
    state: 'All India',
    documentTitle: 'AICTE Approved Institutes Public Dashboard',
    documentType: 'AICTE Portal',
    academicYear: '2024–25',
    issuingOrg: 'All India Council for Technical Education (AICTE)',
    sourceUrl: 'https://facilities.aicte-india.org/dashboard/pages/angulardashboard.php',
    retrievalDate: '2026-10-23',
    note: 'Official public registry of all AICTE-approved institutions. Searchable by state, district, institution type.',
    canViewInApp: false,
  },
  {
    id: 'pub-jadavpur',
    institutionName: 'Jadavpur University',
    state: 'West Bengal',
    documentTitle: 'Official Portal — Jadavpur University',
    documentType: 'Official Portal',
    academicYear: '2024–25',
    issuingOrg: 'Jadavpur University',
    sourceUrl: 'https://jadavpuruniversity.in',
    retrievalDate: '2026-10-23',
    note: 'Official website. AICTE permanent ID 1-21569051. Faculty of Engineering & Technology details on portal.',
    canViewInApp: false,
  },
];

const TYPE_CHIP: Record<string, { bg: string; text: string; border: string }> = {
  'Mandatory Disclosure': { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
  'Webpage': { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
  'AICTE Portal': { bg: '#eef2ff', text: '#3730a3', border: '#c7d2fe' },
  'Official Portal': { bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd' },
};

export const DataSourcesModal: React.FC<DataSourcesModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<
    'strategy' | 'public-records' | 'public-dir' | 'regulations' | 'synthetic'
  >('strategy');

  if (!isOpen) return null;

  const tabBtn = (
    id: typeof activeTab,
    icon: React.ReactNode,
    label: string,
  ) => (
    <button
      type="button"
      onClick={() => setActiveTab(id)}
      className={`pb-3 px-4 font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap text-xs ${
        activeTab === id
          ? 'border-blue-600 text-blue-700 font-bold'
          : 'border-transparent text-slate-600 hover:text-slate-900'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-[#0f1629] to-[#1e2d4f] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Database size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Data Sources &amp; Provenance Registry</h2>
              <p className="text-xs text-blue-200 font-mono mt-0.5">
                AICTE VerifyAI · Public Reference vs Synthetic Demo Separation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 text-xs overflow-x-auto shrink-0">
          {tabBtn('strategy', <ShieldCheck size={13} />, '1. Data Strategy')}
          {tabBtn('public-records', <Globe size={13} />, `2. Official Public Records (${OFFICIAL_PUBLIC_RECORDS.length})`)}
          {tabBtn('public-dir', <Building2 size={13} />, `3. Reference Directory (${PUBLIC_REFERENCE_DIRECTORY.length})`)}
          {tabBtn('regulations', <BookOpen size={13} />, '4. APH 2024–27 Rules')}
          {tabBtn('synthetic', <FileText size={13} />, '5. Demo Case (Northstar)')}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 text-slate-700 text-xs leading-relaxed">

          {/* ── TAB 1: Strategy ──────────────────────────────────────────── */}
          {activeTab === 'strategy' && (
            <div className="flex flex-col gap-5">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-950">
                <h3 className="font-bold text-sm text-blue-900 mb-1 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-blue-600" />
                  Dual-Tier Data Architecture
                </h3>
                <p className="text-xs leading-relaxed">
                  AICTE VerifyAI maintains a strict boundary between official public reference
                  facts and synthetic evaluation scenarios to protect institutional integrity and
                  satisfy SIH ethics requirements.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex flex-col gap-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-900 text-xs">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span>Tier 1: Public Reference Data</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-slate-700">
                    <li>Sourced from AICTE Public Directory, AISHE Reports, and official institution portals.</li>
                    <li>Factual reference only: name, location, permanent ID, institution type.</li>
                    <li><strong className="text-emerald-800">Ethical Rule:</strong> Zero invented findings, zero risk scores, zero fake violations attached to any real institution.</li>
                  </ul>
                </div>
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 flex flex-col gap-2">
                  <div className="flex items-center gap-2 font-bold text-amber-900 text-xs">
                    <AlertTriangle size={16} className="text-amber-600" />
                    <span>Tier 2: Synthetic Demo Applications</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-slate-700">
                    <li>Primary test case is the entirely fictional <strong>Northstar Institute of Technology</strong>.</li>
                    <li>All application IDs, documents, findings, and decisions are synthetic.</li>
                    <li>Visibly labelled <strong>SAMPLE / DEMO</strong> with no authentic government seals or signatures.</li>
                  </ul>
                </div>
              </div>

              {/* Source table */}
              <div>
                <h4 className="font-bold text-slate-800 mb-3 text-xs uppercase tracking-wider">Documented Reference Sources</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                      <tr>
                        <th className="px-3 py-2.5">Source Name</th>
                        <th className="px-3 py-2.5">Issuing Authority</th>
                        <th className="px-3 py-2.5">Year</th>
                        <th className="px-3 py-2.5">Retrieved</th>
                        <th className="px-3 py-2.5">Link</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {PROVENANCE_SOURCES.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 font-semibold text-slate-800">{s.title}</td>
                          <td className="px-3 py-2.5 text-slate-600">{s.issuingAuthority}</td>
                          <td className="px-3 py-2.5 font-mono">{s.applicableYear}</td>
                          <td className="px-3 py-2.5 font-mono">{s.accessDate}</td>
                          <td className="px-3 py-2.5">
                            <a
                              href={s.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                            >
                              Open <ExternalLink size={10} />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600">
                <span className="font-bold text-slate-800">System Limitations: </span>
                <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[11px]">
                  <li>VerifyAI operates in frontend demo mode with simulated API responses — no live AICTE backend.</li>
                  <li>SHA-256 checksums shown are file-integrity identifiers for demo docs; they do not verify source authenticity.</li>
                  <li>Automated findings are heuristic advisory checks — human reviewers make all decisions.</li>
                </ul>
              </div>
            </div>
          )}

          {/* ── TAB 2: Official Public College Records ────────────────────── */}
          {activeTab === 'public-records' && (
            <div className="flex flex-col gap-4">
              {/* Header notice */}
              <div
                style={{
                  background: '#ecfdf5', border: '1px solid #a7f3d0',
                  borderRadius: 12, padding: '12px 16px',
                }}
                className="flex items-start gap-3"
              >
                <Globe size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <div className="font-bold text-emerald-900 mb-1">Official Public College Records</div>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    These records link directly to official public pages or documents from AICTE, AISHE,
                    or institution websites. <strong>No synthetic findings, risk scores, or approval/rejection decisions
                    are attached to any real institution.</strong> "View original" opens the official issuing page in a new tab.
                    "Download" links to the direct source file when one is publicly available.
                  </p>
                </div>
              </div>

              {/* Separator notice about private records */}
              <div
                style={{
                  background: '#fff7ed', border: '1px solid #fed7aa',
                  borderRadius: 10, padding: '10px 14px',
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                }}
              >
                <AlertTriangle size={13} className="text-orange-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-orange-900 leading-relaxed">
                  Private application dossiers, pending AICTE reviews, student records, and any
                  non-public institutional data are <strong>not accessible here</strong> and are not part of this prototype.
                </p>
              </div>

              {/* Records list */}
              <div className="flex flex-col gap-3">
                {OFFICIAL_PUBLIC_RECORDS.map((rec) => {
                  const chip = TYPE_CHIP[rec.documentType] ?? TYPE_CHIP['Webpage'];
                  return (
                    <div
                      key={rec.id}
                      style={{
                        background: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 12,
                        padding: '14px 16px',
                        boxShadow: '0 1px 4px rgba(15,22,41,0.06)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="text-sm font-bold text-slate-900">
                              {rec.institutionName}
                            </span>
                            <span
                              style={{
                                fontSize: 10, fontWeight: 700, padding: '2px 7px',
                                background: chip.bg, color: chip.text,
                                border: `1px solid ${chip.border}`, borderRadius: 20,
                              }}
                            >
                              {rec.documentType}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {rec.state}
                            </span>
                          </div>
                          <div className="text-xs text-slate-700 font-semibold">{rec.documentTitle}</div>
                        </div>
                      </div>

                      {/* Metadata row */}
                      <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-slate-500 mb-2.5">
                        <span><strong className="text-slate-600">Issuing org:</strong> {rec.issuingOrg}</span>
                        {rec.academicYear && (
                          <span><strong className="text-slate-600">Academic year:</strong> {rec.academicYear}</span>
                        )}
                        <span className="font-mono">
                          <strong className="text-slate-600">Retrieved:</strong> {rec.retrievalDate}
                        </span>
                      </div>

                      {/* Note */}
                      <p className="text-[11px] text-slate-500 leading-relaxed mb-3">{rec.note}</p>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <a
                          href={rec.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[11px] transition-colors"
                          title={`Opens ${rec.sourceUrl} in a new tab (the issuing site)`}
                        >
                          <ExternalLink size={11} />
                          View on issuing site
                        </a>

                        {rec.directFileUrl ? (
                          <a
                            href={rec.directFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-[11px] transition-colors"
                            title="Download original source file (unmodified)"
                          >
                            <Download size={11} className="text-blue-600" />
                            Download original
                          </a>
                        ) : (
                          <span
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-100 bg-slate-50 text-slate-400 font-semibold text-[11px] cursor-not-allowed"
                            title="No direct downloadable file is publicly available from this source"
                          >
                            <Download size={11} />
                            No direct file
                          </span>
                        )}

                        <span
                          style={{
                            fontSize: 10, color: '#94a3b8', marginLeft: 4,
                          }}
                        >
                          Opens on {new URL(rec.sourceUrl).hostname}
                        </span>
                      </div>

                      {/* In-app viewing note */}
                      {!rec.canViewInApp && (
                        <p
                          style={{
                            fontSize: 10, color: '#94a3b8', marginTop: 8,
                            fontStyle: 'italic',
                          }}
                        >
                          ℹ In-app preview not available — this site blocks embedding. Opens in a new tab on the official page.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <p className="text-[10px] text-slate-400 italic">
                All records above are verified from official public sources.
                For current annual EoA (Extension of Approval) orders, visit the live AICTE portal.
                Real institutions are never shown with synthetic findings, risk scores, or review decisions.
              </p>
            </div>
          )}

          {/* ── TAB 3: Reference Directory (ID table) ────────────────────── */}
          {activeTab === 'public-dir' && (
            <div className="flex flex-col gap-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800">AICTE &amp; AISHE Public HEI Directory Extracts</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Factual public institutional metadata for reference lookup.
                    No synthetic findings or risk scores are ever linked to these institutions.
                  </p>
                </div>
                <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold uppercase ml-3 shrink-0">
                  Verified Public Directory
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Institution Name</th>
                      <th className="px-3 py-3">Location</th>
                      <th className="px-3 py-3">AICTE Permanent ID</th>
                      <th className="px-3 py-3">AISHE Code</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {PUBLIC_REFERENCE_DIRECTORY.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-sans font-semibold text-slate-900">
                          {item.institutionName}
                          <div className="text-[10px] font-sans text-slate-400 font-normal">{item.institutionType}</div>
                          {item.verifiedProgramNote && (
                            <div className="text-[10px] font-sans text-blue-600 font-normal mt-0.5">
                              {item.verifiedProgramNote}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 font-sans text-slate-700">{item.city}, {item.state}</td>
                        <td className="px-3 py-3 text-slate-800 font-semibold">{item.aictePermanentId}</td>
                        <td className="px-3 py-3 text-slate-600">{item.aisheCode}</td>
                        <td className="px-3 py-3 font-sans">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {item.approvalStatus}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-sans text-[10px] text-slate-500">
                          <div className="font-semibold text-slate-700">Retrieved: {item.retrievalDate}</div>
                          <div className="text-slate-400">AY {item.academicYear}</div>
                          <a
                            href={item.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline mt-0.5 font-sans font-medium"
                          >
                            Official Source <ExternalLink size={10} />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-[10px] text-slate-400 italic">
                * Program numbers and current annual extensions must be confirmed via live AICTE EoA orders.
                Real institutions never have synthetic findings or risk scores in this prototype.
              </p>
            </div>
          )}

          {/* ── TAB 4: APH Regulations ────────────────────────────────────── */}
          {activeTab === 'regulations' && (
            <div className="flex flex-col gap-4">
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-950 flex items-center justify-between">
                <div>
                  <span className="font-bold">Official Statutory Source: </span>
                  AICTE Approval Process Handbook (APH) 2024–2027.
                </div>
                <a
                  href="https://www.aicte-india.org/sites/default/files/approval/APH%202024-27.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 font-semibold underline shrink-0 ml-2"
                >
                  Official PDF <ExternalLink size={12} />
                </a>
              </div>

              <div className="flex flex-col gap-3">
                {/* Rule 1 */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900 text-xs">1. Faculty Requirements, Cadre Ratio &amp; Qualifications</span>
                    <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-bold">§6.14 &amp; Annexure 5.2</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Teacher-to-Student Ratio (TSR): <strong>1:20</strong>. Cadre: <strong>Professor : Associate Professor : Assistant Professor = 1 : 2 : 6</strong>.
                    Ph.D. in the relevant discipline is mandatory for Professor and Associate Professor posts only.
                    Entry-level Assistant Professors require Master's degree with First Class.
                  </p>
                  <blockquote className="mt-2 text-[11px] text-slate-600 bg-slate-50 border-l-2 border-blue-400 pl-2.5 py-1 italic">
                    "Cadre Ratio shall be 1 : 2 : 6 (Professor : Associate Professor : Assistant Professor). Faculty:Student Ratio for UG Degree Engineering: 1:20." — APH Annexure 5.2
                  </blockquote>
                </div>

                {/* Rule 2 */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900 text-xs">2. Computational Facilities, Software &amp; Lab Equipment</span>
                    <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-bold">§6.19 &amp; Annexure 4</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Dedicated departmental computing lab: at least <strong>20 computers</strong>. Centralized Computer Centre: at least <strong>100 computers</strong>,
                    LAN connectivity, and legal system/application software. The handbook does <strong>NOT mandate specific GPU hardware models</strong>.
                  </p>
                  <blockquote className="mt-2 text-[11px] text-slate-600 bg-slate-50 border-l-2 border-blue-400 pl-2.5 py-1 italic">
                    "Every Department shall have a separate Computer Laboratory with at least 20 computers... The Institution shall have a Centralized Computer Centre with at least 100 computers." — APH Annexure 4
                  </blockquote>
                </div>

                {/* Synthetic rule note */}
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 shadow-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-amber-950 text-xs">3. Synthetic Demo Rule: Lab Inventory Reconciliation</span>
                    <span className="font-mono text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 font-bold">Synthetic Demo Rule</span>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    An automated consistency heuristic checking whether specialized hardware self-declared by an institution
                    matches the physical on-site audit count. This is a <strong>synthetic demo validation rule</strong>, NOT an AICTE statutory mandate.
                  </p>
                </div>

                {/* Rule 3 */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900 text-xs">4. Land Requirements, Lawful Possession &amp; Encumbrance Status</span>
                    <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-bold">§6.17 &amp; Annexure 1</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Lawful possession of continuous land with clear marketable title registered in the entity's name.
                    Encumbrance Certificate (EC) verifying freedom from unrecorded liabilities is mandatory.
                    Mortgaging land is permitted only after LoA exclusively for campus development with prior AICTE intimation.
                  </p>
                  <blockquote className="mt-2 text-[11px] text-slate-600 bg-slate-50 border-l-2 border-blue-400 pl-2.5 py-1 italic">
                    "The Promoter Society/Trust shall have lawful possession of the land with clear, marketable title... Encumbrance Certificate issued by the competent authority is mandatory." — APH §6.17 &amp; Annexure 1
                  </blockquote>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 5: Synthetic Demo Case ────────────────────────────────── */}
          {activeTab === 'synthetic' && (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950">
                <h3 className="font-bold text-sm text-amber-900 mb-1 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-600" />
                  Fictional Primary Test Case: Northstar Institute of Technology
                </h3>
                <p className="text-xs leading-relaxed">{SYNTHETIC_DEMO_NOTICE.disclaimer}</p>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs flex flex-col gap-3">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Synthetic Case Attributes</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><span className="text-slate-400">Application ID: </span><span className="font-mono font-bold text-slate-800">DEMO/2024-25/NPA/KA/001842</span></div>
                  <div><span className="text-slate-400">AICTE Permanent ID: </span><span className="font-mono font-bold text-slate-800">DEMO-KA-ENG-2015-88</span></div>
                  <div><span className="text-slate-400">Campus Location: </span><span className="text-slate-800 font-medium">Knowledge Park, Whitefield Extn, Bengaluru</span></div>
                  <div><span className="text-slate-400">Program Applied: </span><span className="text-slate-800 font-medium">B.Tech AI &amp; Data Science (Intake: 60)</span></div>
                  <div><span className="text-slate-400">Priority Score: </span><span className="font-mono font-bold text-red-600">91 / 100 (High Scrutiny)</span></div>
                  <div><span className="text-slate-400">Document Watermark: </span><span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{SYNTHETIC_DEMO_NOTICE.documentWatermark}</span></div>
                </div>
              </div>

              {/* Plain-language glossary */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide mb-3">Plain-Language Term Glossary</h4>
                <div className="flex flex-col gap-2.5">
                  {[
                    { term: 'Finding', def: 'A possible issue for a human reviewer to check. Not proof of non-compliance, not a final decision — an advisory flag only.' },
                    { term: 'Evidence dossier', def: 'An application and its supporting documents grouped together for review.' },
                    { term: 'Priority', def: 'A guide to which application may need attention sooner based on risk, severity, and timeline.' },
                    { term: 'Audit events', def: 'A chronological history of actions taken on an application — submissions received, reviews started, findings flagged, and decisions made.' },
                    { term: 'Automated check', def: 'A heuristic test run on submitted data. Advisory only — a human reviewer makes the final compliance determination.' },
                  ].map(({ term, def }) => (
                    <div key={term} className="flex gap-3 text-xs">
                      <span className="font-bold text-blue-700 shrink-0 w-32">{term}</span>
                      <span className="text-slate-600 leading-relaxed">{def}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <FlaskConical size={13} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-slate-500">
                  Evaluators can inspect Northstar's complete evidence dossier, click on highlighted findings,
                  compare cross-document entity titles, add reviewer notes, and test simulated regulatory actions
                  — all in demo mode with no real backend required.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <Info size={13} className="text-blue-600" />
            <span>AICTE VerifyAI · SIH Prototype · All demo data</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
