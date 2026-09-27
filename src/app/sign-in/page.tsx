import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";

export default function SignInPage() {
  return <AuthShell title="Good to see you." detail="Sign in to find a room or check what’s happening today."><AuthForm mode="sign-in" /></AuthShell>;
}
