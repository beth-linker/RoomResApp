"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="shell page" style={{ minHeight: "80vh", display: "grid", placeItems: "center" }}><section className="card" style={{ padding: "2rem", textAlign: "center", maxWidth: 500 }}><div style={{ fontSize: "3rem" }}>🫠</div><h1 className="display" style={{ fontSize: "2.4rem" }}>That room got away.</h1><p className="hint">Something unexpected happened. Your data is still safe.</p><button className="button button-primary" onClick={reset}>Try again</button></section></main>;
}
