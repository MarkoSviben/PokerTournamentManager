import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
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
  entries: Entry[];
  tables: Table[];
  payouts: Payout[];
  blindStructure: any;
}

interface Entry {
  id: number;
  player_id: number;
  player_name: string;
  table_id: number | null;
  seat_number: number | null;
  status: string;
}

interface Table {
  id: number;
  table_number: number;
  players: Entry[];
}

interface Payout {
  position: number;
  percentage: number;
}

interface Player {
  id: number;
  name: string;
}

export default function TournamentLobbyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [search, setSearch] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [ticket, setTicket] = useState<any>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([{ position: 1, percentage: 100 }]);
  const [error, setError] = useState('');

  const loadTournament = useCallback(async () => {
    const t = await api.get<Tournament>(`/tournaments/${id}`);
    setTournament(t);
    setTables(t.tables || []);
    if (t.payouts?.length) setPayouts(t.payouts);
  }, [id]);

  useEffect(() => { loadTournament(); }, [loadTournament]);

  useEffect(() => {
    if (search.length > 0) {
      api.get<Player[]>(`/players?search=${encodeURIComponent(search)}`).then(setPlayers);
    } else {
      api.get<Player[]>('/players').then(setPlayers);
    }
  }, [search]);

  const registerPlayer = async (playerId: number) => {
    try {
      const result = await api.post<{ entry: Entry; ticket: any }>(`/tournaments/${id}/entries`, { playerId });
      setTicket(result.ticket);
      loadTournament();
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const createAndRegister = async () => {
    if (!newPlayerName.trim()) return;
    const player = await api.post<Player>('/players', { name: newPlayerName.trim() });
    setNewPlayerName('');
    await registerPlayer(player.id);
  };

  const removeEntry = async (entryId: number) => {
    await api.delete(`/tournaments/${id}/entries/${entryId}`);
    loadTournament();
  };

  const autoSeat = async () => {
    const result = await api.post<Table[]>(`/tournaments/${id}/tables/auto-seat`);
    if (Array.isArray(result)) setTables(result);
    loadTournament();
  };

  const addTable = async () => {
    await api.post(`/tournaments/${id}/tables`);
    loadTournament();
  };

  const savePayouts = async () => {
    try {
      await api.put(`/tournaments/${id}/payouts`, { payouts });
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const startTournament = async () => {
    if (!tournament?.entries?.length) { setError('No players registered'); return; }
    await api.post(`/tournaments/${id}/start`);
    navigate(`/tournaments/${id}/live`);
  };

  const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  if (!tournament) return <div className="p-8 text-center text-gray-400">Loading...</div>;

  const registeredPlayers = tournament.entries?.filter(e => e.status === 'active') || [];
  const registeredIds = new Set(registeredPlayers.map(e => e.player_id));
  const availablePlayers = players.filter(p => !registeredIds.has(p.id));

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{tournament.name}</h1>
          <div className="text-sm text-gray-400 mt-1">
            Buy-in: {formatMoney(tournament.buyin_amount)} | Chips: {tournament.starting_chips.toLocaleString()}
            {tournament.gtd > 0 && ` | GTD: ${formatMoney(tournament.gtd)}`}
          </div>
        </div>
        {tournament.status === 'registration' && (
          <button
            onClick={startTournament}
            className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-green-500 transition-colors"
          >
            Start Tournament
          </button>
        )}
      </div>

      {error && <div className="bg-[var(--casino-red)]/20 text-[var(--casino-red)] px-4 py-2 rounded mb-4">{error}</div>}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Player Registration */}
        <div className="lg:col-span-1">
          <div className="bg-[var(--casino-green)] rounded-xl p-5 border border-[var(--casino-gold)]/20 mb-4">
            <h2 className="text-lg font-semibold text-white mb-4">Register Players</h2>

            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search players..."
              className="w-full bg-[var(--casino-dark)] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-[var(--casino-gold)] focus:outline-none mb-3"
            />

            <div className="max-h-48 overflow-y-auto space-y-1 mb-3">
              {availablePlayers.map(p => (
                <button
                  key={p.id}
                  onClick={() => registerPlayer(p.id)}
                  className="w-full text-left px-3 py-2 rounded bg-[var(--casino-dark)] hover:bg-[var(--casino-gold)]/10 text-white text-sm transition-colors"
                >
                  {p.name}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newPlayerName}
                onChange={e => setNewPlayerName(e.target.value)}
                placeholder="New player name"
                className="flex-1 bg-[var(--casino-dark)] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                onKeyDown={e => e.key === 'Enter' && createAndRegister()}
              />
              <button onClick={createAndRegister} className="bg-[var(--casino-gold)] text-[var(--casino-dark)] px-3 py-2 rounded-lg text-sm font-semibold">
                Add
              </button>
            </div>
          </div>

          {/* Registered Players */}
          <div className="bg-[var(--casino-green)] rounded-xl p-5 border border-[var(--casino-gold)]/20">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">
              Registered ({registeredPlayers.length})
            </h3>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {registeredPlayers.map(e => (
                <div key={e.id} className="flex items-center justify-between px-3 py-2 bg-[var(--casino-dark)] rounded text-sm">
                  <span className="text-white">{e.player_name}</span>
                  {tournament.status === 'registration' && (
                    <button onClick={() => removeEntry(e.id)} className="text-[var(--casino-red)] text-xs">Remove</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tables */}
        <div className="lg:col-span-1">
          <div className="bg-[var(--casino-green)] rounded-xl p-5 border border-[var(--casino-gold)]/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Tables</h2>
              <div className="flex gap-2">
                <button onClick={addTable} className="text-[var(--casino-gold)] text-sm hover:underline">+ Table</button>
                <button onClick={autoSeat} className="bg-[var(--casino-gold)]/20 text-[var(--casino-gold)] px-3 py-1 rounded text-sm hover:bg-[var(--casino-gold)]/30">
                  Auto Seat
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {tables.map(table => (
                <div key={table.id} className="bg-[var(--casino-dark)] rounded-lg p-3 border border-gray-800">
                  <h4 className="text-sm font-semibold text-[var(--casino-gold)] mb-2">
                    Table {table.table_number} ({table.players?.length || 0}/9)
                  </h4>
                  <div className="grid grid-cols-3 gap-1">
                    {Array.from({ length: 9 }, (_, i) => {
                      const player = table.players?.find(p => p.seat_number === i + 1);
                      return (
                        <div key={i} className={`text-xs px-2 py-1.5 rounded text-center ${
                          player ? 'bg-[var(--casino-green)] text-white' : 'bg-gray-800/50 text-gray-600'
                        }`}>
                          {player ? player.player_name : `Seat ${i + 1}`}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {tables.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">No tables yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Payouts */}
        <div className="lg:col-span-1">
          <div className="bg-[var(--casino-green)] rounded-xl p-5 border border-[var(--casino-gold)]/20">
            <h2 className="text-lg font-semibold text-white mb-4">Payout Structure</h2>

            <div className="space-y-2 mb-3">
              {payouts.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm text-gray-400 w-8">#{p.position}</span>
                  <input
                    type="number"
                    step="0.1"
                    value={p.percentage}
                    onChange={e => {
                      const updated = [...payouts];
                      updated[i].percentage = parseFloat(e.target.value) || 0;
                      setPayouts(updated);
                    }}
                    className="flex-1 bg-[var(--casino-dark)] border border-gray-700 rounded px-3 py-1.5 text-white text-sm focus:outline-none"
                  />
                  <span className="text-sm text-gray-400">%</span>
                  {payouts.length > 1 && (
                    <button onClick={() => setPayouts(payouts.filter((_, idx) => idx !== i))} className="text-[var(--casino-red)] text-xs">X</button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setPayouts([...payouts, { position: payouts.length + 1, percentage: 0 }])}
                className="text-[var(--casino-gold)] text-sm hover:underline"
              >
                + Add Position
              </button>
            </div>

            <div className="text-sm text-gray-400 mb-2">
              Total: {payouts.reduce((s, p) => s + p.percentage, 0).toFixed(1)}%
            </div>

            <button onClick={savePayouts} className="bg-[var(--casino-gold)] text-[var(--casino-dark)] px-4 py-2 rounded-lg text-sm font-semibold w-full">
              Save Payouts
            </button>
          </div>
        </div>
      </div>

      {/* Ticket Modal */}
      {ticket && (
        <TicketPreview
          ticket={ticket}
          tournamentName={tournament.name}
          startingChips={tournament.starting_chips}
          onClose={() => setTicket(null)}
        />
      )}
    </div>
  );
}
