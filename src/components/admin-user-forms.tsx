"use client";

import { LoaderCircle, UserPlus } from "lucide-react";
import { useActionState } from "react";
import { createUserAction, resetPasswordAction } from "@/app/actions";
import { initialActionState } from "@/lib/action-state";

export function CreateUserForm() {
  const [state, action, pending] = useActionState(createUserAction, initialActionState);
  return <form action={action} style={{ display: "grid", gap: ".75rem" }}><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: ".75rem" }}><label className="label">Name<input className="field" name="name" required /></label><label className="label">Email<input className="field" name="email" type="email" required /></label><label className="label">Temporary password<input className="field" name="password" type="password" minLength={10} required /></label><label className="label">Role<select className="field" name="role"><option value="member">Member</option><option value="admin">Admin</option></select></label></div>{state.message && <div className={`alert ${state.status === "error" ? "alert-error" : "alert-success"}`}>{state.message}</div>}<button className="button button-primary" disabled={pending}>{pending ? <LoaderCircle size={17} className="animate-spin" /> : <UserPlus size={17} />}Add user</button></form>;
}

export function PasswordResetForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, initialActionState);
  return <form action={action} style={{ display: "flex", alignItems: "end", gap: ".5rem", flexWrap: "wrap" }}><input name="userId" type="hidden" value={userId} /><label className="label" style={{ flex: "1 1 180px" }}>Temporary password<input className="field" name="password" type="password" minLength={10} required /></label><button className="button button-secondary" disabled={pending}>Reset</button>{state.message && <div className={`alert ${state.status === "error" ? "alert-error" : "alert-success"}`} style={{ width: "100%" }}>{state.message}</div>}</form>;
}
