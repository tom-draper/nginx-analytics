/**
 * Generates a pre-computed flat array of [lat, lon] points that fall on land,
 * sampled from the Natural Earth 110m land GeoJSON at a fixed angular step.
 * Run with: node scripts/generate-land-points.mjs
 */

import { geoContains } from 'd3-geo';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const STEP = 1.5; // degree grid — adjust for more/fewer dots

console.log('Fetching Natural Earth 110m land GeoJSON...');
const res = await fetch(
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson'
);
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const geojson = await res.json();

console.log(`Sampling ${Math.round(180 / STEP)} × ${Math.round(360 / STEP)} grid at ${STEP}° step...`);

const points = [];
for (let lat = -90; lat <= 90; lat += STEP) {
    for (let lon = -180; lon <= 180; lon += STEP) {
        // d3.geoContains expects [longitude, latitude]
        if (geoContains(geojson, [lon, lat])) {
            points.push([parseFloat(lat.toFixed(2)), parseFloat(lon.toFixed(2))]);
        }
    }
}

console.log(`Generated ${points.length} land points.`);

const output = `// Auto-generated land points — uniform ${STEP}° grid sampled from Natural Earth 110m land GeoJSON.
// Re-generate with: node scripts/generate-land-points.mjs
export const landPoints: [number, number][] = ${JSON.stringify(points, null, 4)};
`;

const outPath = join(__dirname, '../lib/globe.ts');
writeFileSync(outPath, output, 'utf8');
console.log(`Written to ${outPath}`);
