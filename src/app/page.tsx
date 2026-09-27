import { count } from "drizzle-orm";
import { ArrowRight, CalendarDays, Sparkles, UsersRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { user } from "@/db/schema";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [current, [{ total }]] = await Promise.all([
    getCurrentSession(),
    getDb().select({ total: count() }).from(user),
  ]);
  if (current) redirect("/schedule");

  const setupNeeded = total === 0;
  return (
    <main className="shell page">
      <section className="card enter" style={{ padding: "clamp(1.5rem, 5vw, 4.5rem)", overflow: "hidden", position: "relative" }}>
        <div aria-hidden="true" className="float" style={{ position: "absolute", right: "6%", top: "8%", width: 130, height: 130, borderRadius: "38% 62% 55% 45%", background: "var(--sun)", opacity: .8 }} />
        <div aria-hidden="true" style={{ position: "absolute", right: "20%", bottom: "-3rem", width: 170, height: 170, borderRadius: "50%", background: "var(--mint)", opacity: .72 }} />
        <div style={{ maxWidth: 690, position: "relative" }}>
          <div className="eyebrow" style={{ display: "flex", gap: ".45rem", alignItems: "center" }}><Sparkles size={15} /> Tiny office, happy rooms</div>
          <h1 className="display" style={{ fontSize: "clamp(3.6rem, 10vw, 7.8rem)", margin: "1rem 0 1.25rem" }}>RoomRes</h1>
          <p style={{ fontSize: "clamp(1.1rem, 2.2vw, 1.45rem)", lineHeight: 1.55, maxWidth: 590, color: "#505a74" }}>
            Find a room, claim a time, and get back to the good stuff. Seven cheerful spaces, one tidy schedule.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: ".75rem", marginTop: "2rem" }}>
            <Link className="button button-primary" href={setupNeeded ? "/setup" : "/sign-in"}>
              {setupNeeded ? "Set up RoomRes" : "Sign in"} <ArrowRight size={18} />
            </Link>
            {!setupNeeded && <Link className="button button-secondary" href="/join">Join with a code</Link>}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: ".8rem", marginTop: "clamp(2.5rem, 7vw, 5rem)", position: "relative" }}>
          {[
            [CalendarDays, "Two-week view", "Just enough horizon"],
            [UsersRound, "Small-team ready", "Clear ownership"],
            [Sparkles, "Seven rooms", "Every one has character"],
          ].map(([Icon, title, detail]) => {
            const TileIcon = Icon as typeof CalendarDays;
            return <div key={String(title)} style={{ background: "rgba(255,255,255,.74)", border: "1px solid white", borderRadius: "1rem", padding: "1rem" }}><TileIcon size={20} color="#6750e8" /><strong style={{ display: "block", marginTop: ".6rem" }}>{String(title)}</strong><span className="hint">{String(detail)}</span></div>;
          })}
        </div>
      </section>
    </main>
  );
}
