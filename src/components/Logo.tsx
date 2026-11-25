// The AERONOTE mark: an amber heading arrow inside an instrument ring.
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect width="64" height="64" rx="14" className="fill-panel" />
      <circle
        cx="32"
        cy="32"
        r="22"
        fill="none"
        className="stroke-panel-edge"
        strokeWidth="3"
      />
      <path d="M32 12 L46 50 L32 42 L18 50 Z" className="fill-amber" />
    </svg>
  );
}
