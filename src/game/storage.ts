import { GameSettings, SaveProgress, VEHICLES } from './types';

const STORAGE_KEY = 'kasbapur_offroad_save_v2';

export const DEFAULT_SETTINGS: GameSettings = {
  timePreset: 'golden',
  dayCycleSpeed: 1,
  shadows: true,
  soundVolume: 0.65,
  touchControls: 'auto',
  cameraSmoothing: 1.0,
  transmissionMode: 'manual',
  trafficDensity: 'light',
  weatherMode: 'clear',
};

export function createDefaultProgress(): SaveProgress {
  const defaultColors: Record<string, string> = {};
  for (const v of VEHICLES) {
    defaultColors[v.id] = v.defaultColor;
  }
  return {
    coins: 120,
    unlockedVehicles: ['mahindra_thar'],
    selectedVehicleId: 'mahindra_thar',
    vehicleColors: defaultColors,
    completedMissions: [],
    discoveredLocations: [],
    collectedCoinIds: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function loadProgress(): SaveProgress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultProgress();
    const parsed = JSON.parse(raw) as Partial<SaveProgress>;
    const base = createDefaultProgress();
    return {
      coins: typeof parsed.coins === 'number' ? parsed.coins : base.coins,
      unlockedVehicles: Array.isArray(parsed.unlockedVehicles) && parsed.unlockedVehicles.length > 0
        ? parsed.unlockedVehicles
        : base.unlockedVehicles,
      selectedVehicleId: parsed.selectedVehicleId || base.selectedVehicleId,
      vehicleColors: { ...base.vehicleColors, ...(parsed.vehicleColors || {}) },
      completedMissions: Array.isArray(parsed.completedMissions) ? parsed.completedMissions : [],
      discoveredLocations: Array.isArray(parsed.discoveredLocations) ? parsed.discoveredLocations : [],
      collectedCoinIds: Array.isArray(parsed.collectedCoinIds) ? parsed.collectedCoinIds : [],
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
    };
  } catch {
    return createDefaultProgress();
  }
}

export function saveProgress(progress: SaveProgress): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore quota errors
  }
}
