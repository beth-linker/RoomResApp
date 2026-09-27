import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { revokeApiTokenAction } from "@/app/token-actions";
import { getDb } from "@/db";
import { apiTokens, user } from "@/db/schema";
import { requireAdmin } from "@/lib/session";

export default async function AdminApiTokensPage() {
  await requireAdmin();
  const rows = await getDb()
    .select({
      id: apiTokens.id,
      name: apiTokens.name,
      lastFour: apiTokens.lastFour,
      expiresAt: apiTokens.expiresAt,
      lastUsedAt: apiTokens.lastUsedAt,
      createdAt: apiTokens.createdAt,
      ownerName: user.name,
      ownerEmail: user.email,
    })
    .from(apiTokens)
    .innerJoin(user, eq(apiTokens.userId, user.id))
    .where(and(isNull(apiTokens.revokedAt), gt(apiTokens.expiresAt, new Date())))
    .orderBy(desc(apiTokens.createdAt));

  return (
    <main className="shell page">
      <Link href="/admin" className="button button-quiet"><ArrowLeft size={16} />Admin</Link>
      <div style={{ margin: "1.5rem 0" }}>
        <div className="eyebrow"><ShieldCheck size={14} style={{ display: "inline", marginRight: 5 }} />Integration access</div>
        <h1 className="display" style={{ fontSize: "3.6rem", margin: ".5rem 0" }}>API tokens</h1>
        <p className="hint">Revoke a token immediately if it is no longer needed or may have been exposed.</p>
      </div>
      <div style={{ display: "grid", gap: ".75rem" }}>
        {rows.length === 0 && <div className="card hint" style={{ padding: "1.2rem" }}>There are no active API tokens.</div>}
        {rows.map((token) => (
          <section className="card" key={token.id} style={{ padding: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <strong>{token.name}</strong> <span className="pill" style={{ background: "#eef0f6" }}>…{token.lastFour}</span>
              <div className="hint" style={{ marginTop: ".3rem" }}>{token.ownerName} · {token.ownerEmail}</div>
              <div className="hint">Expires {token.expiresAt.toLocaleString()} · {token.lastUsedAt ? `Last used ${token.lastUsedAt.toLocaleString()}` : "Never used"}</div>
            </div>
            <form action={revokeApiTokenAction}>
              <input name="id" type="hidden" value={token.id} />
              <button className="button button-danger">Revoke</button>
            </form>
          </section>
        ))}
      </div>
    </main>
  );
}
