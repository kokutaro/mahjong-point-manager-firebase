import { signInAnonymously } from 'firebase/auth';
import { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useSnackbar } from './contexts/SnackbarContext';
import { auth } from './services/firebase';

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

function App() {
  const [init, setInit] = useState(false);
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    signInAnonymously(auth)
      .then(() => {
        setInit(true);
      })
      .catch((error) => {
        console.error('Auth failed', error);
        showSnackbar('認証に失敗しました。リロードしてください。', { position: 'top' });
        setInit(true);
      });
  }, [showSnackbar]);

  if (!init) return <TopPageSkeleton />;

  return (
    <BrowserRouter>
      <div style={{ paddingBottom: '50px' }}>
        <Suspense fallback={<TopPageSkeleton />}>
          <Routes>
            <Route path="/" element={<TopPage />} />
            <Route path="/room/:roomId" element={<MatchPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/history/:roomId" element={<SessionDetailPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
          </Routes>
        </Suspense>
      </div>
    </BrowserRouter>
  );
}

export default App;
