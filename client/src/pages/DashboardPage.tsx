import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

interface Tournament {
  id: number;
  name: string;
  status: string;
  gtd: number;
  buyin_amount: number;
  created_at: string;
}

export default function DashboardPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Tournament[]>('/tournaments').then(setTournaments).finally(() => setLoading(false));
  }, []);

  const statusColors: Record<string, string> = {
    registration: 'bg-blue-500/20 text-blue-400',
    running: 'bg-green-500/20 text-green-400',
    paused: 'bg-yellow-500/20 text-yellow-400',
    finished: 'bg-gray-500/20 text-gray-400',
  };

  const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Tournaments</h1>
        <Link
          to="/tournaments/new"
          className="bg-[var(--casino-gold)] text-[var(--casino-dark)] px-4 py-2 rounded-lg font-semibold hover:bg-[var(--casino-gold-light)] transition-colors"
        >
          + New Tournament
        </Link>
      </div>

      {tournaments.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg mb-4">No tournaments yet</p>
          <Link to="/tournaments/new" className="text-[var(--casino-gold)] hover:underline">
            Create your first tournament
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tournaments.map(t => (
            <Link
              key={t.id}
              to={t.status === 'registration' ? `/tournaments/${t.id}/lobby` :
                  t.status === 'finished' ? `/tournaments/${t.id}/lobby` :
                  `/tournaments/${t.id}/live`}
              className="bg-[var(--casino-green)] rounded-xl p-5 border border-[var(--casino-gold)]/10 hover:border-[var(--casino-gold)]/30 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-white group-hover:text-[var(--casino-gold)] transition-colors">
                  {t.name}
                </h3>
                <span className={`text-xs px-2 py-1 rounded-full ${statusColors[t.status] || ''}`}>
                  {t.status}
                </span>
              </div>
              <div className="text-sm text-gray-400 space-y-1">
                <div>Buy-in: {formatMoney(t.buyin_amount)}</div>
                {t.gtd > 0 && <div>GTD: {formatMoney(t.gtd)}</div>}
                <div className="text-xs text-gray-500">{new Date(t.created_at).toLocaleDateString()}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
