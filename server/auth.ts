import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import type { Database } from 'sql.js';
import { getDb, queryOne, executeRun } from './db.js';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: 'ADMIN' | 'USER';
  created_at: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  sessionId?: string;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(db: Database, userId: string, userAgent?: string): Promise<string> {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const now = new Date().toISOString();
  // 14 days expiration
  const expiresAt = Date.now() + 14 * 24 * 60 * 60 * 1000;

  executeRun(
    db,
    `INSERT INTO sessions (id, user_id, expires_at, created_at, user_agent) VALUES (?, ?, ?, ?, ?)`,
    [sessionId, userId, expiresAt, now, userAgent || '']
  );

  return sessionId;
}

export async function destroySession(db: Database, sessionId: string): Promise<void> {
  executeRun(db, `DELETE FROM sessions WHERE id = ?`, [sessionId]);
}

export function logAudit(
  db: Database,
  userId: string | null,
  action: string,
  details: Record<string, any> = {},
  ip: string = ''
) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  executeRun(
    db,
    `INSERT INTO audit_logs (id, user_id, action, details_json, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, userId, action, JSON.stringify(details), ip, now]
  );
}

export async function authenticateRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const db = await getDb();
    let sessionId = req.cookies?.mastery_session;
    
    // Check Bearer authorization header if cookie is missing
    const authHeader = req.headers.authorization;
    if (!sessionId && authHeader && authHeader.startsWith('Bearer ')) {
      sessionId = authHeader.substring(7);
    }

    if (!sessionId) {
      return next();
    }

    const session = queryOne<{ user_id: string; expires_at: number }>(
      db,
      `SELECT user_id, expires_at FROM sessions WHERE id = ?`,
      [sessionId]
    );

    if (!session) {
      return next();
    }

    if (Date.now() > session.expires_at) {
      executeRun(db, `DELETE FROM sessions WHERE id = ?`, [sessionId]);
      return next();
    }

    const user = queryOne<AuthUser>(
      db,
      `SELECT id, email, full_name, role, created_at FROM users WHERE id = ?`,
      [session.user_id]
    );

    if (user) {
      req.user = user;
      req.sessionId = sessionId;
    }
    next();
  } catch (err) {
    console.error('Authentication error:', err);
    next();
  }
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied: Administrator privileges required.' });
  }
  next();
}
