import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AviationMap } from "@/components/map/AviationMap";
import { Logo } from "@/components/Logo";
import { SPAIN } from "@/lib/map/regions";
import { SAMPLE_AERODROMES } from "@/lib/map/sampleAerodromes";
import { landingsLabel, mergeAerodromes } from "@/lib/map/toGeoJson";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "My Aviation Map (prueba) · AERONOTE",
  robots: { index: false, follow: false },
};

/**
 * Technical test of My Aviation Map. Only for signed-in pilots (also
 * enforced in src/proxy.ts). Uses DEMONSTRATION data, not Supabase data.
 */
export default function MapLabPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-5 pb-12 pt-[max(2rem,env(safe-area-inset-top))] sm:px-8">
      <header className="flex items-center gap-4">
        <Logo size={44} />
        <div>
          <h1 className="text-xl font-bold tracking-[0.25em]">AERONOTE</h1>
          <p className="text-sm text-muted">My Aviation Map · prueba técnica</p>
        </div>
      </header>

      <Suspense fallback={<p className="text-muted">Cargando…</p>}>
        <SignedInOnly>
          <p className="rounded-xl border border-amber/40 bg-amber/10 px-4 py-3 text-sm leading-6 text-amber">
            <strong>DEMOSTRACIÓN.</strong> Los aterrizajes son ficticios y las coordenadas son
            aproximadas y no verificadas con el AIP España. No apto para navegación.
          </p>

          <AviationMap aerodromes={SAMPLE_AERODROMES} config={SPAIN} />

          <section aria-labelledby="list" className="rounded-2xl border border-panel-edge bg-panel">
            <h2 id="list" className="px-5 pt-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              Aeródromos (demo)
            </h2>
            <ul className="divide-y divide-panel-edge">
              {mergeAerodromes(SAMPLE_AERODROMES).map((a) => (
                <li key={a.icao} className="flex items-center gap-4 px-5 py-3">
                  <span className="font-mono text-sm font-semibold text-amber">{a.icao}</span>
                  <span className="flex-1 text-sm">{a.name}</span>
                  <span className="text-xs text-muted">{landingsLabel(a.landings)}</span>
                </li>
              ))}
            </ul>
          </section>
        </SignedInOnly>
      </Suspense>
    </main>
  );
}

/** Second lock after src/proxy.ts: never render without a verified session. */
async function SignedInOnly({ children }: { children: React.ReactNode }) {
  await cookies(); // request-time only
  if (!isSupabaseConfigured) redirect("/login");
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login");
  return <>{children}</>;
}
