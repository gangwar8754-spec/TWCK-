import React from 'react';
import { Compass, MapPin, Navigation, X } from 'lucide-react';
import { ASPHALT_SEGMENTS, BRIDGES, BUILDINGS, WORLD_HALF_SIZE, riverCenterX } from '../game/terrain';
import { HIDDEN_LOCATIONS, LiveTelemetry, MISSIONS } from '../game/types';

interface CityMapModalProps {
  telemetry: LiveTelemetry;
  discoveredLocations: string[];
  onClose: () => void;
}

function toMapCoord(worldVal: number): number {
  return ((worldVal + WORLD_HALF_SIZE) / (WORLD_HALF_SIZE * 2)) * 500;
}

export const CityMapModal: React.FC<CityMapModalProps> = ({
  telemetry,
  discoveredLocations,
  onClose,
}) => {
  // Build SVG river path across -280..+280 Z
  const riverPoints: string[] = [];
  for (let z = -280; z <= 280; z += 16) {
    const rx = toMapCoord(riverCenterX(z));
    const rz = toMapCoord(z);
    riverPoints.push(`${rx.toFixed(1)},${rz.toFixed(1)}`);
  }

  const activeMissionDef = telemetry.activeMission
    ? MISSIONS.find((m) => m.id === telemetry.activeMission?.missionId)
    : null;
  const activeCp =
    activeMissionDef && telemetry.activeMission
      ? activeMissionDef.checkpoints[telemetry.activeMission.checkpointIndex]
      : null;

  const px = toMapCoord(telemetry.playerX);
  const pz = toMapCoord(telemetry.playerZ);
  // Three.js heading 0 faces +Z (downward on map where top is North=-Z, bottom is South=+Z)
  const deg = (telemetry.playerHeading * 180) / Math.PI;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-3 sm:p-6 bg-black/75">
      <div className="w-full max-w-3xl bg-[#0d1219] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <Compass className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-white leading-tight">
                Kasbapur City Map
              </h2>
              <p className="text-xs text-slate-400">
                Current Zone: <span className="text-amber-300 font-medium">{telemetry.zoneName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close City Map"
            className="min-h-[40px] min-w-[40px] rounded-xl hover:bg-white/10 text-slate-300 flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Interactive Top-Down Map Canvas */}
        <div className="p-4 flex-1 overflow-auto flex flex-col items-center justify-center bg-[#090d13]">
          <div className="relative w-full max-w-[500px] aspect-square rounded-xl overflow-hidden border border-white/15 bg-[#1b291e]">
            <svg viewBox="0 0 500 500" className="w-full h-full block">
              {/* Mountain / Mud / Forest Zones */}
              <circle cx={toMapCoord(-195)} cy={toMapCoord(-188)} r={75} fill="#3c3730" opacity={0.75} />
              <circle cx={toMapCoord(-85)} cy={toMapCoord(76)} r={48} fill="#3f2b1c" opacity={0.85} />
              <circle cx={toMapCoord(148)} cy={toMapCoord(115)} r={56} fill="#1f4225" opacity={0.8} />

              {/* Kasba River */}
              <polyline
                points={riverPoints.join(' ')}
                fill="none"
                stroke="#1d6d7d"
                strokeWidth={18}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Asphalt Roads & Entry Highway */}
              {ASPHALT_SEGMENTS.map(([ax, az, bx, bz, hw], idx) => (
                <line
                  key={idx}
                  x1={toMapCoord(ax)}
                  y1={toMapCoord(az)}
                  x2={toMapCoord(bx)}
                  y2={toMapCoord(bz)}
                  stroke="#363c46"
                  strokeWidth={Math.max(5, hw * 1.4)}
                  strokeLinecap="round"
                />
              ))}

              {/* Bridges */}
              {BRIDGES.map((br) => (
                <rect
                  key={br.id}
                  x={toMapCoord(br.cx - br.length * 0.5)}
                  y={toMapCoord(br.cz - br.width * 0.5)}
                  width={(br.length / (WORLD_HALF_SIZE * 2)) * 500}
                  height={(br.width / (WORLD_HALF_SIZE * 2)) * 500}
                  fill="#b5946b"
                  rx={1.5}
                />
              ))}

              {/* Buildings & Munish House */}
              {BUILDINGS.map((b) => {
                const bw = Math.max(4, (b.width / (WORLD_HALF_SIZE * 2)) * 500);
                const bd = Math.max(4, (b.depth / (WORLD_HALF_SIZE * 2)) * 500);
                return (
                  <rect
                    key={b.id}
                    x={toMapCoord(b.cx) - bw * 0.5}
                    y={toMapCoord(b.cz) - bd * 0.5}
                    width={bw}
                    height={bd}
                    fill={
                      b.type === 'munish'
                        ? '#f2d07b'
                        : b.type === 'gate'
                        ? '#e67e22'
                        : b.type === 'fuel'
                        ? '#ef4444'
                        : '#94a3b8'
                    }
                    rx={1.5}
                  />
                );
              })}

              {/* Traffic & Parked Vehicles & Guards */}
              {telemetry.minimapBlips.map((b, i) => {
                const bx = toMapCoord(b.x);
                const bz = toMapCoord(b.z);
                if (b.kind === 'traffic') {
                  return <circle key={i} cx={bx} cy={bz} r={2.4} fill="#38bdf8" />;
                }
                if (b.kind === 'parked') {
                  return <rect key={i} x={bx - 2.3} y={bz - 2.3} width={4.6} height={4.6} fill="#facc15" rx={1} />;
                }
                if (b.kind === 'guard') {
                  return <circle key={i} cx={bx} cy={bz} r={1.8} fill="#fb7185" />;
                }
                return null;
              })}

              {/* Hidden Location Pins */}
              {HIDDEN_LOCATIONS.map((loc) => {
                const found = discoveredLocations.includes(loc.id);
                return (
                  <circle
                    key={loc.id}
                    cx={toMapCoord(loc.x)}
                    cy={toMapCoord(loc.z)}
                    r={4.2}
                    fill={found ? '#10b981' : '#f59e0b'}
                    stroke="#0d1219"
                    strokeWidth={1.2}
                  />
                );
              })}

              {/* Active Mission Checkpoint */}
              {activeCp && (
                <circle
                  cx={toMapCoord(activeCp.x)}
                  cy={toMapCoord(activeCp.z)}
                  r={7}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth={2.5}
                />
              )}

              {/* District Labels */}
              <g fontSize="9.5" fontWeight="700" fill="#fef3c7" textAnchor="middle">
                <text x={toMapCoord(0)} y={toMapCoord(-120)}>KASBAPUR GATE</text>
                <text x={toMapCoord(48)} y={toMapCoord(-96)} fill="#fde047">MUNISH HOUSE</text>
                <text x={toMapCoord(0)} y={toMapCoord(18)}>BAZAAR</text>
                <text x={toMapCoord(122)} y={toMapCoord(-28)}>EAST MARKET</text>
                <text x={toMapCoord(-85)} y={toMapCoord(76)} fill="#fed7aa">MUDDY CREEK</text>
                <text x={toMapCoord(148)} y={toMapCoord(115)} fill="#bbf7d0">BANYAN FOREST</text>
                <text x={toMapCoord(-195)} y={toMapCoord(-188)}>EAGLE PEAK</text>
              </g>

              {/* Player Arrow (facing South/+Z at rotation=0) */}
              <g transform={`translate(${px}, ${pz}) rotate(${-deg})`}>
                <polygon points="0,7 -5,-5 0,-2.5 5,-5" fill="#ffffff" stroke="#f59e0b" strokeWidth={1.6} />
              </g>
            </svg>
          </div>
        </div>

        {/* Footer Legend */}
        <div className="px-5 py-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-amber-400" />
              Player
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-yellow-400 inline-block" />
              Parked Cars (Press E)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
              Traffic
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              Landmarks / Missions
            </span>
          </div>
          <span className="text-slate-400">Press M or Esc to close</span>
        </div>
      </div>
    </div>
  );
};
