import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { BookOpen, KeyRound } from "lucide-react";
import Link from "next/link";
import { revokeApiTokenAction } from "@/app/token-actions";
import { ApiTokenForm } from "@/components/api-token-form";
import { getDb } from "@/db";
import { apiTokens } from "@/db/schema";
import { requireUser } from "@/lib/session";

export default async function ApiTokensPage() {
  const current = await requireUser();
  const now = new Date();
  const rows = await getDb()
    .select()
    .from(apiTokens)
    .where(
      and(
        eq(apiTokens.userId, current.user.id),
        isNull(apiTokens.revokedAt),
        gt(apiTokens.expiresAt, now),
      ),
    )
    .orderBy(desc(apiTokens.createdAt));

  return (
    <main className="shell page">
      <div className="eyebrow"><KeyRound size={14} style={{ display: "inline", marginRight: 5 }} />Developer access</div>
      <h1 className="display" style={{ fontSize: "clamp(2.8rem, 7vw, 5rem)", margin: ".6rem 0" }}>API tokens</h1>
      <p className="hint" style={{ fontSize: "1rem", maxWidth: 700 }}>
        Tokens identify you to the RoomRes REST API and expire 30 days after creation. Treat them like passwords.
      </p>

      <section className="card" style={{ padding: "1.2rem", margin: "1.5rem 0 1rem" }}>
        <h2 style={{ marginTop: 0 }}>Create a token</h2>
        <ApiTokenForm />
      </section>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", margin: "1.5rem 0 .75rem" }}>
        <h2 style={{ margin: 0 }}>Active tokens</h2>
        <Link className="button button-secondary" href="/api-docs"><BookOpen size={17} />API docs</Link>
      </div>
      <div style={{ display: "grid", gap: ".75rem" }}>
        {rows.length === 0 && <div className="card hint" style={{ padding: "1.2rem" }}>You do not have any active API tokens.</div>}
        {rows.map((token) => (
          <section className="card" key={token.id} style={{ padding: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <strong>{token.name}</strong>
              <div className="hint" style={{ marginTop: ".3rem" }}>
                Ends in {token.lastFour} · Expires {token.expiresAt.toLocaleDateString()} · {token.lastUsedAt ? `Last used ${token.lastUsedAt.toLocaleString()}` : "Never used"}
              </div>
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
