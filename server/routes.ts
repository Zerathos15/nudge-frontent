import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { getDb, queryAll, queryOne, executeRun } from './db.js';
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  logAudit,
  requireAuth,
  requireAdmin,
  AuthenticatedRequest,
} from './auth.js';
import {
  parseCurriculumTextWithGemini,
  parseScheduleTextWithGemini,
  evaluateEvidenceWithGemini,
  generateMasteryAssessment,
  evaluateMasteryAnswers,
  ParsedCurriculum,
  ParsedSchedule,
} from './gemini.js';
import { extractTextFromPdf } from './pdf.js';
import {
  getOrCreateScheduleForDate,
  getTrackCheckpoint,
  updateCheckpointOnCompletion,
  isTopicEligible,
} from './scheduler.js';
import {
  getSampleCurriculumPdf,
  getSampleSchedulePdf,
} from './samplePdfs.js';
import {
  verifyEmailAddress,
  sendOtpEmail,
  sendPasswordResetEmail,
} from './mailer.js';

const router = express.Router();

// Configure Multer for secure PDF uploads
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${crypto.randomUUID()}${ext}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF documents are permitted.'));
    }
  },
});

// Memory storage for immediate PDF ingestion
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

// Staged preview cache for admin validation before activation
let stagedCurriculum: {
  rawText: string;
  filename: string;
  parsed: ParsedCurriculum;
  timestamp: string;
} | null = null;

let stagedSchedule: {
  rawText: string;
  filename: string;
  parsed: ParsedSchedule;
  timestamp: string;
} | null = null;

// ==========================================
// 1. AUTHENTICATION & PROFILE ROUTES
// ==========================================

// Step 1: Send Registration OTP after verifying email existence & format
router.post('/auth/register/send-otp', async (req: Request, res: Response) => {
  try {
    const { email, password, full_name } = req.body;
    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, password, and full name are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = full_name.trim();

    // Verify email format and DNS existence (supporting Gmail, Yahoo, Outlook, Proton, custom, etc.)
    const emailVerification = await verifyEmailAddress(cleanEmail);
    if (!emailVerification.valid) {
      return res.status(400).json({
        error: emailVerification.reason || 'The provided email domain does not appear to exist or cannot receive mail.',
      });
    }

    const db = await getDb();
    const existing = queryOne(db, `SELECT id FROM users WHERE email = ?`, [cleanEmail]);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email address already exists. Please sign in.' });
    }

    // Generate secure 6-digit numeric OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    const id = crypto.randomUUID();
    const passHash = await hashPassword(password);
    const now = new Date().toISOString();

    // Invalidate any previous pending OTP for this email
    executeRun(db, `DELETE FROM email_verifications WHERE email = ?`, [cleanEmail]);

    // Store pending verification
    executeRun(
      db,
      `INSERT INTO email_verifications (id, email, otp_code, full_name, password_hash, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, cleanEmail, otpCode, cleanName, passHash, expiresAt, now]
    );

    // Dispatch email
    const mailResult = await sendOtpEmail(cleanEmail, otpCode, cleanName);

    logAudit(db, null, 'OTP_SENT', { email: cleanEmail }, req.ip);

    res.json({
      message: `A 6-digit confirmation code has been dispatched to ${cleanEmail}. Please confirm it to complete registration.`,
      email: cleanEmail,
      devNotice: mailResult.devNotice,
      devOtp: process.env.NODE_ENV !== 'production' ? otpCode : undefined,
    });
  } catch (err: any) {
    console.error('Registration send OTP error:', err);
    res.status(500).json({ error: err.message || 'Failed to dispatch verification code.' });
  }
});

// Step 2: Confirm OTP and finalize account creation
router.post('/auth/register/verify-otp', async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and 6-digit verification code are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = otp.toString().trim();

    const db = await getDb();
    const pending = queryOne<{
      id: string;
      email: string;
      otp_code: string;
      full_name: string;
      password_hash: string;
      expires_at: number;
    }>(
      db,
      `SELECT * FROM email_verifications WHERE email = ? ORDER BY expires_at DESC LIMIT 1`,
      [cleanEmail]
    );

    if (!pending) {
      return res.status(400).json({
        error: 'No active verification request found for this email. Please request a new code.',
      });
    }

    if (Date.now() > pending.expires_at) {
      executeRun(db, `DELETE FROM email_verifications WHERE email = ?`, [cleanEmail]);
      return res.status(400).json({
        error: 'The verification code has expired. Please submit your details again to receive a fresh code.',
      });
    }

    if (pending.otp_code !== cleanOtp) {
      return res.status(400).json({
        error: 'Incorrect verification code. Please check your email and try again.',
      });
    }

    // Ensure user doesn't already exist
    const existing = queryOne(db, `SELECT id FROM users WHERE email = ?`, [cleanEmail]);
    if (existing) {
      executeRun(db, `DELETE FROM email_verifications WHERE email = ?`, [cleanEmail]);
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    // Role assignment: first user is ADMIN, otherwise USER
    const userCount = queryOne<{ cnt: number }>(db, `SELECT COUNT(*) as cnt FROM users`)?.cnt || 0;
    const role = userCount === 0 ? 'ADMIN' : 'USER';
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Create user
    executeRun(
      db,
      `INSERT INTO users (id, email, password_hash, full_name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, cleanEmail, pending.password_hash, pending.full_name, role, now, now]
    );

    // Initialize user preferences
    executeRun(
      db,
      `INSERT INTO user_preferences (user_id, updated_at) VALUES (?, ?)`,
      [userId, now]
    );

    // Clear verification record
    executeRun(db, `DELETE FROM email_verifications WHERE email = ?`, [cleanEmail]);

    const sessionId = await createSession(db, userId, req.headers['user-agent']);
    logAudit(db, userId, 'USER_REGISTERED_OTP_CONFIRMED', { email: cleanEmail, role }, req.ip);

    res.cookie('mastery_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 14 * 24 * 60 * 60 * 1000,
    });

    res.json({
      message: 'Account successfully confirmed and activated!',
      user: {
        id: userId,
        email: cleanEmail,
        full_name: pending.full_name,
        role,
        created_at: now,
      },
      token: sessionId,
    });
  } catch (err: any) {
    console.error('OTP verification error:', err);
    res.status(500).json({ error: err.message || 'OTP verification failed.' });
  }
});

// Direct register endpoint (verifies email existence as well)
router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, full_name } = req.body;
    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, password, and full name are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = full_name.trim();

    // Verify email format and DNS existence
    const emailVerification = await verifyEmailAddress(cleanEmail);
    if (!emailVerification.valid) {
      return res.status(400).json({
        error: emailVerification.reason || 'The provided email domain does not appear to exist.',
      });
    }

    const db = await getDb();
    const existing = queryOne(db, `SELECT id FROM users WHERE email = ?`, [cleanEmail]);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    // First user becomes ADMIN, subsequent users are USER
    const userCount = queryOne<{ cnt: number }>(db, `SELECT COUNT(*) as cnt FROM users`)?.cnt || 0;
    const role = userCount === 0 ? 'ADMIN' : 'USER';

    const userId = crypto.randomUUID();
    const passHash = await hashPassword(password);
    const now = new Date().toISOString();

    executeRun(
      db,
      `INSERT INTO users (id, email, password_hash, full_name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, cleanEmail, passHash, cleanName, role, now, now]
    );

    // Initialize user preferences
    executeRun(
      db,
      `INSERT INTO user_preferences (user_id, updated_at) VALUES (?, ?)`,
      [userId, now]
    );

    const sessionId = await createSession(db, userId, req.headers['user-agent']);
    logAudit(db, userId, 'USER_REGISTERED', { email: cleanEmail, role }, req.ip);

    res.cookie('mastery_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 14 * 24 * 60 * 60 * 1000,
    });

    res.json({
      user: {
        id: userId,
        email: cleanEmail,
        full_name: cleanName,
        role,
        created_at: now,
      },
      token: sessionId,
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message || 'Registration failed.' });
  }
});

// Forgot Password: Send dedicated password reset link to user email
router.post('/auth/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Verify email format and DNS existence
    const emailVerification = await verifyEmailAddress(cleanEmail);
    if (!emailVerification.valid) {
      return res.status(400).json({
        error: emailVerification.reason || 'The email domain does not appear to exist.',
      });
    }

    const db = await getDb();
    const user = queryOne<{ id: string; email: string; full_name: string }>(
      db,
      `SELECT id, email, full_name FROM users WHERE email = ?`,
      [cleanEmail]
    );

    if (!user) {
      return res.status(404).json({
        error: 'No account registered with this email address. Please check your spelling or create an account.',
      });
    }

    // Invalidate existing unused tokens for this user
    executeRun(db, `UPDATE password_resets SET used = 1 WHERE user_id = ?`, [user.id]);

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetId = crypto.randomUUID();
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour
    const now = new Date().toISOString();

    executeRun(
      db,
      `INSERT INTO password_resets (id, user_id, email, token, expires_at, used, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [resetId, user.id, user.email, resetToken, expiresAt, now]
    );

    // Build the dedicated password reset page link
    const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
    const resetLink = `${origin}/?resetToken=${resetToken}`;

    const mailResult = await sendPasswordResetEmail(user.email, resetLink, user.full_name, resetToken);
    logAudit(db, user.id, 'PASSWORD_RESET_REQUESTED', { email: user.email }, req.ip);

    res.json({
      message: `A password reset link has been dispatched to ${cleanEmail}. Click the link in your email to reset your password.`,
      email: cleanEmail,
      devNotice: mailResult.devNotice,
      devResetLink: resetLink,
      devResetToken: resetToken,
    });
  } catch (err: any) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: err.message || 'Failed to dispatch password reset email.' });
  }
});

// Verify Password Reset Token validity
router.get('/auth/verify-reset-token', async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;
    if (!token) {
      return res.status(400).json({ error: 'Reset token is required.' });
    }

    const db = await getDb();
    const record = queryOne<{
      id: string;
      user_id: string;
      email: string;
      expires_at: number;
      used: number;
    }>(
      db,
      `SELECT * FROM password_resets WHERE token = ?`,
      [token]
    );

    if (!record || record.used === 1) {
      return res.status(400).json({
        valid: false,
        error: 'This password reset link is invalid or has already been used. Please request a new link.',
      });
    }

    if (Date.now() > record.expires_at) {
      return res.status(400).json({
        valid: false,
        error: 'This password reset link has expired. Please request a fresh reset link.',
      });
    }

    res.json({
      valid: true,
      email: record.email,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Dedicated Reset Password endpoint: updates user password
router.post('/auth/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Reset token and new password are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }

    const db = await getDb();
    const record = queryOne<{
      id: string;
      user_id: string;
      email: string;
      expires_at: number;
      used: number;
    }>(
      db,
      `SELECT * FROM password_resets WHERE token = ?`,
      [token]
    );

    if (!record || record.used === 1) {
      return res.status(400).json({
        error: 'This reset token is invalid or has already been used.',
      });
    }

    if (Date.now() > record.expires_at) {
      return res.status(400).json({
        error: 'This reset token has expired. Please request a new one.',
      });
    }

    const newHash = await hashPassword(newPassword);
    const now = new Date().toISOString();

    // Update user's password
    executeRun(
      db,
      `UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`,
      [newHash, now, record.user_id]
    );

    // Mark reset token as used
    executeRun(
      db,
      `UPDATE password_resets SET used = 1 WHERE id = ?`,
      [record.id]
    );

    // Clear any existing active sessions to force re-login with the new password
    executeRun(
      db,
      `DELETE FROM sessions WHERE user_id = ?`,
      [record.user_id]
    );

    logAudit(db, record.user_id, 'PASSWORD_RESET_SUCCESS', { email: record.email }, req.ip);

    res.json({
      message: 'Password successfully reset! You can now log in with your new password.',
    });
  } catch (err: any) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: err.message || 'Failed to reset password.' });
  }
});

router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const db = await getDb();
    const user = queryOne<{
      id: string;
      email: string;
      password_hash: string;
      full_name: string;
      role: 'ADMIN' | 'USER';
      created_at: string;
    }>(db, `SELECT * FROM users WHERE email = ?`, [email.toLowerCase().trim()]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      logAudit(db, user.id, 'LOGIN_FAILED', { email }, req.ip);
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const sessionId = await createSession(db, user.id, req.headers['user-agent']);
    logAudit(db, user.id, 'LOGIN_SUCCESS', { email }, req.ip);

    res.cookie('mastery_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 14 * 24 * 60 * 60 * 1000,
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        created_at: user.created_at,
      },
      token: sessionId,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Login failed.' });
  }
});

router.post('/auth/google', async (req: Request, res: Response) => {
  try {
    const { credential, email: inputEmail, name: inputName } = req.body;
    let email = inputEmail;
    let name = inputName;

    // Handle Google ID Token (JWT) if supplied via Google Identity Services
    if (credential && typeof credential === 'string') {
      try {
        const parts = credential.split('.');
        if (parts.length === 3) {
          const payloadJson = Buffer.from(parts[1], 'base64').toString('utf-8');
          const payload = JSON.parse(payloadJson);
          if (payload.email) {
            email = payload.email;
          }
          if (payload.name) {
            name = payload.name;
          } else if (payload.given_name) {
            name = `${payload.given_name} ${payload.family_name || ''}`.trim();
          }
        }
      } catch (tokenErr) {
        console.warn('Failed to parse Google credential token:', tokenErr);
      }
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email is required to sign in with Google.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = (name && typeof name === 'string' && name.trim()) ? name.trim() : (cleanEmail.split('@')[0]);

    const db = await getDb();
    let user = queryOne<{
      id: string;
      email: string;
      password_hash: string;
      full_name: string;
      role: 'ADMIN' | 'USER';
      created_at: string;
    }>(db, `SELECT * FROM users WHERE email = ?`, [cleanEmail]);

    if (!user) {
      const userCount = queryOne<{ cnt: number }>(db, `SELECT COUNT(*) as cnt FROM users`)?.cnt || 0;
      const role = userCount === 0 ? 'ADMIN' : 'USER';
      const userId = crypto.randomUUID();
      const randomPasswordHash = `google_oauth_${crypto.randomBytes(32).toString('hex')}`;
      const now = new Date().toISOString();

      executeRun(
        db,
        `INSERT INTO users (id, email, password_hash, full_name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, cleanEmail, randomPasswordHash, cleanName, role, now, now]
      );

      executeRun(
        db,
        `INSERT INTO user_preferences (user_id, updated_at) VALUES (?, ?)`,
        [userId, now]
      );

      user = {
        id: userId,
        email: cleanEmail,
        password_hash: randomPasswordHash,
        full_name: cleanName,
        role,
        created_at: now,
      };

      logAudit(db, userId, 'GOOGLE_REGISTER', { email: cleanEmail, role }, req.ip);
    } else {
      logAudit(db, user.id, 'GOOGLE_LOGIN_SUCCESS', { email: cleanEmail }, req.ip);
    }

    const sessionId = await createSession(db, user.id, req.headers['user-agent']);

    res.cookie('mastery_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 14 * 24 * 60 * 60 * 1000,
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        created_at: user.created_at,
      },
      token: sessionId,
    });
  } catch (err: any) {
    console.error('Google sign-in error:', err);
    res.status(500).json({ error: err.message || 'Google sign-in failed.' });
  }
});

router.post('/auth/logout', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    if (req.sessionId) {
      await destroySession(db, req.sessionId);
    }
    logAudit(db, req.user?.id || null, 'LOGOUT', {}, req.ip);
    res.clearCookie('mastery_session');
    res.json({ message: 'Logged out successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Logout failed.' });
  }
});

router.get('/auth/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const prefs = queryOne(
      db,
      `SELECT * FROM user_preferences WHERE user_id = ?`,
      [req.user!.id]
    ) || {};

    const activeCurriculum = queryOne(
      db,
      `SELECT id, version_number, title, created_at FROM curriculum_versions WHERE is_active = 1 LIMIT 1`
    );

    const activeSchedule = queryOne(
      db,
      `SELECT id, version_number, title, created_at FROM schedule_versions WHERE is_active = 1 LIMIT 1`
    );

    res.json({
      user: req.user,
      preferences: prefs,
      activeCurriculum,
      activeSchedule,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch user profile.' });
  }
});

// User Personalization Settings
router.get('/user/preferences', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const prefs = queryOne(
      db,
      `SELECT * FROM user_preferences WHERE user_id = ?`,
      [req.user!.id]
    );
    res.json({ preferences: prefs || {} });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/user/preferences', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      study_style,
      reminder_behavior,
      preferred_language,
      display_theme,
      study_intensity,
      response_preference,
      personal_notes,
      college_end_time,
      saturday_is_working,
    } = req.body;

    const db = await getDb();
    const now = new Date().toISOString();

    executeRun(
      db,
      `INSERT INTO user_preferences (
        user_id, study_style, reminder_behavior, preferred_language, display_theme,
        study_intensity, response_preference, personal_notes, college_end_time,
        saturday_is_working, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        study_style = excluded.study_style,
        reminder_behavior = excluded.reminder_behavior,
        preferred_language = excluded.preferred_language,
        display_theme = excluded.display_theme,
        study_intensity = excluded.study_intensity,
        response_preference = excluded.response_preference,
        personal_notes = excluded.personal_notes,
        college_end_time = excluded.college_end_time,
        saturday_is_working = excluded.saturday_is_working,
        updated_at = excluded.updated_at`,
      [
        req.user!.id,
        study_style || 'practical',
        reminder_behavior || 'standard',
        preferred_language || 'en',
        display_theme || 'system',
        study_intensity || 'balanced',
        response_preference || 'structured',
        personal_notes || '',
        college_end_time || '16:00',
        saturday_is_working ? 1 : 0,
        now,
      ]
    );

    logAudit(db, req.user!.id, 'PREFERENCES_UPDATED', { college_end_time, saturday_is_working }, req.ip);
    res.json({ message: 'Preferences updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Privacy: User Data Export
router.get('/user/export', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const userId = req.user!.id;

    const profile = queryOne(db, `SELECT id, email, full_name, role, created_at FROM users WHERE id = ?`, [userId]);
    const preferences = queryOne(db, `SELECT * FROM user_preferences WHERE user_id = ?`, [userId]);
    const tasks = queryAll(db, `SELECT * FROM user_scheduled_tasks WHERE user_id = ?`, [userId]);
    const checkpoints = queryAll(db, `SELECT * FROM user_checkpoints WHERE user_id = ?`, [userId]);
    const evidence = queryAll(db, `SELECT id, topic_id, original_filename, file_size, ai_status, user_notes, created_at FROM user_evidence WHERE user_id = ?`, [userId]);
    const masteryTests = queryAll(db, `SELECT * FROM user_mastery_tests WHERE user_id = ?`, [userId]);
    const researchMilestones = queryAll(db, `SELECT * FROM user_research_milestones WHERE user_id = ?`, [userId]);

    res.json({
      exported_at: new Date().toISOString(),
      profile,
      preferences,
      tasks,
      checkpoints,
      evidence,
      masteryTests,
      researchMilestones,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Privacy: Account Deletion (GDPR / User data erasure)
router.delete('/user/account', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const userId = req.user!.id;

    // Delete user's evidence files from disk
    const files = queryAll<{ stored_filename: string }>(
      db,
      `SELECT stored_filename FROM user_evidence WHERE user_id = ?`,
      [userId]
    );
    for (const f of files) {
      const p = path.join(UPLOAD_DIR, f.stored_filename);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }

    executeRun(db, `DELETE FROM users WHERE id = ?`, [userId]);
    res.clearCookie('mastery_session');
    res.json({ message: 'Account and all associated isolated data have been permanently erased.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. ADMIN PDF CURRICULUM INGESTION & VERSIONING
// ==========================================

// Upload Schedule Reference PDF
router.post(
  '/admin/upload-schedule-pdf',
  requireAdmin,
  memoryUpload.single('file'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Please upload a Schedule Reference PDF file.' });
      }

      const text = await extractTextFromPdf(req.file.buffer);
      if (!text || text.trim().length < 30) {
        return res.status(400).json({
          error: 'PDF text could not be extracted or file is empty. Please provide a readable PDF.',
        });
      }

      // Parse with Gemini
      const parsed = await parseScheduleTextWithGemini(text);

      stagedSchedule = {
        rawText: text,
        filename: req.file.originalname,
        parsed,
        timestamp: new Date().toISOString(),
      };

      const db = await getDb();
      logAudit(db, req.user!.id, 'SCHEDULE_PDF_PARSED', { filename: req.file.originalname, rulesCount: parsed.rules?.length }, req.ip);

      res.json({
        message: 'Schedule PDF parsed successfully. Review preview before activation.',
        filename: req.file.originalname,
        parsed,
      });
    } catch (err: any) {
      console.error('Schedule PDF parsing error:', err);
      res.status(500).json({ error: err.message || 'Failed to parse Schedule PDF.' });
    }
  }
);

// Upload Topic / Task Reference PDF
router.post(
  '/admin/upload-topic-pdf',
  requireAdmin,
  memoryUpload.single('file'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Please upload a Topic / Task Reference PDF file.' });
      }

      const text = await extractTextFromPdf(req.file.buffer);
      if (!text || text.trim().length < 30) {
        return res.status(400).json({
          error: 'PDF text could not be extracted or file is empty. Please provide a readable PDF.',
        });
      }

      // Parse with Gemini
      const parsed = await parseCurriculumTextWithGemini(text);

      stagedCurriculum = {
        rawText: text,
        filename: req.file.originalname,
        parsed,
        timestamp: new Date().toISOString(),
      };

      const db = await getDb();
      logAudit(db, req.user!.id, 'CURRICULUM_PDF_PARSED', { filename: req.file.originalname, tracksCount: parsed.tracks?.length }, req.ip);

      res.json({
        message: 'Topic Reference PDF parsed successfully. Review preview before activation.',
        filename: req.file.originalname,
        parsed,
      });
    } catch (err: any) {
      console.error('Curriculum PDF parsing error:', err);
      res.status(500).json({ error: err.message || 'Failed to parse Topic PDF.' });
    }
  }
);

// Get staged preview & validation report
router.get('/admin/staged-preview', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    let curriculumSummary: any = null;
    let scheduleSummary: any = null;
    const validationErrors: string[] = [];
    const validationWarnings: string[] = [];

    if (stagedCurriculum) {
      const allTopicCodes = new Set<string>();
      let totalTopics = 0;
      let totalModules = 0;

      for (const track of stagedCurriculum.parsed.tracks || []) {
        totalModules += track.modules?.length || 0;
        for (const mod of track.modules || []) {
          for (const top of mod.topics || []) {
            totalTopics++;
            allTopicCodes.add(top.code);
          }
        }
      }

      // Check for orphan prerequisites
      let prereqCount = 0;
      for (const track of stagedCurriculum.parsed.tracks || []) {
        for (const mod of track.modules || []) {
          for (const top of mod.topics || []) {
            for (const pr of top.prerequisites || []) {
              prereqCount++;
              if (!allTopicCodes.has(pr)) {
                validationWarnings.push(`Topic "${top.code}" references prerequisite "${pr}" which is not defined in this document.`);
              }
            }
          }
        }
      }

      if (totalTopics === 0) {
        validationErrors.push('Curriculum contains 0 valid topics. Ensure the PDF has clear module and topic headings.');
      }

      curriculumSummary = {
        title: stagedCurriculum.parsed.title,
        filename: stagedCurriculum.filename,
        tracksCount: stagedCurriculum.parsed.tracks?.length || 0,
        modulesCount: totalModules,
        topicsCount: totalTopics,
        prerequisitesCount: prereqCount,
        tracks: stagedCurriculum.parsed.tracks,
      };
    }

    if (stagedSchedule) {
      const rules = stagedSchedule.parsed.rules || [];
      if (rules.length === 0) {
        validationErrors.push('Schedule contains 0 schedule rules.');
      }

      scheduleSummary = {
        title: stagedSchedule.parsed.title,
        filename: stagedSchedule.filename,
        rulesCount: rules.length,
        rules: stagedSchedule.parsed.rules,
        summary: stagedSchedule.parsed.college_constraint_summary,
      };
    }

    res.json({
      stagedCurriculum: curriculumSummary,
      stagedSchedule: scheduleSummary,
      validation: {
        isValid: validationErrors.length === 0,
        errors: validationErrors,
        warnings: validationWarnings,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Commit and Activate Staged Curriculum & Schedule Versions
router.post('/admin/activate-version', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!stagedCurriculum && !stagedSchedule) {
      return res.status(400).json({ error: 'No staged curriculum or schedule found. Please upload PDFs first.' });
    }

    const db = await getDb();
    const now = new Date().toISOString();

    // 1. Commit Curriculum Version if staged
    if (stagedCurriculum) {
      const existingVersions = queryAll(db, `SELECT version_number FROM curriculum_versions`);
      const nextVerNum = `v${existingVersions.length + 1}.0`;
      const currVerId = crypto.randomUUID();

      // Deactivate prior versions (historical completion records remain attached to their original version!)
      executeRun(db, `UPDATE curriculum_versions SET is_active = 0 WHERE is_active = 1`);

      executeRun(
        db,
        `INSERT INTO curriculum_versions (
          id, version_number, title, source_filename, is_active, raw_text, parsed_metadata_json, created_by, created_at
        ) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)`,
        [
          currVerId,
          nextVerNum,
          stagedCurriculum.parsed.title || 'Curriculum Specification',
          stagedCurriculum.filename,
          stagedCurriculum.rawText,
          JSON.stringify(stagedCurriculum.parsed),
          req.user!.id,
          now,
        ]
      );

      // Insert Tracks, Modules, Topics, and Prerequisites
      let trackOrder = 0;
      for (const track of stagedCurriculum.parsed.tracks || []) {
        const trackId = crypto.randomUUID();
        executeRun(
          db,
          `INSERT INTO curriculum_tracks (id, curriculum_version_id, track_key, title, description, color, ordering)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            trackId,
            currVerId,
            track.track_key.toUpperCase(),
            track.title,
            track.description || '',
            track.color || '#4f46e5',
            trackOrder++,
          ]
        );

        let modOrder = 0;
        for (const mod of track.modules || []) {
          const modId = crypto.randomUUID();
          executeRun(
            db,
            `INSERT INTO curriculum_modules (id, track_id, module_number, title, description, ordering)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [modId, trackId, mod.module_number || modOrder + 1, mod.title, mod.description || '', modOrder++]
          );

          let topOrder = 0;
          for (const top of mod.topics || []) {
            const topId = crypto.randomUUID();
            executeRun(
              db,
              `INSERT INTO curriculum_topics (
                id, module_id, track_id, curriculum_version_id, topic_number, code, title,
                description, task_type, estimated_minutes, requires_mastery, ordering
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                topId,
                modId,
                trackId,
                currVerId,
                top.topic_number || topOrder + 1,
                top.code,
                top.title,
                top.description || '',
                top.task_type || 'THEORY',
                top.estimated_minutes || 60,
                top.requires_mastery ? 1 : 0,
                topOrder++,
              ]
            );

            // Prerequisites
            for (const pr of top.prerequisites || []) {
              executeRun(
                db,
                `INSERT INTO curriculum_prerequisites (id, topic_id, prerequisite_code, is_mandatory)
                 VALUES (?, ?, ?, 1)`,
                [crypto.randomUUID(), topId, pr]
              );
            }
          }
        }
      }

      logAudit(db, req.user!.id, 'CURRICULUM_VERSION_ACTIVATED', { version: nextVerNum }, req.ip);
      stagedCurriculum = null;
    }

    // 2. Commit Schedule Version if staged
    if (stagedSchedule) {
      const existingSched = queryAll(db, `SELECT version_number FROM schedule_versions`);
      const nextSchedNum = `v${existingSched.length + 1}.0`;
      const schedVerId = crypto.randomUUID();

      executeRun(db, `UPDATE schedule_versions SET is_active = 0 WHERE is_active = 1`);

      executeRun(
        db,
        `INSERT INTO schedule_versions (
          id, version_number, title, source_filename, is_active, raw_text, parsed_rules_json, created_by, created_at
        ) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)`,
        [
          schedVerId,
          nextSchedNum,
          stagedSchedule.parsed.title || 'Schedule Reference Blueprint',
          stagedSchedule.filename,
          stagedSchedule.rawText,
          JSON.stringify(stagedSchedule.parsed),
          req.user!.id,
          now,
        ]
      );

      for (const rule of stagedSchedule.parsed.rules || []) {
        executeRun(
          db,
          `INSERT INTO schedule_rules (
            id, schedule_version_id, day_type, window_start, window_end, max_continuous_minutes,
            break_minutes, max_daily_hours, track_allocation_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            crypto.randomUUID(),
            schedVerId,
            rule.day_type,
            rule.window_start || '16:00',
            rule.window_end || '23:00',
            rule.max_continuous_minutes || 60,
            rule.break_minutes || 15,
            rule.max_daily_hours || 5,
            JSON.stringify(rule.track_allocation || []),
          ]
        );
      }

      logAudit(db, req.user!.id, 'SCHEDULE_VERSION_ACTIVATED', { version: nextSchedNum }, req.ip);
      stagedSchedule = null;
    }

    res.json({ message: 'Curriculum & Schedule version successfully activated!' });
  } catch (err: any) {
    console.error('Activation error:', err);
    res.status(500).json({ error: err.message || 'Failed to activate version.' });
  }
});

// Load standard sample PDFs into staging
router.post('/admin/load-sample-pdfs', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const schedBuffer = getSampleSchedulePdf();
    const currBuffer = getSampleCurriculumPdf();

    const schedText = await extractTextFromPdf(schedBuffer);
    const currText = await extractTextFromPdf(currBuffer);

    const parsedSched = await parseScheduleTextWithGemini(schedText);
    const parsedCurr = await parseCurriculumTextWithGemini(currText);

    stagedSchedule = {
      rawText: schedText,
      filename: 'Sample_Schedule_Reference.pdf',
      parsed: parsedSched,
      timestamp: new Date().toISOString(),
    };

    stagedCurriculum = {
      rawText: currText,
      filename: 'Sample_Topic_Reference.pdf',
      parsed: parsedCurr,
      timestamp: new Date().toISOString(),
    };

    res.json({
      message: 'Sample PDFs loaded into staging. Please inspect preview and click activate.',
      stagedCurriculum: parsedCurr,
      stagedSchedule: parsedSched,
    });
  } catch (err: any) {
    console.error('Load sample PDFs error:', err);
    res.status(500).json({ error: err.message || 'Failed to parse sample PDFs.' });
  }
});

// Download sample PDFs
router.get('/admin/download-sample-pdf/:type', (req: Request, res: Response) => {
  const type = req.params.type;
  if (type === 'schedule') {
    const buffer = getSampleSchedulePdf();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Schedule_Reference_Sample.pdf"');
    res.send(buffer);
  } else if (type === 'curriculum') {
    const buffer = getSampleCurriculumPdf();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Topic_Task_Reference_Sample.pdf"');
    res.send(buffer);
  } else {
    res.status(404).send('Not found');
  }
});

// Version history list
router.get('/admin/versions', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const curriculumVersions = queryAll(
      db,
      `SELECT id, version_number, title, source_filename, is_active, created_at FROM curriculum_versions ORDER BY created_at DESC`
    );
    const scheduleVersions = queryAll(
      db,
      `SELECT id, version_number, title, source_filename, is_active, created_at FROM schedule_versions ORDER BY created_at DESC`
    );
    res.json({ curriculumVersions, scheduleVersions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Audit logs
router.get('/admin/audit-logs', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const logs = queryAll(
      db,
      `SELECT a.*, u.email as user_email 
       FROM audit_logs a
       LEFT JOIN users u ON a.user_id = u.id
       ORDER BY a.created_at DESC LIMIT 100`
    );
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. SCHEDULE & CHECKPOINT ROUTES
// ==========================================

// Get schedule for target date
router.get('/schedule/day', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const dateParam = (req.query.date as string) || new Date().toISOString().split('T')[0];

    const result = getOrCreateScheduleForDate(db, req.user!.id, dateParam);
    res.json(result);
  } catch (err: any) {
    console.error('Schedule fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get week overview
router.get('/schedule/week', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const startDateStr = (req.query.startDate as string) || new Date().toISOString().split('T')[0];
    const startDate = new Date(startDateStr);

    const weekDays: any[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      const dayData = getOrCreateScheduleForDate(db, req.user!.id, dStr);
      weekDays.push(dayData);
    }

    res.json({ week: weekDays });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update task status (e.g. IN_PROGRESS, DEFERRED)
router.post('/schedule/task/:taskId/status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = req.body;
    const taskId = req.params.taskId;
    const db = await getDb();

    // Verify ownership
    const task = queryOne(
      db,
      `SELECT * FROM user_scheduled_tasks WHERE id = ? AND user_id = ?`,
      [taskId, req.user!.id]
    );

    if (!task) {
      return res.status(404).json({ error: 'Task not found or access denied.' });
    }

    // Do not allow users to falsely complete task with a single button click (evidence required)
    if (status === 'STUDIED' || status === 'MASTERED') {
      return res.status(400).json({
        error: 'Tasks cannot be directly marked STUDIED or MASTERED. You must submit valid evidence first.',
      });
    }

    executeRun(
      db,
      `UPDATE user_scheduled_tasks SET status = ? WHERE id = ?`,
      [status, taskId]
    );

    logAudit(db, req.user!.id, 'TASK_STATUS_UPDATED', { taskId, status }, req.ip);
    res.json({ message: 'Task status updated.', status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reschedule task to next available slot or specified date
router.post('/schedule/task/:taskId/reschedule', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { targetDate } = req.body;
    const taskId = req.params.taskId;
    const db = await getDb();

    const task = queryOne(
      db,
      `SELECT * FROM user_scheduled_tasks WHERE id = ? AND user_id = ?`,
      [taskId, req.user!.id]
    );

    if (!task) {
      return res.status(404).json({ error: 'Task not found or access denied.' });
    }

    const nextDate = targetDate || new Date().toISOString().split('T')[0];

    executeRun(
      db,
      `UPDATE user_scheduled_tasks 
       SET status = 'RESCHEDULED', rescheduled_date = ?, scheduled_date = ? 
       WHERE id = ?`,
      [nextDate, nextDate, taskId]
    );

    logAudit(db, req.user!.id, 'TASK_RESCHEDULED', { taskId, originalDate: task.scheduled_date, nextDate }, req.ip);
    res.json({ message: 'Task rescheduled successfully.', rescheduled_date: nextDate });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Checkpoints for all tracks
router.get('/schedule/checkpoints', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const activeVer = queryOne<{ id: string }>(
      db,
      `SELECT id FROM curriculum_versions WHERE is_active = 1 LIMIT 1`
    );

    if (!activeVer) {
      return res.json({ checkpoints: [] });
    }

    const tracks = queryAll<{ id: string; track_key: string; title: string; color: string }>(
      db,
      `SELECT id, track_key, title, color FROM curriculum_tracks WHERE curriculum_version_id = ? ORDER BY ordering ASC`,
      [activeVer.id]
    );

    const checkpoints = [];
    for (const tr of tracks) {
      const cp = getTrackCheckpoint(db, req.user!.id, tr.track_key, activeVer.id);
      
      // Get current topic info
      let currentTopic = null;
      if (cp.current_topic_id) {
        currentTopic = queryOne(
          db,
          `SELECT t.code, t.title, t.task_type, t.requires_mastery, m.title as module_title
           FROM curriculum_topics t
           JOIN curriculum_modules m ON t.module_id = m.id
           WHERE t.id = ?`,
          [cp.current_topic_id]
        );
      }

      checkpoints.push({
        ...cp,
        track_title: tr.title,
        track_color: tr.color,
        current_topic_info: currentTopic,
      });
    }

    res.json({ checkpoints });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard Overview Metrics
router.get('/schedule/overview', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const userId = req.user!.id;
    const today = new Date().toISOString().split('T')[0];

    const totalStudied = queryOne<{ cnt: number }>(
      db,
      `SELECT COUNT(DISTINCT topic_id) as cnt FROM user_scheduled_tasks 
       WHERE user_id = ? AND status IN ('STUDIED', 'MASTERED')`,
      [userId]
    )?.cnt || 0;

    const totalMastered = queryOne<{ cnt: number }>(
      db,
      `SELECT COUNT(DISTINCT topic_id) as cnt FROM user_scheduled_tasks 
       WHERE user_id = ? AND status = 'MASTERED'`,
      [userId]
    )?.cnt || 0;

    const rescheduledPending = queryOne<{ cnt: number }>(
      db,
      `SELECT COUNT(*) as cnt FROM user_scheduled_tasks 
       WHERE user_id = ? AND status = 'RESCHEDULED'`,
      [userId]
    )?.cnt || 0;

    const todayTasks = queryAll(
      db,
      `SELECT ust.*, t.code, t.title, t.task_type, tr.track_key, tr.color as track_color
       FROM user_scheduled_tasks ust
       JOIN curriculum_topics t ON ust.topic_id = t.id
       JOIN curriculum_tracks tr ON t.track_id = tr.id
       WHERE ust.user_id = ? AND ust.scheduled_date = ?`,
      [userId, today]
    );

    const activeCurriculum = queryOne(
      db,
      `SELECT version_number, title FROM curriculum_versions WHERE is_active = 1 LIMIT 1`
    );

    const activeSchedule = queryOne(
      db,
      `SELECT version_number, title FROM schedule_versions WHERE is_active = 1 LIMIT 1`
    );

    // Calculate 7-day daily mastery score progress for line chart
    const dailyMasteryProgress: {
      date: string;
      label: string;
      dayOfWeek: string;
      score: number;
      testsCount: number;
      passedCount: number;
      cumulativeMastered: number;
    }[] = [];

    const now = new Date();
    const allUserTests = queryAll<{
      id: string;
      score: number;
      passed: number;
      completed_at: string;
    }>(
      db,
      `SELECT id, score, passed, completed_at FROM user_mastery_tests 
       WHERE user_id = ? AND completed_at IS NOT NULL
       ORDER BY completed_at ASC`,
      [userId]
    );

    const allMasteredTasks = queryAll<{
      id: string;
      completed_at: string;
      topic_id: string;
    }>(
      db,
      `SELECT id, completed_at, topic_id FROM user_scheduled_tasks
       WHERE user_id = ? AND status = 'MASTERED' AND completed_at IS NOT NULL
       ORDER BY completed_at ASC`,
      [userId]
    );

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'short' });

      const testsUpToDay = allUserTests.filter((t) => t.completed_at && t.completed_at.slice(0, 10) <= dateStr);
      const testsOnDay = allUserTests.filter((t) => t.completed_at && t.completed_at.slice(0, 10) === dateStr);
      const passedOnDay = testsOnDay.filter((t) => t.passed === 1).length;

      const masteredTopicsUpToDay = new Set(
        allMasteredTasks
          .filter((task) => task.completed_at && task.completed_at.slice(0, 10) <= dateStr)
          .map((t) => t.topic_id)
      ).size;

      let dayScore = 0;
      if (testsOnDay.length > 0) {
        const sum = testsOnDay.reduce((acc, t) => acc + (Number(t.score) || 0), 0);
        dayScore = Math.round(sum / testsOnDay.length);
      } else if (testsUpToDay.length > 0) {
        const sum = testsUpToDay.reduce((acc, t) => acc + (Number(t.score) || 0), 0);
        dayScore = Math.round(sum / testsUpToDay.length);
      } else {
        dayScore = 0;
      }

      dailyMasteryProgress.push({
        date: dateStr,
        label: `${dayOfWeek} (${dayLabel})`,
        dayOfWeek,
        score: dayScore,
        testsCount: testsOnDay.length,
        passedCount: passedOnDay,
        cumulativeMastered: masteredTopicsUpToDay,
      });
    }

    res.json({
      today,
      metrics: {
        totalStudied,
        totalMastered,
        rescheduledPending,
        todayTotal: todayTasks.length,
        todayCompleted: todayTasks.filter((t) => t.status === 'STUDIED' || t.status === 'MASTERED').length,
      },
      todayTasks,
      dailyMasteryProgress,
      activeCurriculum,
      activeSchedule,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. EVIDENCE SUBMISSION & AI REVIEW
// ==========================================

router.post(
  '/evidence/submit',
  requireAuth,
  upload.single('pdf'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { taskId, topicId, userNotes } = req.body;
      const userId = req.user!.id;

      if (!topicId) {
        return res.status(400).json({ error: 'Topic ID is required.' });
      }

      const notesText = (userNotes || '').trim();
      let extractedPdfText = '';

      if (req.file) {
        const fileBuffer = fs.readFileSync(req.file.path);
        extractedPdfText = await extractTextFromPdf(fileBuffer);
      }

      if (!notesText && !extractedPdfText) {
        return res.status(400).json({
          error: 'Meaningful study notes or a substantive PDF upload is required as evidence.',
        });
      }

      const db = await getDb();
      // Fetch topic info
      const topic = queryOne<{
        id: string;
        code: string;
        title: string;
        task_type: string;
        requires_mastery: number;
        track_key: string;
      }>(
        db,
        `SELECT t.*, tr.track_key 
         FROM curriculum_topics t
         JOIN curriculum_tracks tr ON t.track_id = tr.id
         WHERE t.id = ?`,
        [topicId]
      );

      if (!topic) {
        return res.status(404).json({ error: 'Topic not found.' });
      }

      // Perform AI Evidence Evaluation with topic-specific criteria
      const evaluation = await evaluateEvidenceWithGemini(
        topic.track_key,
        topic.code,
        topic.title,
        topic.task_type,
        notesText,
        extractedPdfText
      );

      const evidenceId = crypto.randomUUID();
      const now = new Date().toISOString();

      executeRun(
        db,
        `INSERT INTO user_evidence (
          id, user_id, topic_id, scheduled_task_id, original_filename, stored_filename,
          file_size, mime_type, text_content, ai_status, ai_analysis_json, user_notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          evidenceId,
          userId,
          topicId,
          taskId || null,
          req.file ? req.file.originalname : 'Direct Notes',
          req.file ? req.file.filename : 'inline_notes.txt',
          req.file ? req.file.size : Buffer.byteLength(notesText),
          req.file ? req.file.mimetype : 'text/plain',
          extractedPdfText || notesText,
          evaluation.status,
          JSON.stringify(evaluation),
          notesText,
          now,
        ]
      );

      // If VALID: Advance task status to STUDIED
      if (evaluation.status === 'VALID') {
        if (taskId) {
          executeRun(
            db,
            `UPDATE user_scheduled_tasks 
             SET status = 'STUDIED', completed_at = ? 
             WHERE id = ? AND user_id = ?`,
            [now, taskId, userId]
          );
        }

        // If topic does NOT require mastery test, mark complete & advance checkpoint immediately!
        if (!topic.requires_mastery) {
          updateCheckpointOnCompletion(db, userId, topic.id, false);
        }

        logAudit(db, userId, 'EVIDENCE_APPROVED', { topicCode: topic.code, score: evaluation.score }, req.ip);
      } else {
        logAudit(db, userId, 'EVIDENCE_REJECTED', { topicCode: topic.code, status: evaluation.status }, req.ip);
      }

      res.json({
        evidenceId,
        evaluation,
        topicRequiresMastery: Boolean(topic.requires_mastery),
      });
    } catch (err: any) {
      console.error('Evidence submission error:', err);
      res.status(500).json({ error: err.message || 'Evidence submission failed.' });
    }
  }
);

// Evidence Library (searchable)
router.get('/evidence/library', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const userId = req.user!.id;
    const { track, status, search } = req.query;

    let sql = `
      SELECT e.*, t.code as topic_code, t.title as topic_title, t.task_type,
             tr.track_key, tr.title as track_title, tr.color as track_color,
             m.title as module_title
      FROM user_evidence e
      JOIN curriculum_topics t ON e.topic_id = t.id
      JOIN curriculum_tracks tr ON t.track_id = tr.id
      JOIN curriculum_modules m ON t.module_id = m.id
      WHERE e.user_id = ?
    `;
    const params: any[] = [userId];

    if (track) {
      sql += ` AND tr.track_key = ?`;
      params.push(track);
    }
    if (status) {
      sql += ` AND e.ai_status = ?`;
      params.push(status);
    }
    if (search) {
      sql += ` AND (t.title LIKE ? OR t.code LIKE ? OR e.user_notes LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY e.created_at DESC`;

    const library = queryAll(db, sql, params);
    res.json({ library });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Download/View Evidence file
router.get('/evidence/:evidenceId/download', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const ev = queryOne<{ stored_filename: string; original_filename: string; mime_type: string }>(
      db,
      `SELECT stored_filename, original_filename, mime_type FROM user_evidence WHERE id = ? AND user_id = ?`,
      [req.params.evidenceId, req.user!.id]
    );

    if (!ev) {
      return res.status(404).json({ error: 'Evidence record not found or access denied.' });
    }

    const filePath = path.join(UPLOAD_DIR, ev.stored_filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Stored evidence file not found.' });
    }

    res.setHeader('Content-Type', ev.mime_type || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${ev.original_filename}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Evidence
router.delete('/evidence/:evidenceId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const ev = queryOne<{ stored_filename: string }>(
      db,
      `SELECT stored_filename FROM user_evidence WHERE id = ? AND user_id = ?`,
      [req.params.evidenceId, req.user!.id]
    );

    if (!ev) {
      return res.status(404).json({ error: 'Evidence not found.' });
    }

    const p = path.join(UPLOAD_DIR, ev.stored_filename);
    if (fs.existsSync(p)) fs.unlinkSync(p);

    executeRun(db, `DELETE FROM user_evidence WHERE id = ?`, [req.params.evidenceId]);
    logAudit(db, req.user!.id, 'EVIDENCE_DELETED', { evidenceId: req.params.evidenceId }, req.ip);

    res.json({ message: 'Evidence deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. MASTERY ASSESSMENT ROUTES
// ==========================================

// Start mastery test for a topic
router.post('/mastery/start', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { topicId, taskId } = req.body;
    const userId = req.user!.id;
    const db = await getDb();

    // Verify topic
    const topic = queryOne<{ id: string; code: string; title: string; track_key: string }>(
      db,
      `SELECT t.id, t.code, t.title, tr.track_key 
       FROM curriculum_topics t
       JOIN curriculum_tracks tr ON t.track_id = tr.id
       WHERE t.id = ?`,
      [topicId]
    );

    if (!topic) {
      return res.status(404).json({ error: 'Topic not found.' });
    }

    // Get latest approved evidence summary
    const latestEvidence = queryOne<{ user_notes: string; text_content: string }>(
      db,
      `SELECT user_notes, text_content FROM user_evidence 
       WHERE user_id = ? AND topic_id = ? AND ai_status = 'VALID'
       ORDER BY created_at DESC LIMIT 1`,
      [userId, topicId]
    );

    const notesSummary = (latestEvidence?.user_notes || '') + ' ' + (latestEvidence?.text_content || '');

    const questions = await generateMasteryAssessment(
      topic.title,
      topic.code,
      topic.track_key,
      notesSummary
    );

    const testId = crypto.randomUUID();
    executeRun(
      db,
      `INSERT INTO user_mastery_tests (id, user_id, topic_id, scheduled_task_id, questions_json)
       VALUES (?, ?, ?, ?, ?)`,
      [testId, userId, topicId, taskId || null, JSON.stringify(questions)]
    );

    res.json({
      testId,
      topic,
      questions,
    });
  } catch (err: any) {
    console.error('Mastery assessment start error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Submit answers for mastery evaluation
router.post('/mastery/submit', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { testId, answers } = req.body;
    const userId = req.user!.id;
    const db = await getDb();

    const test = queryOne<{
      id: string;
      topic_id: string;
      scheduled_task_id: string;
      questions_json: string;
    }>(
      db,
      `SELECT * FROM user_mastery_tests WHERE id = ? AND user_id = ?`,
      [testId, userId]
    );

    if (!test) {
      return res.status(404).json({ error: 'Mastery test record not found.' });
    }

    const topic = queryOne<{ id: string; title: string; code: string }>(
      db,
      `SELECT id, title, code FROM curriculum_topics WHERE id = ?`,
      [test.topic_id]
    );

    const questions = JSON.parse(test.questions_json);
    const evaluation = await evaluateMasteryAnswers(topic?.title || 'Topic', questions, answers);

    const now = new Date().toISOString();

    executeRun(
      db,
      `UPDATE user_mastery_tests 
       SET answers_json = ?, score = ?, passed = ?, ai_feedback = ?, completed_at = ?
       WHERE id = ?`,
      [
        JSON.stringify(answers),
        evaluation.score,
        evaluation.passed ? 1 : 0,
        evaluation.feedback,
        now,
        testId,
      ]
    );

    // If passed: Mark task MASTERED & advance track checkpoint
    if (evaluation.passed) {
      if (test.scheduled_task_id) {
        executeRun(
          db,
          `UPDATE user_scheduled_tasks 
           SET status = 'MASTERED', completed_at = ?
           WHERE id = ? AND user_id = ?`,
          [now, test.scheduled_task_id, userId]
        );
      }
      updateCheckpointOnCompletion(db, userId, test.topic_id, true);
      logAudit(db, userId, 'MASTERY_PASSED', { topicId: test.topic_id, score: evaluation.score }, req.ip);
    } else {
      if (test.scheduled_task_id) {
        executeRun(
          db,
          `UPDATE user_scheduled_tasks 
           SET status = 'FAILED_MASTERY' 
           WHERE id = ? AND user_id = ?`,
          [test.scheduled_task_id, userId]
        );
      }
      logAudit(db, userId, 'MASTERY_FAILED', { topicId: test.topic_id, score: evaluation.score }, req.ip);
    }

    res.json({
      score: evaluation.score,
      passed: evaluation.passed,
      feedback: evaluation.feedback,
    });
  } catch (err: any) {
    console.error('Mastery submit error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. RESEARCH MILESTONES & INTERVIEW PREP
// ==========================================

router.get('/research/milestones', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const milestones = queryAll(
      db,
      `SELECT * FROM user_research_milestones WHERE user_id = ? ORDER BY updated_at DESC`,
      [req.user!.id]
    );
    res.json({ milestones });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/research/milestones', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, paper_or_experiment, stage, status, notes, topic_id } = req.body;
    const db = await getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    executeRun(
      db,
      `INSERT INTO user_research_milestones (
        id, user_id, title, paper_or_experiment, stage, status, notes, topic_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        req.user!.id,
        title,
        paper_or_experiment,
        stage || 'LITERATURE_REVIEW',
        status || 'IN_PROGRESS',
        notes || '',
        topic_id || null,
        now,
        now,
      ]
    );

    res.json({ id, message: 'Research milestone created.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
