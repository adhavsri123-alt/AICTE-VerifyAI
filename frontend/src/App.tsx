import { useEffect, useState } from 'react';
import { LeftNav, type NavSection } from './components/layout/LeftNav';
import { TopBar } from './components/layout/TopBar';
import { OverviewPage } from './pages/OverviewPage';
import { PipelinePage } from './pages/PipelinePage';
import { ActionQueuePage } from './pages/ActionQueuePage';
import { EvidenceSearchPage } from './pages/EvidenceSearchPage';
import { AuditEventsPage } from './pages/AuditEventsPage';
import { fetchReviewerProfile } from './services/api';
import type { ReviewerProfile } from './types';
import { mockSubmissions } from './data/mockData';
import { ApplicationReviewWorkspacePage } from './pages/ApplicationReviewWorkspacePage';
import { DataSourcesModal } from './components/common/DataSourcesModal';

function App() {
  const [section, setSection] = useState<NavSection>('overview');
  const [reviewer, setReviewer] = useState<ReviewerProfile | null>(null);
  const [reviewingSubmissionId, setReviewingSubmissionId] = useState<string | null>(null);
  const [isSourcesModalOpen, setIsSourcesModalOpen] = useState(false);

  useEffect(() => {
    fetchReviewerProfile().then(setReviewer);
  }, []);

  const handleNavigate = (newSection: NavSection) => {
    setSection(newSection);
    setReviewingSubmissionId(null);
  };

  const pendingCount = mockSubmissions.filter(
    (s) => s.status === 'pending_review' || s.status === 'under_review'
  ).length;

  const escalatedCount = mockSubmissions.filter(
    (s) => s.status === 'escalated'
  ).length;

  const renderPage = () => {
    if (reviewingSubmissionId) {
      return (
        <ApplicationReviewWorkspacePage
          submissionId={reviewingSubmissionId}
          onBack={() => setReviewingSubmissionId(null)}
          onStatusUpdated={() => {
            // Can refresh metrics/reviewer
          }}
        />
      );
    }

    switch (section) {
      case 'overview':
        return <OverviewPage onOpenReviewWorkspace={setReviewingSubmissionId} />;
      case 'pipeline':
        return <PipelinePage onOpenReviewWorkspace={setReviewingSubmissionId} />;
      case 'action-queue':
        return <ActionQueuePage onOpenReviewWorkspace={setReviewingSubmissionId} />;
      case 'evidence-search':
        return <EvidenceSearchPage onOpenReviewWorkspace={setReviewingSubmissionId} />;
      case 'audit-events':
        return <AuditEventsPage />;
      default:
        return <OverviewPage onOpenReviewWorkspace={setReviewingSubmissionId} />;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <LeftNav
        activeSection={section}
        onNavigate={handleNavigate}
        pendingCount={pendingCount}
        escalatedCount={escalatedCount}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar
          section={section}
          reviewer={reviewer}
          onOpenSourcesModal={() => setIsSourcesModalOpen(true)}
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
