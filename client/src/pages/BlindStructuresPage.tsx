import { useState, useEffect } from 'react';
import { api } from '../api/client';

interface BlindLevel {
  id?: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  durationMinutes: number;
  isBreak: boolean;
}

interface BlindStructure {
  id: number;
  name: string;
  levels: any[];
}

const emptyLevel = (): BlindLevel => ({ smallBlind: 0, bigBlind: 0, ante: 0, durationMinutes: 15, isBreak: false });

export default function BlindStructuresPage() {
  const [structures, setStructures] = useState<BlindStructure[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [levels, setLevels] = useState<BlindLevel[]>([emptyLevel()]);
  const [error, setError] = useState('');

  const loadStructures = () => {
    api.get<BlindStructure[]>('/blind-structures').then(setStructures);
  };

  useEffect(() => { loadStructures(); }, []);

  const resetForm = () => {
    setEditing(null);
    setName('');
    setLevels([emptyLevel()]);
    setError('');
  };

  const loadStructure = async (id: number) => {
    const s = await api.get<any>(`/blind-structures/${id}`);
    setEditing(s.id);
    setName(s.name);
    setLevels(s.levels.map((l: any) => ({
      smallBlind: l.small_blind,
      bigBlind: l.big_blind,
      ante: l.ante,
      durationMinutes: l.duration_minutes,
      isBreak: !!l.is_break,
    })));
  };

  const addLevel = () => setLevels([...levels, emptyLevel()]);
  const removeLevel = (i: number) => setLevels(levels.filter((_, idx) => idx !== i));

  const updateLevel = (i: number, field: keyof BlindLevel, value: any) => {
    const updated = [...levels];
    (updated[i] as any)[field] = value;
    setLevels(updated);
  };

  const save = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    if (levels.length === 0) { setError('At least one level required'); return; }

    try {
      if (editing) {
        await api.put(`/blind-structures/${editing}`, { name, levels });
      } else {
        await api.post('/blind-structures', { name, levels });
      }
      resetForm();
      loadStructures();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteStructure = async (id: number) => {
    if (!confirm('Delete this blind structure?')) return;
    await api.delete(`/blind-structures/${id}`);
    loadStructures();
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Blind Structures</h1>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Form */}
        <div className="bg-[var(--casino-green)] rounded-xl p-6 border border-[var(--casino-gold)]/20">
          <h2 className="text-lg font-semibold text-white mb-4">
            {editing ? 'Edit Structure' : 'New Structure'}
          </h2>

          {error && <div className="bg-[var(--casino-red)]/20 text-[var(--casino-red)] px-3 py-2 rounded mb-3 text-sm">{error}</div>}

          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Structure name (e.g. Standard 15min)"
            className="w-full bg-[var(--casino-dark)] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-[var(--casino-gold)] focus:outline-none mb-4"
          />

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {levels.map((level, i) => (
              <div key={i} className="bg-[var(--casino-dark)] rounded-lg p-3 border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Level {i + 1}</span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-sm text-gray-400">
                      <input
                        type="checkbox"
                        checked={level.isBreak}
                        onChange={e => updateLevel(i, 'isBreak', e.target.checked)}
                        className="accent-[var(--casino-gold)]"
                      />
                      Break
                    </label>
                    {levels.length > 1 && (
                      <button onClick={() => removeLevel(i)} className="text-[var(--casino-red)] text-sm">Remove</button>
                    )}
                  </div>
                </div>
                {!level.isBreak && (
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div>
                      <label className="text-xs text-gray-500">SB</label>
                      <input
                        type="number"
                        value={level.smallBlind}
                        onChange={e => updateLevel(i, 'smallBlind', parseInt(e.target.value) || 0)}
                        className="w-full bg-[var(--casino-green)] border border-gray-700 rounded px-2 py-1.5 text-white text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">BB</label>
                      <input
                        type="number"
                        value={level.bigBlind}
                        onChange={e => updateLevel(i, 'bigBlind', parseInt(e.target.value) || 0)}
                        className="w-full bg-[var(--casino-green)] border border-gray-700 rounded px-2 py-1.5 text-white text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Ante</label>
                      <input
                        type="number"
                        value={level.ante}
                        onChange={e => updateLevel(i, 'ante', parseInt(e.target.value) || 0)}
                        className="w-full bg-[var(--casino-green)] border border-gray-700 rounded px-2 py-1.5 text-white text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-xs text-gray-500">Duration (min)</label>
                  <input
                    type="number"
                    value={level.durationMinutes}
                    onChange={e => updateLevel(i, 'durationMinutes', parseInt(e.target.value) || 1)}
                    className="w-full bg-[var(--casino-green)] border border-gray-700 rounded px-2 py-1.5 text-white text-sm focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-4">
            <button onClick={addLevel} className="text-[var(--casino-gold)] text-sm hover:underline">+ Add Level</button>
          </div>

          <div className="flex gap-3 mt-4">
            <button onClick={save} className="bg-[var(--casino-gold)] text-[var(--casino-dark)] px-5 py-2 rounded-lg font-semibold hover:bg-[var(--casino-gold-light)] transition-colors">
              {editing ? 'Update' : 'Save'}
            </button>
            {editing && (
              <button onClick={resetForm} className="text-gray-400 hover:text-white px-4 py-2 transition-colors">Cancel</button>
            )}
          </div>
        </div>

        {/* List */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Saved Structures</h2>
          <div className="space-y-3">
            {structures.map(s => (
              <div key={s.id} className="bg-[var(--casino-green)] rounded-lg p-4 border border-[var(--casino-gold)]/10">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-white">{s.name}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => loadStructure(s.id)} className="text-[var(--casino-gold)] text-sm hover:underline">Edit</button>
                    <button onClick={() => deleteStructure(s.id)} className="text-[var(--casino-red)] text-sm hover:underline">Delete</button>
                  </div>
                </div>
                <div className="text-sm text-gray-400">
                  {s.levels?.length || 0} levels
                </div>
              </div>
            ))}
            {structures.length === 0 && (
              <p className="text-gray-500 text-center py-8">No blind structures yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
