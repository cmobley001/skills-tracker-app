import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  INITIAL_COURSES,
  INITIAL_SCHEDULE_ITEMS,
  INITIAL_SKILLS,
  INITIAL_WEEKLY_LOGS,
  PHASES_DATA,
} from "./seed-data";
import {
  Course,
  CourseStatus,
  CurriculumItem,
  MaterialType,
  PlannerSnapshot,
  ScheduleCategory,
  ScheduleItem,
  Skill,
  WeeklyLog,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "skills-planner.sqlite");

declare global {
  // eslint-disable-next-line no-var
  var __skillsPlannerDb: DatabaseSync | undefined;
}

function getDb(): DatabaseSync {
  if (!global.__skillsPlannerDb) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const db = new DatabaseSync(DB_PATH);
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA foreign_keys = ON;");
    initSchema(db);
    seedIfEmpty(db);
    global.__skillsPlannerDb = db;
  }
  return global.__skillsPlannerDb;
}

function initSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      phase TEXT NOT NULL,
      current_level INTEGER NOT NULL DEFAULT 0,
      target_level INTEGER NOT NULL DEFAULT 4,
      hours_logged REAL NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT 'video',
      phase TEXT NOT NULL DEFAULT 'Phase 1',
      status TEXT NOT NULL DEFAULT 'active',
      skill_id TEXT NOT NULL DEFAULT 'js',
      url TEXT NOT NULL DEFAULT '',
      build_project TEXT NOT NULL DEFAULT '',
      summary_notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS curriculum_items (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      is_stretch INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      artifact_url TEXT NOT NULL DEFAULT '',
      order_index INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS weekly_logs (
      week_number INTEGER PRIMARY KEY,
      start_date TEXT NOT NULL,
      focus_goal TEXT NOT NULL DEFAULT '',
      build_hours REAL NOT NULL DEFAULT 0,
      study_hours REAL NOT NULL DEFAULT 0,
      design_hours REAL NOT NULL DEFAULT 0,
      reps_hours REAL NOT NULL DEFAULT 0,
      review_hours REAL NOT NULL DEFAULT 0,
      labs_hours REAL NOT NULL DEFAULT 0,
      reps_days TEXT NOT NULL DEFAULT '[0,0,0,0,0,0,0]',
      review_shipped TEXT NOT NULL DEFAULT '',
      review_blocked TEXT NOT NULL DEFAULT '',
      review_next TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schedule_items (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'immediate_todo',
      phase TEXT NOT NULL DEFAULT 'Phase 1',
      completed INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT ''
    );
  `);
}

function seedIfEmpty(db: DatabaseSync): void {
  const countRow = db
    .prepare("SELECT COUNT(*) as cnt FROM skills")
    .get() as { cnt: number } | undefined;
  if (countRow && countRow.cnt > 0) {
    return;
  }
  seedAll(db);
}

export function seedAll(dbInstance?: DatabaseSync): void {
  const db = dbInstance ?? getDb();
  db.exec("BEGIN TRANSACTION;");
  try {
    db.exec("DELETE FROM curriculum_items;");
    db.exec("DELETE FROM courses;");
    db.exec("DELETE FROM skills;");
    db.exec("DELETE FROM weekly_logs;");
    db.exec("DELETE FROM schedule_items;");

    const insertSkill = db.prepare(`
      INSERT INTO skills (id, name, category, phase, current_level, target_level, hours_logged, notes, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const s of INITIAL_SKILLS) {
      insertSkill.run(
        s.id,
        s.name,
        s.category,
        s.phase,
        s.currentLevel,
        s.targetLevel,
        s.hoursLogged,
        s.notes,
        s.updatedAt
      );
    }

    const insertCourse = db.prepare(`
      INSERT INTO courses (id, title, provider, type, phase, status, skill_id, url, build_project, summary_notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertItem = db.prepare(`
      INSERT INTO curriculum_items (id, course_id, title, completed, is_stretch, notes, artifact_url, order_index, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const c of INITIAL_COURSES) {
      insertCourse.run(
        c.id,
        c.title,
        c.provider,
        c.type,
        c.phase,
        c.status,
        c.skillId,
        c.url,
        c.buildProject,
        c.summaryNotes,
        c.createdAt
      );
      for (const item of c.items) {
        insertItem.run(
          item.id,
          c.id,
          item.title,
          item.completed ? 1 : 0,
          item.isStretch ? 1 : 0,
          item.notes,
          item.artifactUrl,
          item.orderIndex,
          item.updatedAt
        );
      }
    }

    const insertWeek = db.prepare(`
      INSERT INTO weekly_logs (
        week_number, start_date, focus_goal, build_hours, study_hours, design_hours,
        reps_hours, review_hours, labs_hours, reps_days, review_shipped, review_blocked, review_next, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const w of INITIAL_WEEKLY_LOGS) {
      insertWeek.run(
        w.weekNumber,
        w.startDate,
        w.focusGoal,
        w.buildHours,
        w.studyHours,
        w.designHours,
        w.repsHours,
        w.reviewHours,
        w.labsHours,
        JSON.stringify(w.repsDays),
        w.reviewShipped,
        w.reviewBlocked,
        w.reviewNext,
        w.updatedAt
      );
    }

    const insertSched = db.prepare(`
      INSERT INTO schedule_items (id, title, date, time, category, phase, completed, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of INITIAL_SCHEDULE_ITEMS) {
      insertSched.run(
        item.id,
        item.title,
        item.date,
        item.time,
        item.category,
        item.phase,
        item.completed ? 1 : 0,
        item.notes
      );
    }

    db.exec("COMMIT;");
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  }
}

export function getPlannerSnapshot(): PlannerSnapshot {
  const db = getDb();

  const skillRows = db
    .prepare("SELECT * FROM skills ORDER BY rowid ASC")
    .all() as Array<Record<string, unknown>>;

  const skills: Skill[] = skillRows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    category: String(r.category),
    phase: String(r.phase),
    currentLevel: Number(r.current_level),
    targetLevel: Number(r.target_level),
    hoursLogged: Number(r.hours_logged),
    notes: String(r.notes),
    updatedAt: String(r.updated_at),
  }));

  const courseRows = db
    .prepare("SELECT * FROM courses ORDER BY rowid ASC")
    .all() as Array<Record<string, unknown>>;

  const itemRows = db
    .prepare(
      "SELECT * FROM curriculum_items ORDER BY order_index ASC, rowid ASC"
    )
    .all() as Array<Record<string, unknown>>;

  const itemsByCourse = new Map<string, CurriculumItem[]>();
  for (const ir of itemRows) {
    const cId = String(ir.course_id);
    const list = itemsByCourse.get(cId) ?? [];
    list.push({
      id: String(ir.id),
      courseId: cId,
      title: String(ir.title),
      completed: Boolean(ir.completed),
      isStretch: Boolean(ir.is_stretch),
      notes: String(ir.notes),
      artifactUrl: String(ir.artifact_url),
      orderIndex: Number(ir.order_index),
      updatedAt: String(ir.updated_at),
    });
    itemsByCourse.set(cId, list);
  }

  const courses: Course[] = courseRows.map((r) => {
    const id = String(r.id);
    return {
      id,
      title: String(r.title),
      provider: String(r.provider),
      type: (r.type === "text" ? "text" : "video") as MaterialType,
      phase: String(r.phase),
      status: String(r.status) as CourseStatus,
      skillId: String(r.skill_id),
      url: String(r.url),
      buildProject: String(r.build_project),
      summaryNotes: String(r.summary_notes),
      createdAt: String(r.created_at),
      items: itemsByCourse.get(id) ?? [],
    };
  });

  const weekRows = db
    .prepare("SELECT * FROM weekly_logs ORDER BY week_number ASC")
    .all() as Array<Record<string, unknown>>;

  const weeklyLogs: WeeklyLog[] = weekRows.map((r) => {
    let repsDays = [0, 0, 0, 0, 0, 0, 0];
    try {
      const parsed = JSON.parse(String(r.reps_days));
      if (Array.isArray(parsed) && parsed.length === 7) {
        repsDays = parsed.map((v) => (v ? 1 : 0));
      }
    } catch {
      // keep default
    }
    return {
      weekNumber: Number(r.week_number),
      startDate: String(r.start_date),
      focusGoal: String(r.focus_goal),
      buildHours: Number(r.build_hours),
      studyHours: Number(r.study_hours),
      designHours: Number(r.design_hours),
      repsHours: Number(r.reps_hours),
      reviewHours: Number(r.review_hours),
      labsHours: Number(r.labs_hours),
      repsDays,
      reviewShipped: String(r.review_shipped),
      reviewBlocked: String(r.review_blocked),
      reviewNext: String(r.review_next),
      updatedAt: String(r.updated_at),
    };
  });

  const schedRows = db
    .prepare("SELECT * FROM schedule_items ORDER BY date ASC, time ASC, rowid ASC")
    .all() as Array<Record<string, unknown>>;

  const scheduleItems: ScheduleItem[] = schedRows.map((r) => ({
    id: String(r.id),
    title: String(r.title),
    date: String(r.date),
    time: String(r.time),
    category: String(r.category) as ScheduleCategory,
    phase: String(r.phase),
    completed: Boolean(r.completed),
    notes: String(r.notes),
  }));

  return {
    skills,
    courses,
    weeklyLogs,
    scheduleItems,
    phases: PHASES_DATA,
  };
}

export function upsertSkill(input: {
  id?: string;
  name: string;
  category: string;
  phase: string;
  currentLevel: number;
  targetLevel: number;
  hoursLogged: number;
  notes: string;
}): void {
  const db = getDb();
  const id = input.id?.trim() || `skill-${Date.now().toString(36)}`;
  const now = new Date().toISOString();
  const existing = db
    .prepare("SELECT id FROM skills WHERE id = ?")
    .get(id) as { id: string } | undefined;

  if (existing) {
    db.prepare(`
      UPDATE skills
      SET name = ?, category = ?, phase = ?, current_level = ?, target_level = ?, hours_logged = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `).run(
      input.name,
      input.category,
      input.phase,
      Math.max(0, Math.min(5, input.currentLevel)),
      Math.max(1, Math.min(5, input.targetLevel)),
      Math.max(0, input.hoursLogged),
      input.notes,
      now,
      id
    );
  } else {
    db.prepare(`
      INSERT INTO skills (id, name, category, phase, current_level, target_level, hours_logged, notes, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.name,
      input.category,
      input.phase,
      Math.max(0, Math.min(5, input.currentLevel)),
      Math.max(1, Math.min(5, input.targetLevel)),
      Math.max(0, input.hoursLogged),
      input.notes,
      now
    );
  }
}

export function deleteSkill(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM skills WHERE id = ?").run(id);
}

export function createCourse(input: {
  title: string;
  provider: string;
  type: MaterialType;
  phase: string;
  status: CourseStatus;
  skillId: string;
  url: string;
  buildProject: string;
  summaryNotes: string;
  initialItems?: string[];
}): string {
  const db = getDb();
  const id = `course-${Date.now().toString(36)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO courses (id, title, provider, type, phase, status, skill_id, url, build_project, summary_notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.title,
    input.provider,
    input.type,
    input.phase,
    input.status,
    input.skillId,
    input.url,
    input.buildProject,
    input.summaryNotes,
    now
  );

  if (input.initialItems && input.initialItems.length > 0) {
    const insertItem = db.prepare(`
      INSERT INTO curriculum_items (id, course_id, title, completed, is_stretch, notes, artifact_url, order_index, updated_at)
      VALUES (?, ?, ?, 0, 0, '', '', ?, ?)
    `);
    input.initialItems.forEach((title, idx) => {
      if (title.trim()) {
        insertItem.run(
          `${id}-item-${idx}-${Date.now().toString(36)}`,
          id,
          title.trim(),
          idx,
          now
        );
      }
    });
  }

  return id;
}

export function updateCourse(input: {
  id: string;
  title: string;
  provider: string;
  type: MaterialType;
  phase: string;
  status: CourseStatus;
  skillId: string;
  url: string;
  buildProject: string;
  summaryNotes: string;
}): void {
  const db = getDb();
  db.prepare(`
    UPDATE courses
    SET title = ?, provider = ?, type = ?, phase = ?, status = ?, skill_id = ?, url = ?, build_project = ?, summary_notes = ?
    WHERE id = ?
  `).run(
    input.title,
    input.provider,
    input.type,
    input.phase,
    input.status,
    input.skillId,
    input.url,
    input.buildProject,
    input.summaryNotes,
    input.id
  );
}

export function deleteCourse(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM courses WHERE id = ?").run(id);
}

export function addCurriculumItem(input: {
  courseId: string;
  title: string;
  isStretch?: boolean;
  notes?: string;
  artifactUrl?: string;
}): void {
  const db = getDb();
  const maxRow = db
    .prepare(
      "SELECT COALESCE(MAX(order_index), -1) as maxIdx FROM curriculum_items WHERE course_id = ?"
    )
    .get(input.courseId) as { maxIdx: number } | undefined;
  const nextIndex = (maxRow?.maxIdx ?? -1) + 1;
  const now = new Date().toISOString();
  const id = `ms-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  db.prepare(`
    INSERT INTO curriculum_items (id, course_id, title, completed, is_stretch, notes, artifact_url, order_index, updated_at)
    VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.courseId,
    input.title,
    input.isStretch ? 1 : 0,
    input.notes ?? "",
    input.artifactUrl ?? "",
    nextIndex,
    now
  );
}

export function updateCurriculumItem(input: {
  id: string;
  title?: string;
  completed?: boolean;
  notes?: string;
  artifactUrl?: string;
}): void {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM curriculum_items WHERE id = ?")
    .get(input.id) as Record<string, unknown> | undefined;
  if (!existing) return;

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE curriculum_items
    SET title = ?, completed = ?, notes = ?, artifact_url = ?, updated_at = ?
    WHERE id = ?
  `).run(
    input.title !== undefined ? input.title : String(existing.title),
    input.completed !== undefined
      ? input.completed
        ? 1
        : 0
      : Number(existing.completed),
    input.notes !== undefined ? input.notes : String(existing.notes),
    input.artifactUrl !== undefined
      ? input.artifactUrl
      : String(existing.artifact_url),
    now,
    input.id
  );
}

export function deleteCurriculumItem(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM curriculum_items WHERE id = ?").run(id);
}

export function updateWeeklyLog(input: {
  weekNumber: number;
  focusGoal?: string;
  buildHours?: number;
  studyHours?: number;
  designHours?: number;
  repsHours?: number;
  reviewHours?: number;
  labsHours?: number;
  repsDays?: number[];
  reviewShipped?: string;
  reviewBlocked?: string;
  reviewNext?: string;
}): void {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM weekly_logs WHERE week_number = ?")
    .get(input.weekNumber) as Record<string, unknown> | undefined;
  if (!existing) return;

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE weekly_logs
    SET
      focus_goal = ?,
      build_hours = ?,
      study_hours = ?,
      design_hours = ?,
      reps_hours = ?,
      review_hours = ?,
      labs_hours = ?,
      reps_days = ?,
      review_shipped = ?,
      review_blocked = ?,
      review_next = ?,
      updated_at = ?
    WHERE week_number = ?
  `).run(
    input.focusGoal !== undefined ? input.focusGoal : String(existing.focus_goal),
    input.buildHours !== undefined
      ? Math.max(0, input.buildHours)
      : Number(existing.build_hours),
    input.studyHours !== undefined
      ? Math.max(0, input.studyHours)
      : Number(existing.study_hours),
    input.designHours !== undefined
      ? Math.max(0, input.designHours)
      : Number(existing.design_hours),
    input.repsHours !== undefined
      ? Math.max(0, input.repsHours)
      : Number(existing.reps_hours),
    input.reviewHours !== undefined
      ? Math.max(0, input.reviewHours)
      : Number(existing.review_hours),
    input.labsHours !== undefined
      ? Math.max(0, input.labsHours)
      : Number(existing.labs_hours),
    input.repsDays !== undefined
      ? JSON.stringify(input.repsDays)
      : String(existing.reps_days),
    input.reviewShipped !== undefined
      ? input.reviewShipped
      : String(existing.review_shipped),
    input.reviewBlocked !== undefined
      ? input.reviewBlocked
      : String(existing.review_blocked),
    input.reviewNext !== undefined
      ? input.reviewNext
      : String(existing.review_next),
    now,
    input.weekNumber
  );
}

export function createScheduleItem(input: {
  title: string;
  date: string;
  time: string;
  category: ScheduleCategory;
  phase: string;
  notes: string;
}): void {
  const db = getDb();
  const id = `sched-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  db.prepare(`
    INSERT INTO schedule_items (id, title, date, time, category, phase, completed, notes)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?)
  `).run(
    id,
    input.title,
    input.date,
    input.time,
    input.category,
    input.phase,
    input.notes
  );
}

export function updateScheduleItem(input: {
  id: string;
  title?: string;
  date?: string;
  time?: string;
  category?: ScheduleCategory;
  phase?: string;
  completed?: boolean;
  notes?: string;
}): void {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM schedule_items WHERE id = ?")
    .get(input.id) as Record<string, unknown> | undefined;
  if (!existing) return;

  db.prepare(`
    UPDATE schedule_items
    SET title = ?, date = ?, time = ?, category = ?, phase = ?, completed = ?, notes = ?
    WHERE id = ?
  `).run(
    input.title !== undefined ? input.title : String(existing.title),
    input.date !== undefined ? input.date : String(existing.date),
    input.time !== undefined ? input.time : String(existing.time),
    input.category !== undefined ? input.category : String(existing.category),
    input.phase !== undefined ? input.phase : String(existing.phase),
    input.completed !== undefined
      ? input.completed
        ? 1
        : 0
      : Number(existing.completed),
    input.notes !== undefined ? input.notes : String(existing.notes),
    input.id
  );
}

export function deleteScheduleItem(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM schedule_items WHERE id = ?").run(id);
}

