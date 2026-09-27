import { desc, eq } from "drizzle-orm";
import { ArrowLeft, ScrollText } from "lucide-react";
import Link from "next/link";
import { getDb } from "@/db";
import { auditEvents, user } from "@/db/schema";
import { requireAdmin } from "@/lib/session";

export default async function AuditPage() {
  await requireAdmin();
  const rows = await getDb().select({ id: auditEvents.id, action: auditEvents.action, entityType: auditEvents.entityType, actorName: user.name, createdAt: auditEvents.createdAt }).from(auditEvents).leftJoin(user, eq(auditEvents.actorId, user.id)).orderBy(desc(auditEvents.createdAt)).limit(100);
  return <main className="shell page"><Link href="/admin" className="button button-quiet"><ArrowLeft size={16} />Admin</Link><div style={{ margin: "1.5rem 0" }}><div className="eyebrow"><ScrollText size={14} style={{ display: "inline", marginRight: 5 }} />Recent activity</div><h1 className="display" style={{ fontSize: "3.6rem", margin: ".5rem 0" }}>Audit trail</h1></div><section className="card" style={{ overflow: "hidden" }}>{rows.length === 0 ? <p className="hint" style={{ padding: "1.2rem" }}>Nothing to report yet.</p> : rows.map((event) => <div key={event.id} style={{ display: "grid", gridTemplateColumns: "minmax(150px, 1fr) minmax(120px, .8fr) auto", gap: "1rem", padding: "1rem", borderBottom: "1px solid var(--line)", alignItems: "center" }}><strong>{event.action.replaceAll(".", " ")}</strong><span className="hint">{event.actorName ?? "System"} · {event.entityType}</span><time className="hint">{event.createdAt.toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time></div>)}</section></main>;
}
