"use client";

import * as React from "react";
import {
  Award,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
} from "lucide-react";
import { PlannerSnapshot, Skill } from "@/lib/types";
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

interface SkillsViewProps {
  snapshot: PlannerSnapshot;
  highlightedSkillId?: string | null;
  onMutate: (action: string, payload: unknown) => Promise<void>;
  onJumpToCourse: (courseId: string) => void;
}

const LEVEL_LABELS: Record<number, string> = {
  0: "0 · Unrated",
  1: "1 · Novice / Reading",
  2: "2 · Practicing Reps",
  3: "3 · Shipping Guided",
  4: "4 · Production Ready",
  5: "5 · Deep Mastery / Teach-Back",
};

export function SkillsView({
  snapshot,
  highlightedSkillId,
  onMutate,
  onJumpToCourse,
}: SkillsViewProps) {
  const [selectedCategory, setSelectedCategory] = React.useState<string>("All");
  const [expandedSkillId, setExpandedSkillId] = React.useState<string | null>(
    highlightedSkillId ?? null
  );
  const [noteDrafts, setNoteDrafts] = React.useState<Record<string, string>>(
    {}
  );
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [newSkill, setNewSkill] = React.useState({
    name: "",
    category: "Core Web & UI",
    phase: "Phase 1",
    currentLevel: 1,
    targetLevel: 4,
    hoursLogged: 0,
    notes: "",
  });

  React.useEffect(() => {
    if (highlightedSkillId) {
      setExpandedSkillId(highlightedSkillId);
    }
  }, [highlightedSkillId]);

  const categories = React.useMemo(() => {
    const set = new Set<string>(["All"]);
    snapshot.skills.forEach((s) => set.add(s.category));
    return Array.from(set);
  }, [snapshot.skills]);

  const filteredSkills = snapshot.skills.filter(
    (s) => selectedCategory === "All" || s.category === selectedCategory
  );

  const handleToggleExpand = (skill: Skill) => {
    if (expandedSkillId === skill.id) {
      setExpandedSkillId(null);
    } else {
      setExpandedSkillId(skill.id);
      setNoteDrafts((prev) => ({
        ...prev,
        [skill.id]: prev[skill.id] ?? skill.notes,
      }));
    }
  };

  const handleSaveSkillNote = async (skill: Skill) => {
    const updatedNotes = noteDrafts[skill.id] ?? skill.notes;
    await onMutate("upsertSkill", {
      ...skill,
      notes: updatedNotes,
    });
  };

  const handleCreateSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkill.name.trim()) return;
    await onMutate("upsertSkill", {
      ...newSkill,
      name: newSkill.name.trim(),
    });
    setNewSkill({
      name: "",
      category: "Core Web & UI",
      phase: "Phase 1",
      currentLevel: 1,
      targetLevel: 4,
      hoursLogged: 0,
      notes: "",
    });
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            Skills Matrix & Proficiency Tracker
          </h2>
          <p className="text-sm text-muted-foreground">
            Rate your current level (1–5) against your Six-Month Build Plan
            target, log practice hours, and record teach-back notes.
          </p>
        </div>
        <Button onClick={() => setShowAddForm((v) => !v)}>
          <Plus className="h-4 w-4" />
          {showAddForm ? "Close Form" : "Add Skill"}
        </Button>
      </div>

      {/* Add New Skill Form */}
      {showAddForm && (
        <Card className="border-primary/40 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Add a Skill to Track</CardTitle>
            <CardDescription>
              Define the skill category, target proficiency (1–5), and initial
              study notes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSkill} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-mono text-[11px] uppercase text-muted-foreground">
                    Skill Name
                  </label>
                  <Input
                    required
                    value={newSkill.name}
                    onChange={(e) =>
                      setNewSkill((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="e.g., Drizzle ORM, GSAP ScrollTrigger, Pytest..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[11px] uppercase text-muted-foreground">
                    Category
                  </label>
                  <select
                    value={newSkill.category}
                    onChange={(e) =>
                      setNewSkill((p) => ({ ...p, category: e.target.value }))
                    }
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    <option value="Core Web & UI">Core Web & UI</option>
                    <option value="Backend & Data">Backend & Data</option>
                    <option value="AI & Agents">AI & Agents</option>
                    <option value="Design & Portfolio">
                      Design & Portfolio
                    </option>
                    <option value="Creative Lab">Creative Lab</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[11px] uppercase text-muted-foreground">
                    Phase
                  </label>
                  <select
                    value={newSkill.phase}
                    onChange={(e) =>
                      setNewSkill((p) => ({ ...p, phase: e.target.value }))
                    }
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    <option value="Phase 1">Phase 1</option>
                    <option value="Phase 2">Phase 2</option>
                    <option value="Phases 2 to 4">Phases 2 to 4</option>
                    <option value="Phase 3">Phase 3</option>
                    <option value="Phase 4">Phase 4</option>
                    <option value="Creative Lab">Creative Lab</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="font-mono text-[11px] uppercase text-muted-foreground">
                    Current Level (0–5)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    value={newSkill.currentLevel}
                    onChange={(e) =>
                      setNewSkill((p) => ({
                        ...p,
                        currentLevel: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[11px] uppercase text-muted-foreground">
                    Target Level (1–5)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={newSkill.targetLevel}
                    onChange={(e) =>
                      setNewSkill((p) => ({
                        ...p,
                        targetLevel: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[11px] uppercase text-muted-foreground">
                    Initial Hours Logged
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={newSkill.hoursLogged}
                    onChange={(e) =>
                      setNewSkill((p) => ({
                        ...p,
                        hoursLogged: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-mono text-[11px] uppercase text-muted-foreground">
                  Skill Notes & Focus Areas
                </label>
                <Textarea
                  value={newSkill.notes}
                  onChange={(e) =>
                    setNewSkill((p) => ({ ...p, notes: e.target.value }))
                  }
                  placeholder="Key sub-skills, docs, or teach-back questions..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Skill</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filteredSkills.map((skill) => {
          const isExpanded = expandedSkillId === skill.id;
          const atTarget = skill.currentLevel >= skill.targetLevel;
          const pct = Math.min(
            100,
            Math.round((skill.currentLevel / skill.targetLevel) * 100)
          );
          const linkedCourses = snapshot.courses.filter(
            (c) => c.skillId === skill.id
          );

          return (
            <Card
              key={skill.id}
              className={`transition-all ${
                highlightedSkillId === skill.id
                  ? "ring-2 ring-primary"
                  : "border-border/80"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base">{skill.name}</CardTitle>
                      {atTarget ? (
                        <Badge variant="emerald">
                          <Award className="h-3 w-3 mr-1" />
                          At Target (L{skill.targetLevel})
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="font-mono">
                          {skill.targetLevel - skill.currentLevel} level
                          {skill.targetLevel - skill.currentLevel === 1
                            ? ""
                            : "s"}{" "}
                          to go
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="font-mono text-xs">
                      {skill.category} · {skill.phase} · Target Level{" "}
                      {skill.targetLevel}
                    </CardDescription>
                  </div>

                  {/* Interactive 1-5 Skill Rating Dots */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {[1, 2, 3, 4, 5].map((lvl) => {
                      const active = lvl <= skill.currentLevel;
                      const isTarget = lvl === skill.targetLevel;
                      return (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() =>
                            onMutate("upsertSkill", {
                              ...skill,
                              currentLevel:
                                skill.currentLevel === lvl ? lvl - 1 : lvl,
                            })
                          }
                          title={`Set level to ${lvl}${
                            isTarget ? " (Target)" : ""
                          }`}
                          className={`h-5 w-5 rounded-full border text-[10px] font-mono flex items-center justify-center transition-all cursor-pointer ${
                            active
                              ? "bg-primary text-primary-foreground border-primary font-bold"
                              : "bg-secondary/40 text-muted-foreground border-border hover:border-primary"
                          } ${
                            isTarget
                              ? "ring-2 ring-amber-400 ring-offset-1 ring-offset-background"
                              : ""
                          }`}
                        >
                          {lvl}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {LEVEL_LABELS[skill.currentLevel] ?? "Unrated"}
                    </span>
                    <span className="font-mono text-muted-foreground">
                      {pct}% of target
                    </span>
                  </div>
                  <Progress
                    value={pct}
                    className="h-1.5"
                    indicatorClassName={
                      atTarget ? "bg-emerald-500" : "bg-primary"
                    }
                  />
                </div>

                {/* Hours Logged Stepper & Linked Courses */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-muted-foreground">
                      Hours logged:
                    </span>
                    <strong className="font-mono text-sm">
                      {skill.hoursLogged}h
                    </strong>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 font-mono text-[11px]"
                      onClick={() =>
                        onMutate("upsertSkill", {
                          ...skill,
                          hoursLogged: Math.max(0, skill.hoursLogged - 0.5),
                        })
                      }
                    >
                      -0.5h
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 font-mono text-[11px]"
                      onClick={() =>
                        onMutate("upsertSkill", {
                          ...skill,
                          hoursLogged: skill.hoursLogged + 0.5,
                        })
                      }
                    >
                      +0.5h
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 font-mono text-[11px]"
                      onClick={() =>
                        onMutate("upsertSkill", {
                          ...skill,
                          hoursLogged: skill.hoursLogged + 1,
                        })
                      }
                    >
                      +1h
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    onClick={() => handleToggleExpand(skill)}
                  >
                    {isExpanded ? (
                      <>
                        Hide Notes <ChevronUp className="h-3.5 w-3.5" />
                      </>
                    ) : (
                      <>
                        Notes & Courses ({linkedCourses.length}){" "}
                        <ChevronDown className="h-3.5 w-3.5" />
                      </>
                    )}
                  </Button>
                </div>

                {/* Preview of notes when collapsed */}
                {!isExpanded && skill.notes && (
                  <p className="text-xs text-muted-foreground line-clamp-2 border-t border-border/50 pt-2">
                    {skill.notes}
                  </p>
                )}

                {/* Expanded Notes & Linked Courses Editor */}
                {isExpanded && (
                  <div className="space-y-3 border-t border-border pt-3 mt-2">
                    <div className="space-y-1.5">
                      <label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        Skill Notes, Teach-Back Summary & Key Concepts
                      </label>
                      <Textarea
                        value={noteDrafts[skill.id] ?? skill.notes}
                        onChange={(e) =>
                          setNoteDrafts((prev) => ({
                            ...prev,
                            [skill.id]: e.target.value,
                          }))
                        }
                        placeholder="Add mental models, syntax reminders, or teach-back explanations for this skill..."
                        className="min-h-[96px] text-xs"
                      />
                      <div className="flex items-center justify-between pt-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive h-7 px-2 text-xs"
                          onClick={() =>
                            onMutate("deleteSkill", { id: skill.id })
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Delete Skill
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleSaveSkillNote(skill)}
                        >
                          Save Skill Notes
                        </Button>
                      </div>
                    </div>

                    {linkedCourses.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground block">
                          Linked Courses & Reading Materials
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {linkedCourses.map((c) => (
                            <Button
                              key={c.id}
                              variant="secondary"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => onJumpToCourse(c.id)}
                            >
                              <BookOpen className="h-3 w-3 mr-1" />
                              {c.title}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

