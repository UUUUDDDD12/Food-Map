import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tileOptions, MIN_MAP_ZOOM, MAX_MAP_ZOOM, NATIVE_TILE_ZOOM } from '../src/map-options.js';

for (const retina of [false, true]) {
  test(`地图所有可达层级均有底图且请求不超过瓦片上限（Retina=${retina}）`, () => {
    const options = tileOptions(retina);
    for (let zoom = MIN_MAP_ZOOM; zoom <= MAX_MAP_ZOOM; zoom++) {
      assert.ok(zoom >= options.minZoom && zoom <= options.maxZoom);
      const requestedZoom = Math.min(zoom, options.maxNativeZoom) + options.zoomOffset;
      assert.ok(requestedZoom <= NATIVE_TILE_ZOOM);
    }
    assert.equal(options.tileSize * 2 ** options.zoomOffset, 256);
    assert.equal(options.detectRetina, false);
  });
}
