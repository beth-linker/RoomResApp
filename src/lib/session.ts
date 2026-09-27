import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function getCurrentSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireUser(options?: { allowPasswordChange?: boolean }) {
  const current = await getCurrentSession();
  if (!current) redirect("/sign-in");
  if (!current.user.active) redirect("/sign-in?inactive=1");
  if (current.user.mustChangePassword && !options?.allowPasswordChange) {
    redirect("/change-password");
  }
  return current;
}

export async function requireAdmin() {
  const current = await requireUser();
  if (current.user.role !== "admin") redirect("/schedule");
  return current;
}
