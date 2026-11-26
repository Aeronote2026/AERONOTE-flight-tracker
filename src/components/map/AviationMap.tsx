"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import "./aviationMap.css";

import { useEffect, useRef, useState } from "react";
import type { CountryMapConfig } from "@/lib/map/regions";
import { graticule, landingsLabel, markerSize, mergeAerodromes } from "@/lib/map/toGeoJson";
import type { VisitedAerodrome } from "@/lib/map/types";

type MapLibre = typeof import("./loadMapLibre");
type MapInstance = InstanceType<MapLibre["Map"]>;

/** Candidate MapTiler styles for the hybrid AERONOTE look (to compare on iPad). */
export const MAP_STYLES = [
  { id: "landscape-v4-dark", label: "Landscape" },
  { id: "backdrop-v4-dark", label: "Backdrop" },
  { id: "topo-v4-dark", label: "Topo" },
  { id: "outdoor-v4-dark", label: "Outdoor" },
] as const;

/** Required on screen by MapTiler's terms (same text as MapTiler's styles). */
const ATTRIBUTION = [
  '<a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener">&copy; MapTiler</a>',
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">&copy; OpenStreetMap contributors</a>',
];

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "";

/** Plain dark background used when no MapTiler key is configured. */
const OFFLINE_STYLE = {
  version: 8 as const,
  sources: {},
  layers: [{ id: "background", type: "background" as const, paint: { "background-color": "#0b1426" } }],
};

/** Below this zoom, ICAO labels are hidden so nearby aerodromes stay readable. */
const LABEL_MIN_ZOOM = 6.5;

type Status = "loading" | "ready" | "no-key" | "key-rejected" | "unsupported";

export function AviationMap({
  aerodromes,
  config,
}: {
  aerodromes: VisitedAerodrome[];
  config: CountryMapConfig;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const [status, setStatus] = useState<Status>(MAPTILER_KEY ? "loading" : "no-key");
  const [view, setView] = useState(config.views[0].id);
  const [styleId, setStyleId] = useState<string>(MAP_STYLES[0].id);

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    let map: MapInstance | null = null;

    (async () => {
      const ml = await import("./loadMapLibre");
      if (cancelled || !containerRef.current) return;

      const styleUrl = (id: string) =>
        `https://api.maptiler.com/maps/${id}/style.json?key=${encodeURIComponent(MAPTILER_KEY)}`;

      try {
        map = new ml.Map({
          container: containerRef.current,
          style: MAPTILER_KEY ? styleUrl(MAP_STYLES[0].id) : OFFLINE_STYLE,
          bounds: config.views[0].bounds,
          fitBoundsOptions: { padding: 40 },
          maxBounds: config.maxBounds,
          minZoom: config.minZoom,
          maxZoom: config.maxZoom,
          renderWorldCopies: false,
          // iPad: pinch to zoom, one finger to pan; never rotate or tilt.
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          maxPitch: 0,
          attributionControl: { compact: false, customAttribution: MAPTILER_KEY ? ATTRIBUTION : undefined },
        });
      } catch {
        setStatus("unsupported"); // e.g. WebGL not available
        return;
      }
      mapRef.current = map;
      map.touchZoomRotate.disableRotation();
      map.keyboard.disableRotation();
      map.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
      map.addControl(new ml.ScaleControl({ unit: "nautical", maxWidth: 120 }), "bottom-left");

      if (MAPTILER_KEY) {
        // MapTiler logo, required on the Free plan.
        map.addControl(
          {
            onAdd() {
              const el = document.createElement("div");
              el.className = "maplibregl-ctrl aeronote-logo";
              const link = document.createElement("a");
              link.href = "https://www.maptiler.com";
              link.target = "_blank";
              link.rel = "noopener";
              const img = document.createElement("img");
              img.src = "https://api.maptiler.com/resources/logo.svg";
              img.alt = "MapTiler logo";
              link.appendChild(img);
              el.appendChild(link);
              return el;
            },
            onRemove() {},
          },
          "bottom-left",
        );
      }

      // Chart-like 1° grid, re-added whenever the base style changes.
      const grid = graticule(config.maxBounds, 1);
      map.on("style.load", () => {
        if (!map || map.getSource("aeronote-graticule")) return;
        map.addSource("aeronote-graticule", { type: "geojson", data: grid });
        map.addLayer({
          id: "aeronote-graticule",
          type: "line",
          source: "aeronote-graticule",
          paint: { "line-color": "#8a97ad", "line-opacity": 0.18, "line-width": 0.8, "line-dasharray": [2, 3] },
        });
      });

      map.on("load", () => !cancelled && setStatus(MAPTILER_KEY ? "ready" : "no-key"));

      // Chart-like decluttering: labels only when zoomed in enough.
      const container = containerRef.current;
      const updateLabels = () => {
        if (map) container.dataset.labels = map.getZoom() >= LABEL_MIN_ZOOM ? "on" : "off";
      };
      map.on("zoom", updateLabels);
      updateLabels();
      map.on("error", (event) => {
        const httpStatus = (event.error as { status?: number } | undefined)?.status;
        if (httpStatus === 401 || httpStatus === 403) setStatus("key-rejected");
      });

      // One marker per aerodrome; tapping it opens the info card.
      for (const a of mergeAerodromes(aerodromes)) {
        const el = document.createElement("button");
        el.type = "button";
        el.className = `aero-marker aero-marker--${markerSize(a.landings)}`;
        // Most-used aerodromes stay on top where markers overlap.
        el.style.zIndex = String(1 + a.landings);
        el.setAttribute("aria-label", `${a.icao}, ${a.name}, ${landingsLabel(a.landings)}`);
        const ring = document.createElement("span");
        ring.className = "aero-marker__ring";
        const label = document.createElement("span");
        label.className = "aero-marker__label";
        label.textContent = a.icao;
        el.append(ring, label);

        const card = document.createElement("div");
        const code = document.createElement("p");
        code.style.cssText = "font:700 18px/1.2 ui-monospace,Menlo,monospace;letter-spacing:.08em;color:#f5a524;margin:0";
        code.textContent = a.icao;
        const name = document.createElement("p");
        name.style.cssText = "font:500 14px/1.3 -apple-system,system-ui,sans-serif;margin:4px 0 0";
        name.textContent = a.name;
        const count = document.createElement("p");
        count.style.cssText = "font:400 13px/1.3 -apple-system,system-ui,sans-serif;color:#8a97ad;margin:6px 0 0";
        count.textContent = `${landingsLabel(a.landings)} · demo`;
        card.append(code, name, count);

        const popup = new ml.Popup({ offset: 18, maxWidth: "260px", className: "aeronote-popup", focusAfterOpen: false })
          .setDOMContent(card);
        new ml.Marker({ element: el, anchor: "left", offset: [-10, 0] })
          .setLngLat([a.lon, a.lat])
          .setPopup(popup)
          .addTo(map);
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
  }, [aerodromes, config]);

  const showView = (id: string) => {
    setView(id);
    const target = config.views.find((v) => v.id === id);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (target) mapRef.current?.fitBounds(target.bounds, { padding: 40, duration: reduceMotion ? 0 : 1200 });
  };

  const changeStyle = (id: string) => {
    setStyleId(id);
    if (!MAPTILER_KEY) return;
    mapRef.current?.setStyle(
      `https://api.maptiler.com/maps/${id}/style.json?key=${encodeURIComponent(MAPTILER_KEY)}`,
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Zona del mapa">
        {config.views.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => showView(v.id)}
            aria-pressed={view === v.id}
            className={`h-11 rounded-xl px-4 text-sm font-semibold transition ${
              view === v.id ? "bg-amber text-cockpit" : "border border-panel-edge text-ink"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="relative h-[62vh] min-h-[420px] overflow-hidden rounded-2xl border border-panel-edge bg-cockpit">
        {/* MapLibre sets position:relative on this element, so size it explicitly. */}
        <div ref={containerRef} className="h-full w-full" />
        {status !== "ready" && status !== "loading" && (
          <p className="absolute left-3 right-16 top-3 z-10 rounded-xl border border-amber/40 bg-cockpit/90 px-4 py-3 text-sm text-amber">
            {status === "no-key" && "Mapa base no cargado: falta la clave NEXT_PUBLIC_MAPTILER_KEY. Los marcadores funcionan igualmente."}
            {status === "key-rejected" && "MapTiler ha rechazado la clave (revisa los orígenes permitidos)."}
            {status === "unsupported" && "Este navegador no puede mostrar el mapa (WebGL no disponible)."}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Estilo del mapa base">
        <span className="mr-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">Estilo</span>
        {MAP_STYLES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => changeStyle(s.id)}
            aria-pressed={styleId === s.id}
            disabled={!MAPTILER_KEY}
            className={`h-10 rounded-lg px-3 text-sm transition disabled:opacity-40 ${
              styleId === s.id ? "border border-amber text-amber" : "border border-panel-edge text-muted"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
