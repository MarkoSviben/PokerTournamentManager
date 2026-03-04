import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/database';
import { AuthRequest, authMiddleware, signToken } from '../middleware/auth';

const router = Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username) as any;
  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signToken(admin.id);
  res.json({ token, admin: { id: admin.id, username: admin.username, displayName: admin.display_name } });
});

router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const admin = db.prepare('SELECT id, username, display_name FROM admins WHERE id = ?').get(req.adminId) as any;
  if (!admin) {
    return res.status(404).json({ error: 'Admin not found' });
  }
  res.json({ id: admin.id, username: admin.username, displayName: admin.display_name });
});

router.post('/register', (req, res) => {
  const { username, password, displayName } = req.body;
  if (!username || !password || !displayName) {
    return res.status(400).json({ error: 'Username, password, and display name required' });
  }

  const existing = db.prepare('SELECT id FROM admins WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'Username already exists' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO admins (username, password_hash, display_name) VALUES (?, ?, ?)').run(username, hash, displayName);
  const token = signToken(result.lastInsertRowid as number);
  res.status(201).json({ token, admin: { id: result.lastInsertRowid, username, displayName } });
});

export default router;
