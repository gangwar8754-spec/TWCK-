import React from 'react';
import { ArrowLeft, Check, Lock, Play } from 'lucide-react';
import { PAINT_SWATCHES, SaveProgress, VEHICLES, VehicleConfig } from '../game/types';

interface GarageViewProps {
  progress: SaveProgress;
  previewVehicleId: string;
  onPreviewVehicle: (vehicleId: string) => void;
  onSelectColor: (vehicleId: string, hex: string) => void;
  onUnlockOrEquip: (vehicle: VehicleConfig) => void;
  onDriveNow: () => void;
  onBack: () => void;
}

export const GarageView: React.FC<GarageViewProps> = ({
  progress,
  previewVehicleId,
  onPreviewVehicle,
  onSelectColor,
  onUnlockOrEquip,
  onDriveNow,
  onBack,
}) => {
  const vehicle = VEHICLES.find((v) => v.id === previewVehicleId) || VEHICLES[0];
  const isUnlocked = progress.unlockedVehicles.includes(vehicle.id);
  const isEquipped = progress.selectedVehicleId === vehicle.id;
  const activeColor = progress.vehicleColors[vehicle.id] || vehicle.defaultColor;
  const canAfford = progress.coins >= vehicle.price;

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-4 sm:p-6 pointer-events-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4 pointer-events-auto">
        <button
          onClick={onBack}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0d1219]/90 hover:bg-[#17202b] border border-white/10 text-white text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-amber-400" />
          <span>Back</span>
        </button>

        <div className="text-center hidden sm:block">
          <div className="font-display font-bold text-lg text-white tracking-wide">
            KASBAPUR GARAGE
          </div>
          <div className="text-xs text-slate-300">Drag viewport to inspect vehicle</div>
        </div>

        <div className="px-4 py-2.5 rounded-xl bg-[#0d1219]/90 border border-white/10 font-display font-bold text-amber-400 tabular-nums text-sm sm:text-base whitespace-nowrap shrink-0">
          {progress.coins} Coins
        </div>
      </div>

      {/* Bottom Dock: Keeps center 60%+ unobstructed for the 3D SUV showcase */}
      <div className="w-full max-w-5xl mx-auto bg-[#0d1219]/92 border border-white/10 rounded-2xl p-4 sm:p-5 pointer-events-auto shadow-2xl">
        {/* Vehicle Selector Tabs (6 Rides) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
          {VEHICLES.map((v) => {
            const owned = progress.unlockedVehicles.includes(v.id);
            const active = v.id === vehicle.id;
            return (
              <button
                key={v.id}
                onClick={() => onPreviewVehicle(v.id)}
                className={`min-h-[44px] px-3 py-2 rounded-xl border text-left transition-colors cursor-pointer ${
                  active
                    ? 'bg-amber-500/20 border-amber-400 text-white'
                    : 'bg-[#141c26] border-white/10 text-slate-300 hover:bg-[#1b2633]'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-display font-semibold text-xs sm:text-sm truncate">
                    {v.name}
                  </span>
                  {!owned && <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                  {progress.selectedVehicleId === v.id && (
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  )}
                </div>
                <div className="text-[11px] text-slate-400 tabular-nums mt-0.5">
                  {owned ? 'Owned' : `${v.price} Coins`}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Vehicle Specs + Paint + Action */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-3 border-t border-white/10">
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2.5 flex-wrap">
              <h2 className="font-display text-xl font-bold text-white">{vehicle.name}</h2>
              <span className="text-xs text-slate-400">{vehicle.subtitle}</span>
            </div>

            {/* 4 Clean Stat Bars */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              {[
                { label: 'Speed', val: vehicle.stats.speed },
                { label: 'Off-Road', val: vehicle.stats.offroad },
                { label: 'Torque', val: vehicle.stats.torque },
                { label: 'Suspension', val: vehicle.stats.suspension },
              ].map((s) => (
                <div key={s.label}>
                  <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                    <span>{s.label}</span>
                    <span className="tabular-nums font-semibold">{s.val}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full"
                      style={{ width: `${s.val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Paint Swatches + Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 bg-[#141c26] px-3 py-2 rounded-xl border border-white/10">
              <span className="text-xs text-slate-400 mr-1">Paint</span>
              {PAINT_SWATCHES.map((sw) => (
                <button
                  key={sw.hex}
                  title={sw.name}
                  onClick={() => onSelectColor(vehicle.id, sw.hex)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                    activeColor.toLowerCase() === sw.hex.toLowerCase()
                      ? 'border-white scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: sw.hex }}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {!isUnlocked ? (
                <button
                  onClick={() => onUnlockOrEquip(vehicle)}
                  disabled={!canAfford}
                  className={`min-h-[46px] px-5 py-2.5 rounded-xl font-display font-bold text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    canAfford
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>Unlock ({vehicle.price})</span>
                </button>
              ) : !isEquipped ? (
                <button
                  onClick={() => onUnlockOrEquip(vehicle)}
                  className="min-h-[46px] px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Select Ride</span>
                </button>
              ) : null}

              {isUnlocked && (
                <button
                  onClick={onDriveNow}
                  className="min-h-[46px] px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Drive</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
