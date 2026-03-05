import { Router } from 'express';
import db from '../db/database';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/', (req: AuthRequest, res) => {
  const search = req.query.search as string;
  if (search) {
    const players = db.prepare('SELECT * FROM players WHERE admin_id = ? AND name LIKE ? ORDER BY name').all(req.adminId, `%${search}%`);
    return res.json(players);
  }
  const players = db.prepare('SELECT * FROM players WHERE admin_id = ? ORDER BY name').all(req.adminId);
  res.json(players);
});

router.post('/', (req: AuthRequest, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });

  const result = db.prepare('INSERT INTO players (admin_id, name) VALUES (?, ?)').run(req.adminId, name.trim());
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(player);
});

router.put('/:id', (req: AuthRequest, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });

  db.prepare('UPDATE players SET name = ? WHERE id = ? AND admin_id = ?').run(name.trim(), req.params.id, req.adminId);
  const player = db.prepare('SELECT * FROM players WHERE id = ? AND admin_id = ?').get(req.params.id, req.adminId);
  if (!player) return res.status(404).json({ error: 'Player not found' });
  res.json(player);
});

export default router;
