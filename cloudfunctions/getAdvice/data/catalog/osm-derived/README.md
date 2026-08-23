# OSM-derived catalog boundary

These twenty JavaScript fragments are the controller-frozen #159/#161/#163/#165 route-data slices (twenty searchable
OSM full variants alongside five earlier non-OSM pilots). They are generated from complete,
ordered OpenStreetMap `type=route` relations and are distributed as an ODbL-derived database. Each fragment retains
only the catalog geometry/preview and provenance needed by the route-domain seam; no contributor identity, private
submission, GPX/KML file, raw API response, or elevation query URL is included.

The applicable database/source licence is [Open Database License 1.0 (ODbL)](https://opendatacommons.org/licenses/odbl/).
The runtime source cards carry `© OpenStreetMap contributors` attribution alongside the OSM copyright guidance
(`https://www.openstreetmap.org/copyright`) and the relation/way/node version observations. Full node manifests are
documented in `docs/route-data-licenses.md`; runtime manifests are bounded for package size. `common.js` is helper
code, not an additional data source. `elevation-source.js` records the separate
trusted-api derivation boundary for one bounded Open-Meteo Elevation API request per route using Copernicus DEM GLO-90;
no provider is called at runtime.

All twenty OSM variants keep `operationalStatus=unknown`. Route 20739620's residential member is disclosed while the
user access mode remains `walk`; the #161 routes disclose their `track`, `tertiary`, `unclassified`, `service`, or
road walking members. Cableway, shuttle, and vehicle-only transport are not silently mixed into walking data.
