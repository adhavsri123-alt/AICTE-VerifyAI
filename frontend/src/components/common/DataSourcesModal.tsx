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
} from 'lucide-react';

interface DataSourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DataSourcesModal: React.FC<DataSourcesModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'strategy' | 'public-dir' | 'regulations' | 'synthetic'>('strategy');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-[#0f1629] to-[#1e2d4f] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Database size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Data Sources & Provenance Registry</h2>
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

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 text-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('strategy')}
            className={`pb-3 px-4 font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'strategy'
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck size={14} />
            <span>1. Data Strategy & Ethics</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('public-dir')}
            className={`pb-3 px-4 font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'public-dir'
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 size={14} />
            <span>2. Public Reference Directory ({PUBLIC_REFERENCE_DIRECTORY.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('regulations')}
            className={`pb-3 px-4 font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'regulations'
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen size={14} />
            <span>3. Handbook Regulations (APH 2024–2027)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('synthetic')}
            className={`pb-3 px-4 font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'synthetic'
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText size={14} />
            <span>4. Synthetic Demo Case (Northstar)</span>
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div className="flex-1 overflow-y-auto p-6 text-slate-700 text-xs leading-relaxed">
          {/* TAB 1: Strategy & Ethics */}
          {activeTab === 'strategy' && (
            <div className="flex flex-col gap-5">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-950">
                <h3 className="font-bold text-sm text-blue-900 mb-1 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-blue-600" />
                  Dual-Tier Data Architecture Strategy
                </h3>
                <p className="text-xs leading-relaxed">
                  To ensure complete regulatory integrity and adhere strictly to SIH hackathon ethics, AICTE VerifyAI maintains a strict boundary between official public reference facts and synthetic evaluation scenarios.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex flex-col gap-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-900 text-xs">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span>Tier 1: Public Reference Data</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-slate-700">
                    <li>Sourced directly from AICTE Public Directory & AISHE Reports.</li>
                    <li>Factual reference data: Institute Name, Location, Permanent ID, Approved Programs.</li>
                    <li><strong className="text-emerald-800">Ethical Rule:</strong> Zero invented findings, zero risk scores, and zero fake violations are attached to real institutions.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 flex flex-col gap-2">
                  <div className="flex items-center gap-2 font-bold text-amber-900 text-xs">
                    <AlertTriangle size={16} className="text-amber-600" />
                    <span>Tier 2: Synthetic Demo Applications</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-slate-700">
                    <li>Featured test case is strictly the fictional <strong>Northstar Institute of Technology</strong>.</li>
                    <li>All test application IDs, uploaded document proformas, and discrepancies are synthetic.</li>
                    <li>Visibly labeled <strong>SAMPLE / DEMO</strong> with no authentic government seals or signatures.</li>
                  </ul>
                </div>
              </div>

              {/* Verified Sources Table */}
              <div>
                <h4 className="font-bold text-slate-800 mb-3 text-xs uppercase tracking-wider">
                  Documented Reference Sources
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                      <tr>
                        <th className="px-3 py-2.5">Source Name</th>
                        <th className="px-3 py-2.5">Issuing Authority</th>
                        <th className="px-3 py-2.5">Applicable Year</th>
                        <th className="px-3 py-2.5">Access Date</th>
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

              {/* Core Limitations */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600">
                <span className="font-bold text-slate-800">System Limitations & Ethical Disclaimers: </span>
                <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[11px]">
                  <li>VerifyAI operates in frontend demonstration mode with simulated API responses pending FastAPI backend connection.</li>
                  <li>Cryptographic file hashes (SHA-256) serve exclusively as file-integrity identifiers; they do not verify source legitimacy.</li>
                  <li>Automated findings are heuristic checks for human reviewer guidance; they do not constitute final regulatory sanction or proof of fraud.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: Public Reference Directory */}
          {activeTab === 'public-dir' && (
            <div className="flex flex-col gap-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800">Official AICTE & AISHE Public HEI Directory Extracts</span>
                  <p className="text-[11px] text-slate-500">
                    Factual public institutional metadata used for reference lookup. No synthetic findings or risk scores are ever linked to these institutions.
                  </p>
                </div>
                <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold uppercase">
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
                      <th className="px-3 py-3">Public Status</th>
                      <th className="px-3 py-3">Retrieval & Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {PUBLIC_REFERENCE_DIRECTORY.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-sans font-semibold text-slate-900">
                          {item.institutionName}
                          <div className="text-[10px] font-sans text-slate-400 font-normal">
                            {item.institutionType}
                          </div>
                          {item.verifiedProgramNote && (
                            <div className="text-[10px] font-sans text-blue-600 font-normal mt-0.5">
                              {item.verifiedProgramNote}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 font-sans text-slate-700">
                          {item.city}, {item.state}
                        </td>
                        <td className="px-3 py-3 text-slate-800 font-semibold">{item.aictePermanentId}</td>
                        <td className="px-3 py-3 text-slate-600">{item.aisheCode}</td>
                        <td className="px-3 py-3 font-sans">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {item.approvalStatus}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-sans text-[10px] text-slate-500">
                          <div className="font-semibold text-slate-700">Retrieved: {item.retrievalDate}</div>
                          <div className="text-slate-400">Baseline: AY {item.academicYear}</div>
                          <a
                            href={item.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline mt-0.5 font-sans font-medium"
                          >
                            <span>Official Source</span>
                            <ExternalLink size={10} />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-[10px] text-slate-400 italic">
                * Note: All institution records are verified from public institutional mandatory disclosures & AICTE/AISHE national directories. Program numbers and current annual extensions must be confirmed via live AICTE EoA orders. Real institutions never have synthetic findings or risk scores.
              </p>
            </div>
          )}

          {/* TAB 3: Regulations (APH 2024–2027) */}
          {activeTab === 'regulations' && (
            <div className="flex flex-col gap-4">
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-950 flex items-center justify-between">
                <div>
                  <span className="font-bold">Official Statutory Source: </span>
                  AICTE Approval Process Handbook (APH) 2024–2025 to 2026–2027, promulgated by AICTE.
                </div>
                <a
                  href="https://www.aicte-india.org/sites/default/files/approval/APH%202024-27.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 font-semibold underline shrink-0 ml-2"
                >
                  <span>Official PDF</span>
                  <ExternalLink size={12} />
                </a>
              </div>

              <div className="flex flex-col gap-3">
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900 text-xs">
                      1. Faculty Requirements, Cadre Ratio & Qualifications
                    </span>
                    <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-bold">
                      §6.14 & Annexure 5.2
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Under AICTE APH 2024–2027 §6.14 and Annexure 5.2 (*Faculty Cadre and Qualifications for Degree Engineering and Technology*), the prescribed Teacher-to-Student Ratio (TSR) is <strong>1:20</strong>. Cadre structure mandates <strong>Professor : Associate Professor : Assistant Professor = 1 : 2 : 6</strong>. Awarded Ph.D. degrees in the domain-relevant discipline are mandatory for Professor and Associate Professor posts; Assistant Professor posts require a Master's degree with First Class (Ph.D. is not a blanket entry requirement).
                  </p>
                  <blockquote className="mt-2 text-[11px] text-slate-600 bg-slate-50 border-l-2 border-blue-400 pl-2.5 py-1 italic">
                    "Cadre Ratio shall be 1 : 2 : 6 (Professor : Associate Professor : Assistant Professor). Faculty:Student Ratio for UG Degree Engineering: 1:20." — APH Annexure 5.2
                  </blockquote>
                  <div className="mt-2 text-[11px] text-slate-500 bg-slate-50 p-2 rounded">
                    <strong className="text-slate-700">Demo Grounding: </strong>
                    Applied in Northstar Case Finding #fnd-001a, where candidate Dr. P. Sangeetha’s doctorate is in Mechanical Turbines, violating computing discipline qualification norms for the proposed AI & DS Associate Professor cadre slot.
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900 text-xs">
                      2. Computational Facilities, Software & Laboratory Equipment
                    </span>
                    <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-bold">
                      §6.19 & Annexure 4
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Under AICTE APH 2024–2027 §6.19 and Annexure 4, technical institutions must provide dedicated departmental computing laboratories housing at least <strong>20 computers</strong> per department, a Centralized Computer Centre with at least <strong>100 computers</strong>, LAN connectivity, and legal system/application software. (Note: The handbook does NOT mandate specific GPU hardware models).
                  </p>
                  <blockquote className="mt-2 text-[11px] text-slate-600 bg-slate-50 border-l-2 border-blue-400 pl-2.5 py-1 italic">
                    "Every Department shall have a separate Computer Laboratory with at least 20 computers... The Institution shall have a Centralized Computer Centre with at least 100 computers." — APH Annexure 4
                  </blockquote>
                  <div className="mt-2 text-[11px] text-slate-500 bg-slate-50 p-2 rounded">
                    <strong className="text-slate-700">Statutory Grounding: </strong>
                    Establishes baseline computer laboratory standards for all technical institutions under §6.19 and Annexure 4.
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 shadow-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-amber-950 text-xs">
                      3. Synthetic Demo Rule: Specialized Lab Specification & Inventory Reconciliation
                    </span>
                    <span className="font-mono text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 font-bold">
                      Synthetic Demo Rule
                    </span>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    An automated consistency validation heuristic checking whether specialized hardware self-declared by an institution in its laboratory disclosure matches physical on-site audit serial counts. This is a <strong>Synthetic demo validation rule</strong>, NOT an AICTE statutory mandate.
                  </p>
                  <div className="mt-2 text-[11px] text-amber-800 bg-amber-100/60 p-2 rounded">
                    <strong className="text-amber-950">Demo Grounding: </strong>
                    Applied in Northstar Case Finding #fnd-001b, where 16 GPU workstations were physically verified on-site in Room CS-302 against an institutional self-declaration of 30 units (14 unaccounted for without delivery challans).
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900 text-xs">
                      4. Land Requirements, Lawful Possession & Encumbrance Status
                    </span>
                    <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-bold">
                      §6.17 & Annexure 1
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Under AICTE APH 2024–2027 §6.17 and Annexure 1, the applicant entity must hold lawful possession of continuous land with clear marketable title registered in its name and submit an Encumbrance Certificate (EC) verifying freedom from unrecorded liabilities. Mortgaging institutional land is permitted only after Letter of Approval (LoA) exclusively for campus development with prior intimation to AICTE.
                  </p>
                  <blockquote className="mt-2 text-[11px] text-slate-600 bg-slate-50 border-l-2 border-blue-400 pl-2.5 py-1 italic">
                    "The Promoter Society/Trust shall have lawful possession of the land with clear, marketable title... Encumbrance Certificate issued by the competent authority is mandatory." — APH §6.17 & Annexure 1
                  </blockquote>
                  <div className="mt-2 text-[11px] text-slate-500 bg-slate-50 p-2 rounded">
                    <strong className="text-slate-700">Demo Grounding: </strong>
                    Applied in Northstar Case Finding #fnd-001c, flagging historical legal name divergence between the 1998 conveyance deed ("Northstar Technical Institute") and the 2024 AICTE Application ("Northstar Institute of Technology").
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Synthetic Demo Case */}
          {activeTab === 'synthetic' && (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950">
                <h3 className="font-bold text-sm text-amber-900 mb-1 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-600" />
                  Fictional Primary Test Case: Northstar Institute of Technology
                </h3>
                <p className="text-xs leading-relaxed">
                  {SYNTHETIC_DEMO_NOTICE.disclaimer}
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs flex flex-col gap-3">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">
                  Synthetic Case Attributes
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400">Application ID: </span>
                    <span className="font-mono font-bold text-slate-800">DEMO/2024-25/NPA/KA/001842</span>
                  </div>
                  <div>
                    <span className="text-slate-400">AICTE Permanent ID: </span>
                    <span className="font-mono font-bold text-slate-800">DEMO-KA-ENG-2015-88</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Campus Location: </span>
                    <span className="text-slate-800 font-medium">Knowledge Park, Whitefield Extn, Bengaluru</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Program Applied: </span>
                    <span className="text-slate-800 font-medium">B.Tech AI & Data Science (Intake: 60)</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Heuristic Priority Score: </span>
                    <span className="font-mono font-bold text-red-600">91 / 100 (High Scrutiny)</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Document Watermark: </span>
                    <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                      {SYNTHETIC_DEMO_NOTICE.documentWatermark}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-500">
                Judges can inspect Northstar's complete evidence dossier, click on highlighted findings, compare cross-document entity titles, add reviewer notes, and test simulated regulatory actions safely.
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Info size={13} className="text-blue-600" />
            <span>SIH 2024 · AICTE Technical Education Compliance Prototype</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
          >
            Close Registry
          </button>
        </div>
      </div>
    </div>
  );
};
