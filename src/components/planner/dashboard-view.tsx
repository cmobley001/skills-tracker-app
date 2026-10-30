"use client";

import * as React from "react";
import {
  BookOpen,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Flame,
  Layers,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { BUCKET_TARGETS } from "@/lib/seed-data";
import {
  BucketId,
  PlannerSnapshot,
  WeeklyLog,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

interface DashboardViewProps {
  snapshot: PlannerSnapshot;
  onMutate: (action: string, payload: unknown) => Promise<void>;
  onNavigateTab: (tab: "dashboard" | "skills" | "courses" | "schedule", courseId?: string) => void;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function DashboardView({
  snapshot,
  onMutate,
  onNavigateTab,
}: DashboardViewProps) {
  const [selectedPhaseId, setSelectedPhaseId] = React.useState<string>("p1");
  const [selectedWeek, setSelectedWeek] = React.useState<number>(1);
  const [focusDraft, setFocusDraft] = React.useState<string>("");
  const [editingFocus, setEditingFocus] = React.useState<boolean>(false);
  const [reviewDraft, setReviewDraft] = React.useState({
    shipped: "",
    blocked: "",
    next: "",
  });
  const [savingReview, setSavingReview] = React.useState(false);

  const activeWeekLog: WeeklyLog =
    snapshot.weeklyLogs.find((w) => w.weekNumber === selectedWeek) ??
    snapshot.weeklyLogs[0];

  React.useEffect(() => {
    if (activeWeekLog) {
      setFocusDraft(activeWeekLog.focusGoal);
      setReviewDraft({
        shipped: activeWeekLog.reviewShipped,
        blocked: activeWeekLog.reviewBlocked,
        next: activeWeekLog.reviewNext,
      });
    }
  }, [activeWeekLog]);

  // Aggregate curriculum metrics
  const allItems = snapshot.courses.flatMap((c) => c.items);
  const coreItems = allItems.filter((i) => !i.isStretch);
  const completedCoreItems = coreItems.filter((i) => i.completed);
  const overallProgressPct = coreItems.length
    ? Math.round((completedCoreItems.length / coreItems.length) * 100)
    : 0;

  const totalNotesCount =
    snapshot.courses.filter((c) => c.summaryNotes.trim().length > 0).length +
    allItems.filter((i) => i.notes.trim().length > 0).length +
    snapshot.skills.filter((s) => s.notes.trim().length > 0).length;

  // Skills metrics
  const skillsAtTarget = snapshot.skills.filter(
    (s) => s.currentLevel >= s.targetLevel
  ).length;
  const totalSkillPoints = snapshot.skills.reduce(
    (acc, s) => acc + s.currentLevel,
    0
  );
  const totalTargetPoints = snapshot.skills.reduce(
    (acc, s) => acc + s.targetLevel,
    0
  );
  const skillMasteryPct = totalTargetPoints
    ? Math.round((totalSkillPoints / totalTargetPoints) * 100)
    : 0;

  // Weekly & Total Hours metrics
  const getWeekCoreHours = (w: WeeklyLog) =>
    Math.round(
      (w.buildHours +
        w.studyHours +
        w.designHours +
        w.repsHours +
        w.reviewHours) *
        10
    ) / 10;

  const currentWeekCoreHours = activeWeekLog
    ? getWeekCoreHours(activeWeekLog)
    : 0;

  const totalCoreHoursAllWeeks =
    Math.round(
      snapshot.weeklyLogs.reduce((acc, w) => acc + getWeekCoreHours(w), 0) * 10
    ) / 10;
  const totalLabHoursAllWeeks =
    Math.round(
      snapshot.weeklyLogs.reduce((acc, w) => acc + w.labsHours, 0) * 10
    ) / 10;

  // Monthly aggregation across the 6-month plan
  const monthlyMetrics = React.useMemo(() => {
    const map = new Map<
      string,
      { label: string; core: number; labs: number }
    >();
    for (const w of snapshot.weeklyLogs) {
      const d = new Date(`${w.startDate}T00:00:00Z`);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
        timeZone: "UTC",
      });
      const existing = map.get(key) ?? { label, core: 0, labs: 0 };
      existing.core =
        Math.round((existing.core + getWeekCoreHours(w)) * 10) / 10;
      existing.labs = Math.round((existing.labs + w.labsHours) * 10) / 10;
      map.set(key, existing);
    }
    return Array.from(map.values());
  }, [snapshot.weeklyLogs]);

  // Phase progress helper
  const getPhaseProgress = (phaseTab: string, phaseNumber: number) => {
    const phaseKey = phaseNumber === 0 ? "Setup" : `Phase ${phaseNumber}`;
    const phaseCourses = snapshot.courses.filter((c) => c.phase === phaseKey);
    const items = phaseCourses.flatMap((c) =>
      c.items.filter((i) => !i.isStretch)
    );
    const done = items.filter((i) => i.completed).length;
    const pct = items.length ? Math.round((done / items.length) * 100) : 0;
    return { total: items.length, done, pct, courses: phaseCourses };
  };

  const selectedPhase =
    snapshot.phases.find((p) => p.id === selectedPhaseId) ?? snapshot.phases[1];
  const selectedPhaseStats = getPhaseProgress(
    selectedPhase.tab,
    selectedPhase.number
  );

  const handleAdjustBucket = async (bucketId: BucketId, delta: number) => {
    if (!activeWeekLog) return;
    const fieldMap: Record<BucketId, keyof WeeklyLog> = {
      build: "buildHours",
      study: "studyHours",
      design: "designHours",
      reps: "repsHours",
      review: "reviewHours",
      labs: "labsHours",
    };
    const key = fieldMap[bucketId];
    const currentVal = Number(activeWeekLog[key]) || 0;
    const nextVal = Math.max(0, Math.round((currentVal + delta) * 10) / 10);

    await onMutate("updateWeeklyLog", {
      weekNumber: selectedWeek,
      [key]: nextVal,
    });
  };

  const handleToggleRepDay = async (dayIdx: number) => {
    if (!activeWeekLog) return;
    const nextDays = [...activeWeekLog.repsDays];
    nextDays[dayIdx] = nextDays[dayIdx] ? 0 : 1;
    const daysCompleted = nextDays.filter(Boolean).length;
    // Each 20-minute rep session is ~0.35h; 6 days ~ 2.0h target
    const autoRepsHours = Math.round(((daysCompleted * 20) / 60) * 10) / 10;

    await onMutate("updateWeeklyLog", {
      weekNumber: selectedWeek,
      repsDays: nextDays,
      repsHours: Math.max(activeWeekLog.repsHours, autoRepsHours),
    });
  };

  const handleSaveFocus = async (e: React.FormEvent) => {
    e.preventDefault();
    await onMutate("updateWeeklyLog", {
      weekNumber: selectedWeek,
      focusGoal: focusDraft.trim(),
    });
    setEditingFocus(false);
  };

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingReview(true);
    try {
      await onMutate("updateWeeklyLog", {
        weekNumber: selectedWeek,
        reviewShipped: reviewDraft.shipped,
        reviewBlocked: reviewDraft.blocked,
        reviewNext: reviewDraft.next,
      });
    } finally {
      setSavingReview(false);
    }
  };

  const immediateTodos = snapshot.scheduleItems.filter(
    (s) => s.category === "immediate_todo" && !s.completed
  );

  return (
    <div className="space-y-6">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/80 bg-card/90">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Curriculum Progress
              </span>
              <Target className="h-4 w-4 text-emerald-400" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              {completedCoreItems.length} / {coreItems.length}{" "}
              <span className="text-base font-normal text-muted-foreground">
                milestones
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress
              value={overallProgressPct}
              className="h-2 mb-2"
              indicatorClassName="bg-emerald-500"
            />
            <p className="text-xs text-muted-foreground">
              {overallProgressPct}% of core 26-week plan completed
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/90">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Skill Proficiency
              </span>
              <TrendingUp className="h-4 w-4 text-blue-400" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              {skillMasteryPct}%{" "}
              <span className="text-base font-normal text-muted-foreground">
                target mastery
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress
              value={skillMasteryPct}
              className="h-2 mb-2"
              indicatorClassName="bg-blue-500"
            />
            <p className="text-xs text-muted-foreground">
              {skillsAtTarget} of {snapshot.skills.length} skills at target level
              ({totalSkillPoints}/{totalTargetPoints} pts)
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/90">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Week {selectedWeek} Rhythm
              </span>
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              {currentWeekCoreHours} / 32 h{" "}
              <span className="text-base font-normal text-muted-foreground">
                core
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress
              value={Math.min(100, Math.round((currentWeekCoreHours / 32) * 100))}
              className="h-2 mb-2"
              indicatorClassName="bg-amber-500"
            />
            <p className="text-xs text-muted-foreground">
              Total logged: {totalCoreHoursAllWeeks}h core ·{" "}
              {totalLabHoursAllWeeks}h creative labs
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/90">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Knowledge Base
              </span>
              <BookOpen className="h-4 w-4 text-purple-400" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              {snapshot.courses.length} Courses{" "}
              <span className="text-base font-normal text-muted-foreground">
                · {totalNotesCount} notes
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 pt-1">
              <Badge variant="blue">
                {snapshot.courses.filter((c) => c.type === "video").length} Video
              </Badge>
              <Badge variant="purple">
                {snapshot.courses.filter((c) => c.type === "text").length} Text /
                Docs
              </Badge>
              <Badge variant="amber">{immediateTodos.length} Active To-Dos</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Focus Banner */}
      <Card className="border-l-4 border-l-primary bg-card/95">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  Week {selectedWeek} Anchor Focus ({activeWeekLog?.startDate})
                </span>
              </div>
              {editingFocus ? (
                <form
                  onSubmit={handleSaveFocus}
                  className="flex flex-col sm:flex-row gap-2 pt-1"
                >
                  <Input
                    value={focusDraft}
                    onChange={(e) => setFocusDraft(e.target.value)}
                    placeholder={`Set your #1 focus goal for Week ${selectedWeek}...`}
                    className="flex-1"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm">
                      Save Focus
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingFocus(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <p className="text-base font-medium text-foreground">
                  {activeWeekLog?.focusGoal || (
                    <span className="text-muted-foreground italic">
                      No focus goal set for Week {selectedWeek} yet. Anchor your
                      32 core hours with one primary goal.
                    </span>
                  )}
                </p>
              )}
            </div>
            {!editingFocus && (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingFocus(true)}
                >
                  Edit Week Focus
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 26-Week Six-Month Build Plan Flight Track */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Six-Month Build Plan Track (Nov 2, 2026 – May 2, 2027)
              </CardTitle>
              <CardDescription>
                Select any phase to inspect its spine course, build deliverable,
                and milestone completion.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {snapshot.phases.map((p) => {
                const stats = getPhaseProgress(p.tab, p.number);
                const isSelected = p.id === selectedPhaseId;
                return (
                  <Button
                    key={p.id}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPhaseId(p.id)}
                    className="h-8 text-xs"
                  >
                    <span>
                      {p.number === 0 ? "0 · Setup" : `${p.number} · ${p.tab}`}
                    </span>
                    <span className="ml-1 opacity-75 font-mono text-[10px]">
                      {stats.done}/{stats.total}
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Proportional 26-week bar */}
          <div className="grid grid-cols-26 gap-1 pt-1">
            {snapshot.phases
              .filter((p) => p.startWeek && p.endWeek)
              .map((p) => {
                const span = (p.endWeek! - p.startWeek! + 1);
                const stats = getPhaseProgress(p.tab, p.number);
                const isSelected = p.id === selectedPhaseId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPhaseId(p.id)}
                    style={{
                      gridColumn: `span ${span} / span ${span}`,
                      borderTopColor: p.color,
                    }}
                    className={`group relative flex flex-col justify-between rounded-b-lg border border-border/70 border-t-4 p-2.5 text-left transition-all cursor-pointer hover:bg-accent/40 ${
                      isSelected
                        ? "ring-2 ring-primary bg-accent/30"
                        : "bg-secondary/20"
                    }`}
                  >
                    <div className="truncate font-semibold text-xs sm:text-sm">
                      P{p.number}: {p.segment}
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground mt-1">
                      <span>W{p.startWeek}–{p.endWeek}</span>
                      <span>{stats.pct}%</span>
                    </div>
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${stats.pct}%`,
                          backgroundColor: p.color,
                        }}
                      />
                    </div>
                  </button>
                );
              })}
          </div>

          {/* Selected Phase Summary Card */}
          <div className="rounded-xl border border-border bg-secondary/20 p-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    {selectedPhase.weeksLabel}
                  </Badge>
                  <Badge variant="emerald">
                    {selectedPhaseStats.done} of {selectedPhaseStats.total} core
                    milestones done ({selectedPhaseStats.pct}%)
                  </Badge>
                </div>
                <h4 className="text-lg font-semibold">{selectedPhase.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedPhase.goal}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                {selectedPhaseStats.courses[0] && (
                  <Button
                    size="sm"
                    onClick={() =>
                      onNavigateTab("courses", selectedPhaseStats.courses[0].id)
                    }
                  >
                    Open Phase Courses & Notes →
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 pt-3 border-t border-border/60 sm:grid-cols-3 text-sm">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground block">
                  Spine Course
                </span>
                <span className="font-medium">{selectedPhase.spineCourse}</span>
              </div>
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground block">
                  Phase Build Deliverable
                </span>
                <span className="font-medium">{selectedPhase.buildName}: </span>
                <span className="text-muted-foreground">
                  {selectedPhase.buildDescription}
                </span>
              </div>
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground block">
                  Done When
                </span>
                <span className="text-muted-foreground">
                  {selectedPhase.doneWhen}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Analytics Grid: Weekly Rhythm + Skill Matrix & Monthly Metrics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left 7 cols: Weekly Rhythm & Friday Review */}
        <div className="space-y-6 lg:col-span-7">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-amber-400" />
                    Weekly Rhythm & Bucket Tracker
                  </CardTitle>
                  <CardDescription>
                    32 core hours across 5 buckets + 8–16h Creative Labs.
                  </CardDescription>
                </div>
                <select
                  aria-label="Select week to track"
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(Number(e.target.value))}
                  className="h-9 rounded-lg border border-input bg-background px-3 text-xs font-mono"
                >
                  {snapshot.weeklyLogs.map((w) => {
                    const tot = getWeekCoreHours(w);
                    return (
                      <option key={w.weekNumber} value={w.weekNumber}>
                        Week {w.weekNumber} ({w.startDate}) · {tot}h core
                      </option>
                    );
                  })}
                </select>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 6 Hour Buckets */}
              <div className="space-y-3">
                {BUCKET_TARGETS.map((b) => {
                  const fieldMap: Record<BucketId, keyof WeeklyLog> = {
                    build: "buildHours",
                    study: "studyHours",
                    design: "designHours",
                    reps: "repsHours",
                    review: "reviewHours",
                    labs: "labsHours",
                  };
                  const val = Number(activeWeekLog?.[fieldMap[b.id]]) || 0;
                  const pct = Math.min(100, Math.round((val / b.target) * 100));

                  return (
                    <div
                      key={b.id}
                      className="rounded-lg border border-border/80 bg-secondary/15 p-3"
                    >
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <div className="flex items-center gap-2 font-medium">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: b.color }}
                          />
                          <span>{b.name}</span>
                          {b.isLab && (
                            <Badge variant="outline" className="text-[10px]">
                              Separate from 32h core
                            </Badge>
                          )}
                        </div>
                        <span className="font-mono text-xs text-muted-foreground">
                          <strong className="text-foreground">{val}h</strong> /{" "}
                          {b.targetLabel ?? `${b.target}h`}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary mb-2">
                        <div
                          className="h-full transition-all duration-300"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: b.color,
                          }}
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>{b.description}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 font-mono text-xs"
                            onClick={() => handleAdjustBucket(b.id, -0.5)}
                          >
                            -0.5h
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 font-mono text-xs"
                            onClick={() => handleAdjustBucket(b.id, 0.5)}
                          >
                            +0.5h
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 font-mono text-xs"
                            onClick={() => handleAdjustBucket(b.id, 1)}
                          >
                            +1h
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Daily 20-Min JS/TS Reps Bar */}
              <div className="rounded-lg border border-border bg-secondary/25 p-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">
                      Daily 20-Minute JS / TS Reps ·{" "}
                      <span className="text-primary font-mono">
                        {activeWeekLog?.repsDays.filter(Boolean).length ?? 0}/7
                        days
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Check off each day you complete ~20 mins of exercises in
                      js-review.
                    </p>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {DAYS.map((dayName, idx) => {
                      const done = Boolean(activeWeekLog?.repsDays[idx]);
                      return (
                        <button
                          key={dayName}
                          type="button"
                          onClick={() => handleToggleRepDay(idx)}
                          className={`flex flex-col items-center justify-center rounded-md border px-2 py-1.5 text-xs font-mono transition-colors cursor-pointer ${
                            done
                              ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-300 font-semibold"
                              : "border-border bg-background/60 text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          <span className="text-[10px]">{dayName}</span>
                          <span>{done ? "✓" : "·"}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Friday Review Box */}
              <form
                onSubmit={handleSaveReview}
                className="rounded-lg border border-border/80 bg-card p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold">
                      Week {selectedWeek} Friday Review Log
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Lock in what shipped, what slowed you down, and next
                      week&apos;s focus.
                    </p>
                  </div>
                  <Button type="submit" size="sm" disabled={savingReview}>
                    {savingReview ? "Saving..." : "Save Friday Review"}
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <label className="font-mono text-[10px] uppercase text-muted-foreground">
                      What Shipped
                    </label>
                    <Textarea
                      value={reviewDraft.shipped}
                      onChange={(e) =>
                        setReviewDraft((p) => ({
                          ...p,
                          shipped: e.target.value,
                        }))
                      }
                      placeholder="Repo tag, component, or teach-back..."
                      className="min-h-[72px] text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-[10px] uppercase text-muted-foreground">
                      Slowed Me Down
                    </label>
                    <Textarea
                      value={reviewDraft.blocked}
                      onChange={(e) =>
                        setReviewDraft((p) => ({
                          ...p,
                          blocked: e.target.value,
                        }))
                      }
                      placeholder="Gaps or distractions to cut..."
                      className="min-h-[72px] text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-[10px] uppercase text-muted-foreground">
                      Next Week #1 Goal
                    </label>
                    <Textarea
                      value={reviewDraft.next}
                      onChange={(e) =>
                        setReviewDraft((p) => ({ ...p, next: e.target.value }))
                      }
                      placeholder="Primary anchor for next week..."
                      className="min-h-[72px] text-xs"
                    />
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right 5 cols: Skill Proficiency Snapshot + Monthly Metrics + Immediate To-Dos */}
        <div className="space-y-6 lg:col-span-5">
          {/* Skill Proficiency Snapshot */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    Skills Proficiency Overview
                  </CardTitle>
                  <CardDescription>
                    Click any dot (1–5) to rate your current level against
                    target.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigateTab("skills")}
                >
                  Manage All ({snapshot.skills.length})
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {snapshot.skills.map((skill) => {
                const atTarget = skill.currentLevel >= skill.targetLevel;
                return (
                  <div
                    key={skill.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-secondary/15 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{skill.name}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">
                        {skill.phase} · Target L{skill.targetLevel} ·{" "}
                        {skill.hoursLogged}h
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {[1, 2, 3, 4, 5].map((lvl) => {
                        const isFilled = lvl <= skill.currentLevel;
                        const isTarget = lvl === skill.targetLevel;
                        return (
                          <button
                            key={lvl}
                            type="button"
                            title={`Set ${skill.name} to level ${lvl}${
                              isTarget ? " (Target)" : ""
                            }`}
                            onClick={() =>
                              onMutate("upsertSkill", {
                                ...skill,
                                currentLevel:
                                  skill.currentLevel === lvl ? lvl - 1 : lvl,
                              })
                            }
                            className={`h-4 w-4 rounded-full border transition-all cursor-pointer ${
                              isFilled
                                ? "bg-primary border-primary"
                                : "bg-background border-muted-foreground/40 hover:border-primary"
                            } ${
                              isTarget
                                ? "ring-2 ring-amber-400/80 ring-offset-1 ring-offset-background"
                                : ""
                            }`}
                          />
                        );
                      })}
                      <span
                        className={`ml-1.5 w-14 text-right font-mono text-[11px] ${
                          atTarget
                            ? "text-emerald-400 font-semibold"
                            : "text-muted-foreground"
                        }`}
                      >
                        {atTarget
                          ? "Target ✓"
                          : `L${skill.currentLevel}/L${skill.targetLevel}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Monthly Hours Chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Monthly Hours Breakdown
              </CardTitle>
              <CardDescription>
                Aggregated Core vs. Creative Lab hours across the 6-month plan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 gap-2 items-end h-36 pt-4">
                {monthlyMetrics.map((m) => {
                  const maxMonthHours = 160; // ~4 weeks * 40h
                  const corePct = Math.min(
                    100,
                    Math.round((m.core / maxMonthHours) * 100)
                  );
                  const labPct = Math.min(
                    100,
                    Math.round((m.labs / maxMonthHours) * 100)
                  );
                  return (
                    <div
                      key={m.label}
                      className="flex flex-col items-center gap-1.5 h-full justify-end"
                    >
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {Math.round((m.core + m.labs) * 10) / 10}h
                      </span>
                      <div className="w-full max-w-[36px] flex flex-col justify-end h-20 rounded-md bg-secondary/50 overflow-hidden p-0.5 gap-0.5">
                        {m.labs > 0 && (
                          <div
                            className="w-full rounded-xs bg-purple-400 transition-all"
                            style={{ height: `${Math.max(8, labPct)}%` }}
                            title={`Labs: ${m.labs}h`}
                          />
                        )}
                        {m.core > 0 && (
                          <div
                            className="w-full rounded-xs bg-emerald-400 transition-all"
                            style={{ height: `${Math.max(10, corePct)}%` }}
                            title={`Core: ${m.core}h`}
                          />
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {m.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground border-t border-border/60 pt-2.5">
                <span className="flex items-center gap-1.5">
                  <i className="h-2.5 w-2.5 rounded-xs bg-emerald-400 inline-block" />
                  Core Hours (Build/Study/Design/Reps/Review)
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="h-2.5 w-2.5 rounded-xs bg-purple-400 inline-block" />
                  Creative Labs
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Immediate To-Dos Quick Widget */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-amber-400" />
                    Immediate To-Dos
                  </CardTitle>
                  <CardDescription>
                    High-priority tasks from your schedule.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigateTab("schedule")}
                >
                  Open Calendar →
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {immediateTodos.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  All immediate To-Dos completed!
                </p>
              ) : (
                immediateTodos.slice(0, 4).map((todo) => (
                  <div
                    key={todo.id}
                    className="flex items-start justify-between gap-2 rounded-lg border border-border/70 bg-secondary/15 p-2.5 text-sm"
                  >
                    <label className="flex items-start gap-2.5 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() =>
                          onMutate("updateScheduleItem", {
                            id: todo.id,
                            completed: !todo.completed,
                          })
                        }
                        className="mt-1 h-4 w-4 rounded border-border"
                      />
                      <div>
                        <div className="font-medium leading-snug">
                          {todo.title}
                        </div>
                        <div className="font-mono text-[11px] text-muted-foreground mt-0.5">
                          {todo.date} {todo.time && `· ${todo.time}`} ·{" "}
                          {todo.phase}
                        </div>
                      </div>
                    </label>
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

