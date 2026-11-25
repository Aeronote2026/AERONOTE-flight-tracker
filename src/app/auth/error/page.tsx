import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";

export const metadata: Metadata = { title: "Link problem · AERONOTE" };

export default function AuthErrorPage() {
  return (
    <AuthShell
      title="This link did not work"
      subtitle="It may have expired or already been used."
      footer={<Link href="/" className="font-semibold text-amber">Back to home</Link>}
    >
      <div className="flex flex-col gap-4">
        <p className="text-base leading-7">
          If you already confirmed your email, simply sign in. Otherwise, register again to
          receive a new link.
        </p>
        <Link href="/login" className="flex h-14 items-center justify-center rounded-xl bg-amber text-base font-semibold text-cockpit">
          Sign in
        </Link>
      </div>
    </AuthShell>
  );
}
