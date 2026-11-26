import type { Metadata } from "next";
import { Suspense } from "react";
import { MyAviationMap } from "@/components/map/MyAviationMap";
import { SuiteNav } from "@/components/suite/SuiteNav";
import { RequireSignedIn } from "@/lib/auth/requireSignedIn";
import { demoAerodromes } from "@/lib/map/demoData";

export const metadata: Metadata = { title: "My Aviation Map · AERONOTE" };

/**
 * My Aviation Map (Main Suite). Signed-in pilots only: src/proxy.ts +
 * RequireSignedIn. Still DEMONSTRATION data: real flights are not
 * connected yet.
 */
export default function AviationMapPage() {
  return (
    <main className="suite-page mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-5 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-8">
      <SuiteNav subtitle="My Aviation Map" />

      <div>
        <h2 className="text-2xl font-semibold sm:text-3xl">My Aviation Map</h2>
        <p className="mt-1 text-sm text-muted">Los aeródromos de tu logbook. Toca uno para ver tus aterrizajes.</p>
      </div>

      <Suspense fallback={<p className="text-muted">Cargando…</p>}>
        <RequireSignedIn>
          <MyAviationMap aerodromes={demoAerodromes()} demo variant="suite" />
        </RequireSignedIn>
      </Suspense>
    </main>
  );
}
