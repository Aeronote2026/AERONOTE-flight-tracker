/** A point on the map: a geographic position (WGS84, decimal degrees). */
export type LngLat = { lon: number; lat: number };

/** Bounding box: [west, south, east, north] in decimal degrees. */
export type Bounds = [number, number, number, number];

/** One aerodrome as AERONOTE draws it on My Aviation Map. */
export type VisitedAerodrome = LngLat & {
  /** ICAO location indicator, e.g. "LECU". */
  icao: string;
  name: string;
  /** Country code (ISO 3166-1 alpha-2), e.g. "ES". */
  country: string;
  /** Zone inside the country, e.g. "peninsula", "baleares", "canarias". */
  zone: string;
  /** Landings attributed to this aerodrome. */
  landings: number;
};
