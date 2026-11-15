import React from 'react';
import { X } from 'lucide-react';
import {
  GameSettings,
  TimePreset,
  TouchMode,
  TrafficDensity,
  TransmissionMode,
  WeatherMode,
} from '../game/types';

interface SettingsModalProps {
  settings: GameSettings;
  onChange: (next: GameSettings) => void;
  onClose: () => void;
}

const TIME_PRESETS: Array<{ id: TimePreset; label: string }> = [
  { id: 'golden', label: 'Golden Hour' },
  { id: 'cycle', label: 'Day-Night Cycle' },
  { id: 'midday', label: 'Midday Sun' },
  { id: 'dusk', label: 'Warm Dusk' },
  { id: 'night', label: 'Night Lights' },
];

const WEATHER_MODES: Array<{ id: WeatherMode; label: string }> = [
  { id: 'clear', label: 'Clear Sky' },
  { id: 'rain', label: 'Monsoon Rain' },
  { id: 'fog', label: 'Valley Fog' },
  { id: 'dynamic', label: 'Dynamic' },
];

const TRAFFIC_DENSITIES: Array<{ id: TrafficDensity; label: string }> = [
  { id: 'light', label: 'Light' },
  { id: 'medium', label: 'Medium' },
  { id: 'heavy', label: 'Heavy' },
];

const TRANSMISSION_MODES: Array<{ id: TransmissionMode; label: string }> = [
  { id: 'manual', label: 'Manual (1-4)' },
  { id: 'auto', label: 'Automatic (D)' },
];

const TOUCH_MODES: Array<{ id: TouchMode; label: string }> = [
  { id: 'auto', label: 'Auto Detect' },
  { id: 'always', label: 'Always Show' },
  { id: 'off', label: 'Hide Touch' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onChange,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/65">
      <div className="w-full max-w-lg bg-[#0d1219] border border-white/15 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="font-display text-xl font-bold text-white">Game Settings</h2>
          <button
            onClick={onClose}
            aria-label="Close Settings"
            className="min-h-[44px] min-w-[44px] rounded-xl hover:bg-white/10 text-slate-300 flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Sky & Day-Night Mode */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Sky &amp; Time of Day
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TIME_PRESETS.map((tp) => (
                <button
                  key={tp.id}
                  onClick={() => onChange({ ...settings, timePreset: tp.id })}
                  className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                    settings.timePreset === tp.id
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-[#141c26] text-slate-300 border-white/10 hover:bg-[#1b2633]'
                  }`}
                >
                  {tp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Weather System */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Weather Atmosphere
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {WEATHER_MODES.map((wm) => (
                <button
                  key={wm.id}
                  onClick={() => onChange({ ...settings, weatherMode: wm.id })}
                  className={`min-h-[40px] px-2.5 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                    settings.weatherMode === wm.id
                      ? 'bg-sky-400 text-slate-950 border-sky-300'
                      : 'bg-[#141c26] text-slate-300 border-white/10 hover:bg-[#1b2633]'
                  }`}
                >
                  {wm.label}
                </button>
              ))}
            </div>
          </div>

          {/* Transmission & Traffic Density */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Transmission Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TRANSMISSION_MODES.map((tm) => (
                  <button
                    key={tm.id}
                    onClick={() => onChange({ ...settings, transmissionMode: tm.id })}
                    className={`min-h-[40px] px-2 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                      settings.transmissionMode === tm.id
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-[#141c26] text-slate-300 border-white/10 hover:bg-[#1b2633]'
                    }`}
                  >
                    {tm.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                City Traffic Density
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {TRAFFIC_DENSITIES.map((td) => (
                  <button
                    key={td.id}
                    onClick={() => onChange({ ...settings, trafficDensity: td.id })}
                    className={`min-h-[40px] px-2 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                      settings.trafficDensity === td.id
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-[#141c26] text-slate-300 border-white/10 hover:bg-[#1b2633]'
                    }`}
                  >
                    {td.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sound Volume */}
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold uppercase tracking-wider text-slate-400">
                Engine &amp; Audio Volume
              </span>
              <span className="tabular-nums text-amber-400 font-bold">
                {Math.round(settings.soundVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.soundVolume}
              onChange={(e) => onChange({ ...settings, soundVolume: Number(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Camera Smoothing */}
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold uppercase tracking-wider text-slate-400">
                Chase Camera Responsiveness
              </span>
              <span className="tabular-nums text-amber-400 font-bold">
                {settings.cameraSmoothing.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={1.6}
              step={0.1}
              value={settings.cameraSmoothing}
              onChange={(e) => onChange({ ...settings, cameraSmoothing: Number(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Shadows Toggle */}
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-medium text-white">Dynamic Shadows</div>
              <div className="text-xs text-slate-400">Disable on older phones for higher FPS</div>
            </div>
            <button
              onClick={() => onChange({ ...settings, shadows: !settings.shadows })}
              className={`min-h-[40px] px-4 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                settings.shadows
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                  : 'bg-[#141c26] text-slate-300 border-white/10'
              }`}
            >
              {settings.shadows ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          {/* Touch Controls Visibility */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              On-Screen Touch Controls
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TOUCH_MODES.map((tm) => (
                <button
                  key={tm.id}
                  onClick={() => onChange({ ...settings, touchControls: tm.id })}
                  className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                    settings.touchControls === tm.id
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-[#141c26] text-slate-300 border-white/10 hover:bg-[#1b2633]'
                  }`}
                >
                  {tm.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
