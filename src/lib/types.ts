export type MaterialType = "video" | "text";

export type CourseStatus = "spine" | "active" | "reference" | "completed" | "parked";

export interface Skill {
  id: string;
  name: string;
  category: string;
  phase: string;
  currentLevel: number; // 0 to 5
  targetLevel: number; // 1 to 5
  hoursLogged: number;
  notes: string;
  updatedAt: string;
}

export interface CurriculumItem {
  id: string;
  courseId: string;
  title: string;
  completed: boolean;
  isStretch: boolean;
  notes: string;
  artifactUrl: string;
  orderIndex: number;
  updatedAt: string;
}

export interface Course {
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
  createdAt: string;
  items: CurriculumItem[];
}

export type BucketId = "build" | "study" | "design" | "reps" | "review" | "labs";

export interface WeeklyLog {
  weekNumber: number; // 1..26
  startDate: string; // YYYY-MM-DD
  focusGoal: string;
  buildHours: number;
  studyHours: number;
  designHours: number;
  repsHours: number;
  reviewHours: number;
  labsHours: number;
  repsDays: number[]; // length 7 (Mon-Sun)
  reviewShipped: string;
  reviewBlocked: string;
  reviewNext: string;
  updatedAt: string;
}

export type ScheduleCategory = "event" | "immediate_todo" | "upcoming_todo";

export interface ScheduleItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string;
  category: ScheduleCategory;
  phase: string;
  completed: boolean;
  notes: string;
}

export interface PhaseOverview {
  id: string;
  number: number;
  tab: string;
  segment: string;
  title: string;
  weeksLabel: string;
  startWeek: number | null;
  endWeek: number | null;
  goal: string;
  spineCourse: string;
  buildName: string;
  buildDescription: string;
  doneWhen: string;
  designThread: string;
  color: string;
}

export interface PlannerSnapshot {
  skills: Skill[];
  courses: Course[];
  weeklyLogs: WeeklyLog[];
  scheduleItems: ScheduleItem[];
  phases: PhaseOverview[];
}

