"use client";

import { Check, Clipboard, KeyRound, LoaderCircle } from "lucide-react";
import { useActionState, useState } from "react";
import { createApiTokenAction, type CreateApiTokenState } from "@/app/token-actions";

const initialState: CreateApiTokenState = { status: "idle", message: "" };

export function ApiTokenForm() {
  const [state, action, pending] = useActionState(createApiTokenAction, initialState);
  const [copiedToken, setCopiedToken] = useState<string>();
  const copied = copiedToken === state.token;

  async function copyToken() {
    if (!state.token) return;
    await navigator.clipboard.writeText(state.token);
    setCopiedToken(state.token);
  }

  return (
    <div style={{ display: "grid", gap: ".9rem" }}>
      <form action={action} style={{ display: "flex", alignItems: "end", gap: ".75rem", flexWrap: "wrap" }}>
        <label className="label" style={{ flex: "1 1 240px" }}>
          Token name
          <input className="field" name="name" minLength={2} maxLength={60} placeholder="My CLI" required />
        </label>
        <button className="button button-primary" disabled={pending}>
          {pending ? <LoaderCircle size={17} className="animate-spin" /> : <KeyRound size={17} />}
          Create 30-day token
        </button>
      </form>
      {state.message && (
        <div className={`alert ${state.status === "error" ? "alert-error" : "alert-success"}`} role="status">
          {state.message}
        </div>
      )}
      {state.token && (
        <div style={{ display: "flex", alignItems: "center", gap: ".6rem", flexWrap: "wrap" }}>
          <code style={{ flex: "1 1 300px", overflowWrap: "anywhere", padding: ".85rem", borderRadius: ".9rem", background: "#f4f2ff", border: "1px solid var(--line)" }}>
            {state.token}
          </code>
          <button className="button button-secondary" type="button" onClick={copyToken}>
            {copied ? <Check size={17} /> : <Clipboard size={17} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}
