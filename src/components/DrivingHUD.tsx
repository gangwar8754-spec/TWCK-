import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  DoorOpen,
  Fuel,
  Lightbulb,
  Map as MapIcon,
  Pause,
  Power,
  RotateCcw,
  Trophy,
  X,
} from 'lucide-react';
import { ControlInput, GearValue, LiveTelemetry, TouchMode } from '../game/types';

interface DrivingHUDProps {
  telemetry: LiveTelemetry;
  touchMode: TouchMode;
  onPause: () => void;
  onCycleCamera: () => void;
  onToggleHeadlights: () => void;
  onOpenMissions: () => void;
  onCancelMission: () => void;
  onOpenMap: () => void;
  onResetCar: () => void;
  onToggleEnterExit: () => void;
  onSetGear: (g: GearValue) => void;
  onShiftGear: (delta: 1 | -1) => void;
  onToggleTransmissionMode: () => void;
  onToggleEngine: () => void;
  onTouchInput: (partial: Partial<ControlInput>) => void;
}

const ALL_GEARS: GearValue[] = ['P', 'R', 'N', 'D', '1', '2', '3', '4'];

function formatTime(hours: number): string {
  const h = Math.floor(hours) % 24;
  const m = Math.floor((hours - Math.floor(hours)) * 60);
  const hh = h % 12 === 0 ? 12 : h % 12;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${hh}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export const DrivingHUD: React.FC<DrivingHUDProps> = ({
  telemetry,
  touchMode,
  onPause,
  onCycleCamera,
  onToggleHeadlights,
  onOpenMissions,
  onCancelMission,
  onOpenMap,
  onResetCar,
  onToggleEnterExit,
  onSetGear,
  onShiftGear,
  onToggleTransmissionMode,
  onToggleEngine,
  onTouchInput,
}) => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [sprintToggle, setSprintToggle] = useState(false);

  useEffect(() => {
    const coarse =
      window.matchMedia?.('(pointer: coarse)').matches ||
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0;
    setIsTouchDevice(Boolean(coarse));
  }, []);

  const showTouchControls = touchMode === 'always' || (touchMode === 'auto' && isTouchDevice);

  const [steerLeft, setSteerLeft] = useState(false);
  const [steerRight, setSteerRight] = useState(false);

  useEffect(() => {
    const steer = (steerLeft ? 1 : 0) - (steerRight ? 1 : 0);
    onTouchInput({ steer });
  }, [steerLeft, steerRight, onTouchInput]);

  useEffect(() => {
    onTouchInput({ sprint: sprintToggle });
  }, [sprintToggle, onTouchInput]);

  // Touch Walk Joystick state
  const joyRef = useRef<HTMLDivElement | null>(null);
  const [joyKnob, setJoyKnob] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const joyActiveRef = useRef(false);

  const updateJoystick = (clientX: number, clientY: number) => {
    const el = joyRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;
    const maxR = rect.width * 0.4;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setJoyKnob({ x: dx, y: dy });
    onTouchInput({
      walkX: dx / maxR,
      walkY: -dy / maxR, // up on screen is positive forward
    });
  };

  const resetJoystick = () => {
    joyActiveRef.current = false;
    setJoyKnob({ x: 0, y: 0 });
    onTouchInput({ walkX: 0, walkY: 0 });
  };

  const bindHold = (onChange: (pressed: boolean) => void) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      onChange(true);
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      onChange(false);
    },
    onPointerCancel: () => onChange(false),
    onLostPointerCapture: () => onChange(false),
  });

  const surfaceLabels: Record<string, string> = {
    asphalt: 'Paved Street',
    bridge: 'Bridge Deck',
    dirt: 'Dirt Trail',
    mud: 'Deep Mud',
    water: 'River Ford',
    grass: 'Countryside',
  };

  const fuelLow = telemetry.fuelPct <= 18;
  const radarScale = 0.55; // 100px radar -> ~90m radius

  return (
    <div className="fixed inset-0 z-10 flex flex-col justify-between p-2.5 sm:p-4 pointer-events-none select-none">
      {/* Top Bar */}
      <div className="flex items-start justify-between gap-2">
        {/* Left Quick Actions + Compact Minimap */}
        <div className="flex flex-col items-start gap-2 pointer-events-auto">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              onClick={onPause}
              aria-label="Pause Game"
              className="min-h-[42px] min-w-[42px] px-2.5 sm:px-3 py-2 rounded-xl bg-[#0d1219]/90 hover:bg-[#17202b] border border-white/15 text-white flex items-center justify-center gap-1.5 text-xs sm:text-sm font-medium cursor-pointer"
            >
              <Pause className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline">Pause</span>
            </button>

            <button
              onClick={onCycleCamera}
              aria-label="Change Camera"
              className="min-h-[42px] min-w-[42px] px-2.5 sm:px-3 py-2 rounded-xl bg-[#0d1219]/90 hover:bg-[#17202b] border border-white/15 text-white flex items-center justify-center gap-1.5 text-xs sm:text-sm font-medium cursor-pointer"
            >
              <Camera className="w-4 h-4 text-amber-400" />
              <span className="hidden lg:inline capitalize">{telemetry.cameraMode}</span>
            </button>

            <button
              onClick={onToggleHeadlights}
              aria-label="Toggle Headlights"
              className={`min-h-[42px] min-w-[42px] px-2.5 py-2 rounded-xl border flex items-center justify-center text-xs cursor-pointer ${
                telemetry.headlightsOn
                  ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                  : 'bg-[#0d1219]/90 border-white/15 text-slate-300'
              }`}
            >
              <Lightbulb className="w-4 h-4" />
            </button>

            <button
              onClick={onResetCar}
              title="Reset to Kasbapur Gate (R)"
              aria-label="Reset Vehicle"
              className="min-h-[42px] min-w-[42px] px-2.5 py-2 rounded-xl bg-[#0d1219]/90 hover:bg-[#17202b] border border-white/15 text-slate-200 flex items-center justify-center cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenMap}
              title="City Map (M)"
              aria-label="Open City Map"
              className="min-h-[42px] px-2.5 sm:px-3 py-2 rounded-xl bg-[#0d1219]/90 hover:bg-[#17202b] border border-white/15 text-white flex items-center justify-center gap-1.5 text-xs font-medium cursor-pointer"
            >
              <MapIcon className="w-4 h-4 text-sky-400" />
              <span className="hidden sm:inline">Map</span>
            </button>
          </div>

          {/* Live Minimap Radar (clickable to open Full City Map) */}
          <button
            onClick={onOpenMap}
            title="Click to open full Kasbapur Map (M)"
            className="hidden sm:block relative w-24 h-24 rounded-2xl bg-[#0d1219]/90 border border-white/15 overflow-hidden cursor-pointer hover:border-amber-400/60 transition-colors"
          >
            <svg viewBox="-55 -55 110 110" className="w-full h-full">
              <circle cx={0} cy={0} r={54} fill="#121c18" />
              <line x1={-55} y1={0} x2={55} y2={0} stroke="rgba(255,255,255,0.08)" strokeWidth={0.8} />
              <line x1={0} y1={-55} x2={0} y2={55} stroke="rgba(255,255,255,0.08)" strokeWidth={0.8} />
              {/* Nearby blips rotated or world-aligned */}
              {telemetry.minimapBlips.map((b, i) => {
                const dx = (b.x - telemetry.playerX) * radarScale;
                const dz = (b.z - telemetry.playerZ) * radarScale;
                if (Math.abs(dx) > 52 || Math.abs(dz) > 52) return null;
                if (b.kind === 'traffic') {
                  return <circle key={i} cx={dx} cy={dz} r={2.2} fill="#38bdf8" />;
                }
                if (b.kind === 'parked') {
                  return <rect key={i} x={dx - 2} y={dz - 2} width={4} height={4} fill="#facc15" rx={0.8} />;
                }
                if (b.kind === 'guard') {
                  return <circle key={i} cx={dx} cy={dz} r={1.8} fill="#fb7185" />;
                }
                return <circle key={i} cx={dx} cy={dz} r={1.3} fill="#94a3b8" opacity={0.75} />;
              })}
              {/* Player Arrow */}
              <g transform={`rotate(${-((telemetry.playerHeading * 180) / Math.PI)})`}>
                <polygon points="0,5.5 -4,-4 0,-1.8 4,-4" fill="#ffffff" stroke="#f59e0b" strokeWidth={1.2} />
              </g>
            </svg>
            <span className="absolute bottom-1 right-1.5 text-[9px] font-bold text-slate-400">N↑</span>
          </button>
        </div>

        {/* Center Zone + Time + Weather */}
        <div className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0d1219]/88 border border-white/15 text-xs text-slate-200">
          <span className="font-semibold text-white">{telemetry.zoneName}</span>
          <span className="text-slate-500" aria-hidden="true">·</span>
          <span className="tabular-nums text-amber-300">{formatTime(telemetry.timeHours)}</span>
          <span className="text-slate-500" aria-hidden="true">·</span>
          <span className="text-sky-300">{telemetry.weatherLabel}</span>
          <span className="text-slate-500" aria-hidden="true">·</span>
          <span className="text-slate-300">
            {telemetry.isOnFoot ? 'Walking' : surfaceLabels[telemetry.surface] || telemetry.surface}
          </span>
        </div>

        {/* Right: Coins + Missions */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#0d1219]/90 border border-white/15 flex items-center font-display font-bold text-amber-400 tabular-nums text-xs sm:text-sm">
            {telemetry.coins} Coins
          </div>

          <button
            onClick={onOpenMissions}
            className="min-h-[42px] px-3 sm:px-3.5 py-2 rounded-xl bg-[#0d1219]/90 hover:bg-[#17202b] border border-white/15 text-white text-xs sm:text-sm font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Trophy className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Missions</span>
          </button>
        </div>
      </div>

      {/* Top-Center Mission / Notification / Enter Vehicle Prompt */}
      <div className="flex flex-col items-center gap-2 mt-1 pointer-events-none">
        {telemetry.activeMission && (
          <div className="pointer-events-auto flex items-center gap-3 px-4 py-2 rounded-xl bg-[#0d1219]/94 border border-emerald-500/40 text-xs sm:text-sm">
            <div>
              <span className="font-display font-bold text-emerald-400">
                {telemetry.activeMission.title}
              </span>
              <span className="text-slate-400 mx-2">·</span>
              <span className="text-white">
                CP {telemetry.activeMission.checkpointIndex + 1}/{telemetry.activeMission.totalCheckpoints}:{' '}
                {telemetry.activeMission.checkpointLabel} ({telemetry.activeMission.distanceToNextM}m)
              </span>
            </div>
            <span className="font-display font-bold tabular-nums text-amber-300">
              {telemetry.activeMission.remainingSec}s
            </span>
            <button
              onClick={onCancelMission}
              aria-label="Cancel Mission"
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {telemetry.notification && (
          <div
            className={`px-4 py-2 rounded-xl border text-center bg-[#0d1219]/94 ${
              telemetry.notification.tone === 'gold'
                ? 'border-amber-400/60 text-amber-300'
                : telemetry.notification.tone === 'green'
                ? 'border-emerald-400/60 text-emerald-300'
                : 'border-slate-500/60 text-slate-200'
            }`}
          >
            <div className="font-display font-bold text-sm">{telemetry.notification.title}</div>
            <div className="text-xs text-slate-300">{telemetry.notification.subtitle}</div>
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Context Enter/Exit Prompt right above HUD bar */}
      {telemetry.isOnFoot && telemetry.nearbyVehicleName && (
        <div className="flex justify-center mb-2 pointer-events-auto">
          <button
            onClick={onToggleEnterExit}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xl cursor-pointer"
          >
            <DoorOpen className="w-4 h-4" />
            <span>Press E · Enter {telemetry.nearbyVehicleName}</span>
          </button>
        </div>
      )}

      {/* Bottom Controls & Telemetry Zone */}
      <div className="flex items-end justify-between gap-2 sm:gap-3">
        {/* Left Thumb Controls */}
        {showTouchControls ? (
          telemetry.isOnFoot ? (
            /* On-Foot Touch Walk Joystick */
            <div className="pointer-events-auto flex flex-col items-center gap-1">
              <div
                ref={joyRef}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  joyActiveRef.current = true;
                  updateJoystick(e.clientX, e.clientY);
                }}
                onPointerMove={(e) => {
                  if (joyActiveRef.current) updateJoystick(e.clientX, e.clientY);
                }}
                onPointerUp={resetJoystick}
                onPointerCancel={resetJoystick}
                onLostPointerCapture={resetJoystick}
                className="touch-control relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-[#0d1219]/85 border-2 border-white/20 flex items-center justify-center"
              >
                <div
                  className="w-12 h-12 rounded-full bg-amber-500/90 border-2 border-white shadow-lg"
                  style={{ transform: `translate(${joyKnob.x}px, ${joyKnob.y}px)` }}
                />
              </div>
              <span className="text-[10px] text-slate-300 font-medium">Walk</span>
            </div>
          ) : (
            /* Driving Touch Steering */
            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                {...bindHold(setSteerLeft)}
                aria-label="Steer Left"
                className="touch-control w-14 h-16 sm:w-18 sm:h-18 rounded-2xl bg-[#0d1219]/88 active:bg-amber-500 active:text-slate-950 border border-white/20 text-white flex items-center justify-center"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                {...bindHold(setSteerRight)}
                aria-label="Steer Right"
                className="touch-control w-14 h-16 sm:w-18 sm:h-18 rounded-2xl bg-[#0d1219]/88 active:bg-amber-500 active:text-slate-950 border border-white/20 text-white flex items-center justify-center"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </div>
          )
        ) : (
          <div className="hidden md:flex flex-col gap-1 text-[11px] text-slate-300 bg-[#0d1219]/82 px-3 py-2 rounded-xl border border-white/10 max-w-[230px]">
            {telemetry.isOnFoot ? (
              <span>WASD Walk · Shift Run · Space Jump · E Enter Car · Drag Look</span>
            ) : (
              <span>WASD Drive · Q/F or 1-4 Shift · G Auto/Man · X Ignition · E Exit</span>
            )}
          </div>
        )}

        {/* Bottom-Center Realistic Telemetry & Gear Console */}
        {telemetry.isOnFoot ? (
          <div className="mx-auto flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#0d1219]/92 border border-white/15 pointer-events-auto">
            <div className="text-xs sm:text-sm font-display font-bold text-amber-400">ON FOOT</div>
            <div className="h-5 w-px bg-white/15" />
            <div className="text-xs text-slate-200">{telemetry.zoneName}</div>
            <div className="h-5 w-px bg-white/15" />
            <button
              onClick={onToggleEnterExit}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                telemetry.nearbyVehicleName
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-[#17202b] text-slate-300 border border-white/10'
              }`}
            >
              <DoorOpen className="w-3.5 h-3.5" />
              <span>{telemetry.nearbyVehicleName ? `Enter ${telemetry.nearbyVehicleName}` : 'No Car Near (E)'}</span>
            </button>
          </div>
        ) : (
          <div className="mx-auto flex flex-col gap-1.5 px-3 sm:px-4 py-2 rounded-2xl bg-[#0d1219]/92 border border-white/15 pointer-events-auto max-w-full">
            {/* Top Telemetry Row: Speed + Animated Gear + RPM + Engine + Mode + Fuel + Exit */}
            <div className="flex items-center justify-between gap-2.5 sm:gap-4 flex-wrap">
              {/* Speedometer & Vehicle Name */}
              <div className="flex items-baseline gap-1.5">
                <span className="font-display font-bold text-2xl sm:text-3xl text-white tabular-nums leading-none">
                  {telemetry.speedKmh}
                </span>
                <span className="text-[10px] font-semibold text-slate-400">KM/H</span>
                <span className="hidden sm:inline text-[11px] text-amber-300/90 font-medium ml-1 truncate max-w-[110px]">
                  {telemetry.vehicleName}
                </span>
              </div>

              <div className="h-6 w-px bg-white/10" />

              {/* Active Gear Badge + RPM Bar */}
              <div className="flex items-center gap-2">
                <div
                  key={telemetry.gearShiftPulse}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-display font-bold text-base border transition-transform ${
                    telemetry.actualGear === 'R'
                      ? 'bg-rose-500/20 border-rose-400/60 text-rose-300'
                      : telemetry.actualGear === 'P'
                      ? 'bg-slate-700/60 border-slate-500 text-slate-200'
                      : 'bg-amber-500/20 border-amber-400/60 text-amber-300'
                  }`}
                >
                  {telemetry.actualGear}
                </div>
                <div className="flex flex-col w-16 sm:w-20">
                  <div className="flex justify-between text-[9px] text-slate-400 uppercase">
                    <span>RPM</span>
                    <span>{Math.round(telemetry.rpmNorm * 7)}k</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-0.5">
                    <div
                      className={`h-full transition-all duration-75 ${
                        telemetry.rpmNorm > 0.85 ? 'bg-rose-500' : 'bg-amber-400'
                      }`}
                      style={{ width: `${Math.round(telemetry.rpmNorm * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="h-6 w-px bg-white/10 hidden sm:block" />

              {/* Auto / Manual + Ignition + Exit */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onToggleTransmissionMode}
                  title="Switch Auto / Manual Transmission (G)"
                  className="px-2 py-1 rounded-lg bg-[#17202b] hover:bg-[#223040] border border-white/15 text-[11px] font-display font-bold text-amber-300 cursor-pointer"
                >
                  {telemetry.transmissionMode === 'manual' ? 'MAN' : 'AUTO'}
                </button>

                <button
                  onClick={onToggleEngine}
                  title="Engine Start / Stop (X)"
                  className={`px-2 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                    telemetry.engineRunning
                      ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                      : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                  }`}
                >
                  <Power className="w-3 h-3" />
                  <span className="hidden sm:inline">{telemetry.engineRunning ? 'ON' : 'OFF'}</span>
                </button>

                <button
                  onClick={onToggleEnterExit}
                  title="Exit Vehicle (E)"
                  className="px-2 py-1 rounded-lg bg-[#17202b] hover:bg-[#223040] border border-white/15 text-[11px] font-bold text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  <DoorOpen className="w-3 h-3 text-sky-400" />
                  <span className="hidden sm:inline">Exit</span>
                </button>
              </div>

              {/* Compact Fuel Readout */}
              <div className="hidden md:flex items-center gap-1.5 text-[11px]">
                <Fuel className={`w-3.5 h-3.5 ${fuelLow ? 'text-rose-400' : 'text-emerald-400'}`} />
                <span className={`tabular-nums font-semibold ${fuelLow ? 'text-rose-300' : 'text-slate-200'}`}>
                  {telemetry.fuelPct}%
                </span>
              </div>
            </div>

            {/* Bottom Gear Selector Strip: P R N D 1 2 3 4 + Shift -/+ */}
            <div className="flex items-center justify-between gap-1 pt-1 border-t border-white/10">
              <button
                onClick={() => onShiftGear(-1)}
                aria-label="Shift Down"
                className="px-2 py-1 rounded-lg bg-[#151d28] hover:bg-[#202c3d] border border-white/10 text-slate-200 cursor-pointer"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-1 overflow-x-auto">
                {ALL_GEARS.map((g) => {
                  const active = telemetry.selectedGear === g;
                  return (
                    <button
                      key={g}
                      onClick={() => onSetGear(g)}
                      className={`min-w-[26px] sm:min-w-[30px] h-7 rounded-lg text-xs font-display font-bold border transition-colors cursor-pointer ${
                        active
                          ? g === 'R'
                            ? 'bg-rose-500 text-white border-rose-300'
                            : 'bg-amber-500 text-slate-950 border-amber-300'
                          : 'bg-[#141b24] text-slate-300 border-white/10 hover:bg-[#1e2936]'
                      }`}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => onShiftGear(1)}
                aria-label="Shift Up"
                className="px-2 py-1 rounded-lg bg-[#151d28] hover:bg-[#202c3d] border border-white/10 text-slate-200 cursor-pointer"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Right Thumb Touch Controls */}
        {showTouchControls ? (
          telemetry.isOnFoot ? (
            /* On-Foot Mobile Buttons: Run, Jump, Enter Vehicle */
            <div className="flex flex-col items-end gap-2 pointer-events-auto">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSprintToggle((v) => !v)}
                  className={`touch-control min-h-[44px] px-3.5 py-2 rounded-xl border text-xs font-display font-bold ${
                    sprintToggle
                      ? 'bg-amber-500 text-slate-950 border-amber-300'
                      : 'bg-[#0d1219]/88 text-slate-200 border-white/20'
                  }`}
                >
                  RUN
                </button>
                <button
                  onClick={onToggleEnterExit}
                  className={`touch-control min-h-[44px] px-3.5 py-2 rounded-xl border text-xs font-display font-bold ${
                    telemetry.nearbyVehicleName
                      ? 'bg-emerald-500 text-slate-950 border-emerald-300'
                      : 'bg-[#0d1219]/88 text-slate-400 border-white/15'
                  }`}
                >
                  CAR (E)
                </button>
              </div>
              <button
                {...bindHold((p) => onTouchInput({ jump: p }))}
                className="touch-control w-20 h-16 rounded-2xl bg-[#0d1219]/88 active:bg-sky-500 active:text-slate-950 border border-white/20 text-white font-display font-bold text-xs flex items-center justify-center"
              >
                JUMP
              </button>
            </div>
          ) : (
            /* Driving Mobile Pedals */
            <div className="flex flex-col items-end gap-1.5 pointer-events-auto">
              <div className="flex items-center gap-1.5">
                <button
                  {...bindHold((p) => onTouchInput({ handbrake: p }))}
                  className="touch-control min-h-[40px] px-3 py-1.5 rounded-xl bg-[#0d1219]/88 active:bg-rose-500 border border-white/20 text-[11px] font-display font-bold text-slate-200"
                >
                  H-BRK
                </button>
                <button
                  {...bindHold((p) => onTouchInput({ reverse: p }))}
                  className="touch-control min-h-[40px] px-3 py-1.5 rounded-xl bg-[#0d1219]/88 active:bg-amber-500 active:text-slate-950 border border-white/20 text-[11px] font-display font-bold text-amber-300"
                >
                  REV
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  {...bindHold((p) => onTouchInput({ brake: p ? 1 : 0 }))}
                  className="touch-control w-14 h-16 sm:w-18 sm:h-18 rounded-2xl bg-rose-950/88 active:bg-rose-500 border border-rose-400/40 text-white font-display font-bold text-xs flex items-center justify-center"
                >
                  BRAKE
                </button>
                <button
                  {...bindHold((p) => onTouchInput({ throttle: p ? 1 : 0 }))}
                  className="touch-control w-14 h-20 sm:w-18 sm:h-22 rounded-2xl bg-emerald-950/88 active:bg-emerald-500 active:text-slate-950 border border-emerald-400/40 text-emerald-200 font-display font-bold text-xs flex items-center justify-center"
                >
                  GAS
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="hidden lg:block w-[160px]" />
        )}
      </div>
    </div>
  );
};
