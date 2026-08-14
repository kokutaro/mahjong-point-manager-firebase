import { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useAuth } from './contexts/useAuth';

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
const CompetitionSeriesListPage = lazy(() =>
  import('./pages/CompetitionSeriesListPage').then((module) => ({
    default: module.CompetitionSeriesListPage,
  })),
);
const CompetitionSeriesNewPage = lazy(() =>
  import('./pages/CompetitionSeriesNewPage').then((module) => ({
    default: module.CompetitionSeriesNewPage,
  })),
);
const CompetitionSeriesDashboardPage = lazy(() =>
  import('./pages/CompetitionSeriesDashboardPage').then((module) => ({
    default: module.CompetitionSeriesDashboardPage,
  })),
);
const CompetitionSeriesReportPage = lazy(() =>
  import('./pages/CompetitionSeriesReportPage').then((module) => ({
    default: module.CompetitionSeriesReportPage,
  })),
);
const CompetitionSeriesJoinPage = lazy(() =>
  import('./pages/CompetitionSeriesJoinPage').then((module) => ({
    default: module.CompetitionSeriesJoinPage,
  })),
);
const AnalysisListPage = lazy(() =>
  import('./pages/AnalysisListPage').then((module) => ({ default: module.AnalysisListPage })),
);
const UserSettingsPage = lazy(() =>
  import('./pages/UserSettingsPage').then((module) => ({ default: module.UserSettingsPage })),
);

function App() {
  const { authReady } = useAuth();

  if (!authReady) return <TopPageSkeleton />;

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
            path="/analysis"
            element={
              <Suspense fallback={<div style={{ padding: 20 }}>Loading Analysis...</div>}>
                <AnalysisListPage />
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
            path="/competition-series"
            element={
              <Suspense fallback={<div>Loading...</div>}>
                <CompetitionSeriesListPage />
              </Suspense>
            }
          />
          <Route
            path="/competition-series/new"
            element={
              <Suspense fallback={<div>Loading...</div>}>
                <CompetitionSeriesNewPage />
              </Suspense>
            }
          />
          <Route
            path="/competition-series/:seriesId"
            element={
              <Suspense fallback={<div>Loading...</div>}>
                <CompetitionSeriesDashboardPage />
              </Suspense>
            }
          />
          <Route
            path="/competition-series/:seriesId/report"
            element={
              <Suspense fallback={<div>Loading...</div>}>
                <CompetitionSeriesReportPage />
              </Suspense>
            }
          />
          <Route
            path="/competition-series/:seriesId/join"
            element={
              <Suspense fallback={<div>Loading...</div>}>
                <CompetitionSeriesJoinPage />
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
