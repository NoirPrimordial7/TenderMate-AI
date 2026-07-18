import { Suspense } from "react";
import { PasswordResetForm } from "@/components/security/PasswordResetForm";

export default function ResetPasswordPage() {
  return <Suspense fallback={null}><PasswordResetForm /></Suspense>;
}
