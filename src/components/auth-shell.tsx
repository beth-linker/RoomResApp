import { DoorOpen, Sparkles } from "lucide-react";
import Link from "next/link";

export function AuthShell({ title, detail, children }: { title: string; detail: string; children: React.ReactNode }) {
  return <main className="shell page" style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}><section className="card enter" style={{ width: "min(100%, 470px)", padding: "clamp(1.4rem, 5vw, 2.4rem)" }}><Link href="/" aria-label="RoomRes home" style={{ display: "inline-flex", alignItems: "center", gap: ".55rem", fontWeight: 900, color: "var(--purple-dark)" }}><span style={{ width: 38, height: 38, borderRadius: 13, display: "grid", placeItems: "center", background: "var(--mint)" }}><DoorOpen size={20} /></span>RoomRes</Link><div style={{ margin: "2rem 0 1.5rem" }}><div className="eyebrow"><Sparkles size={14} style={{ display: "inline", marginRight: 6 }} />Welcome in</div><h1 className="display" style={{ fontSize: "2.7rem", margin: ".7rem 0" }}>{title}</h1><p className="hint" style={{ fontSize: "1rem" }}>{detail}</p></div>{children}</section></main>;
}
