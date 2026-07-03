import React from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useSimulationStore } from '../../store/simulationStore';
import { Activity } from 'lucide-react';

export const MultimeterPanel: React.FC = () => {
  const selectedIds = useWorkspaceStore(s => s.selectedComponentIds);
  const components = useWorkspaceStore(s => s.components);
  const updateComponentProperties = useWorkspaceStore(s => s.updateComponentProperties);
  const componentStates = useSimulationStore(s => s.componentStates);

  const selectedMultimeters = components.filter(c => selectedIds.includes(c.id) && c.type === 'MULTIMETER');

  if (selectedMultimeters.length === 0) return null;

  return (
    <div className="absolute top-20 right-4 w-64 bg-slate-800 rounded-lg shadow-xl border border-slate-700 overflow-hidden pointer-events-auto">
      <div className="bg-slate-900 p-3 border-b border-slate-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Activity size={16} className="text-green-400" />
          Multimeter Settings
        </h3>
        <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">
          {selectedMultimeters.length} selected
        </span>
      </div>

      <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
        {selectedMultimeters.map(mm => {
          const state = componentStates[mm.id] as any;
          const currentMode = mm.properties?.mode || 'DCV';

          return (
            <div key={mm.id} className="space-y-4 pb-4 border-b border-slate-700/50 last:border-0 last:pb-0">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-mono">{mm.id}</span>
                {!state?.isConnected && (
                  <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">
                    Open Probes
                  </span>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-xs text-slate-400 block">Measurement Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'DCV', label: 'Voltage (DCV)' },
                    { id: 'DCA', label: 'Current (DCA)' },
                    { id: 'resistance', label: 'Resistance (Ω)' },
                    { id: 'continuity', label: 'Continuity' }
                  ].map(mode => (
                    <button
                      key={mode.id}
                      className={`px-2 py-1.5 text-xs rounded border transition-colors ${
                        currentMode === mode.id 
                        ? 'bg-blue-500/20 border-blue-500 text-blue-300' 
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                      }`}
                      onClick={() => updateComponentProperties(mm.id, { mode: mode.id })}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {state && (
                <div className="bg-[#a3e635] p-3 rounded-lg border-4 border-slate-900 shadow-inner relative overflow-hidden">
                  <div className="absolute inset-0 bg-black/5 opacity-50" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)' }}></div>
                  <div className="relative z-10 flex justify-between items-start">
                    <span className="text-[10px] text-slate-800 font-bold uppercase">{state.mode}</span>
                    <span className="text-2xl font-mono text-slate-900 font-bold tracking-wider">
                      {state.displayValue} <span className="text-sm">{state.unit}</span>
                    </span>
                  </div>
                  {state.warningMessage && (
                    <div className="relative z-10 text-[10px] text-red-700 font-bold mt-1 text-right">
                      {state.warningMessage}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
