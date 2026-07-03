import React from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useSimulationStore } from '../../store/simulationStore';
import { Thermometer } from 'lucide-react';

export const ThermistorControl: React.FC = () => {
  const selectedIds = useWorkspaceStore(s => s.selectedComponentIds);
  const components = useWorkspaceStore(s => s.components);
  const updateComponentProperties = useWorkspaceStore(s => s.updateComponentProperties);
  const componentStates = useSimulationStore(s => s.componentStates);

  const selectedThermistors = components.filter(c => selectedIds.includes(c.id) && c.type === 'THERMISTOR');

  if (selectedThermistors.length === 0) return null;

  return (
    <div className="absolute top-20 right-4 w-64 bg-slate-800 rounded-lg shadow-xl border border-slate-700 overflow-hidden pointer-events-auto">
      <div className="bg-slate-900 p-3 border-b border-slate-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Thermometer size={16} className="text-orange-400" />
          Thermistor Settings
        </h3>
        <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">
          {selectedThermistors.length} selected
        </span>
      </div>

      <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
        {selectedThermistors.map(therm => {
          const state = componentStates[therm.id] as any;
          const currentTemp = therm.properties?.simulatedTemperature ?? 25;
          const type = therm.properties?.type || 'NTC';

          return (
            <div key={therm.id} className="space-y-4 pb-4 border-b border-slate-700/50 last:border-0 last:pb-0">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-mono">{therm.id}</span>
                <span className="text-xs bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">{type}</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Temperature</span>
                  <span className="text-slate-200">{currentTemp}°C</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-blue-400">-40°C</span>
                  <input
                    type="range"
                    min="-40"
                    max="125"
                    step="1"
                    className="flex-1 h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-orange-400"
                    value={Number(currentTemp)}
                    onChange={(e) => updateComponentProperties(therm.id, { simulatedTemperature: parseInt(e.target.value) })}
                  />
                  <span className="text-[10px] text-red-400">125°C</span>
                </div>
              </div>

              {state && (
                <div className="bg-slate-900/50 rounded p-2 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Resistance:</span>
                    <span className="text-slate-300 font-mono">
                      {state.currentResistance > 1000 
                        ? `${(state.currentResistance/1000).toFixed(1)} kΩ`
                        : `${state.currentResistance.toFixed(0)} Ω`
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Voltage Drop:</span>
                    <span className="text-slate-300 font-mono">{(state.voltageAcross || 0).toFixed(2)} V</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
