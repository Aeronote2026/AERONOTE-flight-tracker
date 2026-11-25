import Link from "next/link";
import { Logo } from "@/components/Logo";

/** Frame shared by the sign-in and registration pages. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-5 pb-12 pt-[max(2rem,env(safe-area-inset-top))]">
      <Link href="/" className="flex items-center gap-3 self-center">
        <Logo size={44} />
        <span className="text-xl font-bold tracking-[0.25em]">AERONOTE</span>
      </Link>

      <section className="rounded-3xl border border-panel-edge bg-panel p-6 sm:p-8">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </section>

      <p className="text-center text-sm text-muted">{footer}</p>
    </main>
  );
}
