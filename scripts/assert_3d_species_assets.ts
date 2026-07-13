import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fishData } from '../src/data/fishData';
import { getSpeciesDisplayImage } from '../src/lib/speciesVisual';

const source = readFileSync(new URL('../src/components/ThreeAquarium.tsx', import.meta.url), 'utf8');

assert.match(source, /getSpeciesDisplayImage\(fishInfo\)/, '3D fish must use the shared species image resolver');
assert.match(source, /getSpeciesDisplayImage\(plant\.plantInfo!\)/, '3D plants must use the shared species image resolver');
assert.match(source, /getSpeciesDisplayImage\(item\.itemInfo\)/, '3D hardscape must use the shared species image resolver');
assert.doesNotMatch(source, /loader\.load\(fishInfo\.image\)/, '3D fish must not load the legacy image field directly');
assert.doesNotMatch(source, /useLoader\(THREE\.TextureLoader,\s*(?:plant\.plantInfo|item\.itemInfo).*\.image\)/, '3D decor must not load legacy image fields directly');

const visibilityOverride = fishData.find(item => item.id === 'sp_0001');
const displayOverride = fishData.find(item => item.id === 'sp_0019');
assert.ok(visibilityOverride, 'visibility override fixture must exist');
assert.ok(displayOverride, 'display override fixture must exist');
assert.match(getSpeciesDisplayImage(visibilityOverride), /species-image-overrides\/sp_0001\.png\?v=/);
assert.match(getSpeciesDisplayImage(displayOverride), /species-display\/sp_0019_.*\?v=/);

console.log('3D species asset assertions passed');
