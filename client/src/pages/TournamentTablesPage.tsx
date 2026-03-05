import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import TicketPreview from '../components/tickets/TicketPreview';

interface Tournament {
  id: number;
  name: string;
  status: string;
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
  tables: TableData[];
  rebuys: any[];
  addons: any[];
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

interface TableData {
  id: number;
  table_number: number;
}

interface MoveTarget {
  entry: Entry;
}

export default function TournamentTablesPage() {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [ticket, setTicket] = useState<any>(null);
  const [moveTarget, setMoveTarget] = useState<MoveTarget | null>(null);
  const [moveTableId, setMoveTableId] = useState<string>('');
  const [moveSeat, setMoveSeat] = useState<string>('');
  const [moveError, setMoveError] = useState('');

  const load = useCallback(async () => {
    const t = await api.get<Tournament>(`/tournaments/${id}`);
    setTournament(t);
  }, [id]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  const eliminate = async (entry: Entry) => {
    await api.post(`/tournaments/${id}/entries/${entry.id}/eliminate`);
    setSelectedEntry(null);
    load();
  };

  const removeEntry = async (entry: Entry) => {
    if (!confirm(`Remove ${entry.player_name} from tournament?`)) return;
    await api.delete(`/tournaments/${id}/entries/${entry.id}`);
    setSelectedEntry(null);
    load();
  };

  const rebuy = async (entry: Entry) => {
    const result = await api.post<{ ticket: any }>(`/tournaments/${id}/entries/${entry.id}/rebuy`);
    setTicket({ ...result.ticket, player_name: entry.player_name });
    setSelectedEntry(null);
    load();
  };

  const addon = async (entry: Entry) => {
    const result = await api.post<{ ticket: any }>(`/tournaments/${id}/entries/${entry.id}/addon`);
    setTicket({ ...result.ticket, player_name: entry.player_name });
    setSelectedEntry(null);
    load();
  };

  const addTable = async () => {
    await api.post(`/tournaments/${id}/tables`);
    load();
  };

  const deleteTable = async (tableId: number, tableNumber: number, playerCount: number) => {
    const msg = playerCount > 0
      ? `Delete Table ${tableNumber}? ${playerCount} player(s) will be unseated.`
      : `Delete Table ${tableNumber}?`;
    if (!confirm(msg)) return;
    await api.delete(`/tournaments/${id}/tables/${tableId}`);
    load();
  };

  const autoSeat = async () => {
    await api.post(`/tournaments/${id}/tables/auto-seat`);
    load();
  };

  const openMoveDialog = (entry: Entry) => {
    setMoveTarget({ entry });
    setMoveTableId(entry.table_id ? String(entry.table_id) : '');
    setMoveSeat(entry.seat_number ? String(entry.seat_number) : '1');
    setMoveError('');
    setSelectedEntry(null);
  };

  const executeMove = async () => {
    if (!moveTarget || !moveTableId || !moveSeat) return;
    try {
      setMoveError('');
      await api.put(`/tournaments/${id}/tables/${moveTableId}/move`, {
        entryId: moveTarget.entry.id,
        seatNumber: parseInt(moveSeat),
      });
      setMoveTarget(null);
      load();
    } catch (err: any) {
      setMoveError(err.message || 'Move failed');
    }
  };

  if (!tournament) {
    return (
      <div className="min-h-screen bg-[var(--casino-dark)] flex items-center justify-center">
        <div className="text-[var(--casino-gold)] text-2xl">Loading...</div>
      </div>
    );
  }

  const activeEntries = tournament.entries?.filter(e => e.status === 'active') || [];
  const unseated = activeEntries.filter(e => !e.table_id);
  const isActive = tournament.status !== 'finished';

  const tables = (tournament.tables || []).map(table => {
    const players = activeEntries
      .filter(e => e.table_id === table.id)
      .sort((a, b) => (a.seat_number || 0) - (b.seat_number || 0));
    return { ...table, players };
  });

  // For move dialog: get occupied seats for the selected target table
  const getOccupiedSeats = (tableId: number, excludeEntryId: number) => {
    const tbl = tables.find(t => t.id === tableId);
    if (!tbl) return new Set<number>();
    return new Set(tbl.players.filter(p => p.id !== excludeEntryId).map(p => p.seat_number!));
  };

  const renderActions = (entry: Entry) => {
    const isSelected = selectedEntry?.id === entry.id;
    if (!isActive) return null;

    if (!isSelected) {
      return <span className="text-gray-600 text-xs">click row</span>;
    }

    return (
      <div className="flex gap-1 justify-end flex-wrap">
        <button
          onClick={e => { e.stopPropagation(); openMoveDialog(entry); }}
          className="bg-[var(--casino-gold)] text-[var(--casino-dark)] px-2 py-1 rounded text-xs font-semibold hover:bg-[var(--casino-gold-light)]"
        >
          Move
        </button>
        <button
          onClick={e => { e.stopPropagation(); eliminate(entry); }}
          className="bg-[var(--casino-red)] text-white px-2 py-1 rounded text-xs font-semibold hover:bg-red-600"
        >
          Eliminate
        </button>
        {tournament.rebuy_enabled === 1 && (
          <button
            onClick={e => { e.stopPropagation(); rebuy(entry); }}
            className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-blue-500"
          >
            Rebuy
          </button>
        )}
        {tournament.addon_enabled === 1 && (
          <button
            onClick={e => { e.stopPropagation(); addon(entry); }}
            className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-purple-500"
          >
            Add-on
          </button>
        )}
        <button
          onClick={e => { e.stopPropagation(); removeEntry(entry); }}
          className="bg-gray-800 text-[var(--casino-red)] px-2 py-1 rounded text-xs font-semibold hover:bg-gray-700 border border-[var(--casino-red)]/30"
        >
          Remove
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--casino-dark)] p-6">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--casino-gold)] tracking-wider">{tournament.name}</h1>
          <p className="text-gray-400 text-sm">Tables &amp; Seating — {activeEntries.length} active players</p>
        </div>
        {isActive && (
          <div className="flex gap-2">
            {unseated.length > 0 && (
              <button
                onClick={autoSeat}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-500 transition-colors"
              >
                Auto-Seat ({unseated.length})
              </button>
            )}
            <button
              onClick={addTable}
              className="bg-[var(--casino-gold)] text-[var(--casino-dark)] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[var(--casino-gold-light)] transition-colors"
            >
              + Add Table
            </button>
          </div>
        )}
      </div>

      {/* Tables grid */}
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
        {tables.map(table => (
          <div key={table.id} className="bg-[var(--casino-green)] rounded-xl border border-[var(--casino-gold)]/20 overflow-hidden">
            <div className="bg-[var(--casino-gold)]/10 px-4 py-3 border-b border-[var(--casino-gold)]/20 flex items-center justify-between">
              <h2 className="text-[var(--casino-gold)] font-bold text-lg">
                Table {table.table_number}
                <span className="text-gray-400 text-sm font-normal ml-2">({table.players.length}/9)</span>
              </h2>
              {isActive && (
                <button
                  onClick={() => deleteTable(table.id, table.table_number, table.players.length)}
                  className="text-gray-500 hover:text-[var(--casino-red)] text-xs font-semibold transition-colors"
                >
                  Delete Table
                </button>
              )}
            </div>
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 uppercase">
                  <th className="text-left px-4 py-2 w-14">Seat</th>
                  <th className="text-left px-4 py-2">Player</th>
                  {isActive && <th className="text-right px-4 py-2">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(seat => {
                  const entry = table.players.find(p => p.seat_number === seat);
                  const isSelected = entry && selectedEntry?.id === entry.id;
                  return (
                    <tr
                      key={seat}
                      className={`border-t border-gray-700/30 transition-colors ${
                        entry
                          ? isSelected ? 'bg-[var(--casino-gold)]/10 cursor-pointer' : 'hover:bg-white/5 cursor-pointer'
                          : ''
                      }`}
                      onClick={() => entry && isActive && setSelectedEntry(isSelected ? null : entry)}
                    >
                      <td className="px-4 py-2.5 text-[var(--casino-gold)] font-mono text-sm">{seat}</td>
                      <td className="px-4 py-2.5 text-sm font-medium">
                        {entry ? (
                          <span className="text-white">{entry.player_name}</span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      {isActive && (
                        <td className="px-4 py-2.5 text-right">
                          {entry ? renderActions(entry) : null}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Unseated players */}
      {unseated.length > 0 && (
        <div className="max-w-5xl mx-auto mt-6">
          <div className="bg-[var(--casino-green)] rounded-xl border border-yellow-500/30 overflow-hidden">
            <div className="bg-yellow-500/10 px-4 py-3 border-b border-yellow-500/20">
              <h2 className="text-yellow-400 font-bold text-lg">
                Unseated Players
                <span className="text-gray-400 text-sm font-normal ml-2">({unseated.length})</span>
              </h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 uppercase">
                  <th className="text-left px-4 py-2">Player</th>
                  {isActive && <th className="text-right px-4 py-2">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {unseated.map(entry => {
                  const isSelected = selectedEntry?.id === entry.id;
                  return (
                    <tr
                      key={entry.id}
                      className={`border-t border-gray-700/30 cursor-pointer transition-colors ${
                        isSelected ? 'bg-yellow-500/10' : 'hover:bg-white/5'
                      }`}
                      onClick={() => isActive && setSelectedEntry(isSelected ? null : entry)}
                    >
                      <td className="px-4 py-2.5 text-white text-sm font-medium">{entry.player_name}</td>
                      {isActive && <td className="px-4 py-2.5 text-right">{renderActions(entry)}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tables.length === 0 && unseated.length === 0 && (
        <div className="max-w-5xl mx-auto text-center py-12 text-gray-500">
          No tables yet. Click "+ Add Table" to create one.
        </div>
      )}

      {/* Move Player Modal */}
      {moveTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setMoveTarget(null)}>
          <div className="bg-[var(--casino-green)] rounded-xl p-6 max-w-sm w-full border border-[var(--casino-gold)]/30" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-1">Move Player</h3>
            <p className="text-[var(--casino-gold)] text-sm mb-4">{moveTarget.entry.player_name}</p>

            {moveError && (
              <div className="bg-[var(--casino-red)]/20 border border-[var(--casino-red)]/50 text-[var(--casino-red)] px-3 py-2 rounded mb-3 text-sm">
                {moveError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Table</label>
                <select
                  value={moveTableId}
                  onChange={e => {
                    setMoveTableId(e.target.value);
                    setMoveSeat('');
                    setMoveError('');
                  }}
                  className="w-full bg-[var(--casino-dark)] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-[var(--casino-gold)] focus:outline-none"
                >
                  <option value="">Select table...</option>
                  {tables.map(t => (
                    <option key={t.id} value={t.id}>
                      Table {t.table_number} ({t.players.length}/9)
                    </option>
                  ))}
                </select>
              </div>

              {moveTableId && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Seat</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(seat => {
                      const occupied = getOccupiedSeats(parseInt(moveTableId), moveTarget.entry.id);
                      const isTaken = occupied.has(seat);
                      const isChosen = moveSeat === String(seat);
                      return (
                        <button
                          key={seat}
                          disabled={isTaken}
                          onClick={() => { setMoveSeat(String(seat)); setMoveError(''); }}
                          className={`py-2 rounded-lg text-sm font-semibold transition-colors ${
                            isTaken
                              ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                              : isChosen
                                ? 'bg-[var(--casino-gold)] text-[var(--casino-dark)]'
                                : 'bg-[var(--casino-dark)] text-white border border-gray-700 hover:border-[var(--casino-gold)]/50'
                          }`}
                        >
                          {seat} {isTaken && '(taken)'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={executeMove}
                disabled={!moveTableId || !moveSeat}
                className="flex-1 bg-[var(--casino-gold)] text-[var(--casino-dark)] py-2.5 rounded-lg font-semibold hover:bg-[var(--casino-gold-light)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Move
              </button>
              <button
                onClick={() => setMoveTarget(null)}
                className="flex-1 bg-gray-700 text-white py-2.5 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Modal */}
      {ticket && tournament && (
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
