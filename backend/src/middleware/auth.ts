import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'versionmanage-secret-key-2024';

export interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '需要登录' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    req.userId = payload.id;
    req.userRole = payload.role;
    next();
  } catch {
    return res.status(403).json({ error: 'Token 无效或已过期' });
  }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as any;
      req.userId = payload.id;
      req.userRole = payload.role;
    } catch { /* ignore */ }
  }
  next();
}

export { JWT_SECRET };
