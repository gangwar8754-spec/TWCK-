import React from 'react';
import { Car, Compass, MapPin, Play, Settings, Trophy } from 'lucide-react';
import { HIDDEN_LOCATIONS, MISSIONS, SaveProgress, VEHICLES } from '../game/types';

interface MainMenuProps {
  progress: SaveProgress;
  onStartGame: () => void;
  onOpenGarage: () => void;
  onOpenMissions: () => void;
  onOpenSettings: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  progress,
  onStartGame,
  onOpenGarage,
  onOpenMissions,
  onOpenSettings,
}) => {
  const currentVehicle = VEHICLES.find((v) => v.id === progress.selectedVehicleId) || VEHICLES[0];

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-4 sm:p-8 pointer-events-none">
      {/* Top Bar: Clean 2-side status & settings */}
      <div className="flex items-center justify-between gap-4 pointer-events-auto">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#0d1219]/90 border border-white/10">
          <span className="font-display font-bold text-amber-400 tabular-nums text-base">
            {progress.coins} Coins
          </span>
          <span className="text-slate-500" aria-hidden="true">·</span>
          <span className="text-xs sm:text-sm text-slate-300 whitespace-nowrap">
            {progress.unlockedVehicles.length}/{VEHICLES.length} Rides
          </span>
          <span className="hidden sm:inline text-slate-500" aria-hidden="true">·</span>
          <span className="hidden sm:inline text-xs sm:text-sm text-slate-300 whitespace-nowrap">
            {progress.discoveredLocations.length}/{HIDDEN_LOCATIONS.length} Landmarks
          </span>
        </div>

        <button
          onClick={onOpenSettings}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0d1219]/90 hover:bg-[#17202b] border border-white/10 text-slate-100 text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Settings className="w-4 h-4 text-amber-400" />
          <span>Settings</span>
        </button>
      </div>

      {/* Left/Bottom Hero Title & Action Dock — Leaves center-right Kasbapur panorama visible */}
      <div className="max-w-xl bg-[#0d1219]/90 border border-white/10 rounded-2xl p-6 sm:p-8 pointer-events-auto shadow-2xl">
        <div className="text-xs font-semibold tracking-wider text-amber-400 uppercase mb-2">
          Open-World Indian 4x4 Expedition
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white leading-none">
          KASBAPUR
        </h1>
        <p className="font-display text-lg sm:text-xl font-semibold text-amber-300/90 mt-1">
          OFFROAD CITY
        </p>

        <p className="text-sm sm:text-base text-slate-300 mt-4 leading-relaxed">
          Enter through the grand Kasbapur City Gate, visit Munish House estate, step out on foot to hijack or switch rides, shift realistic gears, and conquer mud &amp; mountain trails.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
          <span>Active Rig: <strong className="text-slate-200">{currentVehicle.name}</strong></span>
          <span aria-hidden="true">·</span>
          <span>Missions: <strong className="text-slate-200">{progress.completedMissions.length}/{MISSIONS.length}</strong></span>
        </div>

        {/* Primary Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={onStartGame}
            className="min-h-[48px] px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-display font-bold text-base tracking-wide flex items-center gap-2.5 transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Start Game</span>
          </button>

          <button
            onClick={onOpenGarage}
            className="min-h-[48px] px-5 py-3 rounded-xl bg-[#18212c] hover:bg-[#212d3b] border border-white/10 text-white font-semibold text-sm flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Car className="w-4 h-4 text-amber-400" />
            <span>Garage</span>
          </button>

          <button
            onClick={onOpenMissions}
            className="min-h-[48px] px-5 py-3 rounded-xl bg-[#18212c] hover:bg-[#212d3b] border border-white/10 text-white font-semibold text-sm flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Trophy className="w-4 h-4 text-emerald-400" />
            <span>Missions</span>
          </button>
        </div>

        {/* Clean Keyboard / Touch Hint */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            PC: WASD Drive/Walk · E Enter/Exit · Q/F or 1-4 Gears · G Auto/Man · M Map
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            Mobile: Touch controls, gear selector &amp; walk joystick
          </span>
        </div>
      </div>
    </div>
  );
};
