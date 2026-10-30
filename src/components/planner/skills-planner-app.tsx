"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import {
  Award,
  BookOpen,
  Calendar,
  Download,
  LayoutDashboard,
  Moon,
  RotateCcw,
  Search,
  Sun,
} from "lucide-react";
import { PlannerSnapshot } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { CoursesView } from "./courses-view";
import { DashboardView } from "./dashboard-view";
import {
  GlobalSearchModal,
  SearchDocument,
} from "./global-search-modal";
import { ScheduleView } from "./schedule-view";
import { SkillsView } from "./skills-view";

interface SkillsPlannerAppProps {
  initialSnapshot: PlannerSnapshot;
}

type ActiveTab = "dashboard" | "skills" | "courses" | "schedule";

export function SkillsPlannerApp({ initialSnapshot }: SkillsPlannerAppProps) {
  const [snapshot, setSnapshot] =
    React.useState<PlannerSnapshot>(initialSnapshot);
  const [activeTab, setActiveTab] = React.useState<ActiveTab>("dashboard");
  const [searchOpen, setSearchOpen] = React.useState<boolean>(false);
  const [syncStatus, setSyncStatus] = React.useState<"synced" | "saving">(
    "synced"
  );

  // Deep-link highlights when jumping from search or dashboard
  const [highlightedCourseId, setHighlightedCourseId] = React.useState<
    string | null
  >(null);
  const [highlightedItemId, setHighlightedItemId] = React.useState<
    string | null
  >(null);
  const [highlightedSkillId, setHighlightedSkillId] = React.useState<
    string | null
  >(null);

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleMutate = React.useCallback(
    async (action: string, payload: unknown) => {
      setSyncStatus("saving");
      try {
        const res = await fetch("/api/planner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, payload }),
        });
        if (res.ok) {
          const updated: PlannerSnapshot = await res.json();
          setSnapshot(updated);
        }
      } finally {
        setSyncStatus("synced");
      }
    },
    []
  );

  const handleNavigateTab = (tab: ActiveTab, courseId?: string) => {
    setActiveTab(tab);
    if (courseId) {
      setHighlightedCourseId(courseId);
      setTimeout(() => {
        const el = document.getElementById(`course-${courseId}`);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  };

  const handleSelectSearchResult = (doc: SearchDocument) => {
    setActiveTab(doc.targetTab);
    setHighlightedCourseId(doc.courseId ?? null);
    setHighlightedItemId(doc.itemId ?? null);
    setHighlightedSkillId(doc.skillId ?? null);
    if (doc.courseId) {
      setTimeout(() => {
        const el = document.getElementById(`course-${doc.courseId}`);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `skills-planner-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetSeed = async () => {
    if (
      !window.confirm(
        "Reset the SQLite database back to the initial Six-Month Build Plan defaults?"
      )
    ) {
      return;
    }
    await handleMutate("resetSeed", {});
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Title & SQLite Status */}
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center font-mono font-bold text-primary">
                SP
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold tracking-tight">
                    The Skills Planner
                  </h1>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        syncStatus === "saving"
                          ? "bg-amber-400 animate-pulse"
                          : "bg-emerald-400"
                      }`}
                    />
                    {syncStatus === "saving"
                      ? "Saving to SQLite..."
                      : "SQLite Synced"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Six-Month Build Plan (Nov 2, 2026 – May 2, 2027) · Next.js +
                  TypeScript + Tailwind v4 + SQLite
                </p>
              </div>
            </div>

            {/* Search Bar + Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  Search notes, courses & skills...
                </span>
                <span className="sm:hidden">Search</span>
                <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">
                  ⌘K
                </kbd>
              </button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportJson}
                title="Export SQLite data as JSON"
                className="hidden md:inline-flex"
              >
                <Download className="h-3.5 w-3.5" />
                Export JSON
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetSeed}
                title="Reset to default Six-Month Build Plan seed"
                className="hidden md:inline-flex text-muted-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>

              {mounted && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  title="Toggle Dark / Light Theme"
                >
                  {theme === "dark" ? (
                    <Sun className="h-4 w-4 text-amber-400" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 overflow-x-auto pt-0.5">
            <Button
              variant={activeTab === "dashboard" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("dashboard")}
              className="gap-1.5"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard & Analytics
            </Button>
            <Button
              variant={activeTab === "skills" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("skills")}
              className="gap-1.5"
            >
              <Award className="h-4 w-4" />
              Skills Tracker ({snapshot.skills.length})
            </Button>
            <Button
              variant={activeTab === "courses" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("courses")}
              className="gap-1.5"
            >
              <BookOpen className="h-4 w-4" />
              Courses & Study Notes ({snapshot.courses.length})
            </Button>
            <Button
              variant={activeTab === "schedule" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("schedule")}
              className="gap-1.5"
            >
              <Calendar className="h-4 w-4" />
              Calendar & To-Dos (
              {snapshot.scheduleItems.filter((i) => !i.completed).length})
            </Button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 py-6">
        {activeTab === "dashboard" && (
          <DashboardView
            snapshot={snapshot}
            onMutate={handleMutate}
            onNavigateTab={handleNavigateTab}
          />
        )}
        {activeTab === "skills" && (
          <SkillsView
            snapshot={snapshot}
            highlightedSkillId={highlightedSkillId}
            onMutate={handleMutate}
            onJumpToCourse={(courseId) => handleNavigateTab("courses", courseId)}
          />
        )}
        {activeTab === "courses" && (
          <CoursesView
            snapshot={snapshot}
            highlightedCourseId={highlightedCourseId}
            highlightedItemId={highlightedItemId}
            onMutate={handleMutate}
          />
        )}
        {activeTab === "schedule" && (
          <ScheduleView snapshot={snapshot} onMutate={handleMutate} />
        )}
      </main>

      {/* Global Fuse.js Search Modal */}
      <GlobalSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        snapshot={snapshot}
        onSelectResult={handleSelectSearchResult}
      />
    </div>
  );
}

