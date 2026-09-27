import { count } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { user } from "@/db/schema";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";

export const dynamic = "force-dynamic";

export default async function JoinPage() {
  const [{ total }] = await getDb().select({ total: count() }).from(user);
  if (total === 0) redirect("/setup");
  return <AuthShell title="Join the team." detail="Use the invite code from your RoomRes admin."><AuthForm mode="join" /></AuthShell>;
}
