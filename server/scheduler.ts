import type { Database } from 'sql.js';
import crypto from 'crypto';
import { queryAll, queryOne, executeRun } from './db.js';

export interface ScheduleSlot {
  start: string; // "16:00"
  end: string;   // "17:00"
  trackKey?: string;
  notes?: string;
}

export interface DaySchedulePlan {
  date: string;
  dayType: 'WEEKDAY' | 'SATURDAY_WORKING' | 'SATURDAY_OFF' | 'SUNDAY';
  slots: ScheduleSlot[];
  maxHours: number;
}

// Compute the slots for a given date based on schedule rules and user preferences
export function computeDailySlots(
  db: Database,
  userId: string,
  targetDate: string
): { dayType: string; slots: ScheduleSlot[]; maxHours: number } {
  // Check user preference for Saturday working & college end time
  const prefs = queryOne<{ college_end_time: string; saturday_is_working: number }>(
    db,
    `SELECT college_end_time, saturday_is_working FROM user_preferences WHERE user_id = ?`,
    [userId]
  ) || { college_end_time: '16:00', saturday_is_working: 0 };

  const d = new Date(targetDate + 'T12:00:00Z');
  const dayOfWeek = d.getUTCDay(); // 0 is Sunday, 6 is Saturday

  let dayType: 'WEEKDAY' | 'SATURDAY_WORKING' | 'SATURDAY_OFF' | 'SUNDAY';
  if (dayOfWeek === 0) {
    dayType = 'SUNDAY';
  } else if (dayOfWeek === 6) {
    dayType = prefs.saturday_is_working ? 'SATURDAY_WORKING' : 'SATURDAY_OFF';
  } else {
    dayType = 'WEEKDAY';
  }

  // Find active schedule version
  const activeSchedVersion = queryOne<{ id: string }>(
    db,
    `SELECT id FROM schedule_versions WHERE is_active = 1 LIMIT 1`
  );

  let rule: any = null;
  if (activeSchedVersion) {
    rule = queryOne(
      db,
      `SELECT * FROM schedule_rules WHERE schedule_version_id = ? AND day_type = ? LIMIT 1`,
      [activeSchedVersion.id, dayType]
    );
  }

  // Fallback defaults if no rule in database yet
  let windowStart = '16:00';
  let windowEnd = '23:00';
  let maxContinuous = 60; // 60 mins
  let breakMinutes = 15;
  let maxDailyHours = 5;

  if (rule) {
    windowStart = rule.window_start || windowStart;
    windowEnd = rule.window_end || windowEnd;
    maxContinuous = rule.max_continuous_minutes || maxContinuous;
    breakMinutes = rule.break_minutes || breakMinutes;
    maxDailyHours = rule.max_daily_hours || maxDailyHours;
  } else {
    if (dayType === 'SATURDAY_OFF' || dayType === 'SUNDAY') {
      windowStart = '11:00';
      windowEnd = '21:00';
      maxDailyHours = 8;
    }
  }

  // On weekdays, ensure windowStart is not earlier than college_end_time
  if (dayType === 'WEEKDAY' || dayType === 'SATURDAY_WORKING') {
    if (prefs.college_end_time && prefs.college_end_time > windowStart) {
      windowStart = prefs.college_end_time;
    }
  }

  // Generate slots within the window
  const slots: ScheduleSlot[] = [];
  let [currHour, currMin] = windowStart.split(':').map(Number);
  const [endHour, endMin] = windowEnd.split(':').map(Number);
  const endTotalMins = endHour * 60 + endMin;

  let totalScheduledMins = 0;
  const maxStudyMins = maxDailyHours * 60;

  while (true) {
    const startMins = currHour * 60 + currMin;
    if (startMins + maxContinuous > endTotalMins) break;
    if (totalScheduledMins + maxContinuous > maxStudyMins) break;

    const blockEndMins = startMins + maxContinuous;
    const sHour = String(Math.floor(startMins / 60)).padStart(2, '0');
    const sMin = String(startMins % 60).padStart(2, '0');
    const eHour = String(Math.floor(blockEndMins / 60)).padStart(2, '0');
    const eMin = String(blockEndMins % 60).padStart(2, '0');

    slots.push({
      start: `${sHour}:${sMin}`,
      end: `${eHour}:${eMin}`,
    });

    totalScheduledMins += maxContinuous;

    // Advance by block + break
    const nextStartMins = blockEndMins + breakMinutes;
    currHour = Math.floor(nextStartMins / 60);
    currMin = nextStartMins % 60;
  }

  return { dayType, slots, maxHours: maxDailyHours };
}

// Check prerequisite state for a topic
export function isTopicEligible(
  db: Database,
  userId: string,
  topicId: string,
  curriculumVersionId: string
): { eligible: boolean; blockedBy: string[] } {
  const prereqs = queryAll<{ prerequisite_code: string; prerequisite_topic_id: string; is_mandatory: number }>(
    db,
    `SELECT p.prerequisite_code, p.prerequisite_topic_id, p.is_mandatory, t.requires_mastery, t.title
     FROM curriculum_prerequisites p
     LEFT JOIN curriculum_topics t ON (t.code = p.prerequisite_code AND t.curriculum_version_id = ?)
     WHERE p.topic_id = ?`,
    [curriculumVersionId, topicId]
  );

  const blockedBy: string[] = [];

  for (const pr of prereqs) {
    // Find completion state of prerequisite
    const prereqTopic = queryOne<{ id: string; requires_mastery: number }>(
      db,
      `SELECT id, requires_mastery FROM curriculum_topics WHERE (id = ? OR code = ?) AND curriculum_version_id = ? LIMIT 1`,
      [pr.prerequisite_topic_id || '', pr.prerequisite_code, curriculumVersionId]
    );

    if (!prereqTopic) continue;

    // Check completed task
    const completedTask = queryOne<{ status: string }>(
      db,
      `SELECT status FROM user_scheduled_tasks 
       WHERE user_id = ? AND topic_id = ? AND status IN ('STUDIED', 'MASTERED')
       ORDER BY completed_at DESC LIMIT 1`,
      [userId, prereqTopic.id]
    );

    if (!completedTask) {
      blockedBy.push(pr.prerequisite_code);
    } else if (prereqTopic.requires_mastery && completedTask.status !== 'MASTERED') {
      blockedBy.push(`${pr.prerequisite_code} (requires Mastery)`);
    }
  }

  return {
    eligible: blockedBy.length === 0,
    blockedBy,
  };
}

// Get or update checkpoint for a track
export function getTrackCheckpoint(
  db: Database,
  userId: string,
  trackKey: string,
  curriculumVersionId: string
): any {
  let checkpoint = queryOne(
    db,
    `SELECT * FROM user_checkpoints WHERE user_id = ? AND track_key = ? AND curriculum_version_id = ?`,
    [userId, trackKey, curriculumVersionId]
  );

  if (!checkpoint) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    // Count total topics in track
    const totalCount = queryOne<{ cnt: number }>(
      db,
      `SELECT COUNT(*) as cnt FROM curriculum_topics WHERE track_id IN (
        SELECT id FROM curriculum_tracks WHERE track_key = ? AND curriculum_version_id = ?
      )`,
      [trackKey, curriculumVersionId]
    )?.cnt || 0;

    // First topic in track
    const firstTopic = queryOne<{ id: string; module_id: string }>(
      db,
      `SELECT t.id, t.module_id FROM curriculum_topics t
       JOIN curriculum_tracks tr ON t.track_id = tr.id
       WHERE tr.track_key = ? AND tr.curriculum_version_id = ?
       ORDER BY t.ordering ASC, t.topic_number ASC LIMIT 1`,
      [trackKey, curriculumVersionId]
    );

    executeRun(
      db,
      `INSERT INTO user_checkpoints (id, user_id, track_key, curriculum_version_id, current_module_id, current_topic_id, completed_count, remaining_count, failed_count, mastery_state, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, 0, 'IN_PROGRESS', ?)`,
      [id, userId, trackKey, curriculumVersionId, firstTopic?.module_id || null, firstTopic?.id || null, totalCount, now]
    );

    checkpoint = queryOne(
      db,
      `SELECT * FROM user_checkpoints WHERE id = ?`,
      [id]
    );
  }

  return checkpoint;
}

// Find next eligible uncompleted topic for a track
export function getNextTopicForTrack(
  db: Database,
  userId: string,
  trackKey: string,
  curriculumVersionId: string
): any | null {
  // All topics in track ordered by module ordering and topic ordering
  const topics = queryAll(
    db,
    `SELECT t.*, m.title as module_title, m.module_number, tr.track_key, tr.title as track_title, tr.color as track_color
     FROM curriculum_topics t
     JOIN curriculum_modules m ON t.module_id = m.id
     JOIN curriculum_tracks tr ON t.track_id = tr.id
     WHERE tr.track_key = ? AND tr.curriculum_version_id = ?
     ORDER BY m.ordering ASC, m.module_number ASC, t.ordering ASC, t.topic_number ASC`,
    [trackKey, curriculumVersionId]
  );

  for (const topic of topics) {
    // Check if user has already completed/mastered this topic
    const done = queryOne<{ id: string; status: string }>(
      db,
      `SELECT id, status FROM user_scheduled_tasks 
       WHERE user_id = ? AND topic_id = ? AND status IN ('STUDIED', 'MASTERED')
       LIMIT 1`,
      [userId, topic.id]
    );

    if (done) continue;

    // Check prerequisites
    const { eligible, blockedBy } = isTopicEligible(db, userId, topic.id, curriculumVersionId);
    if (eligible) {
      return { ...topic, is_blocked: false };
    } else {
      return { ...topic, is_blocked: true, blocked_by: blockedBy };
    }
  }

  return null;
}

// Reschedule any overdue tasks from previous dates into backlog / today
export function processOverdueTasks(db: Database, userId: string, todayDate: string): void {
  // Incomplete tasks from earlier dates
  const overdueTasks = queryAll(
    db,
    `SELECT * FROM user_scheduled_tasks 
     WHERE user_id = ? AND scheduled_date < ? 
       AND status IN ('NOT_STARTED', 'IN_PROGRESS', 'RESCHEDULED', 'DEFERRED')`,
    [userId, todayDate]
  );

  for (const task of overdueTasks) {
    // Mark as RESCHEDULED to today if not already scheduled today
    const existsToday = queryOne(
      db,
      `SELECT id FROM user_scheduled_tasks WHERE user_id = ? AND topic_id = ? AND scheduled_date = ?`,
      [userId, task.topic_id, todayDate]
    );

    if (!existsToday) {
      executeRun(
        db,
        `UPDATE user_scheduled_tasks 
         SET status = 'RESCHEDULED', rescheduled_date = ?, scheduled_date = ? 
         WHERE id = ?`,
        [todayDate, todayDate, task.id]
      );
    }
  }
}

// Generate or fetch schedule for a given date
export function getOrCreateScheduleForDate(
  db: Database,
  userId: string,
  targetDate: string
): {
  date: string;
  dayType: string;
  tasks: any[];
  conflict: boolean;
  conflictDetails?: string;
} {
  // First process overdue
  processOverdueTasks(db, userId, targetDate);

  // Active curriculum
  const activeCurriculum = queryOne<{ id: string }>(
    db,
    `SELECT id FROM curriculum_versions WHERE is_active = 1 LIMIT 1`
  );

  if (!activeCurriculum) {
    return {
      date: targetDate,
      dayType: 'WEEKDAY',
      tasks: [],
      conflict: false,
    };
  }

  // Check existing tasks for target date
  let existingTasks = queryAll(
    db,
    `SELECT ust.*, 
            t.code as topic_code, t.title as topic_title, t.task_type, t.description as topic_description,
            t.requires_mastery, t.estimated_minutes,
            m.title as module_title, m.module_number,
            tr.track_key, tr.title as track_title, tr.color as track_color
     FROM user_scheduled_tasks ust
     JOIN curriculum_topics t ON ust.topic_id = t.id
     JOIN curriculum_modules m ON t.module_id = m.id
     JOIN curriculum_tracks tr ON t.track_id = tr.id
     WHERE ust.user_id = ? AND ust.scheduled_date = ?
     ORDER BY ust.scheduled_slot_start ASC`,
    [userId, targetDate]
  );

  const { dayType, slots, maxHours } = computeDailySlots(db, userId, targetDate);

  // If tasks already populated, return them
  if (existingTasks.length > 0) {
    const isConflict = existingTasks.length > slots.length;
    return {
      date: targetDate,
      dayType,
      tasks: existingTasks,
      conflict: isConflict,
      conflictDetails: isConflict
        ? `Backlog overflow: ${existingTasks.length} tasks scheduled, but only ${slots.length} available slots.`
        : undefined,
    };
  }

  // If no tasks exist for target date, generate them using track rotation & checkpoints
  const tracks = queryAll<{ id: string; track_key: string }>(
    db,
    `SELECT id, track_key FROM curriculum_tracks WHERE curriculum_version_id = ? ORDER BY ordering ASC`,
    [activeCurriculum.id]
  );

  if (tracks.length === 0 || slots.length === 0) {
    return {
      date: targetDate,
      dayType,
      tasks: [],
      conflict: false,
    };
  }

  const generatedTasks: any[] = [];
  let trackIndex = 0;

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    // Rotate track
    let candidateTopic: any = null;
    let attempts = 0;

    while (!candidateTopic && attempts < tracks.length) {
      const currentTrack = tracks[(trackIndex + attempts) % tracks.length];
      const nextTopic = getNextTopicForTrack(db, userId, currentTrack.track_key, activeCurriculum.id);

      if (nextTopic && !nextTopic.is_blocked) {
        // Ensure not already scheduled today
        const alreadyInDay = generatedTasks.some((gt) => gt.topic_id === nextTopic.id);
        if (!alreadyInDay) {
          candidateTopic = nextTopic;
          trackIndex = (trackIndex + attempts + 1) % tracks.length;
          break;
        }
      }
      attempts++;
    }

    if (!candidateTopic) {
      // Look for any eligible topic across tracks
      for (const tr of tracks) {
        const anyTopic = getNextTopicForTrack(db, userId, tr.track_key, activeCurriculum.id);
        if (anyTopic && !anyTopic.is_blocked && !generatedTasks.some((gt) => gt.topic_id === anyTopic.id)) {
          candidateTopic = anyTopic;
          break;
        }
      }
    }

    if (candidateTopic) {
      const taskId = crypto.randomUUID();
      const status = candidateTopic.is_blocked ? 'BLOCKED' : 'NOT_STARTED';

      executeRun(
        db,
        `INSERT INTO user_scheduled_tasks (
          id, user_id, topic_id, curriculum_version_id, scheduled_date, 
          scheduled_slot_start, scheduled_slot_end, status, original_date, priority
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          taskId,
          userId,
          candidateTopic.id,
          activeCurriculum.id,
          targetDate,
          slot.start,
          slot.end,
          status,
          targetDate,
          1,
        ]
      );

      generatedTasks.push({
        id: taskId,
        user_id: userId,
        topic_id: candidateTopic.id,
        curriculum_version_id: activeCurriculum.id,
        scheduled_date: targetDate,
        scheduled_slot_start: slot.start,
        scheduled_slot_end: slot.end,
        status,
        original_date: targetDate,
        topic_code: candidateTopic.code,
        topic_title: candidateTopic.title,
        topic_description: candidateTopic.description,
        task_type: candidateTopic.task_type,
        requires_mastery: candidateTopic.requires_mastery,
        estimated_minutes: candidateTopic.estimated_minutes,
        track_key: candidateTopic.track_key,
        track_title: candidateTopic.track_title,
        track_color: candidateTopic.track_color,
        module_title: candidateTopic.module_title,
        module_number: candidateTopic.module_number,
      });
    }
  }

  return {
    date: targetDate,
    dayType,
    tasks: generatedTasks,
    conflict: false,
  };
}

// Update checkpoint after task completion or mastery
export function updateCheckpointOnCompletion(
  db: Database,
  userId: string,
  topicId: string,
  isMastered: boolean
) {
  const topic = queryOne<{ track_id: string; module_id: string; curriculum_version_id: string; track_key: string }>(
    db,
    `SELECT t.track_id, t.module_id, t.curriculum_version_id, tr.track_key
     FROM curriculum_topics t
     JOIN curriculum_tracks tr ON t.track_id = tr.id
     WHERE t.id = ?`,
    [topicId]
  );

  if (!topic) return;

  const now = new Date().toISOString();

  // Calculate completed topics in this track
  const completedCount = queryOne<{ cnt: number }>(
    db,
    `SELECT COUNT(DISTINCT topic_id) as cnt FROM user_scheduled_tasks ust
     JOIN curriculum_topics t ON ust.topic_id = t.id
     WHERE ust.user_id = ? AND t.track_id = ? AND ust.status IN ('STUDIED', 'MASTERED')`,
    [userId, topic.track_id]
  )?.cnt || 0;

  const totalCount = queryOne<{ cnt: number }>(
    db,
    `SELECT COUNT(*) as cnt FROM curriculum_topics WHERE track_id = ?`,
    [topic.track_id]
  )?.cnt || 0;

  // Next topic in line for this track
  const nextTopic = getNextTopicForTrack(db, userId, topic.track_key, topic.curriculum_version_id);

  executeRun(
    db,
    `UPDATE user_checkpoints 
     SET current_module_id = ?, current_topic_id = ?, completed_count = ?, remaining_count = ?, mastery_state = ?, updated_at = ?
     WHERE user_id = ? AND track_key = ? AND curriculum_version_id = ?`,
    [
      nextTopic?.module_id || topic.module_id,
      nextTopic?.id || topicId,
      completedCount,
      Math.max(0, totalCount - completedCount),
      isMastered ? 'MASTERED' : 'STUDIED',
      now,
      userId,
      topic.track_key,
      topic.curriculum_version_id,
    ]
  );
}
