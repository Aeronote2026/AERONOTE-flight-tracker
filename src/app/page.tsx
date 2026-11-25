import { InstrumentCard } from "@/components/InstrumentCard";
import { Logo } from "@/components/Logo";

// Placeholder readings until the logbook (Step 2) is connected.
const instruments = [
  { label: "Total time", value: "0.0", unit: "h" },
  { label: "Dual", value: "0.0", unit: "h" },
  { label: "Solo", value: "0.0", unit: "h" },
  { label: "Landings", value: "0" },
];

const roadmap = [
  { step: "01", title: "Foundation", status: "Active" },
  { step: "02", title: "Digital logbook", status: "Next" },
  { step: "03", title: "Dashboard", status: "Planned" },
  { step: "04", title: "EASA licence progress", status: "Planned" },
  { step: "05", title: "Accounts & polish", status: "Planned" },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-5 pb-12 pt-[max(2rem,env(safe-area-inset-top))] sm:px-8">
      <header className="flex items-center gap-4">
        <Logo size={48} />
        <div>
          <h1 className="text-2xl font-bold tracking-[0.25em] text-ink">
            AERONOTE
          </h1>
          <p className="text-sm text-muted">Student Pilot Flight Tracker</p>
        </div>
        <span className="ml-auto hidden rounded-full border border-panel-edge px-3 py-1 font-mono text-xs text-muted sm:inline">
          EASA · Part-FCL
        </span>
      </header>

      <section className="rounded-3xl border border-panel-edge bg-gradient-to-br from-panel to-cockpit p-7 sm:p-10">
        <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-go">
          <span className="h-2 w-2 rounded-full bg-go" />
          Systems check complete
        </p>
        <h2 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">
          Your training logbook, built for the{" "}
          <span className="text-amber">EASA</span> student pilot.
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
          Log every flight, watch your hours build up and see how close you
          are to your licence. Flight logging arrives in the next step.
        </p>
      </section>

      <section aria-labelledby="instruments">
        <h3
          id="instruments"
          className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted"
        >
          Instrument panel
        </h3>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {instruments.map((i) => (
            <InstrumentCard key={i.label} {...i} />
          ))}
        </div>
      </section>

      <section aria-labelledby="roadmap">
        <h3
          id="roadmap"
          className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted"
        >
          Flight plan
        </h3>
        <ol className="divide-y divide-panel-edge overflow-hidden rounded-2xl border border-panel-edge bg-panel">
          {roadmap.map((r) => (
            <li key={r.step} className="flex items-center gap-4 px-5 py-4">
              <span className="font-mono text-sm text-muted">{r.step}</span>
              <span className="flex-1 font-medium">{r.title}</span>
              <span
                className={
                  r.status === "Active"
                    ? "rounded-full bg-amber/15 px-3 py-1 text-xs font-semibold text-amber"
                    : "text-xs text-muted"
                }
              >
                {r.status}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <footer className="mt-auto text-xs text-muted">
        AERONOTE is a personal training aid. Your official logbook remains the
        legal record of your flight time.
      </footer>
    </main>
  );
}
