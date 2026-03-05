import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/database';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// Super admin guard: only admin with id=1
function superAdminOnly(req: AuthRequest, res: Response, next: () => void) {
  if (req.adminId !== 1) {
    return res.status(403).json({ error: 'Super admin access only' });
  }
  next();
}

router.use(superAdminOnly);

// List all admins
router.get('/admins', (req: AuthRequest, res: Response) => {
  const admins = db.prepare('SELECT id, email, username, display_name, created_at FROM admins ORDER BY id').all();
  res.json(admins);
});

// Create admin
router.post('/admins', (req: AuthRequest, res: Response) => {
  const { email, username, password, displayName } = req.body;
  if (!email || !username || !password || !displayName) {
    return res.status(400).json({ error: 'All fields required' });
  }

  const existingEmail = db.prepare('SELECT id FROM admins WHERE email = ?').get(email);
  if (existingEmail) return res.status(409).json({ error: 'Email already exists' });

  const existingUser = db.prepare('SELECT id FROM admins WHERE username = ?').get(username);
  if (existingUser) return res.status(409).json({ error: 'Username already exists' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO admins (email, username, password_hash, display_name) VALUES (?, ?, ?, ?)'
  ).run(email, username, hash, displayName);

  const admin = db.prepare('SELECT id, email, username, display_name, created_at FROM admins WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(admin);
});

// Delete admin (cannot delete self / super admin)
router.delete('/admins/:adminId', (req: AuthRequest, res: Response) => {
  const targetId = parseInt(req.params.adminId as string);
  if (targetId === 1) return res.status(400).json({ error: 'Cannot delete super admin' });

  db.prepare('DELETE FROM admins WHERE id = ?').run(targetId);
  res.json({ success: true });
});

// Reset admin password
router.put('/admins/:adminId/password', (req: AuthRequest, res: Response) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });

  const hash = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hash, req.params.adminId);
  res.json({ success: true });
});

export default router;
