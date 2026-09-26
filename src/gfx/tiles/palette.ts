/**
 * Colour ramps for the tileset. Every ramp is ordered darkest -> lightest so
 * painters can say `GRASS[1]` for "shadow" and `GRASS[4]` for "highlight".
 * The light source is always top-left.
 */

export type Ramp = readonly string[];

/** Near-black used for outlines and deep gaps (a very dark violet reads better than pure black). */
export const INK = '#140c1c';

// --- outdoors ---------------------------------------------------------------
export const GRASS: Ramp = ['#173a26', '#23592f', '#347a36', '#4a9a3c', '#6bb84a', '#9cd66a'];
export const CANOPY: Ramp = ['#0c2419', '#16402a', '#225e32', '#327d3a', '#4f9e45', '#7cc05a'];
export const TRUNK: Ramp = ['#2e1a12', '#4c2c1a', '#6e4426', '#8e5e34'];
export const WATER: Ramp = ['#162a66', '#20449a', '#2d62c4', '#4486de', '#76b4f0', '#c4e6ff', '#f4fbff'];
export const SAND: Ramp = ['#9c7646', '#bc9460', '#d6b27a', '#e8cc96', '#f6e4b6'];
export const DIRT: Ramp = ['#5a3c24', '#7a5634', '#9a7244', '#b48c58', '#ceaa76'];
export const MOUNTAIN: Ramp = ['#2c1e1c', '#4e3629', '#725236', '#96724a', '#b89668', '#dcc298'];
export const FLOWER_COLORS: readonly (readonly [string, string])[] = [
  ['#f4f0e8', '#c8c0d8'], // white
  ['#f8d850', '#d09028'], // yellow
  ['#f08cb8', '#c0507c'], // pink
  ['#8cb8f8', '#5070c8'], // blue
];

// --- town -------------------------------------------------------------------
export const COBBLE: Ramp = ['#3a3440', '#5a5260', '#7a7280', '#9a92a0', '#bab4bc', '#dcd6d8'];
export const STONE: Ramp = ['#34323e', '#55535f', '#767482', '#9896a2', '#bcbac4', '#e0dee6'];
export const WOOD: Ramp = ['#2c180e', '#4c2c18', '#6e4424', '#925e32', '#b47e46', '#d4a466'];
export const ROOF: Ramp = ['#3c1418', '#6c2222', '#9a3426', '#c24e30', '#e2764a', '#f4a070'];
export const PLASTER: Ramp = ['#7a6a58', '#a8967c', '#cbbd9e', '#e4dabe', '#f6f0dc'];
export const GLASS: Ramp = ['#1c2c50', '#2c4a7c', '#4a78b0', '#86b8e0', '#d8f0ff'];
export const IRON: Ramp = ['#18141e', '#2e2a36', '#4a4654', '#6e6a78'];

// --- interior ---------------------------------------------------------------
export const FLOOR: Ramp = ['#3e2414', '#62381e', '#86522a', '#a66c38', '#c48a4c', '#dcaa6a'];
export const PANEL: Ramp = ['#24140e', '#40241a', '#5e3824', '#7e5030', '#9e6a40'];
export const WALLPAPER: Ramp = ['#6a5a4a', '#8e7c64', '#b09c7e', '#cab89a', '#e2d4b6'];
export const RUG: Ramp = ['#3c0e1a', '#6a1826', '#962634', '#bc3a42', '#dc6458'];
export const RUG_TRIM: Ramp = ['#6a4a14', '#a0761e', '#d4a832', '#f4d670'];
export const CLOTH_BLUE: Ramp = ['#182048', '#26347a', '#3a50a8', '#5a78d0', '#8eaaec'];
export const LINEN: Ramp = ['#8a8aa0', '#b8b8cc', '#dcdce8', '#f8f8ff'];
export const CLAY: Ramp = ['#4c2016', '#7c3a22', '#a85a34', '#cc7e4c'];
export const MAT: Ramp = ['#2c3a1c', '#46582a', '#667a3a', '#8a9c50'];

// --- cave -------------------------------------------------------------------
export const CAVE_ROCK: Ramp = ['#0e0a14', '#1e1624', '#2e2234', '#433244', '#5c4658', '#7a6070', '#9a808a'];
export const CAVE_FLOOR: Ramp = ['#17141c', '#221e28', '#2e2934', '#3b3542', '#4a4350', '#5c5462'];
export const CAVE_WATER: Ramp = ['#081a26', '#0e2c3c', '#164256', '#205c70', '#3a8494', '#78bcc4', '#c4eef0'];
export const RUNE: Ramp = ['#3a2a6a', '#6a4ab8', '#a88cf0', '#e0d4ff'];

// --- light & magic ----------------------------------------------------------
export const FIRE: Ramp = ['#6a1410', '#b8341a', '#e86a1e', '#f8a830', '#fce070', '#fffbe0'];
/** Reddish lacquered wood for treasure chests, so the gold fittings pop. */
export const CHEST_WOOD: Ramp = ['#3a1410', '#62241a', '#8a3a24', '#ae5632', '#d07a48'];
export const GOLD: Ramp = ['#5a3a10', '#94661c', '#cc9c2c', '#f4d058', '#fff4b0'];
export const CRYSTAL: Ramp = ['#10205a', '#1e48a8', '#2e7ce0', '#5cb4f8', '#a8e4ff', '#ffffff'];
export const HEART: Ramp = ['#3a0c3a', '#761a6e', '#b42c98', '#e454bc', '#ff90dc', '#ffd4f4', '#ffffff'];
export const HEART_DIM: Ramp = ['#1c1822', '#2e2834', '#443a4c', '#5a4e62', '#726678', '#8c8290'];
