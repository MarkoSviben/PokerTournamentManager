import { useState, useEffect } from 'react';
import { api } from '../api/client';

interface Player {
  id: number;
  name: string;
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  const loadPlayers = () => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    api.get<Player[]>(`/players${query}`).then(setPlayers);
  };

  useEffect(() => { loadPlayers(); }, [search]);

  const addPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await api.post('/players', { name: newName.trim() });
    setNewName('');
    loadPlayers();
  };

  const saveEdit = async (id: number) => {
    await api.put(`/players/${id}`, { name: editName });
    setEditingId(null);
    loadPlayers();
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Players</h1>

      <form onSubmit={addPlayer} className="flex gap-3 mb-6">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="New player name"
          className="flex-1 bg-[var(--casino-dark)] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-[var(--casino-gold)] focus:outline-none"
        />
        <button
          type="submit"
          className="bg-[var(--casino-gold)] text-[var(--casino-dark)] px-5 py-2.5 rounded-lg font-semibold hover:bg-[var(--casino-gold-light)] transition-colors"
        >
          Add
        </button>
      </form>

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search players..."
        className="w-full bg-[var(--casino-dark)] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-[var(--casino-gold)] focus:outline-none mb-4"
      />

      <div className="space-y-2">
        {players.map(p => (
          <div key={p.id} className="bg-[var(--casino-green)] rounded-lg px-4 py-3 flex items-center justify-between border border-[var(--casino-gold)]/10">
            {editingId === p.id ? (
              <div className="flex gap-2 flex-1">
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="flex-1 bg-[var(--casino-dark)] border border-gray-700 rounded px-3 py-1 text-white focus:outline-none"
                  autoFocus
                />
                <button onClick={() => saveEdit(p.id)} className="text-[var(--casino-gold)] text-sm">Save</button>
                <button onClick={() => setEditingId(null)} className="text-gray-400 text-sm">Cancel</button>
              </div>
            ) : (
              <>
                <span className="text-white">{p.name}</span>
                <button
                  onClick={() => { setEditingId(p.id); setEditName(p.name); }}
                  className="text-gray-400 hover:text-[var(--casino-gold)] text-sm transition-colors"
                >
                  Edit
                </button>
              </>
            )}
          </div>
        ))}
        {players.length === 0 && (
          <p className="text-gray-500 text-center py-8">No players found</p>
        )}
      </div>
    </div>
  );
}
