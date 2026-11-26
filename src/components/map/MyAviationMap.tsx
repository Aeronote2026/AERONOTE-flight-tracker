import { SpainChart } from "@/components/map/SpainChart";
import { projectAerodromes } from "@/lib/map/project";
import spain from "@/lib/map/spain.generated.json";
import { landingsLabel } from "@/lib/map/toGeoJson";
import type { VisitedAerodrome } from "@/lib/map/types";

/**
 * My Aviation Map section, shared by /aviation-map (Main Suite) and
 * /lab/chart (test page). Server component: projects the aerodromes and
 * renders the static cartography; SpainChart adds the interaction.
 * Not a navigation chart.
 */
export type MyAviationMapProps = {
  aerodromes: VisitedAerodrome[];
  /** Demonstration data: shows the demo notices. Must stay true until real flights are connected. */
  demo: boolean;
  /**
   * "lab" (/lab/chart) or "suite" (/aviation-map). Experimental features
   * are enabled for "lab" first, and for "suite" only once approved.
   */
  variant?: "suite" | "lab";
};

export function MyAviationMap({ aerodromes, demo, variant = "suite" }: MyAviationMapProps) {
  const { onMap, offMap } = projectAerodromes(aerodromes);
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
    <div className="flex flex-col gap-6" data-variant={variant}>
      {demo && (
      <p className="rounded-xl border border-amber/40 bg-amber/10 px-4 py-3 text-sm leading-6 text-amber">
        <strong>DEMOSTRACIÓN.</strong> Los aterrizajes son ficticios y las coordenadas de los aeródromos son
        aproximadas, sin verificar con el AIP España. Este mapa no es una carta aeronáutica y no es apto para
        navegación.
      </p>
      )}

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
        positionNote={demo ? "aprox. · demo" : "aprox."}
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
          <h2 className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-muted">Aterrizajes por aeródromo{demo ? " (demo)" : ""}</h2>
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
    </div>
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
