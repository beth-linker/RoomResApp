"use client";

import { ArrowRight, KeyRound, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

type Mode = "sign-in" | "join" | "setup";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    if (mode === "sign-in") {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message ?? "We could not sign you in.");
        setPending(false);
        return;
      }
    } else {
      const response = await fetch("/api/auth/sign-up/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(form.get("name") ?? ""),
          email,
          password,
          inviteCode: mode === "join" ? String(form.get("inviteCode") ?? "") : undefined,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        setError(payload.message ?? "We could not create your account.");
        setPending(false);
        return;
      }
    }

    router.push("/schedule");
    router.refresh();
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: "1rem" }}>
      {mode !== "sign-in" && <label className="label">Your name<input className="field" name="name" autoComplete="name" required minLength={2} /></label>}
      <label className="label">Email<input className="field" name="email" type="email" autoComplete="email" required /></label>
      <label className="label">Password<input className="field" name="password" type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} required minLength={10} /><span className="hint">At least 10 characters.</span></label>
      {mode === "join" && <label className="label">Invite code<div style={{ position: "relative" }}><KeyRound size={17} style={{ position: "absolute", left: ".85rem", top: ".9rem", color: "#6750e8" }} /><input className="field" name="inviteCode" required style={{ paddingLeft: "2.5rem", textTransform: "uppercase" }} /></div></label>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <button className="button button-primary" disabled={pending} type="submit">
        {pending ? <LoaderCircle size={18} className="animate-spin" /> : <ArrowRight size={18} />}
        {mode === "sign-in" ? "Sign in" : mode === "setup" ? "Create admin account" : "Create account"}
      </button>
      <div className="hint" style={{ textAlign: "center" }}>
        {mode === "sign-in" ? <>Have a code? <Link href="/join" style={{ color: "var(--purple-dark)", fontWeight: 800 }}>Join RoomRes</Link></> : <>Already belong? <Link href="/sign-in" style={{ color: "var(--purple-dark)", fontWeight: 800 }}>Sign in</Link></>}
      </div>
    </form>
  );
}
