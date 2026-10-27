import React, { useState } from 'react';
import type { Submission } from '../../types';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Send,
  X,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '../ui/Button';

interface ConsequentialActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionType: 'approve' | 'reject' | 'escalate' | 'request-evidence' | null;
  submission: Submission;
  onConfirm: (notes: string) => Promise<void>;
  loading: boolean;
  errorMessage?: string | null;
}

export const ConsequentialActionModal: React.FC<ConsequentialActionModalProps> = ({
  isOpen,
  onClose,
  actionType,
  submission,
  onConfirm,
  loading,
  errorMessage,
}) => {
  const [notes, setNotes] = useState('');

  if (!isOpen || !actionType) return null;

  const criticalFindings = submission.findings.filter((f) => f.severity === 'critical');
  const hasCriticals = criticalFindings.length > 0;

  const getActionConfig = () => {
    switch (actionType) {
      case 'approve':
        return {
          title: 'Confirm Application Approval',
          badgeText: 'Consequential Decision',
          icon: <CheckCircle2 size={20} className="text-emerald-600" />,
          headerBg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
          confirmText: 'Confirm & Ratify Approval',
          confirmVariant: 'primary' as const,
          defaultNotes: 'Recommended for Council ratification: All statutory norms cleared.',
          description:
            'You are recording an official approval recommendation for this application. Once ratified, an Extension of Approval or Letter of Approval is drafted.',
        };
      case 'reject':
        return {
          title: 'Confirm Application Rejection',
          badgeText: 'Consequential Decision',
          icon: <XCircle size={20} className="text-red-600" />,
          headerBg: 'bg-red-50 border-red-200 text-red-900',
          confirmText: 'Confirm & Issue Rejection Order',
          confirmVariant: 'danger' as const,
          defaultNotes: hasCriticals
            ? `Rejected due to critical statutory deficiency: ${criticalFindings[0].description}`
            : 'Rejected due to unresolved regulatory non-compliance.',
          description:
            'Rejection formally issues a speaking order with cited AICTE Approval Process Handbook (APH) clauses. The institution will have 10 days to file an appeal.',
        };
      case 'escalate':
        return {
          title: 'Escalate to Hearing Committee',
          badgeText: 'Regulatory Scrutiny',
          icon: <AlertTriangle size={20} className="text-amber-600" />,
          headerBg: 'bg-amber-50 border-amber-200 text-amber-900',
          confirmText: 'Confirm & Escalate Case',
          confirmVariant: 'warning' as const,
          defaultNotes: 'Referred to Senior Hearing Committee for in-person scrutiny of disputed records.',
          description:
            'Escalation forwards this application to the Standing Hearing Committee (SHC) for examination and oral hearing.',
        };
      case 'request-evidence':
        return {
          title: 'Request Additional Documentary Clarification',
          badgeText: 'Inquiry Notice',
          icon: <Send size={20} className="text-blue-600" />,
          headerBg: 'bg-blue-50 border-blue-200 text-blue-900',
          confirmText: 'Dispatch Clarification Notice',
          confirmVariant: 'primary' as const,
          defaultNotes: 'Applicant requested to furnish certified documentary proof within 5 working days.',
          description:
            'Dispatches a formal inquiry notice to the applicant institution. The application status will transition to "On Hold" pending receipt.',
        };
    }
  };

  const config = getActionConfig();

  const handleConfirm = async () => {
    await onConfirm(notes || config.defaultNotes);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${config.headerBg}`}>
          <div className="flex items-center gap-3">
            {config.icon}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                {config.badgeText}
              </span>
              <h3 className="text-base font-bold leading-tight">{config.title}</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/5 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-4 text-xs text-slate-700">
          <div>
            <div className="font-semibold text-slate-900 text-sm mb-0.5">
              {submission.institution.name}
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              App ID: {submission.applicationId} · {submission.category}
            </div>
          </div>

          <p className="leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-600">
            {config.description}
          </p>

          {/* Critical findings prohibition warning for approval */}
          {actionType === 'approve' && hasCriticals && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-900 flex items-start gap-2.5">
              <ShieldAlert size={16} className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-red-800 block mb-0.5">
                  Approval Blocked: {criticalFindings.length} Unresolved Critical Finding(s)
                </span>
                <span className="text-[11px] leading-snug block text-red-700">
                  AICTE regulatory standards prohibit approval while unresolved critical cadre or statutory findings exist. You must resolve or escalate the findings before granting clearance.
                </span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-900 flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-600 shrink-0" />
              <span className="font-medium text-xs">{errorMessage}</span>
            </div>
          )}

          {/* Rationale / Reviewer Notes Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
              Reviewer Decision Rationale / Notes (Recorded in Audit Trail)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={config.defaultNotes}
              className="w-full text-xs p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-slate-800"
            />
            <span className="text-[10px] text-slate-400">
              This reason will be stamped with your reviewer identity in the immutable audit event log.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={config.confirmVariant}
            size="sm"
            loading={loading}
            disabled={actionType === 'approve' && hasCriticals}
            onClick={handleConfirm}
          >
            {config.confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};
