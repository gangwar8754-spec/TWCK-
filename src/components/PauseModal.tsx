import React from 'react';
import { Car, Fuel, Home, Map as MapIcon, Play, RotateCcw, Settings, Trophy } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestartPosition: () => void;
  onRefuel: () => void;
  onOpenGarage: () => void;
  onOpenMissions: () => void;
  onOpenMap: () => void;
  onOpenSettings: () => void;
  onExitToMenu: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestartPosition,
  onRefuel,
  onOpenGarage,
  onOpenMissions,
  onOpenMap,
  onOpenSettings,
  onExitToMenu,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/65">
      <div className="w-full max-w-sm bg-[#0d1219] border border-white/15 rounded-2xl p-6 shadow-2xl">
        <h2 className="font-display text-2xl font-bold text-white text-center">
          Game Paused
        </h2>
        <p className="text-xs text-slate-400 text-center mt-1 mb-5">
          KASBAPUR – OFFROAD CITY
        </p>

        <div className="space-y-2.5">
          <button
            onClick={onResume}
            className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Resume Game</span>
          </button>

          <button
            onClick={onOpenMap}
            className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-[#141c26] hover:bg-[#1c2735] border border-white/10 text-white text-sm font-medium flex items-center justify-center gap-2 cursor-pointer"
          >
            <MapIcon className="w-4 h-4 text-sky-400" />
            <span>Kasbapur City Map (M)</span>
          </button>

          <button
            onClick={onOpenGarage}
            className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-[#141c26] hover:bg-[#1c2735] border border-white/10 text-white text-sm font-medium flex items-center justify-center gap-2 cursor-pointer"
          >
            <Car className="w-4 h-4 text-amber-400" />
            <span>Garage &amp; Vehicles</span>
          </button>

          <button
            onClick={onOpenMissions}
            className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-[#141c26] hover:bg-[#1c2735] border border-white/10 text-white text-sm font-medium flex items-center justify-center gap-2 cursor-pointer"
          >
            <Trophy className="w-4 h-4 text-emerald-400" />
            <span>Missions</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onRestartPosition}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-[#141c26] hover:bg-[#1c2735] border border-white/10 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>City Gate</span>
            </button>
            <button
              onClick={onRefuel}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-[#141c26] hover:bg-[#1c2735] border border-white/10 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Fuel className="w-3.5 h-3.5 text-emerald-400" />
              <span>Refuel 100%</span>
            </button>
          </div>

          <button
            onClick={onOpenSettings}
            className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-[#141c26] hover:bg-[#1c2735] border border-white/10 text-white text-sm font-medium flex items-center justify-center gap-2 cursor-pointer"
          >
            <Settings className="w-4 h-4 text-slate-300" />
            <span>Settings</span>
          </button>

          <button
            onClick={onExitToMenu}
            className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/30 text-rose-200 text-sm font-medium flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Main Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
