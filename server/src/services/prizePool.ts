import db from '../db/database';

export function calculatePrizePool(tournamentId: number) {
  const t = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId) as any;
  if (!t) return null;

  const entryCount = db.prepare(
    'SELECT COUNT(*) as count FROM tournament_entries WHERE tournament_id = ?'
  ).get(tournamentId) as any;

  const rebuyCount = db.prepare(
    'SELECT COUNT(*) as count FROM rebuys WHERE tournament_id = ?'
  ).get(tournamentId) as any;

  const addonCount = db.prepare(
    'SELECT COUNT(*) as count FROM addons WHERE tournament_id = ?'
  ).get(tournamentId) as any;

  const totalMoney = (entryCount.count * t.buyin_amount) +
    (rebuyCount.count * t.rebuy_cost) +
    (addonCount.count * t.addon_cost);

  const rake = Math.floor(totalMoney * (t.rake_percent / 100));
  const actualPrizePool = totalMoney - rake;
  const displayPrizePool = Math.max(t.gtd, actualPrizePool);

  return {
    entries: entryCount.count,
    rebuys: rebuyCount.count,
    addons: addonCount.count,
    totalMoney,
    rake,
    actualPrizePool,
    displayPrizePool,
  };
}
