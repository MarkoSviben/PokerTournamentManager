import { Router, Response } from 'express';
import db from '../db/database';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// Register player to tournament
router.post('/:tournamentId/entries', (req: AuthRequest, res: Response) => {
  const { playerId, tableId, seatNumber } = req.body;
  const tournamentId = req.params.tournamentId;

  const t = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId) as any;
  if (!t) return res.status(404).json({ error: 'Tournament not found' });

  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId) as any;
  if (!player) return res.status(404).json({ error: 'Player not found' });

  const existing = db.prepare(
    'SELECT * FROM tournament_entries WHERE tournament_id = ? AND player_id = ? AND status = ?'
  ).get(tournamentId, playerId, 'active') as any;
  if (existing) return res.status(409).json({ error: 'Player already registered and active' });

  const transaction = db.transaction(() => {
    const entryResult = db.prepare(
      'INSERT INTO tournament_entries (tournament_id, player_id, table_id, seat_number) VALUES (?, ?, ?, ?)'
    ).run(tournamentId, playerId, tableId || null, seatNumber || null);

    const ticketResult = db.prepare(
      'INSERT INTO tickets (tournament_id, entry_id, ticket_type, amount) VALUES (?, ?, ?, ?)'
    ).run(tournamentId, entryResult.lastInsertRowid, 'buyin', t.buyin_amount);

    return { entryId: entryResult.lastInsertRowid, ticketId: ticketResult.lastInsertRowid };
  });

  const { entryId, ticketId } = transaction();
  const entry = db.prepare(`
    SELECT te.*, p.name as player_name FROM tournament_entries te
    JOIN players p ON p.id = te.player_id WHERE te.id = ?
  `).get(entryId);
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);

  res.status(201).json({ entry, ticket });
});

// Remove entry (before tournament starts)
router.delete('/:tournamentId/entries/:entryId', (req: AuthRequest, res: Response) => {
  const { tournamentId, entryId } = req.params;
  const t = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId) as any;
  if (!t) return res.status(404).json({ error: 'Tournament not found' });
  if (t.status !== 'registration') return res.status(400).json({ error: 'Can only remove entries during registration' });

  db.prepare('DELETE FROM tickets WHERE entry_id = ?').run(entryId);
  db.prepare('DELETE FROM tournament_entries WHERE id = ? AND tournament_id = ?').run(entryId, tournamentId);
  res.json({ success: true });
});

// Eliminate player
router.post('/:tournamentId/entries/:entryId/eliminate', (req: AuthRequest, res: Response) => {
  const { tournamentId, entryId } = req.params;

  const activeCount = db.prepare(
    'SELECT COUNT(*) as count FROM tournament_entries WHERE tournament_id = ? AND status = ?'
  ).get(tournamentId, 'active') as any;

  const position = activeCount.count;
  const now = new Date().toISOString();

  db.prepare(
    'UPDATE tournament_entries SET status = ?, eliminated_at = ?, eliminated_position = ? WHERE id = ?'
  ).run('eliminated', now, position, entryId);

  const entry = db.prepare(`
    SELECT te.*, p.name as player_name FROM tournament_entries te
    JOIN players p ON p.id = te.player_id WHERE te.id = ?
  `).get(entryId);

  res.json(entry);
});

// Rebuy
router.post('/:tournamentId/entries/:entryId/rebuy', (req: AuthRequest, res: Response) => {
  const { tournamentId, entryId } = req.params;

  const t = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId) as any;
  if (!t || !t.rebuy_enabled) return res.status(400).json({ error: 'Rebuys not enabled' });

  const transaction = db.transaction(() => {
    const rebuyResult = db.prepare(
      'INSERT INTO rebuys (tournament_id, entry_id) VALUES (?, ?)'
    ).run(tournamentId, entryId);

    const ticketResult = db.prepare(
      'INSERT INTO tickets (tournament_id, entry_id, ticket_type, amount) VALUES (?, ?, ?, ?)'
    ).run(tournamentId, entryId, 'rebuy', t.rebuy_cost);

    return { rebuyId: rebuyResult.lastInsertRowid, ticketId: ticketResult.lastInsertRowid };
  });

  const { ticketId } = transaction();
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
  res.status(201).json({ ticket });
});

// Addon
router.post('/:tournamentId/entries/:entryId/addon', (req: AuthRequest, res: Response) => {
  const { tournamentId, entryId } = req.params;

  const t = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId) as any;
  if (!t || !t.addon_enabled) return res.status(400).json({ error: 'Add-ons not enabled' });

  const transaction = db.transaction(() => {
    const addonResult = db.prepare(
      'INSERT INTO addons (tournament_id, entry_id) VALUES (?, ?)'
    ).run(tournamentId, entryId);

    const ticketResult = db.prepare(
      'INSERT INTO tickets (tournament_id, entry_id, ticket_type, amount) VALUES (?, ?, ?, ?)'
    ).run(tournamentId, entryId, 'addon', t.addon_cost);

    return { addonId: addonResult.lastInsertRowid, ticketId: ticketResult.lastInsertRowid };
  });

  const { ticketId } = transaction();
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
  res.status(201).json({ ticket });
});

export default router;
