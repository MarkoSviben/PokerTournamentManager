import { Router, Response } from 'express';
import db from '../db/database';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/', (req: AuthRequest, res: Response) => {
  const structures = db.prepare('SELECT * FROM blind_structures WHERE admin_id = ? ORDER BY created_at DESC').all(req.adminId);
  res.json(structures);
});

router.get('/:id', (req: AuthRequest, res: Response) => {
  const structure = db.prepare('SELECT * FROM blind_structures WHERE id = ? AND admin_id = ?').get(req.params.id, req.adminId) as any;
  if (!structure) return res.status(404).json({ error: 'Not found' });

  const levels = db.prepare('SELECT * FROM blind_levels WHERE structure_id = ? ORDER BY level_order').all(structure.id);
  res.json({ ...structure, levels });
});

router.post('/', (req: AuthRequest, res: Response) => {
  const { name, levels } = req.body;
  if (!name || !levels?.length) {
    return res.status(400).json({ error: 'Name and levels required' });
  }

  const insertStructure = db.prepare('INSERT INTO blind_structures (admin_id, name) VALUES (?, ?)');
  const insertLevel = db.prepare(
    'INSERT INTO blind_levels (structure_id, level_order, small_blind, big_blind, ante, duration_minutes, is_break) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  const transaction = db.transaction(() => {
    const result = insertStructure.run(req.adminId, name);
    const structureId = result.lastInsertRowid;
    for (let i = 0; i < levels.length; i++) {
      const l = levels[i];
      insertLevel.run(structureId, i + 1, l.smallBlind || 0, l.bigBlind || 0, l.ante || 0, l.durationMinutes, l.isBreak ? 1 : 0);
    }
    return structureId;
  });

  const structureId = transaction();
  const structure = db.prepare('SELECT * FROM blind_structures WHERE id = ?').get(structureId) as any;
  const savedLevels = db.prepare('SELECT * FROM blind_levels WHERE structure_id = ? ORDER BY level_order').all(structureId);
  res.status(201).json({ ...structure, levels: savedLevels });
});

router.put('/:id', (req: AuthRequest, res: Response) => {
  const { name, levels } = req.body;
  const structure = db.prepare('SELECT * FROM blind_structures WHERE id = ? AND admin_id = ?').get(req.params.id, req.adminId) as any;
  if (!structure) return res.status(404).json({ error: 'Not found' });

  const transaction = db.transaction(() => {
    if (name) db.prepare('UPDATE blind_structures SET name = ? WHERE id = ?').run(name, structure.id);
    if (levels?.length) {
      db.prepare('DELETE FROM blind_levels WHERE structure_id = ?').run(structure.id);
      const insertLevel = db.prepare(
        'INSERT INTO blind_levels (structure_id, level_order, small_blind, big_blind, ante, duration_minutes, is_break) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      for (let i = 0; i < levels.length; i++) {
        const l = levels[i];
        insertLevel.run(structure.id, i + 1, l.smallBlind || 0, l.bigBlind || 0, l.ante || 0, l.durationMinutes, l.isBreak ? 1 : 0);
      }
    }
  });

  transaction();
  const updated = db.prepare('SELECT * FROM blind_structures WHERE id = ?').get(structure.id) as any;
  const savedLevels = db.prepare('SELECT * FROM blind_levels WHERE structure_id = ? ORDER BY level_order').all(structure.id);
  res.json({ ...updated, levels: savedLevels });
});

router.delete('/:id', (req: AuthRequest, res: Response) => {
  const structure = db.prepare('SELECT * FROM blind_structures WHERE id = ? AND admin_id = ?').get(req.params.id, req.adminId) as any;
  if (!structure) return res.status(404).json({ error: 'Not found' });

  db.prepare('DELETE FROM blind_structures WHERE id = ?').run(structure.id);
  res.json({ success: true });
});

export default router;
