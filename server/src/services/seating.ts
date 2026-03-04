import db from '../db/database';

export function getRebalanceSuggestions(tournamentId: number) {
  const tables = db.prepare('SELECT * FROM tournament_tables WHERE tournament_id = ? ORDER BY table_number').all(tournamentId) as any[];

  const tableCounts = tables.map(t => {
    const count = db.prepare(
      'SELECT COUNT(*) as count FROM tournament_entries WHERE table_id = ? AND status = ?'
    ).get(t.id, 'active') as any;
    return { ...t, playerCount: count.count };
  }).filter(t => t.playerCount > 0);

  if (tableCounts.length <= 1) return [];

  const suggestions: string[] = [];
  const maxPlayers = Math.max(...tableCounts.map(t => t.playerCount));
  const minPlayers = Math.min(...tableCounts.map(t => t.playerCount));

  if (maxPlayers - minPlayers > 2) {
    suggestions.push(`Tables are unbalanced (${minPlayers}-${maxPlayers} players). Consider rebalancing.`);
  }

  // Check if a table can be collapsed
  const totalPlayers = tableCounts.reduce((sum, t) => sum + t.playerCount, 0);
  const minTables = Math.ceil(totalPlayers / 9);
  if (tableCounts.length > minTables) {
    suggestions.push(`${tableCounts.length - minTables} table(s) can be removed by consolidating players.`);
  }

  return suggestions;
}
