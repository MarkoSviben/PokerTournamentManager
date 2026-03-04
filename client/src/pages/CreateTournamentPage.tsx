import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

interface BlindStructure {
  id: number;
  name: string;
}

export default function CreateTournamentPage() {
  const navigate = useNavigate();
  const [structures, setStructures] = useState<BlindStructure[]>([]);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    gtd: '',
    rakePercent: '',
    buyinAmount: '',
    startingChips: '',
    rebuyEnabled: false,
    rebuyCost: '',
    rebuyChips: '',
    addonEnabled: false,
    addonCost: '',
    addonChips: '',
    blindStructureId: '',
    autoSeating: true,
  });

  useEffect(() => {
    api.get<BlindStructure[]>('/blind-structures').then(setStructures);
  }, []);

  const set = (field: string, value: any) => setForm({ ...form, [field]: value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name || !form.buyinAmount || !form.startingChips || !form.blindStructureId) {
      setError('Name, buy-in, starting chips, and blind structure are required');
      return;
    }

    try {
      const t = await api.post<any>('/tournaments', {
        name: form.name,
        gtd: Math.round(parseFloat(form.gtd || '0') * 100),
        rakePercent: parseFloat(form.rakePercent || '0'),
        buyinAmount: Math.round(parseFloat(form.buyinAmount) * 100),
        startingChips: parseInt(form.startingChips),
        rebuyEnabled: form.rebuyEnabled,
        rebuyCost: Math.round(parseFloat(form.rebuyCost || '0') * 100),
        rebuyChips: parseInt(form.rebuyChips || '0'),
        addonEnabled: form.addonEnabled,
        addonCost: Math.round(parseFloat(form.addonCost || '0') * 100),
        addonChips: parseInt(form.addonChips || '0'),
        blindStructureId: parseInt(form.blindStructureId),
        autoSeating: form.autoSeating,
      });
      navigate(`/tournaments/${t.id}/lobby`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const inputClass = "w-full bg-[var(--casino-dark)] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-[var(--casino-gold)] focus:outline-none";

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-white mb-6">New Tournament</h1>

      <div className="bg-[var(--casino-green)] rounded-xl p-6 border border-[var(--casino-gold)]/20">
        {error && <div className="bg-[var(--casino-red)]/20 text-[var(--casino-red)] px-3 py-2 rounded mb-4 text-sm">{error}</div>}

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Tournament Name</label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)} className={inputClass} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Buy-in ($)</label>
              <input type="number" step="0.01" value={form.buyinAmount} onChange={e => set('buyinAmount', e.target.value)} className={inputClass} required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Starting Chips</label>
              <input type="number" value={form.startingChips} onChange={e => set('startingChips', e.target.value)} className={inputClass} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">GTD Prize Pool ($)</label>
              <input type="number" step="0.01" value={form.gtd} onChange={e => set('gtd', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Rake (%)</label>
              <input type="number" step="0.1" value={form.rakePercent} onChange={e => set('rakePercent', e.target.value)} className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Blind Structure</label>
            <select value={form.blindStructureId} onChange={e => set('blindStructureId', e.target.value)} className={inputClass} required>
              <option value="">Select...</option>
              {structures.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {structures.length === 0 && (
              <p className="text-xs text-[var(--casino-red)] mt-1">No blind structures found. Create one first.</p>
            )}
          </div>

          {/* Rebuy */}
          <div className="border border-gray-700 rounded-lg p-4">
            <label className="flex items-center gap-2 text-white mb-3">
              <input type="checkbox" checked={form.rebuyEnabled} onChange={e => set('rebuyEnabled', e.target.checked)} className="accent-[var(--casino-gold)]" />
              Enable Rebuys
            </label>
            {form.rebuyEnabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Rebuy Cost ($)</label>
                  <input type="number" step="0.01" value={form.rebuyCost} onChange={e => set('rebuyCost', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Rebuy Chips</label>
                  <input type="number" value={form.rebuyChips} onChange={e => set('rebuyChips', e.target.value)} className={inputClass} />
                </div>
              </div>
            )}
          </div>

          {/* Addon */}
          <div className="border border-gray-700 rounded-lg p-4">
            <label className="flex items-center gap-2 text-white mb-3">
              <input type="checkbox" checked={form.addonEnabled} onChange={e => set('addonEnabled', e.target.checked)} className="accent-[var(--casino-gold)]" />
              Enable Add-ons
            </label>
            {form.addonEnabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Add-on Cost ($)</label>
                  <input type="number" step="0.01" value={form.addonCost} onChange={e => set('addonCost', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Add-on Chips</label>
                  <input type="number" value={form.addonChips} onChange={e => set('addonChips', e.target.value)} className={inputClass} />
                </div>
              </div>
            )}
          </div>

          {/* Seating */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Table Seating</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-white">
                <input type="radio" checked={form.autoSeating} onChange={() => set('autoSeating', true)} className="accent-[var(--casino-gold)]" />
                Automatic
              </label>
              <label className="flex items-center gap-2 text-white">
                <input type="radio" checked={!form.autoSeating} onChange={() => set('autoSeating', false)} className="accent-[var(--casino-gold)]" />
                Manual
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[var(--casino-gold)] text-[var(--casino-dark)] font-semibold py-3 rounded-lg hover:bg-[var(--casino-gold-light)] transition-colors text-lg"
          >
            Create Tournament
          </button>
        </form>
      </div>
    </div>
  );
}
