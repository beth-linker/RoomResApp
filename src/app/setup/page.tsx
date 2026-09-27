import { count } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { user } from "@/db/schema";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const [{ total }] = await getDb().select({ total: count() }).from(user);
  if (total > 0) redirect("/sign-in");
  return <AuthShell title="Make it yours." detail="The first account becomes the RoomRes administrator."><AuthForm mode="setup" /></AuthShell>;
}
