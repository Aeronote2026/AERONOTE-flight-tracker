import type { Metadata } from "next";
import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { MyAviationMap } from "@/components/map/MyAviationMap";
import { RequireSignedIn } from "@/lib/auth/requireSignedIn";
import { demoAerodromes } from "@/lib/map/demoData";

export const metadata: Metadata = {
  title: "My Aviation Map (SVG, prueba) · AERONOTE",
  robots: { index: false, follow: false },
};

/**
 * Test page for My Aviation Map (lab variant). Shares MyAviationMap with
 * /aviation-map. Signed-in pilots only: src/proxy.ts + RequireSignedIn.
 */
export default function ChartLabPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-5 pb-12 pt-[max(2rem,env(safe-area-inset-top))] sm:px-8">
      <header className="flex flex-wrap items-center gap-4">
        <Logo size={44} />
        <div>
          <h1 className="text-xl font-bold tracking-[0.25em]">AERONOTE</h1>
          <p className="text-sm text-muted">My Aviation Map · prueba SVG</p>
        </div>
        <span className="ml-auto rounded-full border border-amber/45 bg-amber/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-amber">
          Demo · no apto para navegación
        </span>
      </header>

      <Suspense fallback={<p className="text-muted">Cargando…</p>}>
        <RequireSignedIn>
          <MyAviationMap aerodromes={demoAerodromes()} demo variant="lab" />
        </RequireSignedIn>
      </Suspense>
    </main>
  );
}
