import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { SpainChart } from "@/components/map/SpainChart";
import { projectAerodromes } from "@/lib/map/project";
import { SAMPLE_AERODROMES } from "@/lib/map/sampleAerodromes";
import spain from "@/lib/map/spain.generated.json";
import { landingsLabel, mergeAerodromes } from "@/lib/map/toGeoJson";
import type { VisitedAerodrome } from "@/lib/map/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "My Aviation Map (SVG, prueba) · AERONOTE",
  robots: { index: false, follow: false },
};

/**
 * DEMONSTRATION ONLY: Spanish aerodromes not yet "visited" in the demo,
 * to show the visited / not-visited distinction. Coordinates are
 * APPROXIMATE and NOT verified against the AIP España: they must never be
 * used as definitive data.
 */
const DEMO_NOT_VISITED: [string, string, number, number][] = [
  ["LEAB", "Albacete", 38.9485, -1.8635], ["LEAL", "Alicante", 38.2822, -0.5582],
  ["LEAM", "Almería", 36.8439, -2.3701], ["LEAS", "Asturias", 43.5636, -6.0346],
  ["LEBB", "Bilbao", 43.3011, -2.9106], ["LEBG", "Burgos", 42.3576, -3.6206],
  ["LECO", "A Coruña", 43.3021, -8.3773], ["LEGE", "Girona", 41.901, 2.7606],
  ["LEGR", "Granada", 37.1887, -3.7774], ["LEHC", "Huesca", 42.0761, -0.3164],
  ["LEJR", "Jerez", 36.7446, -6.0601], ["LELO", "Logroño", 42.461, -2.3223],
  ["LEMI", "Región de Murcia", 37.803, -1.125], ["LEPP", "Pamplona", 42.77, -1.6463],
  ["LERS", "Reus", 41.1474, 1.1672], ["LESO", "San Sebastián", 43.3565, -1.7906],
  ["LEST", "Santiago", 42.8963, -8.4151], ["LEXJ", "Santander", 43.4271, -3.82],
  ["LEVD", "Valladolid", 41.7061, -4.8519], ["LEVT", "Vitoria", 42.8828, -2.7245],
  ["LEVX", "Vigo", 42.2318, -8.6268], ["LEBZ", "Badajoz", 38.8913, -6.8213],
  ["LEBA", "Córdoba", 37.842, -4.8488], ["GCFV", "Fuerteventura", 28.4527, -13.8638],
  ["GCLA", "La Palma", 28.6265, -17.7556], ["GCHI", "El Hierro", 27.8148, -17.8871],
  ["GCGM", "La Gomera", 28.0296, -17.2146],
];

function demoAerodromes(): VisitedAerodrome[] {
  const visited = mergeAerodromes(SAMPLE_AERODROMES);
  const known = new Set(visited.map((a) => a.icao));
  const notVisited = DEMO_NOT_VISITED.filter(([icao]) => !known.has(icao)).map(
    ([icao, name, lat, lon]): VisitedAerodrome => ({
      icao, name, lat, lon, country: "ES", zone: icao.startsWith("GC") ? "canarias" : "peninsula", landings: 0,
    }),
  );
  return [...visited, ...notVisited];
}

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
        <SignedInOnly>
          <ChartContent />
        </SignedInOnly>
      </Suspense>
    </main>
  );
}

function ChartContent() {
  const { onMap, offMap } = projectAerodromes(demoAerodromes());
  const visited = onMap.filter((a) => a.landings > 0).sort((a, b) => b.landings - a.landings);
  const totalLandings = visited.reduce((sum, a) => sum + a.landings, 0);
  const zones = new Set(visited.map((a) => (a.icao.startsWith("GC") ? "canarias" : ["LEPA", "LEMH", "LEIB"].includes(a.icao) ? "baleares" : "peninsula")));
  const L = spain.layers;

  const base = (
    <g>
      <path d={L.graticule} className="sc-grid" />
      <path d={L.neighbours} className="sc-abroad" />
      <path d={L.land} className="sc-land" />
      <path d={L.provinces} className="sc-prov" />
      <path d={L.regions} className="sc-reg" />
      <path d={L.outline} className="sc-coast" />
      <path d={L.insetFrame} className="sc-frame" />
    </g>
  );

  return (
    <>
      <p className="rounded-xl border border-amber/40 bg-amber/10 px-4 py-3 text-sm leading-6 text-amber">
        <strong>DEMOSTRACIÓN.</strong> Los aterrizajes son ficticios y las coordenadas de los aeródromos son
        aproximadas, sin verificar con el AIP España. Este mapa no es una carta aeronáutica y no es apto para
        navegación.
      </p>

      <section aria-label="Resumen" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Aeródromos visitados" value={String(visited.length)} unit={`de ${onMap.length}`} />
        <Stat label="Aterrizajes" value={String(totalLandings)} />
        <Stat label="Más frecuente" value={visited[0]?.icao ?? "—"} />
        <Stat label="Zonas" value={String(zones.size)} unit="de 3" />
      </section>

      <SpainChart
        base={base}
        aerodromes={onMap}
        labels={spain.labels}
        views={spain.views as Record<"peninsula" | "canarias" | "todo", number[]>}
        positionNote="aprox. · demo"
      />
      <p className="-mt-3 px-1 text-xs leading-5 text-muted">
        <a href={spain.meta.attributionUrl} target="_blank" rel="noopener" className="underline decoration-panel-edge underline-offset-2">
          Obra derivada de BDLJE CC-BY 4.0 ign.es
        </a>{" "}
        · Países vecinos: Natural Earth (dominio público) · Gibraltar representado como territorio vecino, sin
        etiqueta · No apto para navegación.
      </p>

      <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
        <section className="rounded-2xl border border-panel-edge bg-panel p-4">
          <h2 className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-muted">Leyenda</h2>
          <ul className="flex flex-col gap-3 text-sm">
            <li className="flex items-center gap-3">
              <svg width="34" height="28" viewBox="-17 -14 34 28" aria-hidden="true"><circle r="11" fill="#f5a524" opacity=".16" /><circle r="7" fill="#070d1a" stroke="#f5a524" strokeWidth="2.6" /><circle r="2.2" fill="#f5a524" /></svg>
              Visitado. El tamaño crece con los aterrizajes.
            </li>
            <li className="flex items-center gap-3">
              <svg width="34" height="28" viewBox="-17 -14 34 28" aria-hidden="true"><circle r="4.5" fill="#0a1325" stroke="#6f7f9b" strokeWidth="1.6" /></svg>
              Aeródromo aún no visitado.
            </li>
          </ul>
        </section>
        <section className="rounded-2xl border border-panel-edge bg-panel p-4">
          <h2 className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-muted">Aterrizajes por aeródromo (demo)</h2>
          <ol className="flex flex-col gap-2">
            {visited.slice(0, 8).map((a) => (
              <li key={a.icao} className="grid grid-cols-[52px_1fr_auto] items-center gap-3">
                <span className="font-mono text-[12.5px] font-semibold text-amber">{a.icao}</span>
                <span className="h-1.5 overflow-hidden rounded bg-panel-edge">
                  <span className="block h-full rounded bg-amber" style={{ width: `${(a.landings / visited[0].landings) * 100}%` }} />
                </span>
                <span className="font-mono text-xs tabular-nums text-muted">{landingsLabel(a.landings)}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {offMap.length > 0 && (
        <p className="text-sm text-muted">Fuera del mapa: {offMap.map((a) => a.icao).join(", ")}</p>
      )}
    </>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-2xl border border-panel-edge bg-panel px-4 py-3.5">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-2.5 font-mono text-[28px] font-semibold leading-none tabular-nums">
        {value}
        {unit && <span className="ml-1.5 text-sm text-muted">{unit}</span>}
      </p>
    </div>
  );
}

/** Same lock as /lab/map: src/proxy.ts plus a server-side session check. */
async function SignedInOnly({ children }: { children: React.ReactNode }) {
  await cookies(); // request-time only
  if (!isSupabaseConfigured) redirect("/login");
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login");
  return <>{children}</>;
}
