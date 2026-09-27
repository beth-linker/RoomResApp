"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { changePasswordAction } from "@/app/actions";
import { initialActionState } from "@/lib/action-state";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, initialActionState);
  return <form action={action} style={{ display: "grid", gap: "1rem" }}><label className="label">Current password<input className="field" type="password" name="currentPassword" autoComplete="current-password" required /></label><label className="label">New password<input className="field" type="password" name="newPassword" autoComplete="new-password" minLength={10} required /><span className="hint">At least 10 characters.</span></label>{state.message && <div className="alert alert-error">{state.message}</div>}<button className="button button-primary" disabled={pending}>{pending && <LoaderCircle size={17} className="animate-spin" />}Save new password</button></form>;
}
