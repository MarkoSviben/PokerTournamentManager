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
  auto_seating: number;
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

interface Player {
  id: number;
  name: string;
}


export default function LiveTournamentPage() {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [ticket, setTicket] = useState<any>(null);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const prevLevelRef = useRef<number>(0);

  // Late registration state
  const [showRegistration, setShowRegistration] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [search, setSearch] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [regError, setRegError] = useState('');

  // Tab state for right panel
  const [rightTab, setRightTab] = useState<'players' | 'tables'>('players');

  const loadTournament = useCallback(async () => {
    const t = await api.get<Tournament>(`/tournaments/${id}`);
    setTournament(t);
  }, [id]);

  useEffect(() => {
    loadTournament();
    const interval = setInterval(loadTournament, 5000);
    return () => clearInterval(interval);
  }, [loadTournament]);

  useEffect(() => {
    if (showRegistration) {
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      api.get<Player[]>(`/players${query}`).then(setPlayers);
    }
  }, [showRegistration, search]);

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
    setSelectedEntry(null);
    loadTournament();
  };

  const removeEntry = async (entry: Entry) => {
    if (!confirm(`Remove ${entry.player_name} from tournament?`)) return;
    await api.delete(`/tournaments/${id}/entries/${entry.id}`);
    setSelectedEntry(null);
    loadTournament();
  };

  const rebuy = async (entry: Entry) => {
    const result = await api.post<{ ticket: any }>(`/tournaments/${id}/entries/${entry.id}/rebuy`);
    setTicket({ ...result.ticket, player_name: entry.player_name });
    loadTournament();
  };

  const addon = async (entry: Entry) => {
    const result = await api.post<{ ticket: any }>(`/tournaments/${id}/entries/${entry.id}/addon`);
    setTicket({ ...result.ticket, player_name: entry.player_name });
    loadTournament();
  };

  const registerPlayer = async (playerId: number) => {
    try {
      setRegError('');
      const result = await api.post<{ entry: Entry; ticket: any }>(`/tournaments/${id}/entries`, { playerId });
      setTicket(result.ticket);
      if (tournament?.auto_seating) {
        await api.post(`/tournaments/${id}/tables/auto-seat`);
      }
      loadTournament();
    } catch (err: any) {
      setRegError(err.message);
      setTimeout(() => setRegError(''), 3000);
    }
  };

  const createAndRegister = async () => {
    if (!newPlayerName.trim()) return;
    try {
      const player = await api.post<Player>('/players', { name: newPlayerName.trim() });
      setNewPlayerName('');
      await registerPlayer(player.id);
    } catch (err: any) {
      setRegError(err.message);
      setTimeout(() => setRegError(''), 3000);
    }
  };

  const openDisplay = () => {
    window.open(`/tournaments/${id}/display`, '_blank', 'width=1920,height=1080');
  };

  const openTables = () => {
    window.open(`/tournaments/${id}/tables`, '_blank', 'width=1200,height=800');
  };

  const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  if (!tournament) return <div className="p-8 text-center text-gray-400">Loading...</div>;

  const activeEntries = tournament.entries?.filter(e => e.status === 'active') || [];
  const eliminatedEntries = tournament.entries?.filter(e => e.status === 'eliminated') || [];
  const totalEntries = tournament.entries?.length || 0;
  const totalRebuys = tournament.rebuys?.length || 0;
  const totalAddons = tournament.addons?.length || 0;
  const totalMoney = (totalEntries * tournament.buyin_amount) + (totalRebuys * tournament.rebuy_cost) + (totalAddons * tournament.addon_cost);
  const rake = Math.floor(totalMoney * (tournament.rake_percent / 100));
  const prizePool = Math.max(tournament.gtd, totalMoney - rake);
  const isActive = tournament.status !== 'finished';

  const registeredIds = new Set(tournament.entries?.filter(e => e.status === 'active').map(e => e.player_id) || []);
  const availablePlayers = players.filter(p => !registeredIds.has(p.id));

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">{tournament.name}</h1>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            tournament.status === 'running' ? 'bg-green-500/20 text-green-400' :
            tournament.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-gray-500/20 text-gray-400'
          }`}>
            {tournament.status.toUpperCase()}
          </span>
        </div>
        <div className="flex gap-2">
          {isActive && (
            <button
              onClick={() => setShowRegistration(!showRegistration)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                showRegistration
                  ? 'bg-[var(--casino-gold)] text-[var(--casino-dark)]'
                  : 'bg-[var(--casino-green)] text-[var(--casino-gold)] border border-[var(--casino-gold)]/30 hover:bg-[var(--casino-gold)]/10'
              }`}
            >
              + Register Player
            </button>
          )}
          <button
            onClick={openTables}
            className="bg-[var(--casino-green)] text-gray-300 border border-gray-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[var(--casino-green-light)] transition-colors"
          >
            Tables
          </button>
          <button
            onClick={openDisplay}
            className="bg-[var(--casino-green)] text-gray-300 border border-gray-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[var(--casino-green-light)] transition-colors"
          >
            Open Display
          </button>
        </div>
      </div>

      {/* Registration panel (collapsible) */}
      {showRegistration && (
        <div className="bg-[var(--casino-green)] rounded-xl p-4 border border-[var(--casino-gold)]/20 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[var(--casino-gold)] uppercase tracking-wider">Late Registration</h2>
            <button onClick={() => setShowRegistration(false)} className="text-gray-400 hover:text-white text-xs">Close</button>
          </div>
          {regError && <div className="bg-[var(--casino-red)]/20 text-[var(--casino-red)] px-3 py-2 rounded mb-3 text-sm">{regError}</div>}
          <div className="flex gap-3 flex-wrap">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search existing players..."
              className="bg-[var(--casino-dark)] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-[var(--casino-gold)] focus:outline-none text-sm w-56"
            />
            <div className="flex gap-1 flex-wrap max-w-xl">
              {availablePlayers.slice(0, 10).map(p => (
                <button
                  key={p.id}
                  onClick={() => registerPlayer(p.id)}
                  className="px-3 py-2 rounded-lg bg-[var(--casino-dark)] hover:bg-[var(--casino-gold)]/20 text-white text-sm border border-gray-700 hover:border-[var(--casino-gold)]/40 transition-colors"
                >
                  {p.name}
                </button>
              ))}
              {availablePlayers.length > 10 && <span className="text-gray-500 text-sm self-center">+{availablePlayers.length - 10} more</span>}
            </div>
            <div className="flex gap-2 ml-auto">
              <input
                type="text"
                value={newPlayerName}
                onChange={e => setNewPlayerName(e.target.value)}
                placeholder="New player name"
                className="bg-[var(--casino-dark)] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none w-44"
                onKeyDown={e => e.key === 'Enter' && createAndRegister()}
              />
              <button onClick={createAndRegister} className="bg-[var(--casino-gold)] text-[var(--casino-dark)] px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap">
                Create & Register
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main layout: Left (timer + stats) | Right (players/tables) */}
      <div className="grid lg:grid-cols-[1fr_380px] gap-4">
        {/* Left column */}
        <div className="space-y-4">
          {/* Timer */}
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
              <div className="text-sm text-gray-400 mb-3">
                Next: {nextLevel.is_break ? 'BREAK' : `${nextLevel.small_blind.toLocaleString()} / ${nextLevel.big_blind.toLocaleString()}`}
                {nextLevel.ante > 0 && !nextLevel.is_break && ` (ante ${nextLevel.ante.toLocaleString()})`}
              </div>
            )}

            {isActive && (
              <div className="flex gap-3 justify-center">
                {tournament.status === 'running' ? (
                  <button onClick={pause} className="bg-yellow-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-yellow-500">Pause</button>
                ) : tournament.status === 'paused' ? (
                  <button onClick={resume} className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-green-500">Resume</button>
                ) : null}
                <button onClick={advanceLevel} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-500">Next Level</button>
                <button onClick={finishTournament} className="bg-[var(--casino-red)] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-red-600">End</button>
              </div>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[var(--casino-green)] rounded-lg p-3 border border-[var(--casino-gold)]/10 text-center">
              <div className="text-xs text-gray-500 uppercase">Players</div>
              <div className="text-xl font-bold text-white">{activeEntries.length}<span className="text-gray-500 text-sm">/{totalEntries}</span></div>
            </div>
            <div className="bg-[var(--casino-green)] rounded-lg p-3 border border-[var(--casino-gold)]/10 text-center">
              <div className="text-xs text-gray-500 uppercase">Prize Pool</div>
              <div className="text-xl font-bold text-[var(--casino-gold)]">{formatMoney(prizePool)}</div>
            </div>
            <div className="bg-[var(--casino-green)] rounded-lg p-3 border border-[var(--casino-gold)]/10 text-center">
              <div className="text-xs text-gray-500 uppercase">Rebuys</div>
              <div className="text-xl font-bold text-white">{totalRebuys}</div>
            </div>
            <div className="bg-[var(--casino-green)] rounded-lg p-3 border border-[var(--casino-gold)]/10 text-center">
              <div className="text-xs text-gray-500 uppercase">Add-ons</div>
              <div className="text-xl font-bold text-white">{totalAddons}</div>
            </div>
            <div className="bg-[var(--casino-green)] rounded-lg p-3 border border-[var(--casino-gold)]/10 text-center">
              <div className="text-xs text-gray-500 uppercase">Elapsed</div>
              <div className="text-xl font-bold text-white">{formatTime(timer.totalElapsed)}</div>
            </div>
            <div className="bg-[var(--casino-green)] rounded-lg p-3 border border-[var(--casino-gold)]/10 text-center">
              <div className="text-xs text-gray-500 uppercase">Clock</div>
              <div className="text-xl font-bold text-white">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            <div className="bg-[var(--casino-green)] rounded-lg p-3 border border-[var(--casino-gold)]/10 text-center">
              <div className="text-xs text-gray-500 uppercase">Collected</div>
              <div className="text-xl font-bold text-white">{formatMoney(totalMoney)}</div>
            </div>
            {tournament.rake_percent > 0 && (
              <div className="bg-[var(--casino-green)] rounded-lg p-3 border border-[var(--casino-gold)]/10 text-center">
                <div className="text-xs text-gray-500 uppercase">Rake ({tournament.rake_percent}%)</div>
                <div className="text-xl font-bold text-gray-400">{formatMoney(rake)}</div>
              </div>
            )}
          </div>

          {/* Payouts */}
          {tournament.payouts?.length > 0 && (
            <div className="bg-[var(--casino-green)] rounded-xl p-4 border border-[var(--casino-gold)]/10">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Payouts</h2>
              <div className="flex flex-wrap gap-4">
                {tournament.payouts.map(p => (
                  <div key={p.position} className="text-sm">
                    <span className="text-gray-400">#{p.position}</span>{' '}
                    <span className="text-white font-semibold">{formatMoney(Math.floor(prizePool * p.percentage / 100))}</span>{' '}
                    <span className="text-gray-500">({p.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Player list with actions */}
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex bg-[var(--casino-green)] rounded-lg p-1 border border-[var(--casino-gold)]/10">
            <button
              onClick={() => setRightTab('players')}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
                rightTab === 'players' ? 'bg-[var(--casino-gold)]/20 text-[var(--casino-gold)]' : 'text-gray-400 hover:text-white'
              }`}
            >
              Active Players ({activeEntries.length})
            </button>
            <button
              onClick={() => setRightTab('tables')}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
                rightTab === 'tables' ? 'bg-[var(--casino-gold)]/20 text-[var(--casino-gold)]' : 'text-gray-400 hover:text-white'
              }`}
            >
              Eliminated ({eliminatedEntries.length})
            </button>
          </div>

          {rightTab === 'players' ? (
            <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
              {activeEntries.map(entry => {
                const table = tournament.tables?.find(t => t.id === entry.table_id);
                const isSelected = selectedEntry?.id === entry.id;
                return (
                  <div key={entry.id} className={`bg-[var(--casino-green)] rounded-lg border transition-all ${
                    isSelected ? 'border-[var(--casino-gold)]/60' : 'border-[var(--casino-gold)]/10'
                  }`}>
                    {/* Player row */}
                    <div
                      className="flex items-center justify-between px-4 py-3 cursor-pointer"
                      onClick={() => setSelectedEntry(isSelected ? null : entry)}
                    >
                      <div>
                        <div className="text-white font-semibold text-sm">{entry.player_name}</div>
                        <div className="text-xs text-gray-500">
                          {table ? `Table ${table.table_number} • Seat ${entry.seat_number}` : 'Unseated'}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {isSelected ? '▲' : '▼'}
                      </div>
                    </div>

                    {/* Expanded actions */}
                    {isSelected && isActive && (
                      <div className="px-4 pb-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => eliminate(entry)}
                          className="flex-1 bg-[var(--casino-red)] text-white py-2 rounded-lg text-xs font-semibold hover:bg-red-600 min-w-[80px]"
                        >
                          Eliminate
                        </button>
                        {tournament.rebuy_enabled === 1 && (
                          <button
                            onClick={() => rebuy(entry)}
                            className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-xs font-semibold hover:bg-blue-500 min-w-[80px]"
                          >
                            Rebuy {formatMoney(tournament.rebuy_cost)}
                          </button>
                        )}
                        {tournament.addon_enabled === 1 && (
                          <button
                            onClick={() => addon(entry)}
                            className="flex-1 bg-purple-600 text-white py-2 rounded-lg text-xs font-semibold hover:bg-purple-500 min-w-[80px]"
                          >
                            Add-on {formatMoney(tournament.addon_cost)}
                          </button>
                        )}
                        <button
                          onClick={() => removeEntry(entry)}
                          className="flex-1 bg-gray-800 text-[var(--casino-red)] py-2 rounded-lg text-xs font-semibold hover:bg-gray-700 border border-[var(--casino-red)]/30 min-w-[80px]"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {activeEntries.length === 0 && (
                <p className="text-gray-500 text-center py-8 text-sm">No active players</p>
              )}
            </div>
          ) : (
            <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
              {eliminatedEntries
                .sort((a, b) => (a.eliminated_position || 0) - (b.eliminated_position || 0))
                .map(entry => (
                <div key={entry.id} className="bg-[var(--casino-green)] rounded-lg px-4 py-3 border border-gray-700/50">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 line-through text-sm">{entry.player_name}</span>
                    <span className="text-xs text-gray-600">#{entry.eliminated_position}</span>
                  </div>
                </div>
              ))}
              {eliminatedEntries.length === 0 && (
                <p className="text-gray-500 text-center py-8 text-sm">No eliminations yet</p>
              )}
            </div>
          )}
        </div>
      </div>

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
