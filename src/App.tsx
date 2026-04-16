import { signInAnonymously } from 'firebase/auth';
import { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useSnackbar } from './contexts/SnackbarContext';
import { auth } from './services/firebase';

import { DashboardSkeleton } from './components/skeletons/DashboardSkeleton';
import { HistorySkeleton } from './components/skeletons/HistorySkeleton';
import { TopPageSkeleton } from './components/skeletons/TopPageSkeleton';

const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })),
);
const HistoryPage = lazy(() =>
  import('./pages/HistoryPage').then((module) => ({ default: module.HistoryPage })),
);
const MatchPage = lazy(() =>
  import('./pages/MatchPage').then((module) => ({ default: module.MatchPage })),
);
const SessionDetailPage = lazy(() =>
  import('./pages/SessionDetailPage').then((module) => ({ default: module.SessionDetailPage })),
);
const TopPage = lazy(() =>
  import('./pages/TopPage').then((module) => ({ default: module.TopPage })),
);
const CompetitionsPage = lazy(() =>
  import('./pages/CompetitionsPage').then((module) => ({ default: module.CompetitionsPage })),
);
const CompetitionNewPage = lazy(() =>
  import('./pages/CompetitionNewPage').then((module) => ({ default: module.CompetitionNewPage })),
);
const CompetitionDashboardPage = lazy(() =>
  import('./pages/CompetitionDashboardPage').then((module) => ({
    default: module.CompetitionDashboardPage,
  })),
);
const CompetitionJoinPage = lazy(() =>
  import('./pages/CompetitionJoinPage').then((module) => ({
    default: module.CompetitionJoinPage,
  })),
);
const CompetitionTablePage = lazy(() =>
  import('./pages/CompetitionTablePage').then((module) => ({
    default: module.CompetitionTablePage,
  })),
);
const CompetitionLivePage = lazy(() =>
  import('./pages/CompetitionLivePage').then((module) => ({
    default: module.CompetitionLivePage,
  })),
);
const CompetitionReportPage = lazy(() =>
  import('./pages/CompetitionReportPage').then((module) => ({
    default: module.CompetitionReportPage,
  })),
);
const UserSettingsPage = lazy(() =>
  import('./pages/UserSettingsPage').then((module) => ({ default: module.UserSettingsPage })),
);

function App() {
  const [init, setInit] = useState(false);
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setInit(true);
      } else {
        signInAnonymously(auth)
          .then(() => {
            // init state will be handled by the next onAuthStateChanged emission
          })
          .catch((error) => {
            console.error('Auth failed', error);
            showSnackbar('認証に失敗しました。リロードしてください。', { position: 'top' });
            setInit(true);
          });
      }
    });

    return () => unsubscribe();
  }, [showSnackbar]);

  if (!init) return <TopPageSkeleton />;

  return (
    <BrowserRouter>
      <div style={{ paddingBottom: '50px' }}>
        <Routes>
          <Route
            path="/"
            element={
              <Suspense fallback={<TopPageSkeleton />}>
                <TopPage />
              </Suspense>
            }
          />
          <Route
            path="/room/:roomId"
            element={
              <Suspense fallback={<div style={{ padding: 20 }}>Loading Room...</div>}>
                <MatchPage />
              </Suspense>
            }
          />
          <Route
            path="/history"
            element={
              <Suspense fallback={<HistorySkeleton />}>
                <HistoryPage />
              </Suspense>
            }
          />
          <Route
            path="/history/:roomId"
            element={
              <Suspense fallback={<div style={{ padding: 20 }}>Loading Session...</div>}>
                <SessionDetailPage />
              </Suspense>
            }
          />
          <Route
            path="/dashboard"
            element={
              <Suspense fallback={<DashboardSkeleton />}>
                <DashboardPage />
              </Suspense>
            }
          />
          <Route
            path="/competitions"
            element={
              <Suspense fallback={<div style={{ padding: 20 }}>Loading...</div>}>
                <CompetitionsPage />
              </Suspense>
            }
          />
          <Route
            path="/competitions/new"
            element={
              <Suspense fallback={<div style={{ padding: 20 }}>Loading...</div>}>
                <CompetitionNewPage />
              </Suspense>
            }
          />
          <Route
            path="/competitions/:id"
            element={
              <Suspense fallback={<div style={{ padding: 20 }}>Loading...</div>}>
                <CompetitionDashboardPage />
              </Suspense>
            }
          />
          <Route
            path="/competitions/:id/join"
            element={
              <Suspense fallback={<div style={{ padding: 20 }}>Loading...</div>}>
                <CompetitionJoinPage />
              </Suspense>
            }
          />
          <Route
            path="/competitions/:id/tables/:tableId"
            element={
              <Suspense fallback={<div style={{ padding: 20 }}>Loading...</div>}>
                <CompetitionTablePage />
              </Suspense>
            }
          />
          <Route
            path="/competitions/:id/live"
            element={
              <Suspense fallback={<div style={{ padding: 20 }}>Loading...</div>}>
                <CompetitionLivePage />
              </Suspense>
            }
          />
          <Route
            path="/competitions/:id/report"
            element={
              <Suspense fallback={<div style={{ padding: 20 }}>Loading...</div>}>
                <CompetitionReportPage />
              </Suspense>
            }
          />
          <Route
            path="/settings"
            element={
              <Suspense fallback={<div style={{ padding: 20 }}>Loading...</div>}>
                <UserSettingsPage />
              </Suspense>
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
