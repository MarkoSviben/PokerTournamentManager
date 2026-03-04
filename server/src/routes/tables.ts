import { Router, Response } from 'express';
import db from '../db/database';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/:tournamentId/tables', (req: AuthRequest, res: Response) => {
  const tables = db.prepare('SELECT * FROM tournament_tables WHERE tournament_id = ? ORDER BY table_number').all(req.params.tournamentId) as any[];

  const tablesWithPlayers = tables.map(table => {
    const players = db.prepare(`
      SELECT te.*, p.name as player_name FROM tournament_entries te
      JOIN players p ON p.id = te.player_id
      WHERE te.table_id = ? AND te.status = 'active'
      ORDER BY te.seat_number
    `).all(table.id);
    return { ...table, players };
  });

  res.json(tablesWithPlayers);
});

router.post('/:tournamentId/tables', (req: AuthRequest, res: Response) => {
  const tournamentId = req.params.tournamentId;
  const maxTable = db.prepare(
    'SELECT MAX(table_number) as max_num FROM tournament_tables WHERE tournament_id = ?'
  ).get(tournamentId) as any;

  const tableNumber = (maxTable?.max_num || 0) + 1;
  const result = db.prepare('INSERT INTO tournament_tables (tournament_id, table_number) VALUES (?, ?)').run(tournamentId, tableNumber);

  res.status(201).json({ id: result.lastInsertRowid, tournament_id: parseInt(tournamentId as string), table_number: tableNumber, players: [] });
});

router.post('/:tournamentId/tables/auto-seat', (req: AuthRequest, res: Response) => {
  const tournamentId = req.params.tournamentId;

  const unseated = db.prepare(
    'SELECT * FROM tournament_entries WHERE tournament_id = ? AND table_id IS NULL AND status = ?'
  ).all(tournamentId, 'active') as any[];

  if (unseated.length === 0) return res.json({ message: 'No unseated players' });

  const transaction = db.transaction(() => {
    let tables = db.prepare('SELECT * FROM tournament_tables WHERE tournament_id = ? ORDER BY table_number').all(tournamentId) as any[];

    // Create tables if none exist
    if (tables.length === 0) {
      const numTables = Math.ceil(unseated.length / 9);
      for (let i = 1; i <= numTables; i++) {
        db.prepare('INSERT INTO tournament_tables (tournament_id, table_number) VALUES (?, ?)').run(tournamentId, i);
      }
      tables = db.prepare('SELECT * FROM tournament_tables WHERE tournament_id = ? ORDER BY table_number').all(tournamentId) as any[];
    }

    // Count existing seats per table
    const tableCounts = tables.map(t => {
      const count = db.prepare(
        'SELECT COUNT(*) as count FROM tournament_entries WHERE table_id = ? AND status = ?'
      ).get(t.id, 'active') as any;
      return { ...t, count: count.count };
    });

    // Round-robin assign unseated players
    for (const entry of unseated) {
      // Find table with fewest players that's not full
      tableCounts.sort((a, b) => a.count - b.count);
      let targetTable = tableCounts.find(t => t.count < 9);

      if (!targetTable) {
        // All tables full, create new one
        const newNum = tableCounts.length + 1;
        const result = db.prepare('INSERT INTO tournament_tables (tournament_id, table_number) VALUES (?, ?)').run(tournamentId, newNum);
        targetTable = { id: result.lastInsertRowid, table_number: newNum, count: 0 };
        tableCounts.push(targetTable);
      }

      // Find available seat
      const usedSeats = db.prepare(
        'SELECT seat_number FROM tournament_entries WHERE table_id = ? AND status = ?'
      ).all(targetTable.id, 'active') as any[];
      const usedSet = new Set(usedSeats.map((s: any) => s.seat_number));
      let seat = 1;
      while (usedSet.has(seat)) seat++;

      db.prepare('UPDATE tournament_entries SET table_id = ?, seat_number = ? WHERE id = ?')
        .run(targetTable.id, seat, entry.id);
      targetTable.count++;
    }
  });

  transaction();

  // Return updated tables
  const tables = db.prepare('SELECT * FROM tournament_tables WHERE tournament_id = ? ORDER BY table_number').all(tournamentId) as any[];
  const tablesWithPlayers = tables.map(table => {
    const players = db.prepare(`
      SELECT te.*, p.name as player_name FROM tournament_entries te
      JOIN players p ON p.id = te.player_id
      WHERE te.table_id = ? AND te.status = 'active'
      ORDER BY te.seat_number
    `).all(table.id);
    return { ...table, players };
  });

  res.json(tablesWithPlayers);
});

router.put('/:tournamentId/tables/:tableId/move', (req: AuthRequest, res: Response) => {
  const { entryId, seatNumber } = req.body;
  const { tableId } = req.params;

  // Check seat not taken
  const existing = db.prepare(
    'SELECT * FROM tournament_entries WHERE table_id = ? AND seat_number = ? AND status = ?'
  ).get(tableId, seatNumber, 'active') as any;
  if (existing) return res.status(409).json({ error: 'Seat already occupied' });

  db.prepare('UPDATE tournament_entries SET table_id = ?, seat_number = ? WHERE id = ?')
    .run(tableId, seatNumber, entryId);

  res.json({ success: true });
});

export default router;
