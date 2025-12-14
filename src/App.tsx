import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { MatchPage } from './pages/MatchPage';
import { TopPage } from './pages/TopPage';

function App() {
  return (
    <BrowserRouter>
      <div style={{ paddingBottom: '50px' }}>
        <Routes>
          <Route path="/" element={<TopPage />} />
          <Route path="/room/:roomId" element={<MatchPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
