import { useWorkspaceStore } from '../store/workspaceStore';
import { useEditorStore } from '../store/editorStore';
import { useSimulationStore } from '../store/simulationStore';
import { CircuitComponent, Wire, ComponentType } from '../types/components';
import { getAbsolutePinPosition } from './geometry';
import toast from 'react-hot-toast';

export interface SavedProject {
  version: string;
  name: string;
  savedAt: string;
  description: string;
  components: CircuitComponent[];
  wires: Wire[];
  code: string;
  viewport: { x: number; y: number; scale: number };
  thumbnail?: string;
  tags: string[];
}

const VALID_COMPONENT_TYPES: ComponentType[] = [
  'ARDUINO_UNO', 'LED', 'RESISTOR', 'PUSH_BUTTON', 'POTENTIOMETER', 
  'SERVO_MOTOR', 'LCD_16X2', 'LCD_16X2_I2C', 'BUZZER', 'ULTRASONIC_SENSOR', 
  'TEMPERATURE_SENSOR', 'RELAY', 'BREADBOARD', 'SEVEN_SEG_CC', 'SEVEN_SEG_CA',
  'CAPACITOR', 'TRANSISTOR_NPN', 'TRANSISTOR_PNP', 'DIODE', 'ZENER_DIODE', 
  'PHOTORESISTOR', 'THERMISTOR', 'MULTIMETER'
];

export async function serializeProject(name: string = 'Untitled Project', generateThumbnail: boolean = false): Promise<SavedProject> {
  const workspaceState = useWorkspaceStore.getState();
  const editorState = useEditorStore.getState();

  // Deep clone to avoid any reactivity proxy issues
  const components = JSON.parse(JSON.stringify(workspaceState.components));
  const wires = JSON.parse(JSON.stringify(workspaceState.wires));
  const viewport = JSON.parse(JSON.stringify(workspaceState.viewport));

  let thumbnail: string | undefined;
  
  if (generateThumbnail) {
    try {
      // Find Konva Stage and get data URL. We assume there's a canvas or stage available.
      // This is a naive capture; if Konva stage isn't reachable globally, we skip thumbnail
      const stageEl = document.querySelector('.konvajs-content canvas') as HTMLCanvasElement;
      if (stageEl) {
        // Create a scaled down thumbnail
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 280;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(stageEl, 0, 0, canvas.width, canvas.height);
          thumbnail = canvas.toDataURL('image/jpeg', 0.7);
        }
      }
    } catch (e) {
      console.warn('Failed to generate thumbnail:', e);
    }
  }

  return {
    version: '1.0',
    name,
    savedAt: new Date().toISOString(),
    description: '',
    components,
    wires,
    code: editorState.code,
    viewport,
    thumbnail,
    tags: []
  };
}

export function deserializeProject(data: any) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid project file format.');
  }

  if (data.version !== '1.0') {
    throw new Error(`Unsupported project version: ${data.version}`);
  }

  if (!Array.isArray(data.components) || !Array.isArray(data.wires)) {
    throw new Error('Project file is missing components or wires array.');
  }

  const validComponents: CircuitComponent[] = [];
  data.components.forEach((comp: any) => {
    if (VALID_COMPONENT_TYPES.includes(comp.type as ComponentType)) {
      validComponents.push(comp as CircuitComponent);
    } else {
      console.warn(`Filtering out unknown component type: ${comp.type}`);
    }
  });

  const validWires = data.wires as Wire[];
  validWires.forEach(wire => {
    if (!wire.points || wire.points.length === 0) {
      const fromComp = validComponents.find(c => c.id === wire.from.componentId);
      const toComp = validComponents.find(c => c.id === wire.to.componentId);
      
      if (fromComp && toComp) {
        const fromPin = fromComp.pins[wire.from.pinId];
        const toPin = toComp.pins[wire.to.pinId];
        
        if (fromPin && toPin) {
          const start = getAbsolutePinPosition(fromComp, fromPin);
          const end = getAbsolutePinPosition(toComp, toPin);
          wire.points = [start.x, start.y, end.x, end.y];
        }
      }
    }
  });

  const viewport = data.viewport || { x: 0, y: 0, scale: 1 };
  const code = data.code || '';

  useWorkspaceStore.getState().loadProject(validComponents, validWires, viewport);
  useEditorStore.getState().setCode(code);
  useSimulationStore.getState().resetSimulation?.(); // Optional chaining in case it doesn't exist

  toast.success(`Loaded project: ${data.name || 'Untitled'}`);
}

export async function downloadProject(name: string) {
  try {
    const project = await serializeProject(name, true);
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/\s+/g, '_')}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    toast.success('Project downloaded successfully');
  } catch (error) {
    console.error('Error downloading project:', error);
    toast.error('Failed to download project');
  }
}

export function loadProjectFromFile(): Promise<SavedProject> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          resolve(json);
        } catch (error) {
          reject(new Error('Failed to parse JSON file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    };
    
    input.click();
  });
}

let autoSaveTimer: NodeJS.Timeout | null = null;

export function setupAutoSave() {
  useWorkspaceStore.subscribe((state, prevState) => {
    // Only trigger if components or wires changed
    if (state.components !== prevState.components || state.wires !== prevState.wires) {
      if (state.components.length === 0) return; // Don't auto-save empty projects
      
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
      
      autoSaveTimer = setTimeout(async () => {
        try {
          const project = await serializeProject('AutoSave', false);
          localStorage.setItem('arduino-sim-autosave', JSON.stringify(project));
          localStorage.setItem('arduino-sim-autosave-time', Date.now().toString());
        } catch (e) {
          console.warn('Auto-save failed', e);
        }
      }, 3000);
    }
  });
}
