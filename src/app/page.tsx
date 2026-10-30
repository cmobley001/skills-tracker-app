import { getPlannerSnapshot } from "@/lib/db";
import { SkillsPlannerApp } from "@/components/planner/skills-planner-app";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const snapshot = getPlannerSnapshot();
  return <SkillsPlannerApp initialSnapshot={snapshot} />;
}

