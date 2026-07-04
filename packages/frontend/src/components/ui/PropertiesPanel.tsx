import React from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useSimulationStore } from '../../store/simulationStore';
import { CircuitComponent, Wire } from '../../types/components';
import { 
  Copy, Trash2, Cpu, Settings, Activity, Link2, 
  ChevronUp, ChevronDown 
} from 'lucide-react';
import { clsx } from 'clsx';

export const PropertiesPanel: React.FC = () => {
  const selectedComponentIds = useWorkspaceStore(state => state.selectedComponentIds);
  const components = useWorkspaceStore(state => state.components);
  const wires = useWorkspaceStore(state => state.wires);
  const updateComponentPosition = useWorkspaceStore(state => state.updateComponentPosition);
  const updateComponentRotation = useWorkspaceStore(state => state.updateComponentRotation);
  const updateComponentProperties = useWorkspaceStore(state => state.updateComponentProperties);
  const deleteSelected = useWorkspaceStore(state => state.deleteSelected);
  const duplicateSelected = useWorkspaceStore(state => state.duplicateSelected);
  const bringForward = useWorkspaceStore(state => state.bringForward);
  const sendBackward = useWorkspaceStore(state => state.sendBackward);
  const selectWire = useWorkspaceStore(state => state.selectWire);

  const simulationStatus = useSimulationStore(state => state.status);
  const componentStates = useSimulationStore(state => state.componentStates);
  const pinVoltages = useSimulationStore(state => state.pinVoltages);

  return (
    <div 
      id="properties-panel"
      className="flex flex-col h-full w-full bg-transparent"
    >
      {selectedComponentIds.length > 1 ? (
        <MultipleSelectionContent count={selectedComponentIds.length} deleteSelected={deleteSelected} duplicateSelected={duplicateSelected} />
      ) : selectedComponentIds.length === 1 ? (
        <SingleSelectionContent 
          selectedComponent={components.find(c => c.id === selectedComponentIds[0])}
          components={components}
          wires={wires}
          simulationStatus={simulationStatus}
          componentStates={componentStates}
          pinVoltages={pinVoltages}
          updateComponentPosition={updateComponentPosition}
          updateComponentRotation={updateComponentRotation}
          updateComponentProperties={updateComponentProperties}
          deleteSelected={deleteSelected}
          duplicateSelected={duplicateSelected}
          bringForward={bringForward}
          sendBackward={sendBackward}
          selectWire={selectWire}
        />
      ) : (
        <div className="flex items-center justify-center h-full text-[#6A7B76] font-medium text-sm">
          Select a component to view properties
        </div>
      )}
    </div>
  );
};

const MultipleSelectionContent = ({ count, deleteSelected, duplicateSelected }: { count: number, deleteSelected: () => void, duplicateSelected: () => void }) => (
  <div className="p-4">
    <h3 className="font-bold text-lg text-[#2C5E4A] mb-4">Multiple Selection</h3>
    <p className="text-sm text-[#6A7B76] font-medium mb-6">{count} components selected</p>
    <div className="flex flex-col gap-3">
      <button 
        onClick={duplicateSelected}
        className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#F3F4F3] hover:bg-[#d2e8d6] rounded-lg font-bold text-sm text-[#2C5E4A] transition-colors"
      >
        <Copy className="w-4 h-4" /> Duplicate Selected
      </button>
      <button 
        onClick={deleteSelected}
        className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#FCEAEB] hover:bg-[#FF8A8A]/20 text-[#FF8A8A] rounded-lg font-bold text-sm transition-colors"
      >
        <Trash2 className="w-4 h-4" /> Delete Selected
      </button>
    </div>
  </div>
);

const SingleSelectionContent = ({
  selectedComponent,
  components,
  wires,
  simulationStatus,
  componentStates,
  pinVoltages,
  updateComponentPosition,
  updateComponentRotation,
  updateComponentProperties,
  deleteSelected,
  duplicateSelected,
  bringForward,
  sendBackward,
  selectWire
}: any) => {
  if (!selectedComponent) return null;
  return (
    <>
      <HeaderSection component={selectedComponent} />
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
        <div className="p-4 space-y-6">
          <PositionRotationSection component={selectedComponent} updatePos={updateComponentPosition} updateRot={updateComponentRotation} updateProps={updateComponentProperties} />
          <Divider />
          <ComponentSpecificSection component={selectedComponent} updateProps={updateComponentProperties} simRunning={simulationStatus === 'RUNNING'} />
          
          {simulationStatus === 'RUNNING' && (
            <>
              <Divider />
              <LiveSimulationSection component={selectedComponent} compState={componentStates[selectedComponent.id]} pinVoltages={pinVoltages} />
            </>
          )}

          <Divider />
          <ConnectedWiresSection component={selectedComponent} wires={wires} components={components} selectWire={selectWire} />
          <Divider />
          <ActionsSection 
            deleteSelected={deleteSelected}
            duplicateSelected={duplicateSelected}
            bringForward={bringForward}
            sendBackward={sendBackward}
          />
        </div>
      </div>
    </>
  );
};

const Divider = () => <div className="h-px w-full bg-[#E5EBE8]" />;

const HeaderSection = ({ component }: { component: CircuitComponent }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(component.id);
  };

  return (
    <div className="bg-[#F3F4F3] border-b border-[#E5EBE8] p-4 flex flex-col gap-2 shrink-0">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white rounded-md border border-[#E5EBE8] shadow-sm">
          <Cpu className="w-5 h-5 text-[#2C5E4A]" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-[#2C5E4A] truncate">{component.type.replace(/_/g, ' ')}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-mono font-medium text-[#6A7B76] truncate bg-black/5 px-1.5 py-0.5 rounded">{component.id.split('-')[0]}...</span>
            <button onClick={handleCopy} className="text-[#B5C2BF] hover:text-[#2C5E4A] transition-colors">
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
      <p className="text-xs text-[#6A7B76] font-medium mt-1">Properties and configurations for this component.</p>
    </div>
  );
};

const PositionRotationSection = ({ 
  component, 
  updatePos, 
  updateRot,
  updateProps
}: { 
  component: CircuitComponent; 
  updatePos: (id: string, pos: {x: number, y: number}) => void;
  updateRot: (id: string, rot: number) => void;
  updateProps: (id: string, props: any) => void;
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-bold text-[#2C5E4A]">
        <Settings className="w-4 h-4 text-[#82b49b]" /> Position & Transform
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[#6A7B76]">X Position</label>
          <input 
            type="number" 
            value={Math.round(component.position.x)} 
            onChange={(e) => updatePos(component.id, { x: Number(e.target.value), y: component.position.y })}
            className="bg-[#F3F4F3] text-[#2C5E4A] font-medium border border-[#E5EBE8] rounded-md px-2 py-1.5 text-sm outline-none focus:border-[#82b49b] focus:ring-1 focus:ring-[#82b49b]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[#6A7B76]">Y Position</label>
          <input 
            type="number" 
            value={Math.round(component.position.y)} 
            onChange={(e) => updatePos(component.id, { x: component.position.x, y: Number(e.target.value) })}
            className="bg-[#F3F4F3] text-[#2C5E4A] font-medium border border-[#E5EBE8] rounded-md px-2 py-1.5 text-sm outline-none focus:border-[#82b49b] focus:ring-1 focus:ring-[#82b49b]"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[#6A7B76]">Rotation</label>
          <div className="flex bg-[#F3F4F3] rounded-lg border border-[#E5EBE8] p-1 gap-1">
            {[0, 90, 180, 270].map(deg => (
              <button 
                key={deg}
                onClick={() => updateRot(component.id, deg)}
                className={clsx(
                  "flex-1 py-1 text-[11px] font-bold rounded-md transition-all border",
                  component.rotation === deg ? "bg-white text-[#2C5E4A] shadow-sm border-[#E5EBE8]" : "border-transparent text-[#6A7B76] hover:text-[#2C5E4A] hover:bg-[#d2e8d6]/50"
                )}
              >
                {deg}°
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[#6A7B76]">Flip</label>
          <div className="flex bg-[#F3F4F3] rounded-lg border border-[#E5EBE8] p-1 gap-1 h-[28px]">
            <button 
              onClick={() => updateProps(component.id, { flipX: !component.properties?.flipX })}
              className={clsx(
                "flex-1 py-0.5 text-[11px] font-bold rounded-md transition-all border",
                component.properties?.flipX ? "bg-white text-[#2C5E4A] shadow-sm border-[#E5EBE8]" : "border-transparent text-[#6A7B76] hover:text-[#2C5E4A] hover:bg-[#d2e8d6]/50"
              )}
            >
              Horiz
            </button>
            <button 
              onClick={() => updateProps(component.id, { flipY: !component.properties?.flipY })}
              className={clsx(
                "flex-1 py-0.5 text-[11px] font-bold rounded-md transition-all border",
                component.properties?.flipY ? "bg-white text-[#2C5E4A] shadow-sm border-[#E5EBE8]" : "border-transparent text-[#6A7B76] hover:text-[#2C5E4A] hover:bg-[#d2e8d6]/50"
              )}
            >
              Vert
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ComponentSpecificSection = ({ 
  component, 
  updateProps,
  simRunning
}: { 
  component: CircuitComponent;
  updateProps: (id: string, props: any) => void;
  simRunning: boolean;
}) => {
  const type = component.type;
  const props = component.properties || {};

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-bold text-[#2C5E4A]">
        <Activity className="w-4 h-4 text-[#82b49b]" /> Component Settings
      </div>

      {type === 'LED' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#6A7B76]">Color</label>
            <div className="flex gap-2">
              {['red', 'green', 'blue', 'yellow', 'white'].map(color => {
                const hexMap: Record<string, string> = { red: '#ef4444', green: '#22c55e', blue: '#3b82f6', yellow: '#eab308', white: '#ffffff' };
                const isActive = (props.color || 'red') === color;
                return (
                  <button
                    key={color}
                    onClick={() => updateProps(component.id, { color })}
                    className={clsx(
                      "w-6 h-6 rounded-full border border-black/20 shadow-sm transition-transform",
                      isActive ? "ring-2 ring-[#82b49b] ring-offset-2 ring-offset-white scale-110" : "hover:scale-110"
                    )}
                    style={{ backgroundColor: hexMap[color] }}
                  />
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#6A7B76]">Forward Voltage</label>
              <div className="bg-[#F3F4F3] border border-[#E5EBE8] rounded-md px-2 py-1.5 text-sm text-[#2C5E4A] font-medium">
                {props.color === 'red' ? '1.8V' : props.color === 'green' ? '2.0V' : props.color === 'blue' ? '3.0V' : props.color === 'yellow' ? '2.1V' : props.color === 'white' ? '3.3V' : '2.0V'}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#6A7B76]">Max Safe Current</label>
              <div className="bg-[#F3F4F3] border border-[#E5EBE8] rounded-md px-2 py-1.5 text-sm text-[#2C5E4A] font-medium">
                20mA
              </div>
            </div>
          </div>
        </div>
      )}

      {type === 'CAPACITOR' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#6A7B76]">Capacitance (µF)</label>
            <input
              type="number"
              min="0.1"
              max="10000"
              step="0.1"
              className="bg-white border border-[#E5EBE8] rounded-md px-2 py-1.5 text-sm text-[#2C5E4A] font-medium focus:outline-none focus:border-[#82b49b]"
              value={Number(props.capacitance ?? 100)}
              onChange={(e) => updateProps(component.id, { capacitance: parseFloat(e.target.value) || 100 })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#6A7B76]">Type</label>
            <select
              className="bg-white border border-[#E5EBE8] rounded-md px-2 py-1.5 text-sm text-[#2C5E4A] font-medium focus:outline-none focus:border-[#82b49b]"
              value={String(props.type ?? 'electrolytic')}
              onChange={(e) => updateProps(component.id, { type: e.target.value })}
            >
              <option value="ceramic">Ceramic</option>
              <option value="electrolytic">Electrolytic</option>
              <option value="film">Film</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#6A7B76]">Voltage Rating (V)</label>
            <input
              type="number"
              min="1"
              max="400"
              step="1"
              className="bg-white border border-[#E5EBE8] rounded-md px-2 py-1.5 text-sm text-[#2C5E4A] font-medium focus:outline-none focus:border-[#82b49b]"
              value={Number(props.voltageRating ?? 25)}
              onChange={(e) => updateProps(component.id, { voltageRating: parseInt(e.target.value) || 25 })}
            />
          </div>
        </div>
      )}

      {type === 'RESISTOR' && (() => {
        const resValue = props.resistance || 220;
        const getResistorBands = (res: number) => {
          const colors = ['black', '#8b4513', 'red', 'orange', 'yellow', 'green', 'blue', 'violet', 'gray', 'white'];
          if (!res || res <= 0) return ['black', 'black', 'black', '#ffd700'];
          
          let val = res;
          let exp = 0;
          if (val >= 10) {
            while (val >= 100) { val /= 10; exp++; }
          } else {
            while (val < 10) { val *= 10; exp--; }
          }
          
          const d1 = Math.floor(val / 10);
          const d2 = Math.floor(val % 10);
          
          let mult = 'black';
          if (exp === -1) mult = '#ffd700';
          else if (exp === -2) mult = '#c0c0c0';
          else if (exp >= 0 && exp <= 9) mult = colors[exp];
          
          return [colors[d1] || 'black', colors[d2] || 'black', mult, '#ffd700'];
        };
        const bands = getResistorBands(resValue as number);

        return (
          <div className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-[#6A7B76]">Resistance (Ω)</label>
                <div className="flex h-4 w-16 bg-[#e2c792] rounded-sm items-center justify-between px-1 border border-black/20">
                  {bands.map((color, i) => (
                    <div key={i} className="w-1 h-full opacity-90" style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="number"
                  value={resValue as string | number}
                  onChange={(e) => updateProps(component.id, { resistance: Number(e.target.value) })}
                  className="flex-1 bg-[#F3F4F3] text-[#2C5E4A] font-medium border border-[#E5EBE8] rounded-md px-2 py-1.5 text-sm outline-none focus:border-[#82b49b] focus:ring-1 focus:ring-[#82b49b]"
                />
                <span className="text-sm font-bold text-[#6A7B76]">Ω</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#6A7B76] mb-1">Presets</label>
              <div className="flex flex-wrap gap-1.5">
                {[100, 220, 330, 470, 1000, 4700, 10000].map(val => (
                  <button
                    key={val}
                    onClick={() => updateProps(component.id, { resistance: val })}
                    className="px-2 py-1 bg-[#F3F4F3] hover:bg-[#d2e8d6] border border-[#E5EBE8] rounded-md font-bold text-xs text-[#2C5E4A] transition-colors"
                  >
                    {val >= 1000 ? `${val/1000}k` : val}Ω
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {type === 'POTENTIOMETER' && (
        <div className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#6A7B76]">Total Resistance (Ω)</label>
            <input 
              type="number"
              value={(props.totalResistance as string | number) || 10000}
              onChange={(e) => updateProps(component.id, { totalResistance: Number(e.target.value) })}
              className="w-full bg-[#F3F4F3] text-[#2C5E4A] font-medium border border-[#E5EBE8] rounded-md px-2 py-1.5 text-sm outline-none focus:border-[#82b49b] focus:ring-1 focus:ring-[#82b49b]"
            />
          </div>
          {!simRunning && (
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-[#6A7B76]">Initial Position</label>
                <span className="text-xs text-[#2C5E4A] font-mono font-bold">{props.value || 0}</span>
              </div>
              <input 
                type="range" 
                min="0" max="1023" 
                value={(props.value as string | number) || 0}
                onChange={(e) => updateProps(component.id, { value: Number(e.target.value) })}
                className="w-full accent-[#2C5E4A]"
              />
            </div>
          )}
        </div>
      )}

      {type === 'SERVO_MOTOR' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#6A7B76]">Servo Type</label>
            <div className="flex bg-[#F3F4F3] rounded-lg border border-[#E5EBE8] p-1 gap-1">
              <button 
                onClick={() => updateProps(component.id, { servoType: 'positional' })}
                className={clsx(
                  "flex-1 py-1.5 text-xs font-bold rounded-md transition-all border",
                  (props.servoType || 'positional') === 'positional' ? "bg-white text-[#2C5E4A] shadow-sm border-[#E5EBE8]" : "border-transparent text-[#6A7B76] hover:text-[#2C5E4A] hover:bg-[#d2e8d6]/50"
                )}
              >
                Positional (180°)
              </button>
              <button 
                onClick={() => updateProps(component.id, { servoType: 'continuous' })}
                className={clsx(
                  "flex-1 py-1.5 text-xs font-bold rounded-md transition-all border",
                  props.servoType === 'continuous' ? "bg-white text-[#2C5E4A] shadow-sm border-[#E5EBE8]" : "border-transparent text-[#6A7B76] hover:text-[#2C5E4A] hover:bg-[#d2e8d6]/50"
                )}
              >
                Continuous (360°)
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#6A7B76]">Min Pulse (µs)</label>
              <input 
                type="number"
                value={(props.minPulse as string | number) || 544}
                onChange={(e) => updateProps(component.id, { minPulse: Number(e.target.value) })}
                className="bg-[#F3F4F3] text-[#2C5E4A] font-medium border border-[#E5EBE8] rounded-md px-2 py-1.5 text-sm outline-none focus:border-[#82b49b] focus:ring-1 focus:ring-[#82b49b]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#6A7B76]">Max Pulse (µs)</label>
              <input 
                type="number"
                value={(props.maxPulse as string | number) || 2400}
                onChange={(e) => updateProps(component.id, { maxPulse: Number(e.target.value) })}
                className="bg-[#F3F4F3] text-[#2C5E4A] font-medium border border-[#E5EBE8] rounded-md px-2 py-1.5 text-sm outline-none focus:border-[#82b49b] focus:ring-1 focus:ring-[#82b49b]"
              />
            </div>
          </div>
        </div>
      )}

      {type === 'BUZZER' && (
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox"
              checked={Boolean(props.isPassive)}
              onChange={(e) => updateProps(component.id, { isPassive: e.target.checked })}
              className="rounded text-[#2C5E4A] focus:ring-[#82b49b] bg-[#F3F4F3] border-[#E5EBE8] accent-[#2C5E4A]"
            />
            <span className="text-sm text-[#2C5E4A] font-medium">Passive Mode</span>
          </label>
          {!(props.isPassive) && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#6A7B76]">Frequency (Hz)</label>
              <input 
                type="number"
                value={(props.frequency as string | number) || 440}
                onChange={(e) => updateProps(component.id, { frequency: Number(e.target.value) })}
                className="bg-[#F3F4F3] text-[#2C5E4A] font-medium border border-[#E5EBE8] rounded-md px-2 py-1.5 text-sm outline-none focus:border-[#82b49b] focus:ring-1 focus:ring-[#82b49b]"
              />
            </div>
          )}
        </div>
      )}

      {type === 'PUSH_BUTTON' && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input 
            type="checkbox"
            checked={Boolean(props.pullUp)}
            onChange={(e) => updateProps(component.id, { pullUp: e.target.checked })}
            className="rounded text-[#2C5E4A] focus:ring-[#82b49b] bg-[#F3F4F3] border-[#E5EBE8] accent-[#2C5E4A]"
          />
          <span className="text-sm text-[#2C5E4A] font-medium">Internal Pull-up Resistor</span>
        </label>
      )}

      {type === 'ARDUINO_UNO' && (
        <div className="bg-[#F3F4F3] border border-[#E5EBE8] rounded-lg p-3 text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-[#6A7B76] font-medium">CPU</span>
            <span className="text-[#2C5E4A] font-bold">ATmega328P</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6A7B76] font-medium">Flash Memory</span>
            <span className="text-[#2C5E4A] font-bold">32 KB</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6A7B76] font-medium">SRAM</span>
            <span className="text-[#2C5E4A] font-bold">2 KB</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6A7B76] font-medium">Clock Speed</span>
            <span className="text-[#2C5E4A] font-bold">16 MHz</span>
          </div>
        </div>
      )}
    </div>
  );
};

const LiveSimulationSection = ({ component, compState, pinVoltages }: { component: CircuitComponent, compState: any, pinVoltages: Record<string, number> }) => {
  const type = component.type;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-bold text-green-600">
        <Activity className="w-4 h-4" /> Live State
      </div>

      {type === 'LED' && (
        <div className="space-y-2 text-sm bg-[#F3F4F3] border border-[#E5EBE8] p-3 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-[#6A7B76] font-medium">Status</span>
            <span className="flex items-center gap-1.5 font-bold text-[#2C5E4A]">
              <span className={clsx("w-2 h-2 rounded-full", compState?.isOn ? "bg-green-500" : "bg-gray-400")} />
              {compState?.isOn ? 'ON' : 'OFF'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#6A7B76] font-medium">Brightness</span>
            <span className="text-[#2C5E4A] font-bold">{Math.round((compState?.brightness || 0) * 100)}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#6A7B76] font-medium">Current</span>
            <span className="text-[#2C5E4A] font-bold">{Math.round((compState?.currentMa || 0) * 10) / 10} mA</span>
          </div>
          <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden mt-1">
            <div 
              className="h-full bg-green-500 transition-all duration-100" 
              style={{ width: `${(compState?.brightness || 0) * 100}%` }}
            />
          </div>
        </div>
      )}

      {type === 'CAPACITOR' && (
        <div className="space-y-2 text-sm bg-[#F3F4F3] border border-[#E5EBE8] p-3 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-[#6A7B76] font-medium">Voltage</span>
            <span className="text-[#2C5E4A] font-bold">{Math.round((compState?.voltage || 0) * 100) / 100} V</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#6A7B76] font-medium">Charge</span>
            <span className="text-[#2C5E4A] font-bold">{Math.round(compState?.chargePercent || 0)}%</span>
          </div>
          <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden mt-1 flex">
            <div 
              className={clsx("h-full transition-all duration-100", compState?.isOvervoltage ? 'bg-[#ef4444]' : 'bg-[#3b82f6]')} 
              style={{ width: `${Math.min(compState?.chargePercent || 0, 100)}%` }}
            />
          </div>
        </div>
      )}

      {type === 'RESISTOR' && (
        <div className="space-y-2 text-sm bg-[#F3F4F3] border border-[#E5EBE8] p-3 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-[#6A7B76] font-medium">Voltage Drop</span>
            <span className="text-[#2C5E4A] font-bold">{Math.round((compState?.voltageDrop || 0) * 100) / 100} V</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#6A7B76] font-medium">Current</span>
            <span className="text-[#2C5E4A] font-bold">{Math.round((compState?.currentMa || 0) * 100) / 100} mA</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#6A7B76] font-medium">Power</span>
            <span className="text-[#2C5E4A] font-bold">{Math.round((compState?.powerMw || 0) * 10) / 10} mW</span>
          </div>
          <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden mt-1 flex">
            <div 
              className={clsx("h-full transition-all duration-100", (compState?.powerMw || 0) > 250 ? 'bg-[#FF8A8A]' : 'bg-[#FFA048]')} 
              style={{ width: `${Math.min(((compState?.powerMw || 0) / 250) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {type === 'SERVO_MOTOR' && (
        <div className="space-y-2 text-sm bg-[#F3F4F3] border border-[#E5EBE8] p-3 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-[#6A7B76] font-medium">Current Angle</span>
            <span className="text-[#2C5E4A] font-bold">{Math.round(compState?.angle || 0)}°</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#6A7B76] font-medium">Target Angle</span>
            <span className="text-[#2C5E4A] font-bold">{Math.round(compState?.targetAngle || 0)}°</span>
          </div>
          <div className="relative w-full h-12 mt-2 flex justify-center">
             <div className="w-24 h-12 border-t-2 border-l-2 border-r-2 border-[#E5EBE8] rounded-t-full relative">
               <div 
                 className="absolute bottom-0 left-1/2 w-0.5 h-10 bg-[#82b49b] origin-bottom transition-transform duration-75"
                 style={{ transform: `translateX(-50%) rotate(${(compState?.angle || 0) - 90}deg)` }}
               />
             </div>
          </div>
        </div>
      )}

      {type === 'POTENTIOMETER' && (
        <div className="space-y-2 text-sm bg-[#F3F4F3] border border-[#E5EBE8] p-3 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-[#6A7B76] font-medium">Value</span>
            <span className="text-[#2C5E4A] font-mono font-bold">{compState?.value || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#6A7B76] font-medium">Output Voltage</span>
            <span className="text-[#2C5E4A] font-bold">{Math.round((compState?.voltage || 0) * 100) / 100} V</span>
          </div>
          <input 
            type="range" 
            min="0" max="1023" 
            value={compState?.value || 0}
            onChange={(e) => {
               // Update state via simulation manager if available, else standard store
               const simulationStore = useSimulationStore.getState();
               simulationStore.updateComponentState(component.id, { value: Number(e.target.value) });
            }}
            className="w-full accent-[#2C5E4A] mt-2"
          />
        </div>
      )}

      {type === 'ARDUINO_UNO' && (
        <div className="space-y-2 text-sm bg-[#F3F4F3] border border-[#E5EBE8] p-2 rounded-lg max-h-48 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-2">
             {Object.entries(component.pins).map(([pinId, pin]) => {
               const v = pinVoltages[`${component.id}-${pinId}`] || 0;
               const isHigh = v > 2.5;
               return (
                 <div key={pinId} className="flex justify-between items-center bg-white px-2 py-1.5 rounded-md border border-[#E5EBE8] shadow-sm">
                   <span className="text-xs font-mono font-bold text-[#2C5E4A]">{pin.label}</span>
                   <span className={clsx("text-xs font-mono font-bold", isHigh ? "text-green-500" : "text-[#6A7B76]")}>
                     {pin.type === 'analog' ? `${v.toFixed(2)}V` : (isHigh ? 'HIGH' : 'LOW')}
                   </span>
                 </div>
               )
             })}
          </div>
        </div>
      )}
    </div>
  );
};

const ConnectedWiresSection = ({ component, wires, components, selectWire }: { component: CircuitComponent, wires: Wire[], components: CircuitComponent[], selectWire: (id: string, multi: boolean) => void }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-bold text-[#2C5E4A]">
        <Link2 className="w-4 h-4 text-[#82b49b]" /> Connected Wires
      </div>
      <div className="space-y-1.5">
        {Object.values(component.pins).map(pin => {
          const pinWires = wires.filter(w => (w.from.componentId === component.id && w.from.pinId === pin.id) || (w.to.componentId === component.id && w.to.pinId === pin.id));
          
          if (pinWires.length === 0) {
            return (
              <div key={pin.id} className="flex justify-between items-center text-xs py-1.5 border-b border-[#E5EBE8] last:border-0">
                <span className="font-mono text-[#2C5E4A] font-bold">{pin.label}</span>
                <span className="text-[#B5C2BF] italic font-medium">unconnected</span>
              </div>
            );
          }

          return (
            <div key={pin.id} className="flex flex-col gap-1 border-b border-[#E5EBE8] last:border-0 py-1.5">
              <span className="font-mono text-xs text-[#2C5E4A] font-bold">{pin.label}</span>
              {pinWires.map(w => {
                const isFrom = w.from.componentId === component.id && w.from.pinId === pin.id;
                const targetRef = isFrom ? w.to : w.from;
                const targetComp = components.find(c => c.id === targetRef.componentId);
                const targetPin = targetComp?.pins[targetRef.pinId];

                return (
                  <div 
                    key={w.id} 
                    className="flex items-center justify-between text-xs pl-2 pr-1 py-1.5 rounded-md hover:bg-[#F3F4F3] cursor-pointer group transition-colors"
                    onClick={() => selectWire(w.id, false)}
                  >
                    <div className="flex items-center gap-1.5 text-[#6A7B76] group-hover:text-[#2C5E4A] font-medium">
                      <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: w.color }} />
                      <span>{targetComp?.type.replace(/_/g, ' ') || 'Unknown'}</span>
                    </div>
                    <span className="font-mono text-[10px] bg-white border border-[#E5EBE8] text-[#2C5E4A] font-bold px-1 rounded shadow-sm">{targetPin?.label || '?'}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ActionsSection = ({ 
  deleteSelected,
  duplicateSelected,
  bringForward,
  sendBackward
}: { 
  deleteSelected: () => void,
  duplicateSelected: () => void,
  bringForward: () => void,
  sendBackward: () => void
}) => {
  return (
    <div className="space-y-2 pb-4">
      <div className="grid grid-cols-2 gap-2">
        <button 
          className="flex items-center justify-center gap-2 py-2 bg-[#F3F4F3] hover:bg-[#d2e8d6] text-[#2C5E4A] rounded-lg font-bold text-xs transition-colors"
          onClick={duplicateSelected}
        >
          <Copy className="w-3.5 h-3.5" /> Duplicate
        </button>
        <button 
          className="flex items-center justify-center gap-2 py-2 bg-[#FCEAEB] hover:bg-[#FF8A8A]/20 text-[#FF8A8A] rounded-lg font-bold text-xs transition-colors"
          onClick={deleteSelected}
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button 
          className="flex items-center justify-center gap-2 py-2 bg-[#F3F4F3] hover:bg-[#d2e8d6] text-[#2C5E4A] rounded-lg font-bold text-xs transition-colors"
          onClick={bringForward}
        >
          <ChevronUp className="w-3.5 h-3.5" /> Bring Forward
        </button>
        <button 
          className="flex items-center justify-center gap-2 py-2 bg-[#F3F4F3] hover:bg-[#d2e8d6] text-[#2C5E4A] rounded-lg font-bold text-xs transition-colors"
          onClick={sendBackward}
        >
          <ChevronDown className="w-3.5 h-3.5" /> Send Backward
        </button>
      </div>
    </div>
  );
};
