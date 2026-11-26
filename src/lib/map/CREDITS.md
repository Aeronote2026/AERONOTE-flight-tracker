# My Aviation Map — data sources and licences

## Cartography of Spain (IGN / CNIG)

- **Product:** Líneas límite jurisdiccionales de España — **BDLJE** (municipal,
  provincial and autonomous-community boundaries), published by the Instituto
  Geográfico Nacional / Centro Nacional de Información Geográfica.
- **Obtained via:** npm package `es-atlas` 0.6.0 (MIT licence for its code,
  © Martín González), which converts the CNIG download to TopoJSON.
- **Licence:** CC BY 4.0, under Orden FOM/2807/2015 and the IGN licence
  "Licencia de los productos y servicios de datos geográficos producidos por el
  IGN" (https://www.ign.es/resources/licencia/Condiciones_licenciaUso_IGN.pdf).
- **Our use is a derived work** (simplified and reprojected). Required
  attribution, shown at the foot of the map with a link to https://www.ign.es:

  > Obra derivada de BDLJE CC-BY 4.0 ign.es

  The same text is stored in the metadata of `spain.generated.json`
  (`abstract`, `lineage`, `accessConstraints`), as point 5 of the IGN licence
  requires for modified datasets.
- **Pending:** the IGN formula also allows a `<fecha>` (product date). The exact
  edition date of the data inside `es-atlas` 0.6.0 (package published
  February 2024) must be confirmed in the SCNE product table
  (http://www.scne.es/productos.html) or with consulta@cnig.es before
  production, and then added to the attribution.

## Neighbouring countries

- Natural Earth 1:10m admin-0 countries, via npm `world-atlas` 2.0.2.
  Public domain (https://www.naturalearthdata.com/about/terms-of-use/).
- Gibraltar is drawn neutrally as a neighbouring territory: not part of Spain's
  land, coastline or boundaries, and without any label.

## Aerodromes

- **No real aerodrome data is used yet.** The /lab/chart test uses
  DEMONSTRATION entries with approximate, unverified coordinates and invented
  landing counts.
- Production coordinates must come from a source whose reuse is permitted,
  recorded per aerodrome with its source and verification date. The AIP España
  (ENAIRE) is the reference for verification, but its data is **not**
  incorporated or redistributed until ENAIRE confirms in writing that this is
  allowed (see ENAIRE's legal notice: https://www.enaire.es/aviso_legal).

## Not for navigation

This map is a personal summary of logbook data. It is not an aeronautical
chart and must not be used for flight planning or navigation.
