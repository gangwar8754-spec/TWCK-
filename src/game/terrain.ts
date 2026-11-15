import { SurfaceType } from './types';

export const WORLD_HALF_SIZE = 280; // 560m x 560m playable area inside 640m terrain

export interface BridgeDef {
  id: string;
  cx: number;
  cz: number;
  length: number;
  width: number;
  rotationY: number;
  deckHeight: number;
  style: 'stone' | 'timber';
}

export interface BuildingFootprint {
  id: string;
  cx: number;
  cz: number;
  width: number;
  depth: number;
  height: number;
  rotationY: number;
  type: 'house' | 'shop' | 'gate' | 'fuel' | 'ruin' | 'munish';
  color: string;
  accentColor: string;
  signText?: string;
}

export interface CircleCollider {
  x: number;
  z: number;
  radius: number;
  height: number;
  kind: 'tree' | 'rock' | 'lamp' | 'post';
}

export interface BoxCollider {
  cx: number;
  cz: number;
  halfW: number;
  halfD: number;
  height: number;
  rotationY: number;
}

export interface TrafficNode {
  x: number;
  z: number;
  isIntersection?: boolean;
}

export function riverCenterX(z: number): number {
  return 68 + Math.sin(z * 0.016) * 24 + Math.cos(z * 0.007) * 10;
}

export function riverHalfWidth(z: number): number {
  const fordDist = Math.abs(z - 92);
  const fordExtra = Math.max(0, 1 - fordDist / 32) * 4.5;
  return 11.5 + fordExtra;
}

export const WATER_LEVEL = -0.75;

export const BRIDGES: BridgeDef[] = [
  {
    id: 'stone_bazaar_bridge',
    cx: riverCenterX(-8),
    cz: -8,
    length: 34,
    width: 9.4,
    rotationY: 0,
    deckHeight: 1.55,
    style: 'stone',
  },
  {
    id: 'timber_forest_bridge',
    cx: riverCenterX(122),
    cz: 122,
    length: 34,
    width: 8.2,
    rotationY: 0,
    deckHeight: 1.45,
    style: 'timber',
  },
];

function distToSegment(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): number {
  const vx = bx - ax;
  const vz = bz - az;
  const wx = px - ax;
  const wz = pz - az;
  const lenSq = vx * vx + vz * vz;
  if (lenSq <= 0.0001) return Math.hypot(wx, wz);
  const t = Math.max(0, Math.min(1, (wx * vx + wz * vz) / lenSq));
  const projX = ax + t * vx;
  const projZ = az + t * vz;
  return Math.hypot(px - projX, pz - projZ);
}

// Paved town streets & extended grand entry highway
export const ASPHALT_SEGMENTS: Array<[number, number, number, number, number]> = [
  // Grand Kasbapur Approach Highway (Outside Gate at z=-138 -> Gate at -108 -> Bazaar Avenue to z=48)
  [0, -172, 0, 48, 7.2],
  // Munish House Driveway Spur from Main Avenue (x=0, z=-78) into Munish Estate (x=42, z=-78)
  [0, -78, 40, -78, 5.4],
  // Main East-West Bazaar Road leading over Stone Bridge to East Market
  [-55, -8, 145, -8, 6.4],
  // West Town Loop Street
  [-36, -42, -36, 26, 5.2],
  // North Bazaar Cross Street
  [-45, -42, 36, -42, 5.2],
  // South Town Cross Street
  [-45, 26, 42, 26, 5.2],
  // East Market Spur
  [118, -36, 118, 22, 5.2],
];

// Dirt off-road tracks
const DIRT_SEGMENTS: Array<[number, number, number, number, number]> = [
  [-36, -42, -88, -82, 4.6],
  [-88, -82, -142, -125, 4.4],
  [-142, -125, -178, -156, 4.2],
  [-178, -156, -195, -188, 4.5],
  [0, 48, 8, 92, 4.5],
  [8, 92, 42, 118, 4.5],
  [42, 118, 120, 122, 4.6],
  [118, 22, 122, 65, 4.5],
  [122, 65, 148, 115, 4.4],
  [148, 115, 102, 122, 4.4],
  [118, -36, 138, -98, 4.4],
  [138, -98, 158, -154, 4.4],
];

// Muddy off-road track loop
const MUD_SEGMENTS: Array<[number, number, number, number, number]> = [
  [-45, 26, -65, 42, 5.4],
  [-65, 42, -104, 76, 6.2],
  [-104, 76, -62, 110, 6.2],
  [-62, 110, 8, 92, 5.2],
];

function minSegDist(
  x: number,
  z: number,
  segs: Array<[number, number, number, number, number]>,
): { dist: number; halfWidth: number } {
  let best = Infinity;
  let hw = 4;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    const d = distToSegment(x, z, s[0], s[1], s[2], s[3]);
    if (d - s[4] < best - hw) {
      best = d;
      hw = s[4];
    }
  }
  return { dist: best, halfWidth: hw };
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function rawTerrainHeightAt(x: number, z: number): number {
  // Base town plateau
  const townDist = Math.max(Math.abs(x + 2) - 52, Math.abs(z + 8) - 48, 0);
  const townFlatten = smoothstep(0, 36, townDist);

  // Entry Highway & Munish House Estate plateau (x: -16..68, z: -175..-54)
  const entryDist = Math.max(Math.abs(x - 16) - 52, Math.abs(z + 114) - 64, 0);
  const entryFlatten = smoothstep(0, 28, entryDist);

  const combinedFlatten = Math.min(townFlatten, entryFlatten);

  let h =
    (Math.sin(x * 0.018) * Math.cos(z * 0.016) * 2.8 +
      Math.sin(x * 0.042 + z * 0.031) * 1.15 +
      Math.cos(x * 0.009 - z * 0.011) * 2.2) *
    combinedFlatten;

  // Eagle Peak Mountain in NW (-195, -188)
  const peakDx = x + 195;
  const peakDz = z + 188;
  const peakDist = Math.hypot(peakDx, peakDz);
  if (peakDist < 145) {
    const peakBell = Math.pow(Math.max(0, 1 - peakDist / 145), 1.65) * 32;
    const summitFlat = peakDist < 12 ? (1 - peakDist / 12) * 1.2 : 0;
    h += peakBell - summitFlat;
  }

  const neDist = Math.hypot(x - 165, z + 160);
  if (neDist < 90) {
    h += Math.pow(Math.max(0, 1 - neDist / 90), 1.7) * 15;
  }

  const swHill = Math.hypot(x + 175, z - 175);
  if (swHill < 110) {
    h += Math.pow(Math.max(0, 1 - swHill / 110), 1.6) * 18;
  }

  // Natural perimeter mountain rim outside playable zone
  const edgeDist = Math.max(Math.abs(x), Math.abs(z));
  if (edgeDist > 235) {
    const rimT = smoothstep(235, 315, edgeDist);
    const rimNoise = 1 + 0.35 * Math.sin(x * 0.05) * Math.cos(z * 0.05);
    h += rimT * 42 * rimNoise;
  }

  // Smooth dirt trails
  const dirt = minSegDist(x, z, DIRT_SEGMENTS);
  if (dirt.dist < dirt.halfWidth + 3) {
    const blend = smoothstep(dirt.halfWidth, dirt.halfWidth + 3, dirt.dist);
    const smoothH = h * 0.92 + 0.15;
    h = smoothH + (h - smoothH) * blend;
  }

  // Flatten East Market plateau
  const eastMarketDist = Math.hypot(x - 118, z + 8);
  if (eastMarketDist < 28) {
    const mBlend = smoothstep(14, 28, eastMarketDist);
    h = 0.25 * (1 - mBlend) + h * mBlend;
  }

  // River Channel
  const rcx = riverCenterX(z);
  const rhw = riverHalfWidth(z);
  const distRiver = Math.abs(x - rcx);
  if (distRiver < rhw + 12) {
    const bankT = smoothstep(rhw - 3.5, rhw + 12, distRiver);
    const fordFactor = Math.max(0, 1 - Math.abs(z - 92) / 26);
    const bedDepth = -1.65 + fordFactor * 0.55;
    h = bedDepth * (1 - bankT) + h * bankT;
  }

  // Mud Pit
  const mud = minSegDist(x, z, MUD_SEGMENTS);
  if (mud.dist < mud.halfWidth) {
    const mudFactor = 1 - smoothstep(0, mud.halfWidth, mud.dist);
    h -= mudFactor * 0.28 + Math.sin(x * 0.6) * Math.cos(z * 0.6) * 0.09 * mudFactor;
  }

  // Ensure Entry Highway & Munish House plateau are cleanly level around y = 0.2
  if (Math.abs(x) < 11 && z > -176 && z < 52) {
    h = 0.2;
  }
  const munishDx = Math.abs(x - 46);
  const munishDz = Math.abs(z + 78);
  if (munishDx < 28 && munishDz < 24) {
    h = 0.22;
  }

  return h;
}

export function bridgeDeckHeightAt(x: number, z: number): number | null {
  for (let i = 0; i < BRIDGES.length; i++) {
    const b = BRIDGES[i];
    const dx = x - b.cx;
    const dz = z - b.cz;
    const halfLen = b.length * 0.5;
    const halfWid = b.width * 0.5;
    if (Math.abs(dx) <= halfLen && Math.abs(dz) <= halfWid - 0.35) {
      const normX = Math.abs(dx) / halfLen;
      const arch = Math.cos(normX * Math.PI * 0.5);
      const bankH = rawTerrainHeightAt(b.cx + Math.sign(dx || 1) * halfLen, b.cz);
      return bankH + (b.deckHeight - bankH) * Math.pow(arch, 0.72);
    }
  }
  return null;
}

export function groundHeightAt(x: number, z: number, currentVehicleY?: number): number {
  const terrainH = rawTerrainHeightAt(x, z);
  const bridgeH = bridgeDeckHeightAt(x, z);
  if (bridgeH !== null) {
    if (currentVehicleY !== undefined && currentVehicleY < bridgeH - 1.1) {
      return terrainH;
    }
    return Math.max(terrainH, bridgeH);
  }
  return terrainH;
}

export function terrainNormalAt(x: number, z: number, out: { x: number; y: number; z: number }): void {
  const eps = 0.6;
  const hL = groundHeightAt(x - eps, z);
  const hR = groundHeightAt(x + eps, z);
  const hD = groundHeightAt(x, z - eps);
  const hU = groundHeightAt(x, z + eps);
  const nx = hL - hR;
  const ny = 2 * eps;
  const nz = hD - hU;
  const len = Math.hypot(nx, ny, nz) || 1;
  out.x = nx / len;
  out.y = ny / len;
  out.z = nz / len;
}

export function surfaceTypeAt(x: number, z: number, vehicleY?: number): SurfaceType {
  const bridgeH = bridgeDeckHeightAt(x, z);
  if (bridgeH !== null && (vehicleY === undefined || vehicleY >= bridgeH - 1.1)) {
    return 'bridge';
  }

  const h = rawTerrainHeightAt(x, z);
  if (h < WATER_LEVEL + 0.12) {
    return 'water';
  }

  const mud = minSegDist(x, z, MUD_SEGMENTS);
  if (mud.dist < mud.halfWidth) {
    return 'mud';
  }

  // Munish House paved courtyard
  if (x > 22 && x < 70 && z > -98 && z < -58) {
    return 'asphalt';
  }

  const asphalt = minSegDist(x, z, ASPHALT_SEGMENTS);
  if (asphalt.dist < asphalt.halfWidth) {
    return 'asphalt';
  }

  const dirt = minSegDist(x, z, DIRT_SEGMENTS);
  if (dirt.dist < dirt.halfWidth) {
    return 'dirt';
  }

  return 'grass';
}

export function zoneNameAt(x: number, z: number): string {
  if (z < -108 && Math.abs(x) < 28) return 'Kasbapur Entry Highway';
  if (Math.hypot(x - 46, z + 78) < 28) return 'Munish House Estate';
  if (Math.hypot(x + 195, z + 188) < 55) return 'Eagle Peak Summit';
  if (Math.hypot(x - 158, z + 154) < 35) return 'Kasbapur Watchtower';
  if (Math.hypot(x - 148, z - 115) < 42) return 'Banyan Forest';
  if (Math.abs(x - riverCenterX(z)) < 22) return 'Kasba River';
  if (x > 90 && x < 145 && z > -45 && z < 35) return 'East Market';
  if (x > -55 && x < 45 && z > -55 && z < 40) return 'Kasbapur Bazaar';
  if (x < -45 && z > 25 && z < 125) return 'Muddy Creek Track';
  return 'Kasbapur Countryside';
}

export const BUILDINGS: BuildingFootprint[] = [
  // 1. GRAND KASBAPUR CITY ENTRY GATE (Outer boundary at z = -108)
  {
    id: 'kasbapur_entry_gate',
    cx: 0,
    cz: -108,
    width: 19,
    depth: 4.8,
    height: 11.5,
    rotationY: 0,
    type: 'gate',
    color: '#d9a066',
    accentColor: '#9e3824',
    signText: 'KASBAPUR',
  },
  // 2. MUNISH HOUSE LANDMARK MANSION ESTATE (x = 46, z = -78)
  {
    id: 'munish_house',
    cx: 48,
    cz: -78,
    width: 38,
    depth: 32,
    height: 12.0,
    rotationY: 0,
    type: 'munish',
    color: '#f2ece1',
    accentColor: '#c99345',
    signText: 'MUNISH HOUSE',
  },
  // Kasba Fuel Pump Station
  {
    id: 'fuel_station',
    cx: 22,
    cz: -24,
    width: 10,
    depth: 7,
    height: 4.5,
    rotationY: 0,
    type: 'fuel',
    color: '#f0ece1',
    accentColor: '#e05a19',
    signText: 'KASBA FUEL PUMP',
  },
  // Bazaar Shops along main street
  {
    id: 'shop_chai',
    cx: -16,
    cz: -20,
    width: 8.5,
    depth: 6.5,
    height: 5.2,
    rotationY: 0,
    type: 'shop',
    color: '#e5b869',
    accentColor: '#1f6f78',
    signText: 'SHARMA CHAI & SNACKS',
  },
  {
    id: 'shop_kirana',
    cx: -27,
    cz: -20,
    width: 7.5,
    depth: 6.5,
    height: 6.8,
    rotationY: 0,
    type: 'shop',
    color: '#d46a4e',
    accentColor: '#2d4b73',
    signText: 'BHARAT KIRANA STORE',
  },
  {
    id: 'shop_tyres',
    cx: 16,
    cz: 4,
    width: 9.0,
    depth: 6.8,
    height: 5.0,
    rotationY: Math.PI,
    type: 'shop',
    color: '#4f7d82',
    accentColor: '#d97724',
    signText: 'KASBA AUTO & 4X4',
  },
  {
    id: 'shop_dhaba',
    cx: 32,
    cz: 4,
    width: 9.5,
    depth: 7.0,
    height: 4.8,
    rotationY: Math.PI,
    type: 'shop',
    color: '#d98a4e',
    accentColor: '#a62626',
    signText: 'HIMALAYA DHABA',
  },
  // Indian Residential Houses in Kasbapur Town
  {
    id: 'house_1',
    cx: -18,
    cz: 8,
    width: 9.5,
    depth: 8.5,
    height: 7.2,
    rotationY: 0,
    type: 'house',
    color: '#e8d7bd',
    accentColor: '#2c6975',
  },
  {
    id: 'house_2',
    cx: -18,
    cz: 38,
    width: 10,
    depth: 8,
    height: 6.2,
    rotationY: Math.PI,
    type: 'house',
    color: '#c96f53',
    accentColor: '#f2e8cf',
  },
  {
    id: 'house_3',
    cx: 18,
    cz: 38,
    width: 8.8,
    depth: 8.2,
    height: 8.4,
    rotationY: Math.PI,
    type: 'house',
    color: '#d9b578',
    accentColor: '#7a3529',
  },
  {
    id: 'house_4',
    cx: -50,
    cz: -22,
    width: 8.5,
    depth: 8.5,
    height: 6.5,
    rotationY: Math.PI / 2,
    type: 'house',
    color: '#88a89e',
    accentColor: '#d46a4e',
  },
  {
    id: 'house_5',
    cx: -50,
    cz: 8,
    width: 9.0,
    depth: 7.5,
    height: 7.5,
    rotationY: Math.PI / 2,
    type: 'house',
    color: '#e59f5c',
    accentColor: '#374b5e',
  },
  {
    id: 'house_6',
    cx: -16,
    cz: -56,
    width: 9.2,
    depth: 7.8,
    height: 6.6,
    rotationY: 0,
    type: 'house',
    color: '#dfc6a4',
    accentColor: '#a43e2d',
  },
  {
    id: 'house_7',
    cx: 15,
    cz: -56,
    width: 8.8,
    depth: 7.8,
    height: 7.8,
    rotationY: 0,
    type: 'house',
    color: '#5b828e',
    accentColor: '#e6b86a',
  },
  {
    id: 'house_8',
    cx: 38,
    cz: -24,
    width: 8.2,
    depth: 7.4,
    height: 6.4,
    rotationY: 0,
    type: 'house',
    color: '#d87a56',
    accentColor: '#f4efe6',
  },
  // East Market Buildings
  {
    id: 'east_shop_1',
    cx: 106,
    cz: -22,
    width: 8.5,
    depth: 6.5,
    height: 5.4,
    rotationY: 0,
    type: 'shop',
    color: '#e0b36a',
    accentColor: '#8c2f23',
    signText: 'MANDI MARKET',
  },
  {
    id: 'east_house_1',
    cx: 132,
    cz: -22,
    width: 9.2,
    depth: 8.0,
    height: 7.0,
    rotationY: -Math.PI / 2,
    type: 'house',
    color: '#cbd4c2',
    accentColor: '#2f5d62',
  },
  {
    id: 'east_house_2',
    cx: 132,
    cz: 10,
    width: 8.6,
    depth: 7.6,
    height: 6.2,
    rotationY: -Math.PI / 2,
    type: 'house',
    color: '#d9885b',
    accentColor: '#f1e7d5',
  },
  {
    id: 'watchtower_ruin',
    cx: 158,
    cz: -154,
    width: 7.5,
    depth: 7.5,
    height: 11.5,
    rotationY: 0.4,
    type: 'ruin',
    color: '#b89468',
    accentColor: '#7a5a3a',
  },
];

// Traffic Lane Loops (Right-hand / Left-hand Indian traffic: keep left on 2-way roads!)
export const TRAFFIC_ROUTES: TrafficNode[][] = [
  // Route 1: Highway & Bazaar Loop (North-South -> East over Stone Bridge -> U-turn East Market -> Back)
  [
    { x: 2.8, z: -155 },
    { x: 2.8, z: -108 },
    { x: 2.8, z: -78, isIntersection: true },
    { x: 2.8, z: -42, isIntersection: true },
    { x: 2.8, z: -8, isIntersection: true },
    { x: 35, z: -5.5 },
    { x: 75, z: -5.5 },
    { x: 118, z: -5.5, isIntersection: true },
    { x: 120.5, z: 16 },
    { x: 115.5, z: 16 },
    { x: 115.5, z: -10.5, isIntersection: true },
    { x: 75, z: -10.5 },
    { x: 35, z: -10.5 },
    { x: -2.8, z: -10.5, isIntersection: true },
    { x: -2.8, z: -42, isIntersection: true },
    { x: -2.8, z: -78, isIntersection: true },
    { x: -2.8, z: -108 },
    { x: -2.8, z: -155 },
  ],
  // Route 2: Inner Town Bazaar Loop (Main Avenue <-> North Cross <-> West Loop <-> South Cross)
  [
    { x: 2.6, z: -42, isIntersection: true },
    { x: 2.6, z: -8, isIntersection: true },
    { x: 2.6, z: 26, isIntersection: true },
    { x: -36, z: 26, isIntersection: true },
    { x: -36, z: -8, isIntersection: true },
    { x: -36, z: -42, isIntersection: true },
  ],
  // Route 3: Munish House Boulevard <-> Bazaar Avenue
  [
    { x: -2.5, z: -78, isIntersection: true },
    { x: 24, z: -78 },
    { x: 24, z: -81 },
    { x: -2.5, z: -81, isIntersection: true },
    { x: -2.5, z: -8, isIntersection: true },
    { x: -34, z: -8, isIntersection: true },
    { x: -34, z: -40, isIntersection: true },
    { x: -2.5, z: -40, isIntersection: true },
  ],
];

// Pedestrian Sidewalk Paths
export const PEDESTRIAN_PATHS: Array<Array<{ x: number; z: number }>> = [
  // Bazaar Main Street North Sidewalk
  [{ x: -42, z: -15 }, { x: -12, z: -15 }, { x: 12, z: -15 }, { x: 42, z: -15 }],
  // Bazaar Main Street South Sidewalk (with street crossing!)
  [{ x: 38, z: -1 }, { x: 8, z: -1 }, { x: -8, z: -1 }, { x: -38, z: -1 }],
  // Street Crosswalk across Main Avenue
  [{ x: -7, z: -26 }, { x: 7, z: -26 }, { x: 7, z: 12 }, { x: -7, z: 12 }],
  // Munish House Front Sidewalk Promenade
  [{ x: 25, z: -92 }, { x: 25, z: -64 }, { x: 12, z: -64 }, { x: 12, z: -92 }],
  // East Market Sidewalk
  [{ x: 102, z: -15 }, { x: 126, z: -15 }, { x: 126, z: 4 }, { x: 102, z: 4 }],
];

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface WorldPropsData {
  trees: Array<{ x: number; z: number; scale: number; kind: 'neem' | 'pine'; tint: number }>;
  rocks: Array<{ x: number; z: number; scale: number; rotY: number; tint: number }>;
  lamps: Array<{ x: number; z: number; rotY: number }>;
  coins: Array<{ id: number; x: number; z: number }>;
  fuelCans: Array<{ id: number; x: number; z: number }>;
  colliders: CircleCollider[];
  boxColliders: BoxCollider[];
}

function isNearRoadOrBuilding(x: number, z: number, pad = 4.5): boolean {
  if (Math.abs(x - riverCenterX(z)) < riverHalfWidth(z) + 4) return true;
  if (minSegDist(x, z, ASPHALT_SEGMENTS).dist < 7.8 + pad) return true;
  if (minSegDist(x, z, DIRT_SEGMENTS).dist < 5.5 + pad) return true;
  if (minSegDist(x, z, MUD_SEGMENTS).dist < 6.5 + pad) return true;
  for (const b of BUILDINGS) {
    if (Math.abs(x - b.cx) < b.width * 0.65 + pad && Math.abs(z - b.cz) < b.depth * 0.65 + pad) {
      return true;
    }
  }
  return false;
}

export function generateWorldProps(): WorldPropsData {
  const rand = mulberry32(42026);
  const trees: WorldPropsData['trees'] = [];
  const rocks: WorldPropsData['rocks'] = [];
  const lamps: WorldPropsData['lamps'] = [];
  const colliders: CircleCollider[] = [];
  const boxColliders: BoxCollider[] = [];

  for (const b of BUILDINGS) {
    if (b.type === 'gate') {
      // Twin massive Entry Gate pillars (open 14m center lane for driving through!)
      boxColliders.push({
        cx: b.cx - 8.2,
        cz: b.cz,
        halfW: 1.9,
        halfD: 2.2,
        height: b.height,
        rotationY: 0,
      });
      boxColliders.push({
        cx: b.cx + 8.2,
        cz: b.cz,
        halfW: 1.9,
        halfD: 2.2,
        height: b.height,
        rotationY: 0,
      });
    } else if (b.type === 'munish') {
      // Main Mansion Building Collider (East side of Munish Estate: cx = 53, cz = -78)
      boxColliders.push({
        cx: 54,
        cz: -78,
        halfW: 9.5,
        halfD: 11.5,
        height: b.height,
        rotationY: 0,
      });
      // Security Checkpoint Cabin beside open Entrance Gate (x = 31, z = -84)
      boxColliders.push({
        cx: 31,
        cz: -85.5,
        halfW: 1.6,
        halfD: 1.6,
        height: 3.4,
        rotationY: 0,
      });
      // Boundary Walls (West front left & right of open 9m gate at z=-78, plus North/South/East)
      boxColliders.push({ cx: 29, cz: -89, halfW: 0.5, halfD: 5.5, height: 3.0, rotationY: 0 });
      boxColliders.push({ cx: 29, cz: -67, halfW: 0.5, halfD: 5.5, height: 3.0, rotationY: 0 });
      boxColliders.push({ cx: 48, cz: -94, halfW: 19, halfD: 0.5, height: 3.0, rotationY: 0 });
      boxColliders.push({ cx: 48, cz: -62, halfW: 19, halfD: 0.5, height: 3.0, rotationY: 0 });
      boxColliders.push({ cx: 67, cz: -78, halfW: 0.5, halfD: 16, height: 3.0, rotationY: 0 });
    } else if (b.type === 'fuel') {
      boxColliders.push({
        cx: b.cx,
        cz: b.cz - 1.5,
        halfW: 1.4,
        halfD: 0.9,
        height: 2.4,
        rotationY: b.rotationY,
      });
    } else {
      boxColliders.push({
        cx: b.cx,
        cz: b.cz,
        halfW: b.width * 0.5,
        halfD: b.depth * 0.5,
        height: b.height,
        rotationY: b.rotationY,
      });
    }
  }

  // Bridge side parapets
  for (const br of BRIDGES) {
    boxColliders.push({
      cx: br.cx,
      cz: br.cz - br.width * 0.5 + 0.35,
      halfW: br.length * 0.5,
      halfD: 0.35,
      height: 2.5,
      rotationY: 0,
    });
    boxColliders.push({
      cx: br.cx,
      cz: br.cz + br.width * 0.5 - 0.35,
      halfW: br.length * 0.5,
      halfD: 0.35,
      height: 2.5,
      rotationY: 0,
    });
  }

  // Streetlamps along Approach Highway, Munish House Boulevard, and Bazaar
  const lampCoords: Array<[number, number, number]> = [
    // Approach highway outside & inside gate
    [-8.5, -152, Math.PI / 2],
    [8.5, -152, -Math.PI / 2],
    [-8.5, -130, Math.PI / 2],
    [8.5, -130, -Math.PI / 2],
    [-8.5, -92, Math.PI / 2],
    [8.5, -92, -Math.PI / 2],
    // Munish House boulevard
    [14, -84.5, 0],
    [24, -84.5, 0],
    [14, -71.5, Math.PI],
    // Bazaar & East Market
    [-28, -15, 0],
    [-8, -15, 0],
    [12, -15, 0],
    [32, -15, 0],
    [-8, 12, 0],
    [-8, 34, 0],
    [8, -36, Math.PI],
    [104, -15, 0],
  ];
  for (const [lx, lz, lrot] of lampCoords) {
    lamps.push({ x: lx, z: lz, rotY: lrot });
    colliders.push({ x: lx, z: lz, radius: 0.32, height: 5.5, kind: 'lamp' });
  }

  // Trees
  for (let i = 0; i < 320; i++) {
    let x: number;
    let z: number;
    if (i < 130) {
      x = 95 + rand() * 145;
      z = 35 + rand() * 185;
    } else if (i < 220) {
      x = -235 + rand() * 190;
      z = -235 + rand() * 165;
    } else {
      x = (rand() - 0.5) * 480;
      z = (rand() - 0.5) * 480;
    }

    if (isNearRoadOrBuilding(x, z, 3.8)) continue;
    const h = rawTerrainHeightAt(x, z);
    if (h < 0.05) continue;

    const kind = h > 6.5 || (x < -80 && z < -60) ? 'pine' : 'neem';
    const scale = 0.85 + rand() * 0.32;
    const tint = 0.86 + rand() * 0.28;
    trees.push({ x, z, scale, kind, tint });
    colliders.push({ x, z, radius: 0.72 * scale, height: 6.5 * scale, kind: 'tree' });
  }

  // Boulders
  for (let i = 0; i < 150; i++) {
    const x = (rand() - 0.5) * 490;
    const z = (rand() - 0.5) * 490;
    if (isNearRoadOrBuilding(x, z, 2.5)) continue;
    if (Math.abs(x) < 60 && Math.abs(z) < 110) continue;
    const scale = 0.7 + rand() * 1.1;
    rocks.push({ x, z, scale, rotY: rand() * Math.PI * 2, tint: 0.8 + rand() * 0.35 });
    colliders.push({ x, z, radius: 1.05 * scale, height: 1.8 * scale, kind: 'rock' });
  }

  // Collectible Coins (including Entry Gate & Munish House!)
  const coinCoords: Array<[number, number]> = [
    [0, -122], [0, -108], [0, -90], [20, -78], [36, -78],
    [0, -28], [0, -14], [14, -8], [32, -8], [52, -8],
    [72, -8], [94, -8], [118, -8], [-22, -8], [-36, -24],
    [-16, 26], [16, 26],
    [-62, 38], [-82, 56], [-102, 75], [-84, 96], [-58, 108], [-28, 100], [6, 92],
    [118, 38], [126, 68], [142, 95], [148, 115], [122, 120], [96, 122], [68, 122], [38, 122],
    [-64, -62], [-92, -84], [-118, -105], [-142, -125], [-162, -142], [-180, -158], [-195, -188],
    [128, -62], [138, -98], [148, -128], [158, -154],
  ];
  const coins = coinCoords.map(([x, z], idx) => ({ id: idx + 1, x, z }));

  const fuelCans = [
    { id: 1, x: 22, z: -18 },
    { id: 2, x: -92, z: 82 },
    { id: 3, x: 132, z: 112 },
    { id: 4, x: -132, z: -116 },
    { id: 5, x: 118, z: -12 },
  ];

  return { trees, rocks, lamps, coins, fuelCans, colliders, boxColliders };
}
