import { ElectricEntryWorkspace } from "@/components/entry/ElectricEntryWorkspace";

export default function LoginPage() {
  return <ElectricEntryWorkspace initialAuthMode="signin" defaultAuthRedirect="/dashboard" />;
}
