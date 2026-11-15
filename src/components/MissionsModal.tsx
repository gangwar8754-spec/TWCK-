import React from 'react';
import { CheckCircle2, Compass, Play, X } from 'lucide-react';
import { HIDDEN_LOCATIONS, MISSIONS, SaveProgress } from '../game/types';

interface MissionsModalProps {
  progress: SaveProgress;
  activeMissionId: string | null;
  onStartMission: (missionId: string) => void;
  onClose: () => void;
}

export const MissionsModal: React.FC<MissionsModalProps> = ({
  progress,
  activeMissionId,
  onStartMission,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/65">
      <div className="w-full max-w-2xl max-h-[88vh] flex flex-col bg-[#0d1219] border border-white/15 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="font-display text-xl font-bold text-white">
              Kasbapur Missions &amp; Landmarks
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Complete off-road challenges and discover hidden sites to earn coins
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Missions"
            className="min-h-[44px] min-w-[44px] rounded-xl hover:bg-white/10 text-slate-300 flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Off-Road Challenges */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-3">
              Off-Road Challenges
            </h3>
            <div className="space-y-3">
              {MISSIONS.map((m) => {
                const completed = progress.completedMissions.includes(m.id);
                const isRunning = activeMissionId === m.id;
                return (
                  <div
                    key={m.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#141c26] border border-white/10"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-base text-white">
                          {m.title}
                        </span>
                        {completed && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                      </div>
                      <p className="text-xs text-slate-300 mt-1">{m.description}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-2 tabular-nums">
                        <span>{m.difficulty}</span>
                        <span aria-hidden="true">·</span>
                        <span>{m.checkpoints.length} Checkpoints</span>
                        <span aria-hidden="true">·</span>
                        <span>{m.timeLimitSec}s Limit</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-amber-400 font-semibold">+{m.rewardCoins} Coins</span>
                      </div>
                    </div>

                    <button
                      onClick={() => onStartMission(m.id)}
                      className={`min-h-[44px] px-4 py-2 rounded-xl font-display font-bold text-xs flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                        isRunning
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isRunning ? 'Restart' : 'Start Mission'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hidden Landmarks */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-3">
              Hidden Locations ({progress.discoveredLocations.length}/{HIDDEN_LOCATIONS.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {HIDDEN_LOCATIONS.map((loc) => {
                const found = progress.discoveredLocations.includes(loc.id);
                return (
                  <div
                    key={loc.id}
                    className="p-3.5 rounded-xl bg-[#141c26] border border-white/10"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display font-semibold text-sm text-white flex items-center gap-1.5">
                        <Compass className={`w-4 h-4 ${found ? 'text-emerald-400' : 'text-slate-500'}`} />
                        {loc.name}
                      </span>
                      <span className="text-xs tabular-nums text-amber-400 font-semibold">
                        +{loc.rewardCoins}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {found ? loc.description : 'Explore Kasbapur countryside & peaks to discover.'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
