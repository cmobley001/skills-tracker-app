import { NextRequest, NextResponse } from "next/server";
import {
  addCurriculumItem,
  createCourse,
  createScheduleItem,
  deleteCourse,
  deleteCurriculumItem,
  deleteScheduleItem,
  deleteSkill,
  getPlannerSnapshot,
  seedAll,
  updateCourse,
  updateCurriculumItem,
  updateScheduleItem,
  updateWeeklyLog,
  upsertSkill,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = getPlannerSnapshot();
    return NextResponse.json(snapshot);
  } catch (err) {
    console.error("Failed to load planner snapshot:", err);
    return NextResponse.json(
      { error: "Failed to load planner data" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    switch (action) {
      case "upsertSkill":
        upsertSkill(payload);
        break;
      case "deleteSkill":
        deleteSkill(payload.id);
        break;
      case "createCourse":
        createCourse(payload);
        break;
      case "updateCourse":
        updateCourse(payload);
        break;
      case "deleteCourse":
        deleteCourse(payload.id);
        break;
      case "addCurriculumItem":
        addCurriculumItem(payload);
        break;
      case "updateCurriculumItem":
        updateCurriculumItem(payload);
        break;
      case "deleteCurriculumItem":
        deleteCurriculumItem(payload.id);
        break;
      case "updateWeeklyLog":
        updateWeeklyLog(payload);
        break;
      case "createScheduleItem":
        createScheduleItem(payload);
        break;
      case "updateScheduleItem":
        updateScheduleItem(payload);
        break;
      case "deleteScheduleItem":
        deleteScheduleItem(payload.id);
        break;
      case "resetSeed":
        seedAll();
        break;
      default:
        return NextResponse.json(
          { error: `Unknown action: ${String(action)}` },
          { status: 400 }
        );
    }

    const snapshot = getPlannerSnapshot();
    return NextResponse.json(snapshot);
  } catch (err) {
    console.error("Planner API error:", err);
    return NextResponse.json(
      { error: "Failed to process planner mutation" },
      { status: 500 }
    );
  }
}

