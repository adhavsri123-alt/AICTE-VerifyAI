import React, { useState } from 'react';
import type { ReviewerNoteEntry, AuditEvent } from '../../types';
import { formatDateTime, timeAgo } from '../../utils/helpers';
import { Button } from '../ui/Button';
import {
  MessageSquare,
  History,
  Send,
  User,
} from 'lucide-react';
import { addReviewerNote } from '../../services/api';

interface ReviewerNotesAndTimelineProps {
  submissionId: string;
  notes?: ReviewerNoteEntry[];
  auditHistory?: AuditEvent[];
  onNoteAdded?: () => void;
}

export const ReviewerNotesAndTimeline: React.FC<ReviewerNotesAndTimelineProps> = ({
  submissionId,
  notes = [],
  auditHistory = [],
  onNoteAdded,
}) => {
  const [activeTab, setActiveTab] = useState<'notes' | 'timeline'>('notes');
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState<ReviewerNoteEntry['category']>('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localNotes, setLocalNotes] = useState<ReviewerNoteEntry[]>(notes);

  // Sync if prop changes
  React.useEffect(() => {
    setLocalNotes(notes);
  }, [notes]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await addReviewerNote(submissionId, {
        author: 'Priya Venkataraman',
        role: 'Senior Compliance Reviewer',
        text: newNoteText.trim(),
        category: newNoteCategory,
      });

      setLocalNotes((prev) => [res.note, ...prev]);
      setNewNoteText('');
      onNoteAdded?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryBadge = (cat: ReviewerNoteEntry['category']) => {
    switch (cat) {
      case 'faculty':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'infrastructure':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'legal':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'inspection':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Sub-tab navigation */}
      <div className="flex border-b border-slate-200 bg-slate-50/80 px-4 pt-3">
        <button
          type="button"
          onClick={() => setActiveTab('notes')}
          className={`
            pb-3 px-4 font-semibold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer
            ${activeTab === 'notes'
              ? 'border-[#C14E83] text-[#351D31] font-bold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
            }
          `}
        >
          <MessageSquare size={14} className={activeTab === 'notes' ? 'text-[#C14E83]' : 'text-slate-400'} />
          <span>Reviewer Remarks & Notes ({localNotes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('timeline')}
          className={`
            pb-3 px-4 font-semibold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer
            ${activeTab === 'timeline'
              ? 'border-[#C14E83] text-[#351D31] font-bold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
            }
          `}
        >
          <History size={14} className={activeTab === 'timeline' ? 'text-[#C14E83]' : 'text-slate-400'} />
          <span>Chronological Activity History ({auditHistory.length})</span>
        </button>
      </div>

      <div className="p-6">
        {activeTab === 'notes' ? (
          <div className="flex flex-col gap-6">
            {/* Add note form */}
            <form onSubmit={handleAddNote} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <User size={13} className="text-[#C14E83]" />
                  Add Official Reviewer Remark
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-medium">Domain Tag:</span>
                  <select
                    value={newNoteCategory}
                    onChange={(e) => setNewNoteCategory(e.target.value as any)}
                    className="text-xs bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#C14E83]"
                  >
                    <option value="general">General Scrutiny</option>
                    <option value="faculty">Faculty Cadre</option>
                    <option value="infrastructure">Infrastructure & Labs</option>
                    <option value="legal">Legal & Title</option>
                    <option value="inspection">On-Site Inspection</option>
                  </select>
                </div>
              </div>

              <textarea
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Enter regulatory observation, clarification notes, or internal hearing remarks..."
                rows={3}
                className="w-full text-xs p-3 rounded-lg border border-slate-300 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C14E83] resize-none"
              />

              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 italic">
                  Remarks are cryptographically timestamped and committed to the SQLite audit database.
                </span>
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  loading={isSubmitting}
                  disabled={!newNoteText.trim()}
                  icon={<Send size={12} />}
                >
                  Save Note
                </Button>
              </div>
            </form>

            {/* Existing notes list */}
            <div className="flex flex-col gap-3">
              {localNotes.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No notes recorded yet for this case.
                </div>
              ) : (
                localNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{note.author}</span>
                        <span className="text-slate-500 text-[11px]">({note.role})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getCategoryBadge(note.category)}`}>
                          {note.category}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {timeAgo(note.timestamp)}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                      {note.text}
                    </p>
                    <div className="text-[10px] text-slate-400 text-right font-mono">
                      {formatDateTime(note.timestamp)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* Activity timeline */
          <div className="flex flex-col gap-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-500 flex items-center justify-between">
              <span>Chronological audit trail of all compliance verification actions.</span>
              <span className="font-mono text-[10px] text-slate-400">Prototype Demo Trail</span>
            </div>

            <div className="relative pl-6 border-l-2 border-slate-200 flex flex-col gap-5 py-2">
              {auditHistory.length === 0 ? (
                <div className="text-xs text-slate-400">No events logged yet.</div>
              ) : (
                auditHistory.map((ev) => (
                  <div key={ev.id} className="relative group">
                    {/* Timeline bullet */}
                    <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-sm flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 capitalize">
                          {ev.action.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {timeAgo(ev.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        {ev.details ?? 'System event recorded.'}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                        <span>Actor: {ev.performedBy}</span>
                        <span>·</span>
                        <span>{formatDateTime(ev.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
