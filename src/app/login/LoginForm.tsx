"use client";

import { useActionState } from "react";
import { signIn, type AuthFormState } from "@/app/auth/actions";
import { FormField } from "@/components/FormField";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";

const initial: AuthFormState = { status: "idle" };

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, initial);
  return (
    <form action={action} className="flex flex-col gap-5">
      <FormField label="Email" name="email" type="email" autoComplete="email" defaultValue={state.email} maxLength={254} />
      <FormField label="Password" name="password" type="password" autoComplete="current-password" maxLength={72} />
      <FormMessage message={state.status === "error" ? state.message : undefined} />
      <SubmitButton pending={pending}>Sign in</SubmitButton>
    </form>
  );
}
