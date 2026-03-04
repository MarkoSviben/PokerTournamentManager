import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useTimer, formatTime } from '../hooks/useTimer';
import TicketPreview from '../components/tickets/TicketPreview';

interface Tournament {
  id: number;
  name: string;
  status: string;
  gtd: number;
  rake_percent: number;
  buyin_amount: number;
  starting_chips: number;
  rebuy_enabled: number;
  rebuy_cost: number;
  rebuy_chips: number;
  addon_enabled: number;
  addon_cost: number;
  addon_chips: number;
  current_level: number;
  level_started_at: string | null;
  elapsed_seconds_before_current: number;
  started_at: string;
  entries: Entry[];
  tables: any[];
  rebuys: any[];
  addons: any[];
  blindStructure: { levels: BlindLevel[] };
  payouts: { position: number; percentage: number }[];
}

interface Entry {
  id: number;
  player_id: number;
  player_name: string;
  table_id: number | null;
  seat_number: number | null;
  status: string;
  eliminated_position?: number;
}

interface BlindLevel {
  level_order: number;
  small_blind: number;
  big_blind: number;
  ante: number;
  duration_minutes: number;
  is_break: number;
}

export default function LiveTournamentPage() {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [ticket, setTicket] = useState<any>(null);
  const [actionDialog, setActionDialog] = useState<{ type: string; entry: Entry } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevLevelRef = useRef<number>(0);

  const loadTournament = useCallback(async () => {
    const t = await api.get<Tournament>(`/tournaments/${id}`);
    setTournament(t);
  }, [id]);

  // Initial load + polling
  useEffect(() => {
    loadTournament();
    const interval = setInterval(loadTournament, 5000);
    return () => clearInterval(interval);
  }, [loadTournament]);

  const levels = tournament?.blindStructure?.levels || [];
  const currentLevel = levels.find(l => l.level_order === tournament?.current_level);
  const nextLevel = levels.find(l => l.level_order === (tournament?.current_level || 0) + 1);

  const timer = useTimer(
    tournament?.level_started_at || null,
    tournament?.elapsed_seconds_before_current || 0,
    currentLevel?.duration_minutes || 0,
    tournament?.status || ''
  );

  // Audio alert when level changes
  useEffect(() => {
    if (tournament && prevLevelRef.current > 0 && prevLevelRef.current !== tournament.current_level) {
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.value = 0.3;
        osc.start();
        setTimeout(() => { osc.stop(); ctx.close(); }, 500);
      } catch {}
    }
    if (tournament) prevLevelRef.current = tournament.current_level;
  }, [tournament?.current_level]);

  // Auto advance when timer reaches 0
  useEffect(() => {
    if (timer.levelTimeRemaining === 0 && timer.isRunning && tournament) {
      advanceLevel();
    }
  }, [timer.levelTimeRemaining === 0 && timer.isRunning]);

  const pause = () => api.post(`/tournaments/${id}/pause`).then(loadTournament);
  const resume = () => api.post(`/tournaments/${id}/resume`).then(loadTournament);
  const advanceLevel = () => api.post(`/tournaments/${id}/next-level`).then(loadTournament);
  const finishTournament = () => {
    if (confirm('End this tournament?')) {
      api.post(`/tournaments/${id}/finish`).then(loadTournament);
    }
  };

  const eliminate = async (entry: Entry) => {
    await api.post(`/tournaments/${id}/entries/${entry.id}/eliminate`);
    setActionDialog(null);
    loadTournament();
  };

  const rebuy = async (entry: Entry) => {
    const result = await api.post<{ ticket: any }>(`/tournaments/${id}/entries/${entry.id}/rebuy`);
    setTicket({ ...result.ticket, player_name: entry.player_name });
    setActionDialog(null);
    loadTournament();
  };

  const addon = async (entry: Entry) => {
    const result = await api.post<{ ticket: any }>(`/tournaments/${id}/entries/${entry.id}/addon`);
    setTicket({ ...result.ticket, player_name: entry.player_name });
    setActionDialog(null);
    loadTournament();
  };

  const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  if (!tournament) return <div className="p-8 text-center text-gray-400">Loading...</div>;

  const activeEntries = tournament.entries?.filter(e => e.status === 'active') || [];
  const totalEntries = tournament.entries?.length || 0;
  const totalRebuys = tournament.rebuys?.length || 0;
  const totalAddons = tournament.addons?.length || 0;

  const totalMoney = (totalEntries * tournament.buyin_amount) + (totalRebuys * tournament.rebuy_cost) + (totalAddons * tournament.addon_cost);
  const rake = Math.floor(totalMoney * (tournament.rake_percent / 100));
  const prizePool = Math.max(tournament.gtd, totalMoney - rake);

  const tables = tournament.tables?.map(table => {
    const players = tournament.entries?.filter(e => e.table_id === table.id && e.status === 'active') || [];
    return { ...table, players };
  }) || [];

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-xl md:text-2xl font-bold text-white">{tournament.name}</h1>
        <div className="text-sm text-gray-400">
          {tournament.status === 'finished' ? 'FINISHED' : tournament.status === 'paused' ? 'PAUSED' : 'LIVE'}
        </div>
      </div>

      {/* Timer + Stats */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {/* Blind Timer */}
        <div className="bg-[var(--casino-felt)] rounded-xl p-6 border border-[var(--casino-gold)]/30 text-center">
          {currentLevel?.is_break ? (
            <div className="text-3xl font-bold text-[var(--casino-gold)] mb-2">BREAK</div>
          ) : (
            <>
              <div className="text-sm text-gray-400 mb-1">Level {tournament.current_level}</div>
              <div className="text-2xl md:text-4xl font-bold text-white mb-1">
                {currentLevel ? `${currentLevel.small_blind.toLocaleString()} / ${currentLevel.big_blind.toLocaleString()}` : '-'}
              </div>
              {currentLevel && currentLevel.ante > 0 && (
                <div className="text-sm text-gray-400">Ante: {currentLevel.ante.toLocaleString()}</div>
              )}
            </>
          )}

          <div className={`text-5xl md:text-7xl font-mono font-bold my-4 ${
            timer.levelTimeRemaining < 60 ? 'text-[var(--casino-red)]' :
            timer.levelTimeRemaining < 120 ? 'text-yellow-400' :
            'text-[var(--casino-gold)]'
          }`}>
            {formatTime(timer.levelTimeRemaining)}
          </div>

          {nextLevel && (
            <div className="text-sm text-gray-400">
              Next: {nextLevel.is_break ? 'BREAK' : `${nextLevel.small_blind.toLocaleString()} / ${nextLevel.big_blind.toLocaleString()}`}
              {nextLevel.ante > 0 && !nextLevel.is_break && ` (ante ${nextLevel.ante.toLocaleString()})`}
            </div>
          )}

          {/* Controls */}
          {tournament.status !== 'finished' && (
            <div className="flex gap-3 justify-center mt-4">
              {tournament.status === 'running' ? (
                <button onClick={pause} className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-yellow-500">
                  Pause
                </button>
              ) : tournament.status === 'paused' ? (
                <button onClick={resume} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-500">
                  Resume
                </button>
              ) : null}
              <button onClick={advanceLevel} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-500">
                Next Level
              </button>
              <button onClick={finishTournament} className="bg-[var(--casino-red)] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-600">
                End
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="bg-[var(--casino-green)] rounded-xl p-6 border border-[var(--casino-gold)]/20">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500 uppercase">Players</div>
              <div className="text-2xl font-bold text-white">{activeEntries.length} / {totalEntries}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">Prize Pool</div>
              <div className="text-2xl font-bold text-[var(--casino-gold)]">{formatMoney(prizePool)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">Rebuys</div>
              <div className="text-xl font-bold text-white">{totalRebuys}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">Add-ons</div>
              <div className="text-xl font-bold text-white">{totalAddons}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">Elapsed</div>
              <div className="text-xl font-bold text-white">{formatTime(timer.totalElapsed)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">Current Time</div>
              <div className="text-xl font-bold text-white">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            {tournament.rake_percent > 0 && (
              <div>
                <div className="text-xs text-gray-500 uppercase">Rake</div>
                <div className="text-lg text-gray-400">{formatMoney(rake)} ({tournament.rake_percent}%)</div>
              </div>
            )}
            <div>
              <div className="text-xs text-gray-500 uppercase">Total Collected</div>
              <div className="text-lg text-gray-400">{formatMoney(totalMoney)}</div>
            </div>
          </div>

          {/* Payouts */}
          {tournament.payouts?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="text-xs text-gray-500 uppercase mb-2">Payouts</div>
              <div className="space-y-1">
                {tournament.payouts.map(p => (
                  <div key={p.position} className="flex justify-between text-sm">
                    <span className="text-gray-400">#{p.position}</span>
                    <span className="text-white font-semibold">
                      {formatMoney(Math.floor(prizePool * p.percentage / 100))} ({p.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tables */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tables.map(table => (
          <div key={table.id} className="bg-[var(--casino-green)] rounded-xl p-4 border border-[var(--casino-gold)]/10">
            <h3 className="text-sm font-semibold text-[var(--casino-gold)] mb-3">
              Table {table.table_number} ({table.players.length}/9)
            </h3>
            <div className="space-y-1">
              {Array.from({ length: 9 }, (_, i) => {
                const player = table.players.find((p: Entry) => p.seat_number === i + 1);
                return (
                  <div
                    key={i}
                    className={`flex items-center justify-between px-3 py-2 rounded text-sm ${
                      player ? 'bg-[var(--casino-dark)] cursor-pointer hover:bg-[var(--casino-dark)]/80' : 'bg-gray-800/30'
                    }`}
                    onClick={() => player && tournament.status !== 'finished' && setActionDialog({ type: 'actions', entry: player })}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-xs w-4">{i + 1}</span>
                      <span className={player ? 'text-white' : 'text-gray-700'}>{player?.player_name || '-'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Action Dialog */}
      {actionDialog && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setActionDialog(null)}>
          <div className="bg-[var(--casino-green)] rounded-xl p-6 max-w-sm w-full border border-[var(--casino-gold)]/30" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">{actionDialog.entry.player_name}</h3>
            <div className="space-y-2">
              <button
                onClick={() => eliminate(actionDialog.entry)}
                className="w-full bg-[var(--casino-red)] text-white py-2.5 rounded-lg font-semibold hover:bg-red-600"
              >
                Eliminate
              </button>
              {tournament.rebuy_enabled === 1 && (
                <button
                  onClick={() => rebuy(actionDialog.entry)}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-500"
                >
                  Rebuy ({formatMoney(tournament.rebuy_cost)})
                </button>
              )}
              {tournament.addon_enabled === 1 && (
                <button
                  onClick={() => addon(actionDialog.entry)}
                  className="w-full bg-purple-600 text-white py-2.5 rounded-lg font-semibold hover:bg-purple-500"
                >
                  Add-on ({formatMoney(tournament.addon_cost)})
                </button>
              )}
              <button
                onClick={() => setActionDialog(null)}
                className="w-full bg-gray-700 text-gray-300 py-2.5 rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Modal */}
      {ticket && (
        <TicketPreview
          ticket={ticket}
          tournamentName={tournament.name}
          startingChips={ticket.ticket_type === 'rebuy' ? tournament.rebuy_chips : ticket.ticket_type === 'addon' ? tournament.addon_chips : tournament.starting_chips}
          onClose={() => setTicket(null)}
        />
      )}
    </div>
  );
}
