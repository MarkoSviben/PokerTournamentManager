import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await register(email, username, password, displayName);
      } else {
        await login(username, password);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--casino-dark)] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[var(--casino-gold)] tracking-wider mb-2">
            Poker Tournament
          </h1>
          <p className="text-[var(--casino-gold)]/70 text-lg">Manager</p>
        </div>

        <div className="bg-[var(--casino-green)] rounded-xl p-8 border border-[var(--casino-gold)]/20 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6 text-center">
            {isRegister ? 'Create Account' : 'Sign In'}
          </h2>

          {error && (
            <div className="bg-[var(--casino-red)]/20 border border-[var(--casino-red)]/50 text-[var(--casino-red)] px-4 py-2 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-[var(--casino-dark)] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-[var(--casino-gold)] focus:outline-none transition-colors"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-400 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-[var(--casino-dark)] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-[var(--casino-gold)] focus:outline-none transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-[var(--casino-dark)] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-[var(--casino-gold)] focus:outline-none transition-colors"
                required
              />
            </div>

            {isRegister && (
              <div>
                <label className="block text-sm text-gray-400 mb-1">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full bg-[var(--casino-dark)] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-[var(--casino-gold)] focus:outline-none transition-colors"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--casino-gold)] text-[var(--casino-dark)] font-semibold py-2.5 rounded-lg hover:bg-[var(--casino-gold-light)] transition-colors disabled:opacity-50"
            >
              {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => { setIsRegister(!isRegister); setError(''); }}
              className="text-sm text-gray-400 hover:text-[var(--casino-gold)] transition-colors"
            >
              {isRegister ? 'Already have an account? Sign In' : 'Need an account? Register'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
