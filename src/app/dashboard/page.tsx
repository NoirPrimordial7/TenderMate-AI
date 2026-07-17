import DashboardClient from "@/app/dashboard/DashboardClient";
import { ApplicationShell } from "@/components/shell/ApplicationShell";

export default function DashboardPage() {
  return (
    <ApplicationShell><DashboardClient /></ApplicationShell>
  );
}
