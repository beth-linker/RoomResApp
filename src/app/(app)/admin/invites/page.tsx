import { desc } from "drizzle-orm";
import { ArrowLeft, Copy, KeyRound } from "lucide-react";
import Link from "next/link";
import { createInviteAction, disableInviteAction } from "@/app/actions";
import { getDb } from "@/db";
import { inviteCodes } from "@/db/schema";
import { requireAdmin } from "@/lib/session";

export default async function InvitesAdminPage({ searchParams }: { searchParams: Promise<{ created?: string }> }) {
  await requireAdmin();
  const { created } = await searchParams;
  const rows = await getDb().select().from(inviteCodes).orderBy(desc(inviteCodes.createdAt));
  return <main className="shell page"><Link href="/admin" className="button button-quiet"><ArrowLeft size={16} />Admin</Link><div style={{ margin: "1.5rem 0" }}><div className="eyebrow"><KeyRound size={14} style={{ display: "inline", marginRight: 5 }} />Access</div><h1 className="display" style={{ fontSize: "3.6rem", margin: ".5rem 0" }}>Invite codes</h1></div>{created && <section className="card" style={{ padding: "1.2rem", marginBottom: "1rem", border: "2px solid var(--mint)" }}><div className="eyebrow">Copy it now</div><p className="hint">For safety, the full code is only shown once.</p><code style={{ display: "block", padding: "1rem", background: "#17213b", color: "white", borderRadius: ".8rem", fontSize: "clamp(1rem, 4vw, 1.35rem)", overflowWrap: "anywhere" }}><Copy size={17} style={{ display: "inline", marginRight: 8 }} />{created}</code></section>}<section className="card" style={{ padding: "1.2rem", marginBottom: "1rem" }}><h2>Create a code</h2><form action={createInviteAction} style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: ".75rem", alignItems: "end" }}><label className="label">Label<input className="field" name="label" placeholder="October testers" required /></label><label className="label">Max uses<input className="field" name="maxUses" type="number" min={1} placeholder="Unlimited" /></label><button className="button button-primary">Generate</button></form></section><div style={{ display: "grid", gap: ".7rem" }}>{rows.map((invite) => <section className="card" key={invite.id} style={{ padding: "1rem", display: "flex", gap: "1rem", alignItems: "center", justifyContent: "space-between", opacity: invite.active ? 1 : .6 }}><div><strong>{invite.label}</strong><div className="hint">Ends in •••• {invite.lastFour} · {invite.useCount}{invite.maxUses ? ` of ${invite.maxUses}` : " uses"}</div></div>{invite.active && <form action={disableInviteAction}><input type="hidden" name="id" value={invite.id} /><button className="button button-danger">Disable</button></form>}</section>)}</div></main>;
}
