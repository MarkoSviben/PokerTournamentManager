import { Router, Response } from 'express';
import db from '../db/database';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/:tournamentId/tickets', (req: AuthRequest, res: Response) => {
  const tickets = db.prepare(`
    SELECT t.*, p.name as player_name, te.seat_number, tt.table_number
    FROM tickets t
    JOIN tournament_entries te ON te.id = t.entry_id
    JOIN players p ON p.id = te.player_id
    LEFT JOIN tournament_tables tt ON tt.id = te.table_id
    WHERE t.tournament_id = ?
    ORDER BY t.created_at DESC
  `).all(req.params.tournamentId);
  res.json(tickets);
});

router.get('/ticket/:ticketId', (req: AuthRequest, res: Response) => {
  const ticket = db.prepare(`
    SELECT t.*, p.name as player_name, te.seat_number, tt.table_number,
           tn.name as tournament_name, tn.buyin_amount, tn.rebuy_chips, tn.addon_chips, tn.starting_chips
    FROM tickets t
    JOIN tournament_entries te ON te.id = t.entry_id
    JOIN players p ON p.id = te.player_id
    LEFT JOIN tournament_tables tt ON tt.id = te.table_id
    JOIN tournaments tn ON tn.id = t.tournament_id
    WHERE t.id = ?
  `).get(req.params.ticketId);

  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  res.json(ticket);
});

export default router;
