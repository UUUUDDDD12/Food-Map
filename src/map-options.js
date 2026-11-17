export const MIN_MAP_ZOOM = 3;
export const MAX_MAP_ZOOM = 21;
export const NATIVE_TILE_ZOOM = 19;

export function tileOptions(retina) {
  const offset = retina ? 1 : 0;
  return {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    // Set Retina sizing explicitly: Leaflet's detectRetina changes maxZoom.
    detectRetina: false,
    tileSize: retina ? 128 : 256,
    zoomOffset: offset,
    minZoom: MIN_MAP_ZOOM,
    maxNativeZoom: NATIVE_TILE_ZOOM - offset,
    maxZoom: MAX_MAP_ZOOM,
    keepBuffer: 2,
  };
}
