// A single "instrument" on the dashboard: a label, a big number and a unit.
type InstrumentCardProps = {
  label: string;
  value: string;
  unit?: string;
};

export function InstrumentCard({ label, value, unit }: InstrumentCardProps) {
  return (
    <div className="rounded-2xl border border-panel-edge bg-panel p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        {label}
      </p>
      <p className="mt-3 font-mono text-4xl font-semibold tabular-nums text-ink">
        {value}
        {unit && <span className="ml-1.5 text-lg text-muted">{unit}</span>}
      </p>
    </div>
  );
}
