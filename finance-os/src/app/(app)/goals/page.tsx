import { GoalsGrid } from "@/components/goals/goals-grid";
import { goals } from "@/lib/mock-data";

export default function GoalsPage() {
  return <GoalsGrid goals={goals} />;
}
