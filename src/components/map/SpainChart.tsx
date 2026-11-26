"use client";

import "./spainChart.css";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ChartAerodrome } from "@/lib/map/project";
import { landingsLabel } from "@/lib/map/toGeoJson";

type Box = [number, number, number, number];
type ViewId = "peninsula" | "canarias" | "todo";

const VIEW_BUTTONS: { id: ViewId; label: string }[] = [
  { id: "peninsula", label: "Península y Baleares" },
  { id: "canarias", label: "Canarias" },
  { id: "todo", label: "Todo" },
];

/** Marker radius in screen pixels, by landings. */
const radius = (landings: number) => (landings === 0 ? 4.5 : landings >= 20 ? 9 : landings >= 5 ? 7.5 : 6);

/** Aeronautical coordinate notation, e.g. 40°22′14″N 003°47′06″W. */
function dms(value: number, pos: string, neg: string, width: number) {
  const hemisphere = value >= 0 ? pos : neg;
  const v = Math.abs(value);
  const d = Math.floor(v);
  const mFloat = (v - d) * 60;
  const m = Math.floor(mFloat);
  const s = Math.min(59, Math.round((mFloat - m) * 60));
  return `${String(d).padStart(width, "0")}°${String(m).padStart(2, "0")}′${String(s).padStart(2, "0")}″${hemisphere}`;
}

export type SpainChartProps = {
  /** Static, server-rendered base layers (coastline, regions...). */
  base: ReactNode;
  aerodromes: ChartAerodrome[];
  labels: { text: string; x: number; y: number }[];
  views: Record<ViewId, number[]>;
  /** Shown on every card: where the positions come from. */
  positionNote: string;
};

export function SpainChart({ base, aerodromes, labels, views, positionNote }: SpainChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [vb, setVb] = useState<Box>(views.peninsula as Box);
  const [view, setView] = useState<ViewId>("peninsula");
  const [selected, setSelected] = useState<string | null>(null);
  const [showUnvisited, setShowUnvisited] = useState(true);
  const animation = useRef<number | null>(null);
  const vbRef = useRef<Box>(vb);
  useEffect(() => {
    vbRef.current = vb;
  }, [vb]);

  const viewRef = useRef<ViewId>("peninsula");

  /** Expands a box to an aspect ratio so nothing is distorted or cut. */
  const fitTo = (ar: number, [x, y, w, h]: number[]): Box => {
    if (w / h > ar) {
      const nh = w / ar;
      return [x, y - (nh - h) / 2, w, nh];
    }
    const nw = h * ar;
    return [x - (nw - w) / 2, y, nw, h];
  };
  const fit = (box: number[]) => fitTo(size.w / size.h, box);

  // Track the drawing's on-screen size (symbols keep a constant pixel size)
  // and re-fit the current zone when the screen size changes.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      setSize({ w: r.width, h: r.height });
      setVb(fitTo(r.width / r.height, views[viewRef.current]));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [views]);

  const animateTo = useCallback((target: Box) => {
    if (animation.current) cancelAnimationFrame(animation.current);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setVb(target);
    const from = vbRef.current;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / 650);
      const e = 1 - Math.pow(1 - p, 3);
      setVb(from.map((f, i) => f + (target[i] - f) * e) as Box);
      if (p < 1) animation.current = requestAnimationFrame(step);
    };
    animation.current = requestAnimationFrame(step);
  }, []);

  const showView = (id: ViewId) => {
    setView(id);
    viewRef.current = id;
    setSelected(null);
    animateTo(fit(views[id]));
  };

  const zoomBox = useCallback((box: Box, factor: number, cx?: number, cy?: number): Box => {
    const [x, y, w, h] = box;
    const nw = Math.min(1100, Math.max(70, w * factor));
    const s = nw / w;
    const px = cx ?? x + w / 2;
    const py = cy ?? y + h / 2;
    return [px - (px - x) * s, py - (py - y) * s, w * s, h * s];
  }, []);

  // Pointer pan (one finger), pinch zoom (two fingers), wheel zoom.
  useEffect(() => {
    const stage = stageRef.current;
    const svg = svgRef.current;
    if (!stage || !svg) return;
    const pointers = new Map<number, [number, number]>();
    let lastDistance: number | null = null;
    const toMap = (cx: number, cy: number, box: Box): [number, number] => {
      const r = svg.getBoundingClientRect();
      return [box[0] + ((cx - r.left) / r.width) * box[2], box[1] + ((cy - r.top) / r.height) * box[3]];
    };
    const down = (e: PointerEvent) => {
      if ((e.target as Element).closest(".sc-card")) return;
      pointers.set(e.pointerId, [e.clientX, e.clientY]);
      lastDistance = null;
    };
    const move = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      const prev = pointers.get(e.pointerId)!;
      pointers.set(e.pointerId, [e.clientX, e.clientY]);
      const r = svg.getBoundingClientRect();
      if (pointers.size === 1) {
        if (Math.abs(e.clientX - prev[0]) + Math.abs(e.clientY - prev[1]) < 1) return;
        setVb((b) => [b[0] - ((e.clientX - prev[0]) / r.width) * b[2], b[1] - ((e.clientY - prev[1]) / r.height) * b[3], b[2], b[3]]);
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (lastDistance) {
          const ratio = lastDistance / d;
          setVb((box) => {
            const [mx, my] = toMap((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, box);
            return zoomBox(box, ratio, mx, my);
          });
        }
        lastDistance = d;
      }
    };
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) lastDistance = null;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      setVb((box) => {
        const [mx, my] = toMap(e.clientX, e.clientY, box);
        return zoomBox(box, e.deltaY > 0 ? 1.12 : 0.89, mx, my);
      });
    };
    stage.addEventListener("pointerdown", down);
    stage.addEventListener("pointermove", move);
    stage.addEventListener("pointerup", up);
    stage.addEventListener("pointercancel", up);
    stage.addEventListener("wheel", wheel, { passive: false });
    return () => {
      stage.removeEventListener("pointerdown", down);
      stage.removeEventListener("pointermove", move);
      stage.removeEventListener("pointerup", up);
      stage.removeEventListener("pointercancel", up);
      stage.removeEventListener("wheel", wheel);
    };
  }, [zoomBox]);

  const k = vb[2] / size.w; // map units per screen pixel

  // Draw order: not visited first, then visited by landings (most on top).
  const ordered = useMemo(() => [...aerodromes].sort((a, b) => a.landings - b.landings), [aerodromes]);

  // Label placement without collisions (most-used aerodromes first).
  const labelPlacement = useMemo(() => {
    const placed: number[][] = [];
    const result = new Map<string, { dx: number; dy: number; anchor: "start" | "end" } | null>();
    const zoomedIn = vb[2] < 330;
    const shown = aerodromes.filter((a) => a.landings > 0 || showUnvisited);
    for (const a of [...shown].sort((x, y) => y.landings - x.landings)) {
      const r = radius(a.landings);
      if (!(a.landings > 0 || zoomedIn)) {
        result.set(a.icao, null);
        continue;
      }
      const w = (a.icao.length * 7.2 + 4) * k;
      const h = 13 * k;
      const candidates: [number, number, "start" | "end"][] = [
        [r + 6, 4, "start"],
        [-(r + 6), 4, "end"],
        [-(w / k) / 2, -(r + 7), "start"],
        [-(w / k) / 2, r + 14, "start"],
      ];
      let chosen: { dx: number; dy: number; anchor: "start" | "end" } | null = null;
      for (const [dx, dy, anchor] of candidates) {
        const x0 = a.x + (anchor === "end" ? dx * k - w : dx * k);
        const y0 = a.y + (dy - 10) * k;
        const box = [x0, y0, x0 + w, y0 + h];
        const hitsMarker = shown.some((b) => {
          const br = radius(b.landings) * k;
          return b !== a && b.x > box[0] - br && b.x < box[2] + br && b.y > box[1] - br && b.y < box[3] + br;
        });
        const hitsLabel = placed.some((p) => !(box[2] < p[0] || box[0] > p[2] || box[3] < p[1] || box[1] > p[3]));
        if (!hitsMarker && !hitsLabel) {
          placed.push(box);
          chosen = { dx, dy, anchor };
          break;
        }
      }
      result.set(a.icao, chosen);
    }
    return result;
  }, [aerodromes, k, vb, showUnvisited]);

  const current = aerodromes.find((a) => a.icao === selected) ?? null;
  const inset = views.canarias;

  return (
    <div className="spain-chart overflow-hidden rounded-2xl border border-panel-edge bg-panel">
      <div className="flex flex-wrap items-center gap-2 border-b border-panel-edge p-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Zona del mapa">
          {VIEW_BUTTONS.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => showView(b.id)}
              aria-pressed={view === b.id}
              className={`h-11 rounded-xl px-4 text-sm font-semibold transition ${
                view === b.id ? "bg-amber text-cockpit" : "border border-panel-edge text-ink"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
        <span className="flex-1" />
        <label className="flex h-11 cursor-pointer items-center gap-2 text-sm text-muted" htmlFor="sc-show-unvisited">
          <input
            id="sc-show-unvisited"
            type="checkbox"
            checked={showUnvisited}
            onChange={(e) => {
              setShowUnvisited(e.target.checked);
              if (!e.target.checked && current && current.landings === 0) setSelected(null);
            }}
            className="h-5 w-5 accent-[#f5a524]"
          />
          No visitados
        </label>
        <button type="button" aria-label="Acercar" onClick={() => animateTo(zoomBox(vb, 0.6))} className="h-11 w-11 rounded-xl border border-panel-edge font-mono text-lg">+</button>
        <button type="button" aria-label="Alejar" onClick={() => animateTo(zoomBox(vb, 1 / 0.6))} className="h-11 w-11 rounded-xl border border-panel-edge font-mono text-lg">−</button>
      </div>

      <div className="relative">
      <div
        ref={stageRef}
        className="spain-chart__stage"
        onClick={(e) => {
          if (!(e.target as Element).closest(".sc-ad, .sc-card")) setSelected(null);
        }}
      >
        <svg ref={svgRef} viewBox={vb.map((n) => n.toFixed(2)).join(" ")} role="img" aria-label="Mapa de España con aeródromos">
          <rect x={-500} y={-500} width={2000} height={1800} fill="var(--sea)" />
          {base}
          {labels.map((l) => (
            <g key={l.text} transform={`translate(${l.x} ${l.y}) scale(${k})`}>
              <text className="sc-label" textAnchor="middle">{l.text}</text>
            </g>
          ))}
          <g transform={`translate(${inset[0] + 8} ${inset[1] + 6}) scale(${k})`}>
            <text className="sc-inset" y={12}>ISLAS CANARIAS</text>
          </g>
          {ordered.map((a) => {
            const visited = a.landings > 0;
            if (!visited && !showUnvisited) return null;
            const r = radius(a.landings);
            const label = labelPlacement.get(a.icao);
            return (
              <g
                key={a.icao}
                className={`sc-ad ${visited ? "v" : "n"}`}
                transform={`translate(${a.x} ${a.y}) scale(${k})`}
                role="button"
                tabIndex={0}
                aria-pressed={selected === a.icao}
                aria-label={`${a.icao}, ${a.name}, ${visited ? landingsLabel(a.landings) : "no visitado"}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected(a.icao);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(a.icao);
                  }
                }}
              >
                <circle className="hit" r={22} />
                {visited && <circle className="glow" r={r + 5} />}
                <circle className="sel" r={r + 4} />
                <circle className="ring" r={r} />
                <circle className="dot" r={2.2} />
                {label && (
                  <text className="lbl" x={label.dx} y={label.dy} textAnchor={label.anchor}>
                    {a.icao}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

        {/* Phones: card below the map so it never hides it; larger screens: over the map. */}
        {current && (
          <div className="sc-card m-3 rounded-2xl sm:absolute sm:bottom-3 sm:left-3 sm:m-0 sm:w-[min(300px,calc(100%-24px))] border border-panel-edge bg-panel/95 px-4 py-3.5 shadow-2xl backdrop-blur">
            <div className="flex items-center gap-2.5">
              <span className={`font-mono text-[22px] font-semibold tracking-[0.1em] ${current.landings > 0 ? "text-amber" : "text-muted"}`}>
                {current.icao}
              </span>
              <span
                className={`rounded-md border px-1.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                  current.landings > 0 ? "border-go/40 text-go" : "border-panel-edge text-muted"
                }`}
              >
                {current.landings > 0 ? "Visitado" : "No visitado"}
              </span>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setSelected(null)}
                className="-my-3 -mr-2.5 ml-auto h-11 w-11 text-xl text-muted"
              >
                ×
              </button>
            </div>
            <p className="mt-1.5 font-medium">{current.name}</p>
            <p className="mt-2 font-mono text-[15px] font-semibold tabular-nums">
              {current.landings > 0 ? `${landingsLabel(current.landings)} registrados` : "Sin aterrizajes registrados"}
            </p>
            <p className="mt-1.5 font-mono text-[11.5px] text-muted">
              {dms(current.lat, "N", "S", 2)} {dms(current.lon, "E", "W", 3)} · {positionNote}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
