"use server";

import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type AuthFormState = {
  status: "idle" | "error" | "check_email";
  message?: string;
  email?: string;
  /** Kept after an error so the pilot does not have to retype it. */
  fullName?: string;
};

const NOT_CONFIGURED: AuthFormState = {
  status: "error",
  message: "Sign-in is not available yet: AERONOTE is not connected to its database.",
};

const CONNECTION_PROBLEM =
  "AERONOTE could not reach its database. Check your internet connection and try again.";

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72;

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function looksLikeEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

/** The address of this site (production or preview), for email links. */
async function siteOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export async function signIn(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;

  const email = text(formData, "email").trim().toLowerCase();
  const password = text(formData, "password");
  if (!looksLikeEmail(email) || password.length === 0) {
    return { status: "error", message: "Enter your email and password.", email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (isAuthRetryableFetchError(error)) {
      return { status: "error", email, message: CONNECTION_PROBLEM };
    }
    const unconfirmed = error.code === "email_not_confirmed";
    return {
      status: "error",
      email,
      message: unconfirmed
        ? "Please confirm your email first: open the link we sent you, then sign in."
        : "Email or password is incorrect.",
    };
  }
  redirect("/logbook");
}

export async function signUp(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;

  const fullName = text(formData, "full_name").trim();
  const email = text(formData, "email").trim().toLowerCase();
  const password = text(formData, "password");
  const confirm = text(formData, "password_confirm");

  if (fullName.length === 0 || fullName.length > 100) {
    return { status: "error", email, fullName, message: "Enter your full name (up to 100 characters)." };
  }
  if (!looksLikeEmail(email)) {
    return { status: "error", email, fullName, message: "Enter a valid email address." };
  }
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    return {
      status: "error",
      email,
      fullName,
      message: `Your password must be ${PASSWORD_MIN} to ${PASSWORD_MAX} characters long.`,
    };
  }
  if (password !== confirm) {
    return { status: "error", email, fullName, message: "The two passwords do not match." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${await siteOrigin()}/auth/confirm`,
    },
  });

  if (error) {
    if (isAuthRetryableFetchError(error)) {
      return { status: "error", email, fullName, message: CONNECTION_PROBLEM };
    }
    if (error.code === "signup_disabled") {
      return { status: "error", email, fullName, message: "New registrations are currently closed." };
    }
    if (error.code === "weak_password") {
      return { status: "error", email, fullName, message: "Please choose a stronger password." };
    }
    return { status: "error", email, fullName, message: "Registration failed. Please try again later." };
  }

  // Same answer whether or not the address already has an account, so
  // nobody can use this form to find out who is registered.
  return { status: "check_email", email };
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
