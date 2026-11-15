/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { CityMapModal } from './components/CityMapModal';
import { DrivingHUD } from './components/DrivingHUD';
import { GarageView } from './components/GarageView';
import { MainMenu } from './components/MainMenu';
import { MissionsModal } from './components/MissionsModal';
import { PauseModal } from './components/PauseModal';
import { SettingsModal } from './components/SettingsModal';
import { KasbapurEngine } from './game/KasbapurEngine';
import { loadProgress, saveProgress } from './game/storage';
import {
  ControlInput,
  GameScreen,
  GameSettings,
  GearValue,
  LiveTelemetry,
  SaveProgress,
  VEHICLES,
  VehicleConfig,
} from './game/types';

const INITIAL_TELEMETRY: LiveTelemetry = {
  speedKmh: 0,
  isOnFoot: false,
  vehicleName: VEHICLES[0].name,
  selectedGear: '1',
  actualGear: '1',
  transmissionMode: 'manual',
  engineRunning: true,
  gearShiftPulse: 0,
  rpmNorm: 0.16,
  fuelPct: 100,
  surface: 'asphalt',
  zoneName: 'Kasbapur Entry Highway',
  timeHours: 17.3,
  weatherLabel: 'Clear Sky',
  headlightsOn: false,
  cameraMode: 'chase',
  coins: 60,
  nearbyVehicleName: null,
  activeMission: null,
  playerX: 0,
  playerZ: -138,
  playerHeading: 0,
  minimapBlips: [],
  notification: null,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<KasbapurEngine | null>(null);

  const [progress, setProgress] = useState<SaveProgress>(() => loadProgress());
  const progressRef = useRef<SaveProgress>(progress);

  const [screen, setScreen] = useState<GameScreen>('menu');
  const [garagePreviewId, setGaragePreviewId] = useState<string>(progress.selectedVehicleId);
  const [showMissions, setShowMissions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [telemetry, setTelemetry] = useState<LiveTelemetry>({
    ...INITIAL_TELEMETRY,
    coins: progress.coins,
    transmissionMode: progress.settings.transmissionMode,
    selectedGear: progress.settings.transmissionMode === 'manual' ? '1' : 'D',
  });

  const commitProgress = useCallback((updater: (prev: SaveProgress) => SaveProgress) => {
    setProgress((prev) => {
      const next = updater(prev);
      progressRef.current = next;
      saveProgress(next);
      return next;
    });
  }, []);

  // Mount Three.js engine once in isolated container ref
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const initial = progressRef.current;
    const initialColor =
      initial.vehicleColors[initial.selectedVehicleId] ||
      VEHICLES.find((v) => v.id === initial.selectedVehicleId)?.defaultColor ||
      VEHICLES[0].defaultColor;

    const engine = new KasbapurEngine(
      mount,
      initial.settings,
      initial.selectedVehicleId,
      initialColor,
      initial.coins,
      initial.collectedCoinIds,
      initial.discoveredLocations,
      {
        onTelemetry: (t) => setTelemetry(t),
        onCoinCollected: (coinId, amount) => {
          commitProgress((prev) => ({
            ...prev,
            coins: prev.coins + amount,
            collectedCoinIds: prev.collectedCoinIds.includes(coinId)
              ? prev.collectedCoinIds
              : [...prev.collectedCoinIds, coinId],
          }));
        },
        onLocationDiscovered: (locId, rewardCoins) => {
          commitProgress((prev) => ({
            ...prev,
            coins: prev.coins + rewardCoins,
            discoveredLocations: prev.discoveredLocations.includes(locId)
              ? prev.discoveredLocations
              : [...prev.discoveredLocations, locId],
          }));
        },
        onMissionCompleted: (missionId, rewardCoins) => {
          commitProgress((prev) => ({
            ...prev,
            coins: prev.coins + rewardCoins,
            completedMissions: prev.completedMissions.includes(missionId)
              ? prev.completedMissions
              : [...prev.completedMissions, missionId],
          }));
        },
      },
    );

    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [commitProgress]);

  // Global Shortcuts: Escape = Pause/Close Modals, KeyM = City Map
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyM' && (screen === 'playing' || screen === 'paused')) {
        setShowMap((v) => !v);
        return;
      }
      if (e.code === 'Escape') {
        if (showMap) {
          setShowMap(false);
          return;
        }
        if (showMissions) {
          setShowMissions(false);
          return;
        }
        if (showSettings) {
          setShowSettings(false);
          return;
        }
        setScreen((curr) => {
          const next = curr === 'playing' ? 'paused' : curr === 'paused' ? 'playing' : curr;
          engineRef.current?.setScreen(next);
          return next;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, showMap, showMissions, showSettings]);

  const handleStartGame = useCallback(() => {
    const selId = progressRef.current.selectedVehicleId;
    const col =
      progressRef.current.vehicleColors[selId] ||
      VEHICLES.find((v) => v.id === selId)?.defaultColor ||
      VEHICLES[0].defaultColor;
    engineRef.current?.setVehicle(selId, col);
    setScreen('playing');
    engineRef.current?.setScreen('playing');
  }, []);

  const handleOpenGarage = useCallback(() => {
    const selId = progressRef.current.selectedVehicleId;
    setGaragePreviewId(selId);
    const col =
      progressRef.current.vehicleColors[selId] ||
      VEHICLES.find((v) => v.id === selId)?.defaultColor ||
      VEHICLES[0].defaultColor;
    engineRef.current?.setVehicle(selId, col);
    setScreen('garage');
    engineRef.current?.setScreen('garage');
  }, []);

  const handlePreviewVehicle = useCallback((vehicleId: string) => {
    setGaragePreviewId(vehicleId);
    const col =
      progressRef.current.vehicleColors[vehicleId] ||
      VEHICLES.find((v) => v.id === vehicleId)?.defaultColor ||
      VEHICLES[0].defaultColor;
    engineRef.current?.setVehicle(vehicleId, col);
  }, []);

  const handleSelectColor = useCallback(
    (vehicleId: string, hex: string) => {
      commitProgress((prev) => ({
        ...prev,
        vehicleColors: { ...prev.vehicleColors, [vehicleId]: hex },
      }));
      engineRef.current?.setVehicle(vehicleId, hex);
    },
    [commitProgress],
  );

  const handleUnlockOrEquip = useCallback(
    (vehicle: VehicleConfig) => {
      const owned = progressRef.current.unlockedVehicles.includes(vehicle.id);
      if (!owned) {
        if (progressRef.current.coins < vehicle.price) return;
        commitProgress((prev) => ({
          ...prev,
          coins: prev.coins - vehicle.price,
          unlockedVehicles: [...prev.unlockedVehicles, vehicle.id],
          selectedVehicleId: vehicle.id,
        }));
      } else {
        commitProgress((prev) => ({
          ...prev,
          selectedVehicleId: vehicle.id,
        }));
      }
      const col = progressRef.current.vehicleColors[vehicle.id] || vehicle.defaultColor;
      engineRef.current?.setVehicle(vehicle.id, col);
    },
    [commitProgress],
  );

  const handleUpdateSettings = useCallback(
    (nextSettings: GameSettings) => {
      commitProgress((prev) => ({ ...prev, settings: nextSettings }));
      engineRef.current?.updateSettings(nextSettings);
    },
    [commitProgress],
  );

  const handleStartMission = useCallback((missionId: string) => {
    setShowMissions(false);
    setShowMap(false);
    setScreen('playing');
    engineRef.current?.setScreen('playing');
    engineRef.current?.startMission(missionId);
  }, []);

  const handleTouchInput = useCallback((partial: Partial<ControlInput>) => {
    engineRef.current?.setTouchInput(partial);
  }, []);

  const handleToggleTransmissionMode = useCallback(() => {
    engineRef.current?.toggleTransmissionMode();
    commitProgress((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        transmissionMode: prev.settings.transmissionMode === 'manual' ? 'auto' : 'manual',
      },
    }));
  }, [commitProgress]);

  const handleSetGear = useCallback((g: GearValue) => {
    engineRef.current?.setGear(g);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0b0f14]">
      {/* Dedicated WebGL Mount Container (never unmounted by React UI state) */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full" />

      {screen === 'menu' && (
        <MainMenu
          progress={progress}
          onStartGame={handleStartGame}
          onOpenGarage={handleOpenGarage}
          onOpenMissions={() => setShowMissions(true)}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {screen === 'garage' && (
        <GarageView
          progress={progress}
          previewVehicleId={garagePreviewId}
          onPreviewVehicle={handlePreviewVehicle}
          onSelectColor={handleSelectColor}
          onUnlockOrEquip={handleUnlockOrEquip}
          onDriveNow={handleStartGame}
          onBack={() => {
            const selId = progressRef.current.selectedVehicleId;
            const col =
              progressRef.current.vehicleColors[selId] ||
              VEHICLES.find((v) => v.id === selId)?.defaultColor ||
              VEHICLES[0].defaultColor;
            engineRef.current?.setVehicle(selId, col);
            setScreen('menu');
            engineRef.current?.setScreen('menu');
          }}
        />
      )}

      {(screen === 'playing' || screen === 'paused') && (
        <DrivingHUD
          telemetry={telemetry}
          touchMode={progress.settings.touchControls}
          onPause={() => {
            setScreen('paused');
            engineRef.current?.setScreen('paused');
          }}
          onCycleCamera={() => engineRef.current?.cycleCamera()}
          onToggleHeadlights={() => engineRef.current?.toggleHeadlights()}
          onOpenMissions={() => setShowMissions(true)}
          onCancelMission={() => engineRef.current?.cancelMission()}
          onOpenMap={() => setShowMap(true)}
          onResetCar={() => engineRef.current?.resetVehicleToTownGate()}
          onToggleEnterExit={() => engineRef.current?.toggleEnterExitVehicle()}
          onSetGear={handleSetGear}
          onShiftGear={(delta) => engineRef.current?.shiftGear(delta)}
          onToggleTransmissionMode={handleToggleTransmissionMode}
          onToggleEngine={() => engineRef.current?.toggleEngine()}
          onTouchInput={handleTouchInput}
        />
      )}

      {screen === 'paused' && !showMissions && !showSettings && !showMap && (
        <PauseModal
          onResume={() => {
            setScreen('playing');
            engineRef.current?.setScreen('playing');
          }}
          onRestartPosition={() => {
            engineRef.current?.resetVehicleToTownGate();
            setScreen('playing');
            engineRef.current?.setScreen('playing');
          }}
          onRefuel={() => {
            engineRef.current?.refuelFull();
            setScreen('playing');
            engineRef.current?.setScreen('playing');
          }}
          onOpenMap={() => setShowMap(true)}
          onOpenGarage={handleOpenGarage}
          onOpenMissions={() => setShowMissions(true)}
          onOpenSettings={() => setShowSettings(true)}
          onExitToMenu={() => {
            setScreen('menu');
            engineRef.current?.setScreen('menu');
          }}
        />
      )}

      {showMap && (
        <CityMapModal
          telemetry={telemetry}
          discoveredLocations={progress.discoveredLocations}
          onClose={() => setShowMap(false)}
        />
      )}

      {showMissions && (
        <MissionsModal
          progress={progress}
          activeMissionId={telemetry.activeMission?.missionId || null}
          onStartMission={handleStartMission}
          onClose={() => setShowMissions(false)}
        />
      )}

      {showSettings && (
        <SettingsModal
          settings={progress.settings}
          onChange={handleUpdateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
