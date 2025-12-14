import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { HistoryPage } from './pages/HistoryPage';
import { MatchPage } from './pages/MatchPage';
import { SessionDetailPage } from './pages/SessionDetailPage';
import { TopPage } from './pages/TopPage';

import { signInAnonymously } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { auth } from './services/firebase';

function App() {
  const [init, setInit] = useState(false);

  useEffect(() => {
    signInAnonymously(auth)
      .then(() => {
        setInit(true);
      })
      .catch((error) => {
        console.error("Auth failed", error);
        // Ideally show error, but for now just proceed (or better, retry?)
        // If auth fails, Firestore rules will block everything anyway.
        setInit(true); 
      });
  }, []);

  if (!init) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <BrowserRouter>
      <div style={{ paddingBottom: '50px' }}>
        <Routes>
          <Route path="/" element={<TopPage />} />
          <Route path="/room/:roomId" element={<MatchPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/history/:roomId" element={<SessionDetailPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
