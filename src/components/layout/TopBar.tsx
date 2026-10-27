import React, { useState, useRef, useEffect } from 'react';
import { FlaskConical, Bell, Database, X, CheckCheck, ExternalLink, User, Pencil, RotateCcw, Save, LogOut } from 'lucide-react';
import type { ReviewerProfile } from '../../types';
import type { NavSection } from './LeftNav';

// ─── Demo notification data ───────────────────────────────────────────────────

interface DemoNotification {
  id: string;
  title: string;
  body: string;
  relatedAppId?: string;
  relatedSubmissionId?: string;
  timestamp: string;
  read: boolean;
  type: 'critical' | 'warning' | 'info';
}

const INITIAL_NOTIFICATIONS: DemoNotification[] = [
  {
    id: 'notif-001',
    title: 'Critical finding escalated',
    body: 'Northstar Institute of Technology — Faculty doctoral cadre deficiency flagged. Human review required before approval.',
    relatedAppId: 'DEMO/2024-25/NPA/KA/001842',
    relatedSubmissionId: 'sub-001',
    timestamp: '2024-11-10T11:05:00Z',
    read: false,
    type: 'critical',
  },
  {
    id: 'notif-002',
    title: 'Lab inventory mismatch',
    body: 'Northstar Institute — Physical inspection report disputes 14 workstations. Dossier review pending.',
    relatedAppId: 'DEMO/2024-25/NPA/KA/001842',
    relatedSubmissionId: 'sub-001',
    timestamp: '2024-11-12T09:35:00Z',
    read: false,
    type: 'warning',
  },
  {
    id: 'notif-003',
    title: 'Application due date approaching',
    body: 'Heritage Polytechnic — Annual compliance submission is due in 2 days. Review workload reminder.',
    relatedAppId: 'DEMO/2024-25/ACF/MH/003301',
    relatedSubmissionId: 'sub-002',
    timestamp: '2024-11-14T08:00:00Z',
    read: true,
    type: 'info',
  },
  {
    id: 'notif-004',
    title: 'Land deed name discrepancy',
    body: 'Northstar Institute — Entity name on 1998 deed does not match 2024 application. Minor finding logged.',
    relatedAppId: 'DEMO/2024-25/NPA/KA/001842',
    relatedSubmissionId: 'sub-001',
    timestamp: '2024-11-15T16:05:00Z',
    read: true,
    type: 'warning',
  },
];

function formatNotifTime(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ─── Local profile storage ────────────────────────────────────────────────────

const PROFILE_KEY = 'aicte_verifyai_demo_profile';
interface DemoProfile { name: string; title: string }
function loadProfile(fallback: ReviewerProfile | null): DemoProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return JSON.parse(raw) as DemoProfile;
  } catch { /* ignore */ }
  return { name: fallback?.name ?? 'Review Officer', title: fallback?.role ?? 'Compliance Reviewer' };
}

// ─── Section labels ───────────────────────────────────────────────────────────

const SECTION_LABELS: Record<NavSection, string> = {
  overview: 'Overview · Control Room',
  pipeline: 'Submission Pipeline',
  'action-queue': 'Action Queue',
  'evidence-search': 'Evidence Search',
  'audit-events': 'Audit Events',
  analytics: 'Compliance Analytics',
};

interface TopBarProps {
  section: NavSection;
  reviewer: ReviewerProfile | null;
  onOpenSourcesModal?: () => void;
  onOpenReviewWorkspace?: (submissionId: string) => void;
  onLogout?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  section,
  reviewer,
  onOpenSourcesModal,
  onOpenReviewWorkspace,
  onLogout,
}) => {
  // ── notifications ──────────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState<DemoNotification[]>(INITIAL_NOTIFICATIONS);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const unread = notifications.filter((n) => !n.read).length;

  // ── profile ────────────────────────────────────────────────────────────────
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<DemoProfile>(() => loadProfile(reviewer));
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [editTitle, setEditTitle] = useState(profile.title);
  const profileRef = useRef<HTMLDivElement>(null);

  // ── demo mode popover ──────────────────────────────────────────────────────
  const [demoOpen, setDemoOpen] = useState(false);
  const demoRef = useRef<HTMLDivElement>(null);

  // Close panels on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
        setEditing(false);
      }
      if (demoRef.current && !demoRef.current.contains(e.target as Node)) setDemoOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── notification actions ───────────────────────────────────────────────────
  const markRead = (id: string) =>
    setNotifications((ns) => ns.map((n) => (n.id === id ? { ...n, read: true } : n)));
  const markAllRead = () => setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));
  const handleNotifClick = (n: DemoNotification) => {
    markRead(n.id);
    if (n.relatedSubmissionId && onOpenReviewWorkspace) {
      setNotifOpen(false);
      onOpenReviewWorkspace(n.relatedSubmissionId);
    }
  };

  // ── profile actions ────────────────────────────────────────────────────────
  const saveProfile = () => {
    const next = { name: editName.trim() || profile.name, title: editTitle.trim() || profile.title };
    setProfile(next);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    setEditing(false);
  };
  const resetProfile = () => {
    const def = { name: reviewer?.name ?? 'Review Officer', title: reviewer?.role ?? 'Compliance Reviewer' };
    setProfile(def);
    setEditName(def.name);
    setEditTitle(def.title);
    localStorage.removeItem(PROFILE_KEY);
    setEditing(false);
  };
  const startEdit = () => {
    setEditName(profile.name);
    setEditTitle(profile.title);
    setEditing(true);
  };

  const initials = profile.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  const notifTypeColor: Record<DemoNotification['type'], string> = {
    critical: '#dc2626',
    warning: '#d97706',
    info: '#2563eb',
  };

  return (
    <header
      style={{
        background: 'white',
        borderBottom: '1px solid #dde4f0',
        height: 60,
        position: 'relative',
        zIndex: 40,
      }}
      className="flex items-center justify-between px-6 py-3 shrink-0"
    >
      {/* Left */}
      <div>
        <h2 className="text-base font-semibold text-slate-800 leading-tight">
          {SECTION_LABELS[section]}
        </h2>
        <p className="text-[11px] text-slate-400 mt-0.5">
          AICTE · Technical Education Compliance
        </p>
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-3">
        {/* Data Sources button */}
        {onOpenSourcesModal && (
          <button
            type="button"
            onClick={onOpenSourcesModal}
            className="flex items-center gap-1.5 bg-[#FFF5F7] border border-[#ECD9E2] hover:bg-[#FDE8F1] hover:border-[#C14E83] text-[#351D31] rounded-full px-3 py-1 text-[11px] font-semibold transition-all shadow-xs cursor-pointer"
            title="Inspect official public reference sources and synthetic demo ethics"
          >
            <Database size={12} className="text-[#C14E83]" />
            <span>Data Sources</span>
          </button>
        )}

        {/* ── DEMO MODE button + popover ─────────────────────────────────── */}
        <div ref={demoRef} className="relative">
          <button
            type="button"
            onClick={() => setDemoOpen((v) => !v)}
            className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-full px-3 py-1 transition-all cursor-pointer"
            title="What is Demo Mode?"
          >
            <FlaskConical size={12} className="text-amber-600" />
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide">
              Prototype Data
            </span>
          </button>

          {demoOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: 340,
                background: '#fff',
                border: '1px solid #dde4f0',
                borderRadius: 12,
                boxShadow: '0 16px 40px rgba(15,22,41,0.16)',
                zIndex: 200,
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div
                style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a', padding: '12px 16px' }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <FlaskConical size={15} className="text-amber-600" />
                  <span className="text-sm font-bold text-amber-900">Demo Mode Active</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDemoOpen(false)}
                  className="text-amber-400 hover:text-amber-700 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="p-4 flex flex-col gap-3 text-xs text-slate-700">
                <p className="leading-relaxed">
                  <strong>No live AICTE backend is connected.</strong> All application submissions,
                  findings, risk scores, and reviewer actions you see are <em>synthetic demo data</em>{' '}
                  created solely for this Smart India Hackathon prototype.
                </p>
                <p className="leading-relaxed">
                  The <strong>Northstar Institute of Technology</strong> case and its documents are
                  entirely fictional. No real institution's private data, student records, or pending
                  applications are accessible here.
                </p>

                <div
                  style={{
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: 8,
                    padding: '10px 12px',
                  }}
                >
                  <div className="font-bold text-blue-800 mb-1.5 text-[11px] uppercase tracking-wider">
                    What is real
                  </div>
                  <ul className="flex flex-col gap-1 text-slate-700 leading-relaxed">
                    <li>✓ AICTE Approval Process Handbook (APH) 2024–2027 rule citations</li>
                    <li>✓ Public college directory entries (PSG Tech, COEP, DTU, etc.)</li>
                    <li>✓ Official source URLs in the Data Sources panel</li>
                  </ul>
                </div>

                {onOpenSourcesModal && (
                  <button
                    type="button"
                    onClick={() => { setDemoOpen(false); onOpenSourcesModal(); }}
                    className="flex items-center gap-1.5 text-blue-700 hover:text-blue-900 font-semibold text-xs transition-colors"
                  >
                    <ExternalLink size={12} />
                    <span>View Data Sources &amp; Provenance</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Notification bell + panel ──────────────────────────────────── */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => { setNotifOpen((v) => !v); setProfileOpen(false); setDemoOpen(false); }}
            className="relative w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
            title={`${unread} unread simulated notifications`}
          >
            <Bell size={14} />
            {unread > 0 && (
              <span
                className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#C14E83] text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none"
              >
                {unread}
              </span>
            )}
          </button>

          {notifOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: 380,
                background: '#fff',
                border: '1px solid #dde4f0',
                borderRadius: 12,
                boxShadow: '0 16px 40px rgba(15,22,41,0.16)',
                zIndex: 200,
                overflow: 'hidden',
                maxHeight: 480,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Panel header */}
              <div
                style={{
                  background: 'linear-gradient(135deg,#0f1629,#1e2d4f)',
                  padding: '12px 16px',
                  borderBottom: '1px solid #1e2d4f',
                }}
                className="flex items-center justify-between shrink-0"
              >
                <div className="flex items-center gap-2">
                  <Bell size={14} className="text-blue-300" />
                  <span className="text-sm font-bold text-white">Notifications</span>
                  {unread > 0 && (
                    <span className="text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded-full">
                      {unread} unread
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unread > 0 && (
                    <button
                      type="button"
                      onClick={markAllRead}
                      className="text-[11px] text-blue-300 hover:text-white font-semibold flex items-center gap-1 transition-colors"
                      title="Mark all as read"
                    >
                      <CheckCheck size={12} />
                      All read
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setNotifOpen(false)}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Simulated-data notice */}
              <div
                className="px-4 py-2 flex items-center gap-1.5 shrink-0"
                style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a' }}
              >
                <FlaskConical size={11} className="text-amber-600 shrink-0" />
                <span className="text-[10.5px] text-amber-800 font-medium">
                  Simulated notifications · No live backend connected
                </span>
              </div>

              {/* Notification list */}
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">No notifications</div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleNotifClick(n)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        display: 'block',
                        padding: '12px 16px',
                        borderBottom: '1px solid #f1f5f9',
                        background: n.read ? '#fff' : '#f0f6ff',
                        cursor: 'pointer',
                        transition: 'background 0.1s',
                      }}
                      className="hover:bg-slate-50"
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: n.read ? 'transparent' : notifTypeColor[n.type],
                            border: n.read ? '1.5px solid #cbd5e1' : `2px solid ${notifTypeColor[n.type]}`,
                            marginTop: 4,
                            flexShrink: 0,
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span
                              className="text-xs font-bold leading-tight truncate"
                              style={{ color: n.read ? '#475569' : '#1e293b' }}
                            >
                              {n.title}
                            </span>
                            <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                              {formatNotifTime(n.timestamp)}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                            {n.body}
                          </p>
                          {n.relatedSubmissionId && (
                            <span className="text-[10px] text-blue-600 font-semibold mt-0.5 block">
                              {n.relatedAppId} · Click to open dossier →
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Reviewer profile button + panel ───────────────────────────── */}
        {reviewer && (
          <div ref={profileRef} className="relative">
            <button
              type="button"
              onClick={() => { setProfileOpen((v) => !v); setNotifOpen(false); setDemoOpen(false); }}
              className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-lg pl-1.5 pr-3 py-1.5 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold"
                style={{ background: 'linear-gradient(135deg, #8A2F5B, #C14E83)' }}
              >
                {initials}
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold text-slate-700 leading-tight">
                  {profile.name.split(' ')[0]}
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  {profile.title.split(' ')[0]}
                </div>
              </div>
            </button>

            {profileOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: 300,
                  background: '#fff',
                  border: '1px solid #dde4f0',
                  borderRadius: 12,
                  boxShadow: '0 16px 40px rgba(15,22,41,0.16)',
                  zIndex: 200,
                  overflow: 'hidden',
                }}
              >
                {/* Profile header */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #1A0D18 0%, #351D31 60%, #55223F 100%)',
                    padding: '14px 16px',
                    borderBottom: '1px solid #55223F',
                  }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: 'linear-gradient(135deg, #8A2F5B, #C14E83)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 700, fontSize: 14,
                        boxShadow: '0 2px 8px rgba(193, 78, 131, 0.4)',
                      }}
                    >
                      {initials}
                    </div>
                    <div>
                      <div className="text-white font-bold text-sm leading-tight">{profile.name}</div>
                      <div className="text-[#F8E5ED] text-[11px]">{profile.title}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setProfileOpen(false); setEditing(false); }}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="p-4 flex flex-col gap-3">
                  {/* Demo notice */}
                  <div
                    style={{
                      background: '#fffbeb', border: '1px solid #fde68a',
                      borderRadius: 8, padding: '8px 12px',
                      display: 'flex', gap: 6, alignItems: 'flex-start',
                    }}
                  >
                    <FlaskConical size={11} className="text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-[10.5px] text-amber-800 leading-relaxed">
                      Demo profile only — stored locally in your browser. Not connected to real
                      AICTE authentication or account management.
                    </p>
                  </div>

                  {!editing ? (
                    <>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Display Name</label>
                        <div className="text-sm font-semibold text-slate-800">{profile.name}</div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Job Title</label>
                        <div className="text-sm text-slate-600">{profile.title}</div>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          type="button"
                          onClick={startEdit}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold transition-colors cursor-pointer"
                          style={{ background: 'linear-gradient(135deg, #8A2F5B, #C14E83)' }}
                        >
                          <Pencil size={12} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={resetProfile}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors"
                          title="Reset to default demo profile"
                        >
                          <RotateCcw size={12} /> Reset
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Display Name</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          maxLength={60}
                          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:border-[#C14E83] focus:ring-1 focus:ring-[#ECD9E2]"
                          placeholder="Your name"
                          autoFocus
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Job Title</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          maxLength={80}
                          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:border-[#C14E83] focus:ring-1 focus:ring-[#ECD9E2]"
                          placeholder="Your role"
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          type="button"
                          onClick={saveProfile}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                        >
                          <Save size={12} /> Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(false)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  )}

                  {onLogout && (
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors"
                      >
                        <LogOut size={13} />
                        Sign Out
                      </button>
                    </div>
                  )}

                  {/* User icon details */}
                  <div
                    style={{
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: 10,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      color: '#94a3b8',
                    }}
                  >
                    <User size={12} />
                    <span className="text-[10.5px] text-slate-400">
                      AICTE VerifyAI · Institutional Reviewer Workspace
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
