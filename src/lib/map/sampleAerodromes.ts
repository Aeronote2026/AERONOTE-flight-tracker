import type { VisitedAerodrome } from "./types";

/**
 * DEMONSTRATION DATA ONLY — for the /lab/map technical test.
 *
 *  - The landing counts are INVENTED.
 *  - Coordinates are APPROXIMATE and have NOT been verified against the
 *    official AIP España (ENAIRE). They must be verified before any
 *    aerodrome data is used in production.
 *  - Not for navigation.
 *
 * LECU appears twice on purpose: the map must still draw it only once.
 */
export const SAMPLE_AERODROMES: VisitedAerodrome[] = [
  { icao: "LECU", name: "Madrid / Cuatro Vientos", lat: 40.3706, lon: -3.7851, country: "ES", zone: "peninsula", landings: 38 },
  { icao: "LECU", name: "Madrid / Cuatro Vientos", lat: 40.3706, lon: -3.7851, country: "ES", zone: "peninsula", landings: 4 },
  { icao: "LEMD", name: "Madrid / Barajas", lat: 40.4719, lon: -3.5626, country: "ES", zone: "peninsula", landings: 1 },
  { icao: "LEGT", name: "Getafe", lat: 40.2941, lon: -3.7238, country: "ES", zone: "peninsula", landings: 2 },
  { icao: "LESA", name: "Salamanca / Matacán", lat: 40.9521, lon: -5.502, country: "ES", zone: "peninsula", landings: 5 },
  { icao: "LELN", name: "León", lat: 42.589, lon: -5.6556, country: "ES", zone: "peninsula", landings: 2 },
  { icao: "LEZG", name: "Zaragoza", lat: 41.6662, lon: -1.0416, country: "ES", zone: "peninsula", landings: 3 },
  { icao: "LELL", name: "Sabadell", lat: 41.5209, lon: 2.105, country: "ES", zone: "peninsula", landings: 6 },
  { icao: "LEBL", name: "Barcelona / El Prat", lat: 41.2971, lon: 2.0785, country: "ES", zone: "peninsula", landings: 1 },
  { icao: "LEVC", name: "Valencia", lat: 39.4893, lon: -0.4816, country: "ES", zone: "peninsula", landings: 2 },
  { icao: "LEZL", name: "Sevilla", lat: 37.418, lon: -5.8931, country: "ES", zone: "peninsula", landings: 1 },
  { icao: "LEMG", name: "Málaga / Costa del Sol", lat: 36.6749, lon: -4.4991, country: "ES", zone: "peninsula", landings: 2 },
  { icao: "LEPA", name: "Palma de Mallorca", lat: 39.5517, lon: 2.7388, country: "ES", zone: "baleares", landings: 3 },
  { icao: "LEMH", name: "Menorca", lat: 39.8626, lon: 4.2186, country: "ES", zone: "baleares", landings: 1 },
  { icao: "LEIB", name: "Ibiza", lat: 38.8729, lon: 1.3731, country: "ES", zone: "baleares", landings: 1 },
  { icao: "GCLP", name: "Gran Canaria", lat: 27.9319, lon: -15.3866, country: "ES", zone: "canarias", landings: 2 },
  { icao: "GCXO", name: "Tenerife Norte", lat: 28.4827, lon: -16.3415, country: "ES", zone: "canarias", landings: 1 },
  { icao: "GCTS", name: "Tenerife Sur", lat: 28.0445, lon: -16.5725, country: "ES", zone: "canarias", landings: 1 },
  { icao: "GCRR", name: "Lanzarote", lat: 28.9455, lon: -13.6052, country: "ES", zone: "canarias", landings: 1 },
];
