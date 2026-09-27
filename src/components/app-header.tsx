import { CalendarDays, DoorOpen, Settings, UserRound } from "lucide-react";
import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";

export function AppHeader({ name, isAdmin }: { name: string; isAdmin: boolean }) {
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(250,248,255,.8)", backdropFilter: "blur(18px)", borderBottom: "1px solid rgba(103,80,232,.1)" }}>
      <div className="shell" style={{ minHeight: 72, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
        <Link href="/schedule" style={{ display: "flex", alignItems: "center", gap: ".6rem", fontWeight: 950, fontSize: "1.2rem" }}>
          <span style={{ width: 40, height: 40, display: "grid", placeItems: "center", borderRadius: 14, background: "var(--purple)", color: "white", boxShadow: "0 7px 16px rgba(103,80,232,.25)" }}><DoorOpen size={21} /></span>
          RoomRes
        </Link>
        <nav aria-label="Main navigation" style={{ display: "flex", gap: ".45rem", alignItems: "center" }}>
          <Link className="button button-secondary" href="/schedule"><CalendarDays size={17} /><span className="nav-label">Schedule</span></Link>
          {isAdmin && <Link className="button button-quiet" href="/admin"><Settings size={17} /><span className="nav-label">Admin</span></Link>}
          <span className="pill nav-label" style={{ background: "var(--mint)" }}><UserRound size={14} />{name}</span>
          <SignOutButton />
        </nav>
      </div>
    </header>
  );
}
