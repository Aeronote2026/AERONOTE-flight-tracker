"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp, type AuthFormState } from "@/app/auth/actions";
import { FormField } from "@/components/FormField";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";

const initial: AuthFormState = { status: "idle" };

export function RegisterForm() {
  const [state, action, pending] = useActionState(signUp, initial);

  if (state.status === "check_email") {
    return (
      <div className="flex flex-col gap-4">
        <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-go">
          <span className="h-2 w-2 rounded-full bg-go" /> Check your email
        </p>
        <p className="text-base leading-7">
          If <strong>{state.email}</strong> can be registered, we have sent a confirmation
          link to it. Open the email, tap the link, then come back and sign in.
        </p>
        <Link
          href="/login"
          className="flex h-14 items-center justify-center rounded-xl border border-panel-edge text-base font-semibold"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <FormField label="Full name" name="full_name" autoComplete="name" defaultValue={state.fullName} maxLength={100} />
      <FormField label="Email" name="email" type="email" autoComplete="email" defaultValue={state.email} maxLength={254} />
      <FormField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        maxLength={72}
        hint="At least 8 characters."
      />
      <FormField
        label="Repeat password"
        name="password_confirm"
        type="password"
        autoComplete="new-password"
        minLength={8}
        maxLength={72}
      />
      <FormMessage message={state.status === "error" ? state.message : undefined} />
      <SubmitButton pending={pending}>Create account</SubmitButton>
    </form>
  );
}
