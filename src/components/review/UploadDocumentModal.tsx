import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  X,
  ShieldCheck,
  Cpu,
  Info,
  Eye,
  Scan,
  ScanText,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { uploadApplicationDocument, type DocumentUploadResult } from '../../services/api';

const FIELD_LABEL_MAP: Record<string, string> = {
  institutionName: 'Institution Legal Name',
  surveyNumber: 'Land Survey / Plot No.',
  landArea: 'Campus Land Area',
  landAreaMention: 'Land Area Citation',
  applicationId: 'Application ID',
  issuingAuthority: 'Issuing / Certifying Authority',
  issueDate: 'Document Issue / Execution Date',
  referenceNo: 'Reference / Order No.',
  cadreMention: 'Faculty Cadre Ratio Declaration',
  cadreRatio: 'Cadre Proportion (§6.14)',
  aicteIdMention: 'Permanent AICTE Institute ID',
};

function formatFieldLabel(key: string): string {
  if (FIELD_LABEL_MAP[key]) return FIELD_LABEL_MAP[key];
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissionId: string;
  institutionName: string;
  onDocumentUploaded: (result: DocumentUploadResult) => void;
}

const DOCUMENT_TYPES = [
  { value: 'document', label: 'General Compliance Document' },
  { value: 'affidavit', label: 'Statutory Stamp Paper Affidavit' },
  { value: 'noc', label: 'Government / State Directorate NOC' },
  { value: 'approval_letter', label: 'University Affiliation Order' },
  { value: 'financial_report', label: 'Audited Financial Balance Sheet' },
  { value: 'inspection_report', label: 'Physical Inspection / Survey Report' },
];

export const UploadDocumentModal: React.FC<UploadDocumentModalProps> = ({
  isOpen,
  onClose,
  submissionId,
  institutionName,
  onDocumentUploaded,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('document');
  const [issuer, setIssuer] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<DocumentUploadResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValidationError(null);
    setUploadResult(null);
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const allowed = ['.pdf', '.png', '.jpg', '.jpeg', '.tiff'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowed.includes(ext)) {
      setValidationError(`Unsupported file format '${ext}'. Supported formats: PDF, PNG, JPG, JPEG, TIFF.`);
      setSelectedFile(null);
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setValidationError(`File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds 15 MB limit.`);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    if (!description) {
      setDescription(`Uploaded verification file for ${institutionName}: ${file.name}`);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setValidationError('Please select a document file to upload.');
      return;
    }

    setLoading(true);
    setValidationError(null);

    try {
      const result = await uploadApplicationDocument(submissionId, selectedFile, {
        documentType,
        issuer: issuer.trim() || undefined,
        description: description.trim() || undefined,
      });

      setUploadResult(result);
      onDocumentUploaded(result);
    } catch (err: any) {
      setValidationError(err.message || 'Document upload and validation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setValidationError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div
          className="px-6 py-4 text-white flex items-center justify-between shrink-0"
          style={{ background: 'linear-gradient(135deg, #251421 0%, #351D31 60%, #481B38 100%)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[#FFD1E3]">
              <Upload size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">
                Upload &amp; Authenticate Document
              </h3>
              <p className="text-[11px] text-[#E0B0C8] mt-0.5">
                PyMuPDF text extraction · Tesseract OCR fallback · AICTE regulatory rule audit
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4 text-xs text-slate-700">
          {!uploadResult ? (
            <>
              {/* File Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
                  ${selectedFile
                    ? 'border-[#C14E83] bg-[#FFF5F7]'
                    : 'border-slate-300 hover:border-[#ECD9E2] hover:bg-[#FFF5F7]/30'
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.png,.jpg,.jpeg,.tiff"
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText size={32} className="text-[#C14E83]" />
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{selectedFile.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {(selectedFile.size / 1024).toFixed(1)} KB · Ready for text extraction &amp; compliance audit
                      </div>
                    </div>
                    <span className="text-[10px] text-[#C14E83] font-semibold underline mt-1">
                      Click to choose a different file
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-500">
                    <Upload size={28} className="text-slate-400" />
                    <div>
                      <span className="font-semibold text-slate-700">Click to browse or drag file here</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Supports PDF (digital &amp; scanned), PNG, JPG, JPEG, TIFF (Max 15 MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Validation error notice */}
              {validationError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-900 flex items-center gap-2 animate-fadeIn">
                  <AlertTriangle size={15} className="text-red-600 shrink-0" />
                  <span className="font-medium text-xs">{validationError}</span>
                </div>
              )}

              {/* Metadata Form */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                    Document Category
                  </label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="p-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  >
                    {DOCUMENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                    Issuing Authority / Submitting Body
                  </label>
                  <input
                    type="text"
                    value={issuer}
                    onChange={(e) => setIssuer(e.target.value)}
                    placeholder="e.g. Office of Registrar / State Directorate"
                    className="p-2 text-xs border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>

                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                    Document Description &amp; Verification Objective
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What does this document certify?"
                    className="p-2 text-xs border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
              </div>

              {/* Processing Pipeline Highlights */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col gap-2">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu size={13} className="text-blue-600" />
                  <span>Processing Pipeline</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10.5px] text-slate-600">
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="font-semibold text-slate-800 block">1. PyMuPDF Parser</span>
                    Digital page text extraction, font layout &amp; checksum.
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="font-semibold text-slate-800 block">2. Tesseract OCR</span>
                    Scanned image recognition with fallback status.
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="font-semibold text-slate-800 block">3. Statutory Rules</span>
                    Evaluates §6.14 cadre, §6.17 land, §6.19 lab minimums.
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Upload & Verification Results View */
            <div className="flex flex-col gap-3.5 animate-fadeIn">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-emerald-900 text-sm">{uploadResult.message}</h4>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Document ingested into dossier and verified against statutory compliance rules.
                  </p>
                </div>
              </div>

              {/* Technical Extraction Details Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3 shadow-xs">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                  <span className="font-bold text-slate-800 uppercase tracking-wide">
                    Authentication Metrics
                  </span>
                  <span className="font-mono text-slate-500">
                    Doc ID: {uploadResult.documentId}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Filename</span>
                    <div className="font-mono text-slate-800 truncate">{uploadResult.filename}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">File Size</span>
                    <div className="text-slate-800 font-medium">
                      {(uploadResult.fileSizeBytes / 1024).toFixed(1)} KB ({uploadResult.pageCount} page{uploadResult.pageCount > 1 ? 's' : ''})
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                      <ShieldCheck size={11} className="text-emerald-600" />
                      SHA-256 File-Integrity Checksum
                    </span>
                    <div className="font-mono text-[11px] text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200 break-all select-all">
                      {uploadResult.checksumSha256}
                    </div>
                  </div>
                </div>

                {/* OCR Engine Status Banner */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] flex items-start gap-2 text-slate-600">
                  <Info size={13} className="text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800 block">OCR Engine Status:</span>
                    <span>{uploadResult.ocrStatus}</span>
                  </div>
                </div>
              </div>

              {/* Extracted Document Fields Card */}
              {(() => {
                const displayFieldsEntries = Object.entries(uploadResult.extractedFields || {}).filter(([key, val]) => {
                  if (key === 'extractedFieldCount') return false;
                  if (key === 'landAreaMention' && uploadResult.extractedFields.landArea) return false;
                  return val !== null && val !== undefined && String(val).trim().length > 0;
                });

                return (
                  <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3 shadow-xs">
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 uppercase tracking-wide">
                        <ScanText size={14} className="text-[#C14E83]" />
                        <span>Extracted Document Fields</span>
                        {displayFieldsEntries.length > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#FFF5F7] text-[#C14E83] border border-[#ECD9E2] font-semibold">
                            {displayFieldsEntries.length} field{displayFieldsEntries.length > 1 ? 's' : ''} detected
                          </span>
                        )}
                      </div>
                      <div>
                        {uploadResult.ocrUsed ? (
                          <span className="px-2.5 py-0.5 text-[10.5px] font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5">
                            <Scan size={11} className="text-indigo-600" />
                            Tesseract OCR Processed
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 text-[10.5px] font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5">
                            <FileText size={11} className="text-slate-500" />
                            PyMuPDF Digital Native
                          </span>
                        )}
                      </div>
                    </div>

                    {displayFieldsEntries.length === 0 ? (
                      <div className="p-4 bg-slate-50/80 rounded-lg border border-dashed border-slate-200 text-center text-slate-500 text-xs">
                        <p className="font-semibold text-slate-700">No structured fields extracted</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          No explicit key fields (such as Survey Number, Land Area, or Application ID) were detected in the text layer.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2.5">
                        {displayFieldsEntries.map(([key, val]) => (
                          <div
                            key={key}
                            className="p-2.5 rounded-lg bg-slate-50/70 border border-slate-200/80 flex flex-col gap-0.5"
                          >
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                              {formatFieldLabel(key)}
                            </span>
                            <div className="font-mono text-xs font-semibold text-slate-800 break-words select-all">
                              {String(val)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Findings Raised Section */}
              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <AlertTriangle size={13} className="text-amber-500" />
                  <span>
                    Compliance Findings Triggered ({uploadResult.findingsRaised.length})
                  </span>
                </h4>

                {uploadResult.findingsRaised.length === 0 ? (
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>No statutory discrepancies or rule violations were flagged in this document.</span>
                  </div>
                ) : (
                  uploadResult.findingsRaised.map((f) => (
                    <div
                      key={f.id}
                      className="p-3 rounded-xl border border-amber-200 bg-amber-50/70 flex flex-col gap-1 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-amber-900">{f.category}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                          {f.severity}
                        </span>
                      </div>
                      <p className="text-slate-800 leading-relaxed">{f.description}</p>
                      {f.ruleOrCheck && (
                        <div className="text-[10px] text-amber-800 font-mono mt-1 pt-1 border-t border-amber-200/60">
                          Citation: {f.ruleOrCheck}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          {!uploadResult ? (
            <>
              <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={loading}
                disabled={!selectedFile}
                onClick={handleUpload}
                icon={<Upload size={13} />}
              >
                Extract Text &amp; Verify Document
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={handleReset}>
                Upload Another Document
              </Button>
              <Button variant="primary" size="sm" onClick={onClose} icon={<Eye size={13} />}>
                View In Evidence Dossier
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
