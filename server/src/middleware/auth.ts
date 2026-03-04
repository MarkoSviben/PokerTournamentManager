import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'xpoker-secret-key-change-in-production';

export interface AuthRequest extends Request {
  adminId?: number;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { adminId: number };
    req.adminId = decoded.adminId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function signToken(adminId: number): string {
  return jwt.sign({ adminId }, JWT_SECRET, { expiresIn: '8h' });
}
