import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { signOut } from "@/app/auth/actions";
import { InstrumentCard } from "@/components/InstrumentCard";
import { Logo } from "@/components/Logo";
import { formatDuration } from "@/lib/duration";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const metadata: Metadata = { title: "Logbook · AERONOTE" };

type Totals = {
  total_minutes: number;
  dual_minutes: number;
  solo_minutes: number;
  night_minutes: number;
  landings_day: number;
  landings_night: number;
};

const EMPTY_TOTALS: Totals = {
  total_minutes: 0,
  dual_minutes: 0,
  solo_minutes: 0,
  night_minutes: 0,
  landings_day: 0,
  landings_night: 0,
};

export default function LogbookPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-5 pb-12 pt-[max(2rem,env(safe-area-inset-top))] sm:px-8">
      <header className="flex items-center gap-4">
        <Logo size={44} />
        <div>
          <h1 className="text-xl font-bold tracking-[0.25em]">AERONOTE</h1>
          <p className="text-sm text-muted">Logbook</p>
        </div>
        <form action={signOut} className="ml-auto">
          <button
            type="submit"
            className="h-11 rounded-xl border border-panel-edge px-4 text-sm font-semibold text-muted hover:text-ink"
          >
            Sign out
          </button>
        </form>
      </header>

      <Suspense fallback={<p className="text-muted">Loading your logbook…</p>}>
        <LogbookContent />
      </Suspense>
    </main>
  );
}

async function LogbookContent() {
  await cookies(); // request-time only
  if (!isSupabaseConfigured) {
    return (
      <Notice title="Not connected yet">
        AERONOTE is not connected to its database on this address. Check the two Supabase
        environment variables in Vercel.
      </Notice>
    );
  }
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) redirect("/login");

  // Row Level Security returns only the signed-in pilot's own rows.
  const [{ data: pilot, error: pilotError }, { data: totals }] = await Promise.all([
    supabase.from("pilots").select("full_name").maybeSingle(),
    supabase
      .from("logbook_totals")
      .select("total_minutes, dual_minutes, solo_minutes, night_minutes, landings_day, landings_night")
      .maybeSingle<Totals>(),
  ]);

  if (pilotError) {
    return (
      <Notice title="Database not ready yet">
        You are signed in, but the AERONOTE logbook tables have not been created in
        Supabase yet. Run the migration file (supabase/migrations) in the Supabase SQL
        Editor, then reload this page.
      </Notice>
    );
  }

  const t = totals ?? EMPTY_TOTALS;
  const name = pilot?.full_name?.trim();

  return (
    <>
      <section className="rounded-3xl border border-panel-edge bg-gradient-to-br from-panel to-cockpit p-7">
        <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-go">
          <span className="h-2 w-2 rounded-full bg-go" /> Signed in
        </p>
        <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">
          {name ? `Welcome, ${name}.` : "Welcome aboard."}
        </h2>
        <p className="mt-2 text-muted">
          Your logbook is ready. Adding flights arrives in the next step.
        </p>
      </section>

      <section aria-labelledby="totals">
        <h3 id="totals" className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
          Instrument panel
        </h3>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <InstrumentCard label="Total time" value={formatDuration(t.total_minutes)} />
          <InstrumentCard label="Dual" value={formatDuration(t.dual_minutes)} />
          <InstrumentCard label="Solo" value={formatDuration(t.solo_minutes)} />
          <InstrumentCard label="Night" value={formatDuration(t.night_minutes)} />
          <InstrumentCard label="Landings" value={String(t.landings_day + t.landings_night)} />
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-panel-edge p-8 text-center text-muted">
        No flights logged yet.
      </section>
    </>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-amber/40 bg-amber/10 p-6 text-amber">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6">{children}</p>
    </section>
  );
}
