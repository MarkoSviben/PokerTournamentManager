import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

interface AdminUser {
  id: number;
  email: string;
  username: string;
  display_name: string;
  created_at: string;
}

export default function AdminPage() {
  const { admin } = useAuth();
  const navigate = useNavigate();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Reset password state
  const [resetId, setResetId] = useState<number | null>(null);
  const [resetPassword, setResetPassword] = useState('');

  // Only super admin (id=1) can access
  useEffect(() => {
    if (admin && admin.id !== 1) {
      navigate('/');
    }
  }, [admin, navigate]);

  const loadAdmins = async () => {
    try {
      const data = await api.get<AdminUser[]>('/admin/admins');
      setAdmins(data);
    } catch {
      navigate('/');
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const createAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.post('/admin/admins', { email, username, password, displayName });
      setShowForm(false);
      setEmail('');
      setUsername('');
      setPassword('');
      setDisplayName('');
      setSuccess('Admin created successfully');
      loadAdmins();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteAdmin = async (id: number, name: string) => {
    if (!confirm(`Delete admin "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/admins/${id}`);
      setSuccess(`Admin "${name}" deleted`);
      loadAdmins();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const doResetPassword = async () => {
    if (!resetId || !resetPassword) return;
    try {
      await api.put(`/admin/admins/${resetId}/password`, { password: resetPassword });
      setResetId(null);
      setResetPassword('');
      setSuccess('Password reset successfully');
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (admin?.id !== 1) return null;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Admin Management</h1>
        <button
          onClick={() => { setShowForm(!showForm); setError(''); }}
          className="bg-[var(--casino-gold)] text-[var(--casino-dark)] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[var(--casino-gold-light)] transition-colors"
        >
          {showForm ? 'Cancel' : '+ New Admin'}
        </button>
      </div>

      {error && (
        <div className="bg-[var(--casino-red)]/20 border border-[var(--casino-red)]/50 text-[var(--casino-red)] px-4 py-2 rounded mb-4 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500/20 border border-green-500/50 text-green-400 px-4 py-2 rounded mb-4 text-sm">
          {success}
        </div>
      )}

      {/* Create admin form */}
      {showForm && (
        <div className="bg-[var(--casino-green)] rounded-xl p-6 border border-[var(--casino-gold)]/20 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Create New Admin</h2>
          <form onSubmit={createAdmin} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-[var(--casino-dark)] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-[var(--casino-gold)] focus:outline-none text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-[var(--casino-dark)] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-[var(--casino-gold)] focus:outline-none text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-[var(--casino-dark)] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-[var(--casino-gold)] focus:outline-none text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full bg-[var(--casino-dark)] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-[var(--casino-gold)] focus:outline-none text-sm"
                required
              />
            </div>
            <div className="col-span-2">
              <button
                type="submit"
                className="bg-[var(--casino-gold)] text-[var(--casino-dark)] px-6 py-2 rounded-lg text-sm font-semibold hover:bg-[var(--casino-gold-light)] transition-colors"
              >
                Create Admin
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Admins table */}
      <div className="bg-[var(--casino-green)] rounded-xl border border-[var(--casino-gold)]/20 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-xs text-gray-500 uppercase border-b border-[var(--casino-gold)]/20">
              <th className="text-left px-4 py-3">ID</th>
              <th className="text-left px-4 py-3">Username</th>
              <th className="text-left px-4 py-3">Display Name</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map(a => (
              <tr key={a.id} className="border-t border-gray-700/30 hover:bg-white/5">
                <td className="px-4 py-3 text-gray-400 text-sm font-mono">{a.id}</td>
                <td className="px-4 py-3 text-white text-sm font-medium">
                  {a.username}
                  {a.id === 1 && <span className="ml-2 text-xs text-[var(--casino-gold)] bg-[var(--casino-gold)]/10 px-1.5 py-0.5 rounded">Super</span>}
                </td>
                <td className="px-4 py-3 text-white text-sm">{a.display_name}</td>
                <td className="px-4 py-3 text-gray-400 text-sm">{a.email}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => { setResetId(a.id); setResetPassword(''); setError(''); }}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Reset Password
                    </button>
                    {a.id !== 1 && (
                      <button
                        onClick={() => deleteAdmin(a.id, a.username)}
                        className="text-xs text-[var(--casino-red)] hover:text-red-400"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reset password modal */}
      {resetId !== null && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setResetId(null)}>
          <div className="bg-[var(--casino-green)] rounded-xl p-6 max-w-sm w-full border border-[var(--casino-gold)]/30" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">Reset Password</h3>
            <p className="text-gray-400 text-sm mb-3">
              Admin: <span className="text-white">{admins.find(a => a.id === resetId)?.username}</span>
            </p>
            <input
              type="password"
              value={resetPassword}
              onChange={e => setResetPassword(e.target.value)}
              placeholder="New password"
              className="w-full bg-[var(--casino-dark)] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-[var(--casino-gold)] focus:outline-none text-sm mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={doResetPassword}
                disabled={!resetPassword}
                className="flex-1 bg-[var(--casino-gold)] text-[var(--casino-dark)] py-2 rounded-lg font-semibold hover:bg-[var(--casino-gold-light)] disabled:opacity-40"
              >
                Reset
              </button>
              <button
                onClick={() => setResetId(null)}
                className="flex-1 bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
