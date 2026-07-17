import { ElectricEntryWorkspace } from "@/components/entry/ElectricEntryWorkspace";

export default function SignupPage() {
  return <ElectricEntryWorkspace initialAuthMode="signup" defaultAuthRedirect="/dashboard" />;
}
