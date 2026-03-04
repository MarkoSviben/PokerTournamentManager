import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { admin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[var(--casino-gold)] text-xl">Loading...</div>
      </div>
    );
  }

  if (!admin) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
