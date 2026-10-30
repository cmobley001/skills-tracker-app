"use client";

import * as React from "react";
import {
  BookText,
  ExternalLink,
  FileText,
  Plus,
  Trash2,
  Video,
} from "lucide-react";
import {
  CourseStatus,
  CurriculumItem,
  MaterialType,
  PlannerSnapshot,
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

interface CoursesViewProps {
  snapshot: PlannerSnapshot;
  highlightedCourseId?: string | null;
  highlightedItemId?: string | null;
  onMutate: (action: string, payload: unknown) => Promise<void>;
}

const PHASES_FILTER = [
  "All",
  "Setup",
  "Phase 1",
  "Phase 2",
  "Phase 3",
  "Phase 4",
];

export function CoursesView({
  snapshot,
  highlightedCourseId,
  highlightedItemId,
  onMutate,
}: CoursesViewProps) {
  const [phaseFilter, setPhaseFilter] = React.useState<string>("All");
  const [typeFilter, setTypeFilter] = React.useState<"all" | MaterialType>(
    "all"
  );
  const [showCreateForm, setShowCreateForm] = React.useState<boolean>(false);

  // Expanded curriculum item IDs so multiple or single item note areas can be open
  const [openItemIds, setOpenItemIds] = React.useState<Record<string, boolean>>(
    {}
  );
  const [itemDrafts, setItemDrafts] = React.useState<
    Record<string, { notes: string; artifactUrl: string }>
  >({});

  // Inline new curriculum item input per course
  const [newItemText, setNewItemText] = React.useState<Record<string, string>>(
    {}
  );
  const [newItemStretch, setNewItemStretch] = React.useState<
    Record<string, boolean>
  >({});

  // Course creation state
  const [newCourse, setNewCourse] = React.useState({
    title: "",
    provider: "",
    type: "video" as MaterialType,
    phase: "Phase 1",
    status: "active" as CourseStatus,
    skillId: snapshot.skills[0]?.id ?? "js",
    url: "",
    buildProject: "",
    summaryNotes: "",
    initialItemsText: "",
  });

  React.useEffect(() => {
    if (highlightedCourseId) {
      setPhaseFilter("All");
      setTypeFilter("all");
    }
    if (highlightedItemId) {
      setOpenItemIds((prev) => ({ ...prev, [highlightedItemId]: true }));
    }
  }, [highlightedCourseId, highlightedItemId]);

  const filteredCourses = snapshot.courses.filter((c) => {
    const matchPhase = phaseFilter === "All" || c.phase === phaseFilter;
    const matchType = typeFilter === "all" || c.type === typeFilter;
    return matchPhase && matchType;
  });

  const toggleItemEditor = (item: CurriculumItem) => {
    setOpenItemIds((prev) => ({
      ...prev,
      [item.id]: !prev[item.id],
    }));
    setItemDrafts((prev) => ({
      ...prev,
      [item.id]: prev[item.id] ?? {
        notes: item.notes,
        artifactUrl: item.artifactUrl,
      },
    }));
  };

  const handleSaveItemNote = async (item: CurriculumItem) => {
    const draft = itemDrafts[item.id] ?? {
      notes: item.notes,
      artifactUrl: item.artifactUrl,
    };
    await onMutate("updateCurriculumItem", {
      id: item.id,
      notes: draft.notes,
      artifactUrl: draft.artifactUrl,
    });
  };

  const handleAddCurriculumItem = async (
    e: React.FormEvent,
    courseId: string
  ) => {
    e.preventDefault();
    const title = (newItemText[courseId] ?? "").trim();
    if (!title) return;
    await onMutate("addCurriculumItem", {
      courseId,
      title,
      isStretch: Boolean(newItemStretch[courseId]),
    });
    setNewItemText((prev) => ({ ...prev, [courseId]: "" }));
    setNewItemStretch((prev) => ({ ...prev, [courseId]: false }));
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourse.title.trim()) return;
    const initialItems = newCourse.initialItemsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    await onMutate("createCourse", {
      title: newCourse.title.trim(),
      provider: newCourse.provider.trim(),
      type: newCourse.type,
      phase: newCourse.phase,
      status: newCourse.status,
      skillId: newCourse.skillId,
      url: newCourse.url.trim(),
      buildProject: newCourse.buildProject.trim(),
      summaryNotes: newCourse.summaryNotes.trim(),
      initialItems,
    });

    setNewCourse({
      title: "",
      provider: "",
      type: "video",
      phase: "Phase 1",
      status: "active",
      skillId: snapshot.skills[0]?.id ?? "js",
      url: "",
      buildProject: "",
      summaryNotes: "",
      initialItemsText: "",
    });
    setShowCreateForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header & Add Course Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            Courses, Reading Titles & Curriculum Notes
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage video courses and text/documentation titles. Expand any
            curriculum item to write detailed study notes and attach artifacts.
          </p>
        </div>
        <Button onClick={() => setShowCreateForm((v) => !v)}>
          <Plus className="h-4 w-4" />
          {showCreateForm ? "Close Form" : "Add Video Course / Text Title"}
        </Button>
      </div>

      {/* Add Course / Text Title Form */}
      {showCreateForm && (
        <Card className="border-primary/40 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Add a Video Course or Text Title
            </CardTitle>
            <CardDescription>
              Create a new learning resource and optionally seed its curriculum
              modules or chapters (one per line).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-mono text-[11px] uppercase text-muted-foreground">
                    Course or Text Title
                  </label>
                  <Input
                    required
                    value={newCourse.title}
                    onChange={(e) =>
                      setNewCourse((p) => ({ ...p, title: e.target.value }))
                    }
                    placeholder="e.g., Next.js App Router Documentation or FastAPI Official Tutorial"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[11px] uppercase text-muted-foreground">
                    Material Format
                  </label>
                  <select
                    value={newCourse.type}
                    onChange={(e) =>
                      setNewCourse((p) => ({
                        ...p,
                        type: e.target.value as MaterialType,
                      }))
                    }
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    <option value="video">Video Course</option>
                    <option value="text">Text Title / Book / Docs</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div className="space-y-1">
                  <label className="font-mono text-[11px] uppercase text-muted-foreground">
                    Provider / Author
                  </label>
                  <Input
                    value={newCourse.provider}
                    onChange={(e) =>
                      setNewCourse((p) => ({ ...p, provider: e.target.value }))
                    }
                    placeholder="Udemy, LinkedIn, MDN..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[11px] uppercase text-muted-foreground">
                    Plan Phase
                  </label>
                  <select
                    value={newCourse.phase}
                    onChange={(e) =>
                      setNewCourse((p) => ({ ...p, phase: e.target.value }))
                    }
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    <option value="Setup">Setup</option>
                    <option value="Phase 1">Phase 1</option>
                    <option value="Phase 2">Phase 2</option>
                    <option value="Phase 3">Phase 3</option>
                    <option value="Phase 4">Phase 4</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[11px] uppercase text-muted-foreground">
                    Status
                  </label>
                  <select
                    value={newCourse.status}
                    onChange={(e) =>
                      setNewCourse((p) => ({
                        ...p,
                        status: e.target.value as CourseStatus,
                      }))
                    }
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    <option value="spine">Spine Course</option>
                    <option value="active">Active</option>
                    <option value="reference">Reference Only</option>
                    <option value="completed">Completed</option>
                    <option value="parked">Parked</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[11px] uppercase text-muted-foreground">
                    Primary Skill
                  </label>
                  <select
                    value={newCourse.skillId}
                    onChange={(e) =>
                      setNewCourse((p) => ({ ...p, skillId: e.target.value }))
                    }
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    {snapshot.skills.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="font-mono text-[11px] uppercase text-muted-foreground">
                    Resource URL (Optional)
                  </label>
                  <Input
                    value={newCourse.url}
                    onChange={(e) =>
                      setNewCourse((p) => ({ ...p, url: e.target.value }))
                    }
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[11px] uppercase text-muted-foreground">
                    Associated Build Project
                  </label>
                  <Input
                    value={newCourse.buildProject}
                    onChange={(e) =>
                      setNewCourse((p) => ({
                        ...p,
                        buildProject: e.target.value,
                      }))
                    }
                    placeholder="e.g., Planner UI kit, Notes search service..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="font-mono text-[11px] uppercase text-muted-foreground">
                    Overview & Summary Notes
                  </label>
                  <Textarea
                    value={newCourse.summaryNotes}
                    onChange={(e) =>
                      setNewCourse((p) => ({
                        ...p,
                        summaryNotes: e.target.value,
                      }))
                    }
                    placeholder="How this material fits your build plan..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[11px] uppercase text-muted-foreground">
                    Initial Curriculum Items / Chapters (One per line)
                  </label>
                  <Textarea
                    value={newCourse.initialItemsText}
                    onChange={(e) =>
                      setNewCourse((p) => ({
                        ...p,
                        initialItemsText: e.target.value,
                      }))
                    }
                    placeholder={
                      "Chapter 1: Core Architecture\nChapter 2: Data Fetching & Mutations\nChapter 3: Teach-Back Summary"
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create Material</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {PHASES_FILTER.map((ph) => (
            <Button
              key={ph}
              variant={phaseFilter === ph ? "default" : "outline"}
              size="sm"
              onClick={() => setPhaseFilter(ph)}
            >
              {ph}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant={typeFilter === "all" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setTypeFilter("all")}
          >
            All Formats ({snapshot.courses.length})
          </Button>
          <Button
            variant={typeFilter === "video" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setTypeFilter("video")}
          >
            <Video className="h-3.5 w-3.5 mr-1 text-blue-400" />
            Video Courses (
            {snapshot.courses.filter((c) => c.type === "video").length})
          </Button>
          <Button
            variant={typeFilter === "text" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setTypeFilter("text")}
          >
            <BookText className="h-3.5 w-3.5 mr-1 text-purple-400" />
            Text & Docs (
            {snapshot.courses.filter((c) => c.type === "text").length})
          </Button>
        </div>
      </div>

      {/* Course Cards List */}
      <div className="space-y-5">
        {filteredCourses.map((course) => {
          const coreItems = course.items.filter((i) => !i.isStretch);
          const doneCore = coreItems.filter((i) => i.completed).length;
          const pct = coreItems.length
            ? Math.round((doneCore / coreItems.length) * 100)
            : 0;
          const linkedSkill = snapshot.skills.find(
            (s) => s.id === course.skillId
          );

          return (
            <Card
              key={course.id}
              id={`course-${course.id}`}
              className={`transition-all ${
                highlightedCourseId === course.id
                  ? "ring-2 ring-primary"
                  : "border-border/80"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {course.type === "video" ? (
                        <Badge variant="blue">
                          <Video className="h-3 w-3 mr-1" />
                          Video Course
                        </Badge>
                      ) : (
                        <Badge variant="purple">
                          <BookText className="h-3 w-3 mr-1" />
                          Text / Docs
                        </Badge>
                      )}
                      <Badge variant="outline" className="font-mono">
                        {course.phase}
                      </Badge>
                      {course.status === "spine" && (
                        <Badge variant="emerald">Spine Course</Badge>
                      )}
                      {course.status === "reference" && (
                        <Badge variant="secondary">Reference</Badge>
                      )}
                      {linkedSkill && (
                        <Badge variant="amber">Skill: {linkedSkill.name}</Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg">{course.title}</CardTitle>
                    <CardDescription className="text-xs font-mono">
                      {course.provider && `${course.provider} · `}
                      {course.buildProject &&
                        `Build Deliverable: ${course.buildProject}`}
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {course.url && (
                      <a
                        href={course.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary/40 px-3 py-1.5 text-xs font-medium hover:bg-accent"
                      >
                        Open Resource <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive h-8 px-2"
                      onClick={() =>
                        onMutate("deleteCourse", { id: course.id })
                      }
                      title="Delete course"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {course.summaryNotes && (
                  <p className="text-sm text-muted-foreground pt-1">
                    {course.summaryNotes}
                  </p>
                )}

                {/* Progress Meter */}
                <div className="flex items-center gap-3 pt-2">
                  <Progress
                    value={pct}
                    className="h-2 flex-1"
                    indicatorClassName="bg-emerald-500"
                  />
                  <span className="font-mono text-xs text-muted-foreground shrink-0">
                    {doneCore}/{coreItems.length} milestones ({pct}%)
                  </span>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Curriculum Items List */}
                <div className="divide-y divide-border/60 rounded-xl border border-border/80 bg-secondary/10">
                  {course.items.map((item) => {
                    const isOpen = Boolean(openItemIds[item.id]);
                    const hasNotes = Boolean(
                      item.notes.trim() || item.artifactUrl.trim()
                    );
                    const draft = itemDrafts[item.id] ?? {
                      notes: item.notes,
                      artifactUrl: item.artifactUrl,
                    };

                    return (
                      <div key={item.id} className="p-3 sm:p-3.5 space-y-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <label className="flex items-start gap-2.5 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={item.completed}
                              onChange={() =>
                                onMutate("updateCurriculumItem", {
                                  id: item.id,
                                  completed: !item.completed,
                                })
                              }
                              className="mt-1 h-4 w-4 rounded border-border"
                            />
                            <div className="space-y-1">
                              <span
                                className={`text-sm leading-snug ${
                                  item.completed
                                    ? "line-through text-muted-foreground"
                                    : "font-medium text-foreground"
                                }`}
                              >
                                {item.title}
                              </span>
                              {item.isStretch && (
                                <Badge
                                  variant="outline"
                                  className="ml-2 text-[10px] font-mono"
                                >
                                  Stretch
                                </Badge>
                              )}
                            </div>
                          </label>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              type="button"
                              variant={hasNotes ? "secondary" : "outline"}
                              size="sm"
                              className="h-7 px-2.5 text-xs font-mono"
                              onClick={() => toggleItemEditor(item)}
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              {isOpen
                                ? "Close Notes"
                                : hasNotes
                                  ? "Notes ✓"
                                  : "+ Add Notes"}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() =>
                                onMutate("deleteCurriculumItem", {
                                  id: item.id,
                                })
                              }
                              title="Remove item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Collapsed note preview */}
                        {!isOpen && hasNotes && (
                          <div className="ml-6 rounded-lg border border-border/60 bg-background/60 p-2.5 text-xs space-y-1.5">
                            {item.artifactUrl && (
                              <div>
                                <a
                                  href={item.artifactUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-primary hover:underline font-mono text-[11px]"
                                >
                                  Artifact / Link ↗
                                </a>
                              </div>
                            )}
                            {item.notes && (
                              <p className="text-muted-foreground whitespace-pre-wrap">
                                {item.notes}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Expanded Dedicated Note & Artifact Text Area */}
                        {isOpen && (
                          <div className="ml-6 rounded-xl border border-primary/40 bg-card p-3.5 space-y-3">
                            <div className="space-y-1">
                              <label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                                Expanded Study Notes, Code Snippets & Teach-Back
                                Takeaways
                              </label>
                              <Textarea
                                value={draft.notes}
                                onChange={(e) =>
                                  setItemDrafts((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      ...draft,
                                      notes: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="Write your study notes, key architectural decisions, or teach-back explanation for this curriculum item..."
                                className="min-h-[120px] text-sm"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                                Artifact URL (GitHub Repo, PR, Figma, or Docs
                                Reference)
                              </label>
                              <Input
                                value={draft.artifactUrl}
                                onChange={(e) =>
                                  setItemDrafts((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      ...draft,
                                      artifactUrl: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="https://github.com/..."
                                className="text-xs"
                              />
                            </div>

                            <div className="flex items-center justify-end gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleItemEditor(item)}
                              >
                                Close
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleSaveItemNote(item)}
                              >
                                Save Note & Link
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Add Curriculum Item Form */}
                <form
                  onSubmit={(e) => handleAddCurriculumItem(e, course.id)}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1"
                >
                  <Input
                    value={newItemText[course.id] ?? ""}
                    onChange={(e) =>
                      setNewItemText((prev) => ({
                        ...prev,
                        [course.id]: e.target.value,
                      }))
                    }
                    placeholder={`Add a milestone, chapter, or lecture topic to ${course.title}...`}
                    className="flex-1 text-xs"
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono cursor-pointer px-2">
                      <input
                        type="checkbox"
                        checked={Boolean(newItemStretch[course.id])}
                        onChange={(e) =>
                          setNewItemStretch((prev) => ({
                            ...prev,
                            [course.id]: e.target.checked,
                          }))
                        }
                        className="rounded border-border"
                      />
                      Stretch
                    </label>
                    <Button type="submit" variant="outline" size="sm">
                      <Plus className="h-3.5 w-3.5" />
                      Add Item
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

