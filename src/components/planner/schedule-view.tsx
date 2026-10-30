"use client";

import * as React from "react";
import {
  ArrowUpRight,
  Calendar as CalendarIcon,
  CheckSquare,
  Clock,
  ListTodo,
  Plus,
  Trash2,
} from "lucide-react";
import {
  PlannerSnapshot,
  ScheduleCategory,
  ScheduleItem,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ScheduleViewProps {
  snapshot: PlannerSnapshot;
  onMutate: (action: string, payload: unknown) => Promise<void>;
}

function toDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y || 2026, (m || 10) - 1, d || 29);
}

export function ScheduleView({ snapshot, onMutate }: ScheduleViewProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    new Date(2026, 9, 29) // Oct 29, 2026
  );
  const [filterBySelectedDate, setFilterBySelectedDate] =
    React.useState<boolean>(false);

  const selectedDateKey = selectedDate
    ? toDateKey(selectedDate)
    : "2026-10-29";

  const [newItem, setNewItem] = React.useState({
    title: "",
    date: selectedDateKey,
    time: "09:00",
    category: "immediate_todo" as ScheduleCategory,
    phase: "Phase 1",
    notes: "",
  });

  React.useEffect(() => {
    if (selectedDate) {
      setNewItem((prev) => ({ ...prev, date: toDateKey(selectedDate) }));
    }
  }, [selectedDate]);

  // Dates that have schedule items for Calendar modifiers
  const scheduledDates = React.useMemo(() => {
    const unique = Array.from(
      new Set(snapshot.scheduleItems.map((i) => i.date))
    );
    return unique.map(parseLocalDate);
  }, [snapshot.scheduleItems]);

  const handleCreateScheduleItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.title.trim()) return;
    await onMutate("createScheduleItem", {
      ...newItem,
      title: newItem.title.trim(),
      notes: newItem.notes.trim(),
    });
    setNewItem((prev) => ({
      ...prev,
      title: "",
      notes: "",
    }));
  };

  const visibleItems = filterBySelectedDate
    ? snapshot.scheduleItems.filter((i) => i.date === selectedDateKey)
    : snapshot.scheduleItems;

  const immediateTodos = visibleItems.filter(
    (i) => i.category === "immediate_todo"
  );
  const upcomingTodos = visibleItems.filter(
    (i) => i.category === "upcoming_todo"
  );
  const events = visibleItems.filter((i) => i.category === "event");

  const renderItemCard = (item: ScheduleItem) => (
    <div
      key={item.id}
      className={`rounded-lg border p-3 transition-all ${
        item.completed
          ? "border-border/50 bg-secondary/10 opacity-65"
          : "border-border/80 bg-secondary/20"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <label className="flex items-start gap-2.5 cursor-pointer flex-1">
          <input
            type="checkbox"
            checked={item.completed}
            onChange={() =>
              onMutate("updateScheduleItem", {
                id: item.id,
                completed: !item.completed,
              })
            }
            className="mt-1 h-4 w-4 rounded border-border"
          />
          <div className="space-y-1">
            <div
              className={`text-sm font-medium leading-snug ${
                item.completed ? "line-through text-muted-foreground" : ""
              }`}
            >
              {item.title}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
              <span>{item.date}</span>
              {item.time && <span>· {item.time}</span>}
              <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                {item.phase}
              </Badge>
            </div>
            {item.notes && (
              <p className="text-xs text-muted-foreground pt-0.5">
                {item.notes}
              </p>
            )}
          </div>
        </label>

        <div className="flex items-center gap-1 shrink-0">
          {item.category === "upcoming_todo" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px] font-mono"
              title="Move to Immediate To-Dos"
              onClick={() =>
                onMutate("updateScheduleItem", {
                  id: item.id,
                  category: "immediate_todo",
                })
              }
            >
              <ArrowUpRight className="h-3 w-3 mr-0.5" />
              Now
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            onClick={() => onMutate("deleteScheduleItem", { id: item.id })}
            title="Delete item"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            Schedule, Calendar & Action Lists
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage study blocks, Friday review events, Immediate To-Dos, and
            Upcoming To-Dos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={filterBySelectedDate ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterBySelectedDate((v) => !v)}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            {filterBySelectedDate
              ? `Showing Only ${selectedDateKey}`
              : "Showing All Dates (Click to Filter by Date)"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left 4 cols: shadcn/ui Calendar + Quick Add Form */}
        <div className="space-y-6 lg:col-span-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" />
                Planner Calendar
              </CardTitle>
              <CardDescription>
                Highlighted dates have scheduled events or To-Dos.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={{ hasEvents: scheduledDates }}
                modifiersClassNames={{
                  hasEvents:
                    "after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-emerald-400",
                }}
                className="rounded-lg border border-border/60 w-full"
              />
              <div className="mt-3 w-full flex items-center justify-between text-xs text-muted-foreground px-1">
                <span className="font-mono">Selected: {selectedDateKey}</span>
                <span>
                  {
                    snapshot.scheduleItems.filter(
                      (i) => i.date === selectedDateKey
                    ).length
                  }{" "}
                  item(s) on this date
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Add Event / To-Do Form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Add Event or To-Do
              </CardTitle>
              <CardDescription>
                Assign to Immediate To-Dos, Upcoming To-Dos, or Calendar Events.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateScheduleItem} className="space-y-3">
                <div className="space-y-1">
                  <label className="font-mono text-[10px] uppercase text-muted-foreground">
                    Title
                  </label>
                  <Input
                    required
                    value={newItem.title}
                    onChange={(e) =>
                      setNewItem((p) => ({ ...p, title: e.target.value }))
                    }
                    placeholder="e.g., Complete JS closures & event loop note"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-mono text-[10px] uppercase text-muted-foreground">
                      Category
                    </label>
                    <select
                      value={newItem.category}
                      onChange={(e) =>
                        setNewItem((p) => ({
                          ...p,
                          category: e.target.value as ScheduleCategory,
                        }))
                      }
                      className="flex h-9 w-full rounded-lg border border-input bg-background px-2.5 text-xs"
                    >
                      <option value="immediate_todo">Immediate To-Do</option>
                      <option value="upcoming_todo">Upcoming To-Do</option>
                      <option value="event">Calendar Event</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-[10px] uppercase text-muted-foreground">
                      Phase
                    </label>
                    <select
                      value={newItem.phase}
                      onChange={(e) =>
                        setNewItem((p) => ({ ...p, phase: e.target.value }))
                      }
                      className="flex h-9 w-full rounded-lg border border-input bg-background px-2.5 text-xs"
                    >
                      <option value="Setup">Setup</option>
                      <option value="Phase 1">Phase 1</option>
                      <option value="Phase 2">Phase 2</option>
                      <option value="Phase 3">Phase 3</option>
                      <option value="Phase 4">Phase 4</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-mono text-[10px] uppercase text-muted-foreground">
                      Date
                    </label>
                    <Input
                      type="date"
                      value={newItem.date}
                      onChange={(e) =>
                        setNewItem((p) => ({ ...p, date: e.target.value }))
                      }
                      className="text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-[10px] uppercase text-muted-foreground">
                      Time (Optional)
                    </label>
                    <Input
                      type="time"
                      value={newItem.time}
                      onChange={(e) =>
                        setNewItem((p) => ({ ...p, time: e.target.value }))
                      }
                      className="text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[10px] uppercase text-muted-foreground">
                    Notes
                  </label>
                  <Textarea
                    value={newItem.notes}
                    onChange={(e) =>
                      setNewItem((p) => ({ ...p, notes: e.target.value }))
                    }
                    placeholder="Context or deliverable checklist..."
                    className="min-h-[68px] text-xs"
                  />
                </div>

                <Button type="submit" className="w-full">
                  <Plus className="h-4 w-4" />
                  Add to Schedule
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right 8 cols: Three Columns (Immediate To-Dos, Upcoming To-Dos, Calendar Events) */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:col-span-8">
          {/* Column 1: Immediate To-Dos */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-amber-400" />
                  Immediate To-Dos
                </CardTitle>
                <Badge variant="amber">
                  {immediateTodos.filter((i) => !i.completed).length} active
                </Badge>
              </div>
              <CardDescription>
                Actionable tasks for your active study and build blocks right
                now.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 flex-1">
              {immediateTodos.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No immediate To-Dos found.
                </p>
              ) : (
                immediateTodos.map(renderItemCard)
              )}
            </CardContent>
          </Card>

          {/* Column 2: Upcoming To-Dos */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <ListTodo className="h-4 w-4 text-blue-400" />
                  Upcoming To-Dos
                </CardTitle>
                <Badge variant="blue">
                  {upcomingTodos.filter((i) => !i.completed).length} queued
                </Badge>
              </div>
              <CardDescription>
                Next up in the queue. Click &ldquo;Now&rdquo; to pull into
                Immediate To-Dos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 flex-1">
              {upcomingTodos.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No upcoming To-Dos queued.
                </p>
              ) : (
                upcomingTodos.map(renderItemCard)
              )}
            </CardContent>
          </Card>

          {/* Column 3: Scheduled Events */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-400" />
                  Events & Reviews
                </CardTitle>
                <Badge variant="purple">{events.length} events</Badge>
              </div>
              <CardDescription>
                Dedicated calendar blocks, Friday reviews, and phase launches.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 flex-1">
              {events.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No calendar events scheduled.
                </p>
              ) : (
                events.map(renderItemCard)
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

