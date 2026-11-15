export type GameScreen = 'menu' | 'garage' | 'playing' | 'paused';

export type CameraMode = 'chase' | 'far' | 'cockpit' | 'hood';

export type SurfaceType = 'asphalt' | 'dirt' | 'mud' | 'water' | 'grass' | 'bridge';

export type TimePreset = 'cycle' | 'golden' | 'midday' | 'dusk' | 'night';

export type TouchMode = 'auto' | 'always' | 'off';

export type GearValue = 'P' | 'R' | 'N' | 'D' | '1' | '2' | '3' | '4';

export type TransmissionMode = 'manual' | 'auto';

export type TrafficDensity = 'light' | 'medium' | 'heavy';

export type WeatherMode = 'clear' | 'rain' | 'fog' | 'dynamic';

export type VehicleStyle =
  | 'thar'
  | 'verna'
  | 'scorpio'
  | 'fortuner'
  | 'pickup'
  | 'truck'
  | 'hatchback'
  | 'bus'
  | 'motorcycle';

export type EngineSoundProfile = 'suv' | 'sedan' | 'heavy_diesel' | 'moto';

export interface VehicleConfig {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  defaultColor: string;
  maxSpeedKmh: number;
  engineForce: number;
  brakingPower: number;
  steeringGrip: number;
  massKg: number;
  mudGrip: number;
  suspensionStiffness: number;
  fuelTankLiters: number;
  chassisWidth: number;
  chassisLength: number;
  chassisHeight: number;
  wheelRadius: number;
  wheelWidth: number;
  wheelBase: number;
  trackWidth: number;
  groundClearance: number;
  style: VehicleStyle;
  engineSound: EngineSoundProfile;
  garageAvailable: boolean;
  stats: {
    speed: number;
    offroad: number;
    torque: number;
    suspension: number;
  };
}

export const PAINT_SWATCHES = [
  { name: 'Saffron Rust', hex: '#d96b27' },
  { name: 'Bazaar Crimson', hex: '#b92b27' },
  { name: 'Pearl White', hex: '#ece9e1' },
  { name: 'Obsidian Black', hex: '#1e242b' },
  { name: 'Forest Olive', hex: '#3d5a40' },
  { name: 'Royal Cobalt', hex: '#224f8c' },
] as const;

export const VEHICLES: VehicleConfig[] = [
  {
    id: 'mahindra_thar',
    name: 'Mahindra Thar',
    subtitle: 'Iconic open-top 4x4 off-road icon',
    price: 0,
    defaultColor: '#b92b27',
    maxSpeedKmh: 118,
    engineForce: 31,
    brakingPower: 1.0,
    steeringGrip: 0.96,
    massKg: 1750,
    mudGrip: 0.85,
    suspensionStiffness: 48,
    fuelTankLiters: 57,
    chassisWidth: 1.92,
    chassisLength: 4.05,
    chassisHeight: 0.78,
    wheelRadius: 0.45,
    wheelWidth: 0.31,
    wheelBase: 2.55,
    trackWidth: 1.72,
    groundClearance: 0.56,
    style: 'thar',
    engineSound: 'suv',
    garageAvailable: true,
    stats: { speed: 76, offroad: 90, torque: 82, suspension: 84 },
  },
  {
    id: 'hyundai_verna',
    name: 'Hyundai Verna',
    subtitle: 'Sleek city sedan with crisp tarmac handling',
    price: 120,
    defaultColor: '#ece9e1',
    maxSpeedKmh: 152,
    engineForce: 35,
    brakingPower: 1.18,
    steeringGrip: 1.15,
    massKg: 1280,
    mudGrip: 0.42,
    suspensionStiffness: 62,
    fuelTankLiters: 45,
    chassisWidth: 1.84,
    chassisLength: 4.48,
    chassisHeight: 0.56,
    wheelRadius: 0.35,
    wheelWidth: 0.24,
    wheelBase: 2.72,
    trackWidth: 1.62,
    groundClearance: 0.34,
    style: 'verna',
    engineSound: 'sedan',
    garageAvailable: true,
    stats: { speed: 95, offroad: 46, torque: 74, suspension: 70 },
  },
  {
    id: 'mahindra_scorpio',
    name: 'Scorpio N',
    subtitle: 'Muscular Indian SUV built for city & dirt roads',
    price: 200,
    defaultColor: '#1e242b',
    maxSpeedKmh: 136,
    engineForce: 34,
    brakingPower: 1.05,
    steeringGrip: 0.98,
    massKg: 2120,
    mudGrip: 0.78,
    suspensionStiffness: 52,
    fuelTankLiters: 65,
    chassisWidth: 2.0,
    chassisLength: 4.62,
    chassisHeight: 0.84,
    wheelRadius: 0.44,
    wheelWidth: 0.29,
    wheelBase: 2.82,
    trackWidth: 1.78,
    groundClearance: 0.52,
    style: 'scorpio',
    engineSound: 'suv',
    garageAvailable: true,
    stats: { speed: 86, offroad: 80, torque: 86, suspension: 84 },
  },
  {
    id: 'toyota_fortuner',
    name: 'Fortuner Legender',
    subtitle: 'Flagship luxury 4x4 powerhouse for Munish House VIPs',
    price: 340,
    defaultColor: '#ece9e1',
    maxSpeedKmh: 148,
    engineForce: 39,
    brakingPower: 1.14,
    steeringGrip: 1.06,
    massKg: 2280,
    mudGrip: 0.88,
    suspensionStiffness: 56,
    fuelTankLiters: 80,
    chassisWidth: 2.08,
    chassisLength: 4.78,
    chassisHeight: 0.86,
    wheelRadius: 0.47,
    wheelWidth: 0.32,
    wheelBase: 2.9,
    trackWidth: 1.84,
    groundClearance: 0.58,
    style: 'fortuner',
    engineSound: 'suv',
    garageAvailable: true,
    stats: { speed: 93, offroad: 89, torque: 92, suspension: 92 },
  },
  {
    id: 'pickup_truck',
    name: 'Kasba Pickup 4x4',
    subtitle: 'Rugged open-bed utility truck for cargo & mud',
    price: 260,
    defaultColor: '#d96b27',
    maxSpeedKmh: 122,
    engineForce: 36,
    brakingPower: 0.96,
    steeringGrip: 0.9,
    massKg: 2380,
    mudGrip: 0.86,
    suspensionStiffness: 46,
    fuelTankLiters: 75,
    chassisWidth: 2.04,
    chassisLength: 5.05,
    chassisHeight: 0.82,
    wheelRadius: 0.48,
    wheelWidth: 0.33,
    wheelBase: 3.1,
    trackWidth: 1.84,
    groundClearance: 0.6,
    style: 'pickup',
    engineSound: 'suv',
    garageAvailable: true,
    stats: { speed: 78, offroad: 88, torque: 90, suspension: 86 },
  },
  {
    id: 'heavy_truck',
    name: 'Bharat Heavy Truck',
    subtitle: '6-wheel Indian highway lorry with massive diesel torque',
    price: 420,
    defaultColor: '#224f8c',
    maxSpeedKmh: 96,
    engineForce: 28,
    brakingPower: 0.82,
    steeringGrip: 0.78,
    massKg: 6800,
    mudGrip: 0.74,
    suspensionStiffness: 40,
    fuelTankLiters: 140,
    chassisWidth: 2.38,
    chassisLength: 6.4,
    chassisHeight: 1.45,
    wheelRadius: 0.56,
    wheelWidth: 0.36,
    wheelBase: 3.9,
    trackWidth: 2.08,
    groundClearance: 0.64,
    style: 'truck',
    engineSound: 'heavy_diesel',
    garageAvailable: true,
    stats: { speed: 62, offroad: 75, torque: 99, suspension: 76 },
  },
];

// Additional drivable traffic/world vehicle archetypes (enterable via E anywhere in Kasbapur!)
export const TRAFFIC_ARCHETYPES: VehicleConfig[] = [
  {
    id: 'hatchback_car',
    name: 'City Hatchback',
    subtitle: 'Nimble compact commuter',
    price: 0,
    defaultColor: '#2a7b88',
    maxSpeedKmh: 128,
    engineForce: 30,
    brakingPower: 1.12,
    steeringGrip: 1.12,
    massKg: 1020,
    mudGrip: 0.4,
    suspensionStiffness: 58,
    fuelTankLiters: 38,
    chassisWidth: 1.72,
    chassisLength: 3.72,
    chassisHeight: 0.58,
    wheelRadius: 0.33,
    wheelWidth: 0.22,
    wheelBase: 2.38,
    trackWidth: 1.52,
    groundClearance: 0.34,
    style: 'hatchback',
    engineSound: 'sedan',
    garageAvailable: false,
    stats: { speed: 80, offroad: 42, torque: 65, suspension: 66 },
  },
  {
    id: 'city_bus',
    name: 'Kasbapur City Bus',
    subtitle: 'Heavy public transit passenger coach',
    price: 0,
    defaultColor: '#d97724',
    maxSpeedKmh: 88,
    engineForce: 25,
    brakingPower: 0.78,
    steeringGrip: 0.74,
    massKg: 8200,
    mudGrip: 0.55,
    suspensionStiffness: 42,
    fuelTankLiters: 160,
    chassisWidth: 2.42,
    chassisLength: 7.4,
    chassisHeight: 1.65,
    wheelRadius: 0.55,
    wheelWidth: 0.35,
    wheelBase: 4.5,
    trackWidth: 2.12,
    groundClearance: 0.58,
    style: 'bus',
    engineSound: 'heavy_diesel',
    garageAvailable: false,
    stats: { speed: 56, offroad: 52, torque: 96, suspension: 72 },
  },
  {
    id: 'street_moto',
    name: 'Street Motorcycle',
    subtitle: 'Fast two-wheeler for narrow bazaar lanes',
    price: 0,
    defaultColor: '#b92b27',
    maxSpeedKmh: 138,
    engineForce: 38,
    brakingPower: 1.25,
    steeringGrip: 1.28,
    massKg: 210,
    mudGrip: 0.55,
    suspensionStiffness: 55,
    fuelTankLiters: 16,
    chassisWidth: 0.72,
    chassisLength: 2.05,
    chassisHeight: 0.65,
    wheelRadius: 0.32,
    wheelWidth: 0.14,
    wheelBase: 1.38,
    trackWidth: 0.1,
    groundClearance: 0.34,
    style: 'motorcycle',
    engineSound: 'moto',
    garageAvailable: false,
    stats: { speed: 92, offroad: 64, torque: 72, suspension: 74 },
  },
];

export const ALL_VEHICLE_CONFIGS: VehicleConfig[] = [...VEHICLES, ...TRAFFIC_ARCHETYPES];

export function findVehicleConfig(id: string): VehicleConfig {
  return ALL_VEHICLE_CONFIGS.find((v) => v.id === id) || VEHICLES[0];
}

export interface MissionDef {
  id: string;
  title: string;
  description: string;
  rewardCoins: number;
  timeLimitSec: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  checkpoints: Array<{ x: number; z: number; label: string }>;
}

export const MISSIONS: MissionDef[] = [
  {
    id: 'gate_to_munish',
    title: 'Grand Entry to Munish House',
    description: 'Drive through the Kasbapur City Gate and reach Munish House estate.',
    rewardCoins: 110,
    timeLimitSec: 70,
    difficulty: 'Easy',
    checkpoints: [
      { x: 0, z: -108, label: 'Kasbapur Gate' },
      { x: 0, z: -78, label: 'Avenue Junction' },
      { x: 26, z: -78, label: 'Munish Driveway' },
      { x: 42, z: -78, label: 'Munish House Gate' },
    ],
  },
  {
    id: 'bazaar_dash',
    title: 'Kasbapur Bazaar Sprint',
    description: 'Race from Bazaar Chowk across the Stone Bridge to East Market.',
    rewardCoins: 120,
    timeLimitSec: 75,
    difficulty: 'Easy',
    checkpoints: [
      { x: 0, z: -32, label: 'Bazaar North' },
      { x: 35, z: -12, label: 'Bazaar Chowk' },
      { x: 75, z: -8, label: 'Stone Bridge' },
      { x: 118, z: -16, label: 'East Market' },
    ],
  },
  {
    id: 'muddy_creek',
    title: 'Muddy Creek Trail',
    description: 'Conquer the deep mud bog loop and cross the shallow river ford.',
    rewardCoins: 150,
    timeLimitSec: 95,
    difficulty: 'Medium',
    checkpoints: [
      { x: -62, z: 38, label: 'Mud Entry' },
      { x: -102, z: 75, label: 'Deep Mire' },
      { x: -58, z: 108, label: 'Creek Bend' },
      { x: 8, z: 92, label: 'River Ford' },
    ],
  },
  {
    id: 'eagle_peak',
    title: 'Eagle Peak Summit Climb',
    description: 'Scale the steep dirt switchbacks up to the Kasbapur mountain summit.',
    rewardCoins: 240,
    timeLimitSec: 125,
    difficulty: 'Hard',
    checkpoints: [
      { x: -95, z: -88, label: 'Foothill Base' },
      { x: -142, z: -125, label: 'Switchback Ridge' },
      { x: -178, z: -156, label: 'Cliff Approach' },
      { x: -195, z: -188, label: 'Eagle Peak Summit' },
    ],
  },
];

export interface HiddenLocationDef {
  id: string;
  name: string;
  description: string;
  x: number;
  z: number;
  radius: number;
  rewardCoins: number;
}

export const HIDDEN_LOCATIONS: HiddenLocationDef[] = [
  {
    id: 'munish_house_estate',
    name: 'Munish House Mansion',
    description: 'Kasbapur’s grandest landmark estate with private guards and manicured gardens.',
    x: 46,
    z: -78,
    radius: 22,
    rewardCoins: 80,
  },
  {
    id: 'old_fort',
    name: 'Kasbapur Old Watchtower',
    description: 'Ancient sandstone bastion overlooking the northern valley.',
    x: 158,
    z: -154,
    radius: 16,
    rewardCoins: 75,
  },
  {
    id: 'banyan_shrine',
    name: 'Banyan Grove Shrine',
    description: 'Quiet forest clearing beneath giant sacred banyan trees.',
    x: 148,
    z: 115,
    radius: 15,
    rewardCoins: 75,
  },
  {
    id: 'eagle_peak_lookout',
    name: 'Eagle Peak Lookout',
    description: 'The highest summit above Kasbapur with sweeping valley views.',
    x: -195,
    z: -188,
    radius: 16,
    rewardCoins: 100,
  },
];

export interface GameSettings {
  timePreset: TimePreset;
  dayCycleSpeed: number;
  shadows: boolean;
  soundVolume: number;
  touchControls: TouchMode;
  cameraSmoothing: number;
  transmissionMode: TransmissionMode;
  trafficDensity: TrafficDensity;
  weatherMode: WeatherMode;
}

export interface ControlInput {
  throttle: number; // 0..1
  brake: number; // 0..1
  reverse: boolean;
  steer: number; // -1 (right) to +1 (left)
  handbrake: boolean;
  // On-foot movement
  walkX: number; // -1 left .. +1 right relative to camera
  walkY: number; // +1 forward .. -1 backward relative to camera
  sprint: boolean;
  jump: boolean;
}

export interface ActiveMissionState {
  missionId: string;
  title: string;
  checkpointIndex: number;
  totalCheckpoints: number;
  checkpointLabel: string;
  remainingSec: number;
  distanceToNextM: number;
}

export interface MinimapBlip {
  x: number;
  z: number;
  kind: 'traffic' | 'parked' | 'npc' | 'guard';
}

export interface LiveTelemetry {
  speedKmh: number;
  isOnFoot: boolean;
  vehicleName: string;
  selectedGear: GearValue;
  actualGear: string;
  transmissionMode: TransmissionMode;
  engineRunning: boolean;
  gearShiftPulse: number; // incremented on shift for UI animation
  rpmNorm: number; // 0..1
  fuelPct: number; // 0..100
  surface: SurfaceType;
  zoneName: string;
  timeHours: number;
  weatherLabel: string;
  headlightsOn: boolean;
  cameraMode: CameraMode;
  coins: number;
  nearbyVehicleName: string | null;
  activeMission: ActiveMissionState | null;
  playerX: number;
  playerZ: number;
  playerHeading: number;
  minimapBlips: MinimapBlip[];
  notification: { id: number; title: string; subtitle: string; tone: 'gold' | 'green' | 'amber' } | null;
}

export interface SaveProgress {
  coins: number;
  unlockedVehicles: string[];
  selectedVehicleId: string;
  vehicleColors: Record<string, string>;
  completedMissions: string[];
  discoveredLocations: string[];
  collectedCoinIds: number[];
  settings: GameSettings;
}
