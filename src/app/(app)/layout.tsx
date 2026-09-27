import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SignedInLayout({ children }: { children: React.ReactNode }) {
  const current = await requireUser();
  return <><AppHeader name={current.user.name.split(" ")[0]} isAdmin={current.user.role === "admin"} />{children}</>;
}
