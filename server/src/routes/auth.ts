import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/database';
import { AuthRequest, authMiddleware, signToken } from '../middleware/auth';

const router = Router();

// Register with email, username, password, display name
router.post('/register', (req, res) => {
  const { email, username, password, displayName } = req.body;
  if (!email || !username || !password || !displayName) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const existingEmail = db.prepare('SELECT id FROM admins WHERE email = ?').get(email);
  if (existingEmail) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const existingUser = db.prepare('SELECT id FROM admins WHERE username = ?').get(username);
  if (existingUser) {
    return res.status(409).json({ error: 'Username already taken' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO admins (email, username, password_hash, display_name) VALUES (?, ?, ?, ?)'
  ).run(email, username, hash, displayName);

  const token = signToken(result.lastInsertRowid as number);
  res.status(201).json({
    token,
    admin: { id: result.lastInsertRowid, username, displayName },
  });
});

// Login with username + password
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
  res.json({
    token,
    admin: { id: admin.id, username: admin.username, displayName: admin.display_name },
  });
});

// Get current admin
router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const admin = db.prepare('SELECT id, username, display_name FROM admins WHERE id = ?').get(req.adminId) as any;
  if (!admin) {
    return res.status(404).json({ error: 'Admin not found' });
  }
  res.json({ id: admin.id, username: admin.username, displayName: admin.display_name });
});

export default router;
