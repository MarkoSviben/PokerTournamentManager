import { Router, Response } from 'express';
import db from '../db/database';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/', (req: AuthRequest, res: Response) => {
  const tournaments = db.prepare('SELECT * FROM tournaments WHERE admin_id = ? ORDER BY created_at DESC').all(req.adminId);
  res.json(tournaments);
});

router.get('/:id', (req: AuthRequest, res: Response) => {
  const t = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id) as any;
  if (!t) return res.status(404).json({ error: 'Not found' });

  const entries = db.prepare(`
    SELECT te.*, p.name as player_name
    FROM tournament_entries te
    JOIN players p ON p.id = te.player_id
    WHERE te.tournament_id = ?
    ORDER BY te.registered_at
  `).all(t.id);

  const tables = db.prepare('SELECT * FROM tournament_tables WHERE tournament_id = ? ORDER BY table_number').all(t.id);

  const rebuys = db.prepare('SELECT * FROM rebuys WHERE tournament_id = ?').all(t.id);
  const addons = db.prepare('SELECT * FROM addons WHERE tournament_id = ?').all(t.id);

  const blindStructure = db.prepare('SELECT * FROM blind_structures WHERE id = ?').get(t.blind_structure_id) as any;
  const levels = blindStructure
    ? db.prepare('SELECT * FROM blind_levels WHERE structure_id = ? ORDER BY level_order').all(blindStructure.id)
    : [];

  const payouts = db.prepare('SELECT * FROM payout_structures WHERE tournament_id = ? ORDER BY position').all(t.id);

  res.json({
    ...t,
    entries,
    tables,
    rebuys,
    addons,
    blindStructure: blindStructure ? { ...blindStructure, levels } : null,
    payouts,
  });
});

router.post('/', (req: AuthRequest, res: Response) => {
  const {
    name, gtd, rakePercent, buyinAmount, startingChips,
    rebuyEnabled, rebuyCost, rebuyChips,
    addonEnabled, addonCost, addonChips,
    blindStructureId, autoSeating
  } = req.body;

  if (!name || !buyinAmount || !startingChips || !blindStructureId) {
    return res.status(400).json({ error: 'Name, buyin, starting chips, and blind structure required' });
  }

  const result = db.prepare(`
    INSERT INTO tournaments (admin_id, name, gtd, rake_percent, buyin_amount, starting_chips,
      rebuy_enabled, rebuy_cost, rebuy_chips, addon_enabled, addon_cost, addon_chips,
      blind_structure_id, auto_seating)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.adminId, name, gtd || 0, rakePercent || 0, buyinAmount, startingChips,
    rebuyEnabled ? 1 : 0, rebuyCost || 0, rebuyChips || 0,
    addonEnabled ? 1 : 0, addonCost || 0, addonChips || 0,
    blindStructureId, autoSeating !== false ? 1 : 0
  );

  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(tournament);
});

router.put('/:id', (req: AuthRequest, res: Response) => {
  const t = db.prepare('SELECT * FROM tournaments WHERE id = ? AND admin_id = ?').get(req.params.id, req.adminId) as any;
  if (!t) return res.status(404).json({ error: 'Not found' });

  const fields = ['name', 'gtd', 'rake_percent', 'buyin_amount', 'starting_chips',
    'rebuy_enabled', 'rebuy_cost', 'rebuy_chips', 'addon_enabled', 'addon_cost', 'addon_chips',
    'auto_seating'];

  const updates: string[] = [];
  const values: any[] = [];

  const fieldMap: Record<string, string> = {
    name: 'name', gtd: 'gtd', rakePercent: 'rake_percent', buyinAmount: 'buyin_amount',
    startingChips: 'starting_chips', rebuyEnabled: 'rebuy_enabled', rebuyCost: 'rebuy_cost',
    rebuyChips: 'rebuy_chips', addonEnabled: 'addon_enabled', addonCost: 'addon_cost',
    addonChips: 'addon_chips', autoSeating: 'auto_seating'
  };

  for (const [jsKey, dbKey] of Object.entries(fieldMap)) {
    if (req.body[jsKey] !== undefined) {
      updates.push(`${dbKey} = ?`);
      values.push(req.body[jsKey]);
    }
  }

  if (updates.length > 0) {
    values.push(t.id);
    db.prepare(`UPDATE tournaments SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }

  const updated = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(t.id);
  res.json(updated);
});

router.post('/:id/start', (req: AuthRequest, res: Response) => {
  const t = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id) as any;
  if (!t) return res.status(404).json({ error: 'Not found' });
  if (t.status !== 'registration') return res.status(400).json({ error: 'Tournament not in registration' });

  const now = new Date().toISOString();
  db.prepare('UPDATE tournaments SET status = ?, started_at = ?, level_started_at = ? WHERE id = ?')
    .run('running', now, now, t.id);

  res.json(db.prepare('SELECT * FROM tournaments WHERE id = ?').get(t.id));
});

router.post('/:id/pause', (req: AuthRequest, res: Response) => {
  const t = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id) as any;
  if (!t || t.status !== 'running') return res.status(400).json({ error: 'Tournament not running' });

  const now = Date.now();
  const levelStart = new Date(t.level_started_at).getTime();
  const elapsedInLevel = Math.floor((now - levelStart) / 1000);
  const totalElapsed = t.elapsed_seconds_before_current + elapsedInLevel;

  db.prepare('UPDATE tournaments SET status = ?, elapsed_seconds_before_current = ?, level_started_at = NULL WHERE id = ?')
    .run('paused', totalElapsed, t.id);

  res.json(db.prepare('SELECT * FROM tournaments WHERE id = ?').get(t.id));
});

router.post('/:id/resume', (req: AuthRequest, res: Response) => {
  const t = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id) as any;
  if (!t || t.status !== 'paused') return res.status(400).json({ error: 'Tournament not paused' });

  const now = new Date().toISOString();
  db.prepare('UPDATE tournaments SET status = ?, level_started_at = ? WHERE id = ?')
    .run('running', now, t.id);

  res.json(db.prepare('SELECT * FROM tournaments WHERE id = ?').get(t.id));
});

router.post('/:id/next-level', (req: AuthRequest, res: Response) => {
  const t = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id) as any;
  if (!t || (t.status !== 'running' && t.status !== 'paused')) {
    return res.status(400).json({ error: 'Tournament not active' });
  }

  const blindStructure = db.prepare('SELECT * FROM blind_structures WHERE id = ?').get(t.blind_structure_id) as any;
  const levels = db.prepare('SELECT * FROM blind_levels WHERE structure_id = ? ORDER BY level_order').all(blindStructure.id) as any[];

  if (t.current_level >= levels.length) {
    return res.status(400).json({ error: 'Already at last level' });
  }

  const currentLevel = levels[t.current_level - 1];
  const levelDurationSecs = currentLevel.duration_minutes * 60;
  const newElapsed = t.elapsed_seconds_before_current + levelDurationSecs;
  const now = new Date().toISOString();

  db.prepare('UPDATE tournaments SET current_level = ?, elapsed_seconds_before_current = ?, level_started_at = ? WHERE id = ?')
    .run(t.current_level + 1, newElapsed, t.status === 'running' ? now : null, t.id);

  res.json(db.prepare('SELECT * FROM tournaments WHERE id = ?').get(t.id));
});

router.post('/:id/finish', (req: AuthRequest, res: Response) => {
  const t = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id) as any;
  if (!t) return res.status(404).json({ error: 'Not found' });

  const now = new Date().toISOString();
  db.prepare('UPDATE tournaments SET status = ?, finished_at = ? WHERE id = ?').run('finished', now, t.id);

  res.json(db.prepare('SELECT * FROM tournaments WHERE id = ?').get(t.id));
});

export default router;
