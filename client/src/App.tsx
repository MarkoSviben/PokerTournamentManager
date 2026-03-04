import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Header from './components/layout/Header';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import BlindStructuresPage from './pages/BlindStructuresPage';
import PlayersPage from './pages/PlayersPage';
import CreateTournamentPage from './pages/CreateTournamentPage';
import TournamentLobbyPage from './pages/TournamentLobbyPage';
import LiveTournamentPage from './pages/LiveTournamentPage';

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--casino-dark)]">
      <Header />
      <main>{children}</main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>} />
          <Route path="/blind-structures" element={<ProtectedRoute><AppLayout><BlindStructuresPage /></AppLayout></ProtectedRoute>} />
          <Route path="/players" element={<ProtectedRoute><AppLayout><PlayersPage /></AppLayout></ProtectedRoute>} />
          <Route path="/tournaments/new" element={<ProtectedRoute><AppLayout><CreateTournamentPage /></AppLayout></ProtectedRoute>} />
          <Route path="/tournaments/:id/lobby" element={<ProtectedRoute><AppLayout><TournamentLobbyPage /></AppLayout></ProtectedRoute>} />
          <Route path="/tournaments/:id/live" element={<ProtectedRoute><AppLayout><LiveTournamentPage /></AppLayout></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
