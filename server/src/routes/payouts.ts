import { Router, Response } from 'express';
import db from '../db/database';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/:tournamentId/payouts', (req: AuthRequest, res: Response) => {
  const payouts = db.prepare('SELECT * FROM payout_structures WHERE tournament_id = ? ORDER BY position').all(req.params.tournamentId);
  res.json(payouts);
});

router.put('/:tournamentId/payouts', (req: AuthRequest, res: Response) => {
  const { payouts } = req.body;
  const tournamentId = req.params.tournamentId;

  if (!payouts?.length) return res.status(400).json({ error: 'Payouts required' });

  const totalPercentage = payouts.reduce((sum: number, p: any) => sum + p.percentage, 0);
  if (Math.abs(totalPercentage - 100) > 0.01) {
    return res.status(400).json({ error: 'Percentages must sum to 100' });
  }

  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM payout_structures WHERE tournament_id = ?').run(tournamentId);
    const insert = db.prepare('INSERT INTO payout_structures (tournament_id, position, percentage) VALUES (?, ?, ?)');
    for (const p of payouts) {
      insert.run(tournamentId, p.position, p.percentage);
    }
  });

  transaction();
  const saved = db.prepare('SELECT * FROM payout_structures WHERE tournament_id = ? ORDER BY position').all(tournamentId);
  res.json(saved);
});

export default router;
