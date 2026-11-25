import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "Create account · AERONOTE" };

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Your logbook is private: only you can see your flights."
      footer={
        <>
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-amber">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
