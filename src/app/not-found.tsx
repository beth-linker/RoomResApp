import Link from "next/link";

export default function NotFound() {
  return <main className="shell page" style={{ minHeight: "80vh", display: "grid", placeItems: "center" }}><section className="card" style={{ padding: "2rem", textAlign: "center" }}><div style={{ fontSize: "3rem" }}>🚪</div><h1 className="display" style={{ fontSize: "2.4rem" }}>No meeting here.</h1><Link href="/" className="button button-primary">Back to RoomRes</Link></section></main>;
}
