import React from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useSimulationStore } from '../../store/simulationStore';
import { Settings, Zap } from 'lucide-react';

export const CapacitorControl: React.FC = () => {
  const selectedIds = useWorkspaceStore(s => s.selectedComponentIds);
  const components = useWorkspaceStore(s => s.components);
  const updateComponentProperties = useWorkspaceStore(s => s.updateComponentProperties);
  const componentStates = useSimulationStore(s => s.componentStates);

  const selectedCapacitors = components.filter(c => selectedIds.includes(c.id) && c.type === 'CAPACITOR');

  if (selectedCapacitors.length === 0) return null;

  return (
    <div className="absolute top-20 right-4 w-64 bg-slate-800 rounded-lg shadow-xl border border-slate-700 overflow-hidden pointer-events-auto">
      <div className="bg-slate-900 p-3 border-b border-slate-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Settings size={16} className="text-blue-400" />
          Capacitor Settings
        </h3>
        <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">
          {selectedCapacitors.length} selected
        </span>
      </div>

      <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
        {selectedCapacitors.map(cap => {
          const state = componentStates[cap.id] as any;
          return (
            <div key={cap.id} className="space-y-3 pb-3 border-b border-slate-700/50 last:border-0">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-mono">{cap.id}</span>
                {state?.isOvervoltage && (
                  <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Zap size={10} /> Overvoltage
                  </span>
                )}
              </div>
              
              <div className="space-y-1">
                <label className="text-xs text-slate-400 block">Capacitance (µF)</label>
                <input
                  type="number"
                  min="0.1"
                  max="10000"
                  step="0.1"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  value={Number(cap.properties?.capacitance ?? 100)}
                  onChange={(e) => updateComponentProperties(cap.id, { capacitance: parseFloat(e.target.value) || 100 })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 block">Type</label>
                <select
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  value={String(cap.properties?.type ?? 'electrolytic')}
                  onChange={(e) => updateComponentProperties(cap.id, { type: e.target.value })}
                >
                  <option value="electrolytic">Electrolytic (Polarized)</option>
                  <option value="ceramic">Ceramic</option>
                  <option value="film">Film</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 block">Voltage Rating (V)</label>
                <input
                  type="number"
                  min="1"
                  max="400"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  value={Number(cap.properties?.voltageRating ?? 25)}
                  onChange={(e) => updateComponentProperties(cap.id, { voltageRating: parseFloat(e.target.value) || 25 })}
                />
              </div>

              {state && (
                <div className="bg-slate-900/50 rounded p-2 text-xs space-y-1 mt-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Charge:</span>
                    <span className="text-slate-300 font-mono">{(state.chargeVoltage || 0).toFixed(2)} V</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Current:</span>
                    <span className="text-slate-300 font-mono">{(state.currentMa || 0).toFixed(2)} mA</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Energy:</span>
                    <span className="text-slate-300 font-mono">{(state.storedEnergy || 0).toFixed(1)} µJ</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div 
                      className="bg-blue-500 h-1.5 transition-all duration-100"
                      style={{ width: `${Math.min(100, state.chargePercent || 0)}%` }}
                    />
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
