import type { SuiteIcon } from "@/lib/suite/sections";

/** Line icons for the main menu (24×24 grid, 1.75 stroke, currentColor). */
export function SuiteIconSvg({ icon, className = "h-5 w-5" }: { icon: SuiteIcon; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (icon) {
    case "logbook": // bound logbook with ruled lines
      return (
        <svg {...common}>
          <path d="M6 3.5h11.5a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z" />
          <path d="M8 3.5v17" />
          <path d="M11 8h4.5M11 11.5h4.5M11 15h3" />
        </svg>
      );
    case "map": // aerodrome symbol (ring + dot) on a folded chart
      return (
        <svg {...common}>
          <path d="M3.5 6.5 9 4l6 2.5 5.5-2.5v13.5L15 20l-6-2.5-5.5 2.5Z" />
          <path d="M9 4v13.5M15 6.5V20" />
          <circle cx="12" cy="11.5" r="2.2" />
        </svg>
      );
    case "aircraft": // light aircraft seen from above
      return (
        <svg {...common}>
          <path d="M12 3.5v15" />
          <path d="M4 10.5h16" />
          <path d="M9 18.5h6" />
          <path d="M12 3.5c.8 0 1.2.8 1.2 1.8v3" />
        </svg>
      );
    case "progress": // climbing gauge
      return (
        <svg {...common}>
          <path d="M4.5 16.5a8 8 0 1 1 15 0" />
          <path d="m12 13 4-4.5" />
          <circle cx="12" cy="13.5" r="1.2" />
        </svg>
      );
  }
}
