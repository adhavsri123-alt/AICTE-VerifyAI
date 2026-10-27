import { useEffect, useState } from 'react';
import { LeftNav, type NavSection } from './components/layout/LeftNav';
import { TopBar } from './components/layout/TopBar';
import { OverviewPage } from './pages/OverviewPage';
import { PipelinePage } from './pages/PipelinePage';
import { ActionQueuePage } from './pages/ActionQueuePage';
import { EvidenceSearchPage } from './pages/EvidenceSearchPage';
import { AuditEventsPage } from './pages/AuditEventsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import {
  fetchAuthMe,
  logoutReviewer,
  fetchSystemHealth,
  fetchSubmissions,
} from './services/api';
import type { ReviewerProfile } from './types';
import { ApplicationReviewWorkspacePage } from './pages/ApplicationReviewWorkspacePage';
import { DataSourcesModal } from './components/common/DataSourcesModal';
import { LoginScreen } from './components/welcome/LoginScreen';
import { ShieldCheck, Loader2 } from 'lucide-react';

function App() {
  const [section, setSection] = useState<NavSection>('overview');
  const [reviewer, setReviewer] = useState<ReviewerProfile | null>(null);
  const [reviewingSubmissionId, setReviewingSubmissionId] = useState<string | null>(null);
  const [isSourcesModalOpen, setIsSourcesModalOpen] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [escalatedCount, setEscalatedCount] = useState(0);

  // Authentication state:
  // null = verifying active session cookie on mount
  // false = unauthenticated, show LoginScreen
  // true = authenticated, show workspace
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Check active session on load
  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      try {
        const activeReviewer = await fetchAuthMe();
        if (!isMounted) return;
        if (activeReviewer) {
          setReviewer(activeReviewer);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        if (isMounted) setIsAuthenticated(false);
      }
    }

    checkSession();

    // Check backend health
    fetchSystemHealth()
      .then((h) => {
        if (isMounted) setBackendOnline(h.status === 'healthy');
      })
      .catch(() => {
        if (isMounted) setBackendOnline(false);
      });

    // Get live submission counts
    fetchSubmissions()
      .then((res) => {
        if (!isMounted) return;
        const items = res.items;
        setPendingCount(
          items.filter(
            (s) => s.status === 'pending_review' || s.status === 'under_review'
          ).length
        );
        setEscalatedCount(items.filter((s) => s.status === 'escalated').length);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const handleAuthenticated = (authenticatedReviewer: ReviewerProfile) => {
    setReviewer(authenticatedReviewer);
    setIsAuthenticated(true);

    // Refresh live status & counts
    fetchSystemHealth()
      .then((h) => setBackendOnline(h.status === 'healthy'))
      .catch(() => setBackendOnline(false));

    fetchSubmissions()
      .then((res) => {
        const items = res.items;
        setPendingCount(
          items.filter(
            (s) => s.status === 'pending_review' || s.status === 'under_review'
          ).length
        );
        setEscalatedCount(items.filter((s) => s.status === 'escalated').length);
      })
      .catch(() => {});
  };

  const handleLogout = async () => {
    await logoutReviewer();
    setReviewer(null);
    setIsAuthenticated(false);
    setReviewingSubmissionId(null);
    setSection('overview');
  };

  const handleNavigate = (newSection: NavSection) => {
    setSection(newSection);
    setReviewingSubmissionId(null);
  };

  const handleStatusUpdated = () => {
    // Refresh counts after a status change
    fetchSubmissions()
      .then((res) => {
        const items = res.items;
        setPendingCount(
          items.filter(
            (s) => s.status === 'pending_review' || s.status === 'under_review'
          ).length
        );
        setEscalatedCount(items.filter((s) => s.status === 'escalated').length);
      })
      .catch(() => {});
  };

  // ── Session verification loader (no screen flicker) ──────────────────────────
  if (isAuthenticated === null) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #FFF5F7 0%, #FFF0F4 60%, #FDF2F8 100%)',
          color: '#351D31',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #8A2F5B 0%, #C14E83 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(193,78,131,0.25)',
            marginBottom: 16,
          }}
        >
          <ShieldCheck size={28} color="#fff" strokeWidth={1.8} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#351D31', letterSpacing: '-0.01em' }}>
          VerifyAI Reviewer Workspace
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#896F81', marginTop: 8 }}>
          <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Verifying credentials…</span>
        </div>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  // ── Unauthenticated state ────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return <LoginScreen onAuthenticated={handleAuthenticated} />;
  }

  // ── Protected workspace ──────────────────────────────────────────────────────
  const renderPage = () => {
    if (reviewingSubmissionId) {
      return (
        <ApplicationReviewWorkspacePage
          submissionId={reviewingSubmissionId}
          onBack={() => setReviewingSubmissionId(null)}
          onStatusUpdated={handleStatusUpdated}
        />
      );
    }

    switch (section) {
      case 'overview':
        return (
          <OverviewPage
            onOpenReviewWorkspace={setReviewingSubmissionId}
            onNavigate={handleNavigate}
          />
        );
      case 'pipeline':
        return <PipelinePage onOpenReviewWorkspace={setReviewingSubmissionId} />;
      case 'action-queue':
        return <ActionQueuePage onOpenReviewWorkspace={setReviewingSubmissionId} />;
      case 'evidence-search':
        return <EvidenceSearchPage onOpenReviewWorkspace={setReviewingSubmissionId} />;
      case 'audit-events':
        return <AuditEventsPage />;
      case 'analytics':
        return <AnalyticsPage />;
      default:
        return (
          <OverviewPage
            onOpenReviewWorkspace={setReviewingSubmissionId}
            onNavigate={handleNavigate}
          />
        );
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-pale-blush, #FFF5F7)' }}>
      <LeftNav
        activeSection={section}
        onNavigate={handleNavigate}
        pendingCount={pendingCount}
        escalatedCount={escalatedCount}
        backendOnline={backendOnline}
        onLogout={handleLogout}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar
          section={section}
          reviewer={reviewer}
          onOpenSourcesModal={() => setIsSourcesModalOpen(true)}
          onOpenReviewWorkspace={setReviewingSubmissionId}
          onLogout={handleLogout}
        />
        {renderPage()}
      </div>

      <DataSourcesModal
        isOpen={isSourcesModalOpen}
        onClose={() => setIsSourcesModalOpen(false)}
      />
    </div>
  );
}

export default App;
