import type { Bounds } from "./types";

/**
 * Map views per country. Adding another country later means adding an
 * entry here; the map component does not change.
 */
export type MapView = {
  id: string;
  label: string;
  bounds: Bounds;
};

export type CountryMapConfig = {
  country: string;
  name: string;
  /** Views offered as buttons; the first one is shown on opening. */
  views: MapView[];
  /** The map cannot be panned outside this box (saves tile requests). */
  maxBounds: Bounds;
  minZoom: number;
  maxZoom: number;
};

export const SPAIN: CountryMapConfig = {
  country: "ES",
  name: "España",
  views: [
    { id: "peninsula-baleares", label: "Península y Baleares", bounds: [-9.6, 35.8, 4.6, 44.0] },
    { id: "canarias", label: "Canarias", bounds: [-18.4, 27.5, -13.2, 29.5] },
    { id: "todo", label: "Todo", bounds: [-18.6, 27.4, 4.8, 44.1] },
  ],
  maxBounds: [-24, 24, 10, 47],
  minZoom: 3.5,
  maxZoom: 12,
};

export const COUNTRY_MAPS: Record<string, CountryMapConfig> = { ES: SPAIN };
