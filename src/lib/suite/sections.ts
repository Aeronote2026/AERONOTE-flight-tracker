/**
 * AERONOTE Main Suite: the private sections shown in the main menu.
 *
 * To add a section later (e.g. My Aircraft, My Progress), set `enabled`
 * to true, create its page and add its route to PROTECTED_PREFIXES in
 * src/proxy.ts. The menu layout adapts automatically.
 */
export type SuiteIcon = "logbook" | "map" | "aircraft" | "progress";

export type SuiteSection = {
  href: string;
  /** Full name, used on iPad and larger screens. */
  label: string;
  /** Short name for the phone tab bar. */
  shortLabel: string;
  icon: SuiteIcon;
  enabled: boolean;
};

export const SUITE_SECTIONS: SuiteSection[] = [
  { href: "/logbook", label: "My Logbook", shortLabel: "Logbook", icon: "logbook", enabled: true },
  { href: "/aviation-map", label: "My Aviation Map", shortLabel: "Mapa", icon: "map", enabled: true },
  // Prepared for later; hidden until their pages exist.
  { href: "/aircraft", label: "My Aircraft", shortLabel: "Aircraft", icon: "aircraft", enabled: false },
  { href: "/progress", label: "My Progress", shortLabel: "Progress", icon: "progress", enabled: false },
];

export const visibleSections = () => SUITE_SECTIONS.filter((s) => s.enabled);

/** True when `pathname` is the section itself or one of its sub-pages. */
export function isActiveSection(pathname: string, href: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  return path === href || path.startsWith(`${href}/`);
}
