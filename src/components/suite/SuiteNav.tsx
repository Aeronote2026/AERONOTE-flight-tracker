"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { Logo } from "@/components/Logo";
import { isActiveSection, visibleSections } from "@/lib/suite/sections";
import { SuiteIconSvg } from "./SuiteIcons";

/**
 * Main Suite navigation.
 *  - md and up (iPad, desktop): horizontal menu in the header.
 *  - Phones: header with logo + sign out, and a fixed bottom tab bar that
 *    respects the iOS safe areas. Pages using this add `suite-page` to
 *    their <main> so content is never hidden behind the tab bar.
 */
export function SuiteNav({ subtitle }: { subtitle?: string }) {
  const pathname = usePathname() ?? "/";
  const sections = visibleSections();

  return (
    <>
      <header className="flex items-center gap-4">
        <Link href="/logbook" className="flex items-center gap-3" aria-label="AERONOTE, ir a My Logbook">
          <Logo size={40} />
          <span className="flex flex-col">
            <span className="text-lg font-bold leading-tight tracking-[0.25em]">AERONOTE</span>
            {subtitle && <span className="text-xs text-muted md:hidden">{subtitle}</span>}
          </span>
        </Link>

        <nav aria-label="Menú principal" className="ml-6 hidden md:block">
          <ul className="flex items-center gap-1">
            {sections.map((s) => {
              const active = isActiveSection(pathname, s.href);
              return (
                <li key={s.href}>
                  <Link
                    href={s.href}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex h-11 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition ${
                      active ? "bg-amber/12 text-amber" : "text-muted hover:bg-panel hover:text-ink"
                    }`}
                  >
                    <SuiteIconSvg icon={s.icon} />
                    {s.label}
                    {active && <span aria-hidden="true" className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-amber" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <form action={signOut} className="ml-auto">
          <button
            type="submit"
            className="h-11 rounded-xl border border-panel-edge px-4 text-sm font-semibold text-muted hover:text-ink"
          >
            Sign out
          </button>
        </form>
      </header>

      {/* Phone tab bar */}
      <nav
        aria-label="Menú principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-panel-edge bg-cockpit/95 backdrop-blur md:hidden"
        style={{
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          paddingLeft: "env(safe-area-inset-left, 0px)",
          paddingRight: "env(safe-area-inset-right, 0px)",
        }}
      >
        <ul className="mx-auto grid max-w-md" style={{ gridTemplateColumns: `repeat(${sections.length}, minmax(0, 1fr))` }}>
          {sections.map((s) => {
            const active = isActiveSection(pathname, s.href);
            return (
              <li key={s.href}>
                <Link
                  href={s.href}
                  aria-current={active ? "page" : undefined}
                  aria-label={s.label}
                  className={`relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold tracking-wide ${
                    active ? "text-amber" : "text-muted"
                  }`}
                >
                  {active && <span aria-hidden="true" className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-amber" />}
                  <SuiteIconSvg icon={s.icon} className="h-6 w-6" />
                  {s.shortLabel}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
