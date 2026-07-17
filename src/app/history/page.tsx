import HistoryClient from "@/app/history/HistoryClient";
import { ApplicationShell } from "@/components/shell/ApplicationShell";

export default function HistoryPage() {
  return (
    <ApplicationShell><HistoryClient /></ApplicationShell>
  );
}
