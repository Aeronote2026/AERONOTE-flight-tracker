import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in · AERONOTE" };

export default function LoginPage() {
  return (
    <AuthShell
      title="Sign in"
      subtitle="Welcome back, pilot."
      footer={
        <>
          New to AERONOTE?{" "}
          <Link href="/register" className="font-semibold text-amber">
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
