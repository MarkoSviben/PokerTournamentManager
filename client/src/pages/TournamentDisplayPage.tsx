import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useTimer, formatTime } from '../hooks/useTimer';

interface Tournament {
  id: number;
  name: string;
  status: string;
  gtd: number;
  rake_percent: number;
  buyin_amount: number;
  starting_chips: number;
  rebuy_cost: number;
  addon_cost: number;
  current_level: number;
  level_started_at: string | null;
  elapsed_seconds_before_current: number;
  entries: { id: number; status: string; player_name: string }[];
  rebuys: any[];
  addons: any[];
  blindStructure: { levels: BlindLevel[] };
  payouts: { position: number; percentage: number }[];
}

interface BlindLevel {
  level_order: number;
  small_blind: number;
  big_blind: number;
  ante: number;
  duration_minutes: number;
  is_break: number;
}

export default function TournamentDisplayPage() {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [clock, setClock] = useState(new Date());

  const loadTournament = useCallback(async () => {
    const t = await api.get<Tournament>(`/tournaments/${id}`);
    setTournament(t);
  }, [id]);

  useEffect(() => {
    loadTournament();
    const interval = setInterval(loadTournament, 5000);
    return () => clearInterval(interval);
  }, [loadTournament]);

  // Update real-time clock every second
  useEffect(() => {
    const interval = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const levels = tournament?.blindStructure?.levels || [];
  const currentLevel = levels.find(l => l.level_order === tournament?.current_level);
  const nextLevel = levels.find(l => l.level_order === (tournament?.current_level || 0) + 1);

  const timer = useTimer(
    tournament?.level_started_at || null,
    tournament?.elapsed_seconds_before_current || 0,
    currentLevel?.duration_minutes || 0,
    tournament?.status || '',
    (tournament as any)?.level_elapsed_on_pause || 0
  );

  const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  if (!tournament) {
    return (
      <div className="min-h-screen bg-[var(--casino-dark)] flex items-center justify-center">
        <div className="text-[var(--casino-gold)] text-2xl">Loading...</div>
      </div>
    );
  }

  const activeEntries = tournament.entries?.filter(e => e.status === 'active') || [];
  const totalEntries = tournament.entries?.length || 0;
  const totalRebuys = tournament.rebuys?.length || 0;
  const totalAddons = tournament.addons?.length || 0;
  const totalMoney = (totalEntries * tournament.buyin_amount) + (totalRebuys * tournament.rebuy_cost) + (totalAddons * tournament.addon_cost);
  const rake = Math.floor(totalMoney * (tournament.rake_percent / 100));
  const prizePool = Math.max(tournament.gtd, totalMoney - rake);

  return (
    <div className="min-h-screen bg-[var(--casino-dark)] flex flex-col">
      {/* Top bar */}
      <div className="bg-[var(--casino-green)] border-b border-[var(--casino-gold)]/30 px-6 py-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--casino-gold)] tracking-wider">{tournament.name}</h1>
        <div className="text-xl font-mono text-white">
          {clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Status badge */}
        {tournament.status === 'paused' && (
          <div className="text-3xl font-bold text-yellow-400 mb-4 animate-pulse">PAUSED</div>
        )}
        {tournament.status === 'finished' && (
          <div className="text-3xl font-bold text-gray-400 mb-4">FINISHED</div>
        )}

        {/* Break or Level info */}
        {currentLevel?.is_break ? (
          <div className="text-5xl font-bold text-[var(--casino-gold)] mb-6">BREAK</div>
        ) : (
          <div className="text-center mb-4">
            <div className="text-xl text-gray-400 mb-2">Level {tournament.current_level}</div>
            <div className="text-5xl md:text-7xl font-bold text-white mb-2">
              {currentLevel ? `${currentLevel.small_blind.toLocaleString()} / ${currentLevel.big_blind.toLocaleString()}` : '-'}
            </div>
            {currentLevel && currentLevel.ante > 0 && (
              <div className="text-2xl text-gray-400">Ante: {currentLevel.ante.toLocaleString()}</div>
            )}
          </div>
        )}

        {/* Timer */}
        <div className={`text-8xl md:text-[12rem] font-mono font-bold my-6 leading-none ${
          timer.levelTimeRemaining < 60 ? 'text-[var(--casino-red)]' :
          timer.levelTimeRemaining < 120 ? 'text-yellow-400' :
          'text-[var(--casino-gold)]'
        }`}>
          {formatTime(timer.levelTimeRemaining)}
        </div>

        {/* Next level */}
        {nextLevel && (
          <div className="text-xl text-gray-400 mb-8">
            Next: {nextLevel.is_break ? 'BREAK' : `${nextLevel.small_blind.toLocaleString()} / ${nextLevel.big_blind.toLocaleString()}`}
            {nextLevel.ante > 0 && !nextLevel.is_break && ` (ante ${nextLevel.ante.toLocaleString()})`}
          </div>
        )}
      </div>

      {/* Bottom stats bar */}
      <div className="bg-[var(--casino-green)] border-t border-[var(--casino-gold)]/30 px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-6">
          <div className="text-center">
            <div className="text-xs text-gray-500 uppercase">Players</div>
            <div className="text-2xl font-bold text-white">{activeEntries.length} / {totalEntries}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 uppercase">Prize Pool</div>
            <div className="text-2xl font-bold text-[var(--casino-gold)]">{formatMoney(prizePool)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 uppercase">Rebuys</div>
            <div className="text-2xl font-bold text-white">{totalRebuys}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 uppercase">Add-ons</div>
            <div className="text-2xl font-bold text-white">{totalAddons}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 uppercase">Elapsed</div>
            <div className="text-2xl font-bold text-white">{formatTime(timer.totalElapsed)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 uppercase">Avg Stack</div>
            <div className="text-2xl font-bold text-white">
              {activeEntries.length > 0
                ? Math.round(
                    (totalEntries * tournament.starting_chips +
                     totalRebuys * (tournament.rebuy_cost > 0 ? tournament.starting_chips : 0) +
                     totalAddons * (tournament.addon_cost > 0 ? tournament.starting_chips : 0)) /
                    activeEntries.length
                  ).toLocaleString()
                : '0'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
