import { count, eq } from "drizzle-orm";
import { CalendarCheck, DoorOpen, KeyRound, ScrollText, UsersRound } from "lucide-react";
import Link from "next/link";
import { getDb } from "@/db";
import { bookings, inviteCodes, rooms, user } from "@/db/schema";
import { requireAdmin } from "@/lib/session";

export default async function AdminPage() {
  await requireAdmin();
  const [[users], [roomCount], [bookingCount], [invites]] = await Promise.all([
    getDb().select({ value: count() }).from(user).where(eq(user.active, true)),
    getDb().select({ value: count() }).from(rooms).where(eq(rooms.active, true)),
    getDb().select({ value: count() }).from(bookings),
    getDb().select({ value: count() }).from(inviteCodes).where(eq(inviteCodes.active, true)),
  ]);
  const items = [
    { href: "/admin/users", icon: UsersRound, label: "Users", count: users.value, detail: "Accounts, roles, and resets", color: "var(--mint)" },
    { href: "/admin/rooms", icon: DoorOpen, label: "Rooms", count: roomCount.value, detail: "Capacity and amenities", color: "var(--sky)" },
    { href: "/admin/invites", icon: KeyRound, label: "Invites", count: invites.value, detail: "Codes for new teammates", color: "var(--sun)" },
    { href: "/admin/audit", icon: ScrollText, label: "Audit trail", count: bookingCount.value, detail: "Recent changes and bookings", color: "#ffddd7" },
  ];
  return <main className="shell page"><div className="eyebrow"><CalendarCheck size={14} style={{ display: "inline", marginRight: 5 }} />RoomRes control room</div><h1 className="display" style={{ fontSize: "clamp(2.8rem, 7vw, 5rem)", margin: ".6rem 0 2rem" }}>Admin, but friendly.</h1><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "1rem" }}>{items.map((item, index) => <Link href={item.href} className="card enter" key={item.href} style={{ padding: "1.3rem", animationDelay: `${index * 60}ms`, transition: "transform .18s ease" }}><span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: item.color }}><item.icon size={23} /></span><div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: "1.2rem" }}><h2 style={{ margin: 0 }}>{item.label}</h2><strong style={{ fontSize: "1.8rem", color: "var(--purple-dark)" }}>{item.count}</strong></div><p className="hint">{item.detail}</p></Link>)}</div></main>;
}
