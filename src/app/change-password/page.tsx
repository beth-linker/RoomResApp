import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { ChangePasswordForm } from "@/components/change-password-form";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const current = await requireUser({ allowPasswordChange: true });
  if (!current.user.mustChangePassword) redirect("/schedule");
  return <AuthShell title="Choose a new password." detail="An admin gave you a temporary password. Replace it before continuing."><ChangePasswordForm /></AuthShell>;
}
