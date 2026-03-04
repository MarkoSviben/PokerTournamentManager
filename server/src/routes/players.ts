import { Router } from 'express';
import db from '../db/database';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const search = req.query.search as string;
  if (search) {
    const players = db.prepare('SELECT * FROM players WHERE name LIKE ? ORDER BY name').all(`%${search}%`);
    return res.json(players);
  }
  const players = db.prepare('SELECT * FROM players ORDER BY name').all();
  res.json(players);
});

router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });

  const result = db.prepare('INSERT INTO players (name) VALUES (?)').run(name.trim());
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(player);
});

router.put('/:id', (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });

  db.prepare('UPDATE players SET name = ? WHERE id = ?').run(name.trim(), req.params.id);
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  res.json(player);
});

export default router;
