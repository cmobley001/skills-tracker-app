"use client";

import * as React from "react";
import Fuse from "fuse.js";
import {
  Award,
  BookText,
  Calendar,
  FileText,
  Search,
  Video,
  X,
} from "lucide-react";
import { PlannerSnapshot } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export interface SearchDocument {
  id: string;
  kind: "video_course" | "text_course" | "curriculum_note" | "skill" | "schedule";
  title: string;
  subtitle: string;
  body: string;
  phase: string;
  targetTab: "dashboard" | "skills" | "courses" | "schedule";
  courseId?: string;
  itemId?: string;
  skillId?: string;
}

interface GlobalSearchModalProps {
  open: boolean;
  onClose: () => void;
  snapshot: PlannerSnapshot;
  onSelectResult: (doc: SearchDocument) => void;
}

export function GlobalSearchModal({
  open,
  onClose,
  snapshot,
  onSelectResult,
}: GlobalSearchModalProps) {
  const [query, setQuery] = React.useState("");

  // Build unified index for Fuse.js across all notes, text titles, video titles, and skills
  const searchDocs = React.useMemo<SearchDocument[]>(() => {
    const docs: SearchDocument[] = [];

    for (const s of snapshot.skills) {
      docs.push({
        id: `skill-${s.id}`,
        kind: "skill",
        title: s.name,
        subtitle: `${s.category} · Level ${s.currentLevel}/${s.targetLevel}`,
        body: s.notes,
        phase: s.phase,
        targetTab: "skills",
        skillId: s.id,
      });
    }

    for (const c of snapshot.courses) {
      docs.push({
        id: `course-${c.id}`,
        kind: c.type === "video" ? "video_course" : "text_course",
        title: c.title,
        subtitle: `${c.provider || "Course"} · ${c.buildProject || c.status}`,
        body: c.summaryNotes,
        phase: c.phase,
        targetTab: "courses",
        courseId: c.id,
      });

      for (const item of c.items) {
        docs.push({
          id: `item-${item.id}`,
          kind: "curriculum_note",
          title: item.title,
          subtitle: `In ${c.title}`,
          body: `${item.notes} ${item.artifactUrl}`.trim(),
          phase: c.phase,
          targetTab: "courses",
          courseId: c.id,
          itemId: item.id,
        });
      }
    }

    for (const sc of snapshot.scheduleItems) {
      docs.push({
        id: `sched-${sc.id}`,
        kind: "schedule",
        title: sc.title,
        subtitle: `${sc.date} ${sc.time} · ${sc.category.replace("_", " ")}`,
        body: sc.notes,
        phase: sc.phase,
        targetTab: "schedule",
      });
    }

    return docs;
  }, [snapshot]);

  const fuse = React.useMemo(() => {
    return new Fuse(searchDocs, {
      keys: [
        { name: "title", weight: 0.45 },
        { name: "body", weight: 0.35 },
        { name: "subtitle", weight: 0.15 },
        { name: "phase", weight: 0.05 },
      ],
      threshold: 0.35,
      ignoreLocation: true,
      includeScore: true,
    });
  }, [searchDocs]);

  const results = React.useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      // Show top items with notes when empty
      return searchDocs
        .filter((d) => d.body.length > 0)
        .slice(0, 10)
        .map((item) => ({ item, score: 0 }));
    }
    return fuse.search(trimmed, { limit: 18 });
  }, [query, fuse, searchDocs]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) onClose();
      } else if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const renderBadge = (kind: SearchDocument["kind"]) => {
    switch (kind) {
      case "video_course":
        return (
          <Badge variant="blue" className="gap-1">
            <Video className="h-3 w-3" /> Video Title
          </Badge>
        );
      case "text_course":
        return (
          <Badge variant="purple" className="gap-1">
            <BookText className="h-3 w-3" /> Text Title
          </Badge>
        );
      case "curriculum_note":
        return (
          <Badge variant="emerald" className="gap-1">
            <FileText className="h-3 w-3" /> Curriculum Note
          </Badge>
        );
      case "skill":
        return (
          <Badge variant="amber" className="gap-1">
            <Award className="h-3 w-3" /> Skill
          </Badge>
        );
      case "schedule":
        return (
          <Badge variant="outline" className="gap-1">
            <Calendar className="h-3 w-3" /> Schedule
          </Badge>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-xs pt-16 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across all study notes, video courses, text titles, and skills..."
            className="border-0 shadow-none focus-visible:ring-0 px-1 text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-xs text-muted-foreground hover:text-foreground px-1.5"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[420px] overflow-y-auto divide-y divide-border/60">
          {results.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No matching notes, courses, or skills found for &ldquo;{query}
              &rdquo;.
            </div>
          ) : (
            results.map(({ item }) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectResult(item);
                  onClose();
                }}
                className="w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors flex flex-col gap-1 cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm text-foreground line-clamp-1">
                    {item.title}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {item.phase}
                    </span>
                    {renderBadge(item.kind)}
                  </div>
                </div>
                <div className="text-xs font-mono text-muted-foreground">
                  {item.subtitle}
                </div>
                {item.body && (
                  <p className="text-xs text-muted-foreground/90 line-clamp-2 mt-0.5 bg-secondary/30 rounded px-2 py-1">
                    {item.body}
                  </p>
                )}
              </button>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border bg-secondary/20 px-4 py-2 text-[11px] font-mono text-muted-foreground">
          <span>Powered by Fuse.js fuzzy search across SQLite notes</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
}

