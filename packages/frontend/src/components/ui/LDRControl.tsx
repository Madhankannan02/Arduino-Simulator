import React from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useSimulationStore } from '../../store/simulationStore';
import { Sun, Moon } from 'lucide-react';

export const LDRControl: React.FC = () => {
  const selectedIds = useWorkspaceStore(s => s.selectedComponentIds);
  const components = useWorkspaceStore(s => s.components);
  const updateComponentProperties = useWorkspaceStore(s => s.updateComponentProperties);
  const componentStates = useSimulationStore(s => s.componentStates);

  const selectedLDRs = components.filter(c => selectedIds.includes(c.id) && c.type === 'PHOTORESISTOR');

  if (selectedLDRs.length === 0) return null;

  return (
    <div className="absolute top-20 right-4 w-64 bg-slate-800 rounded-lg shadow-xl border border-slate-700 overflow-hidden pointer-events-auto">
      <div className="bg-slate-900 p-3 border-b border-slate-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Sun size={16} className="text-yellow-400" />
          Photoresistor (LDR)
        </h3>
        <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">
          {selectedLDRs.length} selected
        </span>
      </div>

      <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
        {selectedLDRs.map(ldr => {
          const state = componentStates[ldr.id] as any;
          const currentLight = ldr.properties?.simulatedLightLevel || 50;

          return (
            <div key={ldr.id} className="space-y-4 pb-4 border-b border-slate-700/50 last:border-0 last:pb-0">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-mono">{ldr.id}</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Light Level</span>
                  <span className="text-slate-200">{currentLight}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Moon size={14} className="text-slate-500" />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    className="flex-1 h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                    value={Number(currentLight)}
                    onChange={(e) => updateComponentProperties(ldr.id, { simulatedLightLevel: parseInt(e.target.value) })}
                  />
                  <Sun size={14} className="text-yellow-400" />
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
                  <div className="flex justify-between">
                    <span className="text-slate-500">Current:</span>
                    <span className="text-slate-300 font-mono">{(state.currentMa || 0).toFixed(2)} mA</span>
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
