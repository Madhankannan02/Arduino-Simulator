// Types to support the graph

export type PinType = 'digital' | 'analog' | 'power' | 'ground' | 'PWM' | 'signal' | string;
export type PinDirection = 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP' | 'UNSET' | string;

export interface GraphNode {
  id: string; // componentId.pinId
  componentId: string;
  pinId: string;
  voltage: number;
  pinType: PinType;
  pinDirection: PinDirection;
}

export interface GraphEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  wireId?: string;
}

export interface GraphComponent {
  id: string;
  type: string;
  properties?: Record<string, any>;
  pins?: {
    id: string;
    type: string;
    direction?: string;
  }[];
}

export interface GraphWire {
  id: string;
  fromComponentId: string;
  fromPinId: string;
  toComponentId: string;
  toPinId: string;
}

// State types
export interface LEDState {
  isOn: boolean;
  brightness: number;
  currentMa: number;
}

export interface ServoState {
  angle?: number;
  speed?: number;
}

export interface BuzzerState {
  isActive: boolean;
  frequency?: number;
}

export interface ResistorState {
  voltageDrop: number;
  currentMa: number;
  powerMw: number;
}

export class CircuitGraph {
  public nodes: Map<string, GraphNode> = new Map();
  public edges: Map<string, GraphEdge> = new Map();
  public adjacency: Map<string, Set<string>> = new Map();
  public components: Map<string, GraphComponent> = new Map();
  public dynamicResistances: Map<string, number> = new Map();
  private tempEdges: Map<string, GraphEdge> = new Map();

  public setDynamicResistance(componentId: string, resistance: number): void {
    this.dynamicResistances.set(componentId, resistance);
  }

  public buildFromCircuitState(components: GraphComponent[], wires: GraphWire[]): void {
    this.nodes.clear();
    this.edges.clear();
    this.adjacency.clear();
    this.components.clear();
    this.dynamicResistances.clear();
    this.tempEdges.clear();

    for (const comp of components) {
      this.components.set(comp.id, comp);
      if (comp.pins) {
        for (const pin of comp.pins) {
          const nodeId = `${comp.id}.${pin.id}`;
          this.nodes.set(nodeId, {
            id: nodeId,
            componentId: comp.id,
            pinId: pin.id,
            voltage: 0,
            pinType: pin.type,
            pinDirection: pin.direction || 'UNSET'
          });
          this.adjacency.set(nodeId, new Set());
        }
      }
    }

    for (const wire of wires) {
      const fromNodeId = `${wire.fromComponentId}.${wire.fromPinId}`;
      const toNodeId = `${wire.toComponentId}.${wire.toPinId}`;
      
      const edgeId = wire.id;
      this.edges.set(edgeId, {
        id: edgeId,
        fromNodeId,
        toNodeId,
        wireId: wire.id
      });

      if (this.nodes.has(fromNodeId) && this.nodes.has(toNodeId)) {
        this.adjacency.get(fromNodeId)?.add(toNodeId);
        this.adjacency.get(toNodeId)?.add(fromNodeId);
      }
    }
  }

  public propagateVoltage(sourceNodeId: string, sourceVoltage: number): Map<string, number> {
    const updatedNodes = new Map<string, number>();
    const visited = new Set<string>();
    const queue: string[] = [sourceNodeId];
    
    const sourceNode = this.nodes.get(sourceNodeId);
    if (sourceNode) {
      sourceNode.voltage = sourceVoltage;
      updatedNodes.set(sourceNodeId, sourceVoltage);
    }
    visited.add(sourceNodeId);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const neighbors = this.adjacency.get(currentId);
      
      if (neighbors) {
        for (const neighborId of neighbors) {
          if (!visited.has(neighborId)) {
            const neighborNode = this.nodes.get(neighborId);
            if (neighborNode) {
              neighborNode.voltage = sourceVoltage;
              updatedNodes.set(neighborId, sourceVoltage);
            }
            visited.add(neighborId);
            queue.push(neighborId);
          }
        }
      }
    }

    return updatedNodes;
  }

  public getNodeVoltage(componentId: string, pinId: string): number {
    const node = this.nodes.get(`${componentId}.${pinId}`);
    return node ? node.voltage : 0;
  }

  public setNodeVoltage(componentId: string, pinId: string, voltage: number): void {
    const node = this.nodes.get(`${componentId}.${pinId}`);
    if (node) {
      node.voltage = voltage;
    }
  }

  public findSeriesResistance(startNodeId: string): number {
    const visited = new Set<string>();
    const queue: string[] = [startNodeId];
    visited.add(startNodeId);
    
    let totalResistance = 0;
    let foundResistor = false;
    const countedResistors = new Set<string>();

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const node = this.nodes.get(currentId);
      
      if (node) {
        const comp = this.components.get(node.componentId);
        if (comp && !countedResistors.has(comp.id)) {
          if (comp.type === 'RESISTOR') {
            totalResistance += (comp.properties?.resistance || 0);
            foundResistor = true;
            countedResistors.add(comp.id);
          } else if (this.dynamicResistances.has(comp.id)) {
            totalResistance += this.dynamicResistances.get(comp.id)!;
            foundResistor = true;
            countedResistors.add(comp.id);
          }
        }
      }

      const neighbors = this.adjacency.get(currentId);
      if (neighbors) {
        for (const neighborId of neighbors) {
          if (!visited.has(neighborId)) {
            visited.add(neighborId);
            queue.push(neighborId);
          }
        }
      }
    }

    return foundResistor ? totalResistance : 0;
  }

  public getConnectedComponents(componentId: string, pinId: string): GraphComponent[] {
    const startNodeId = `${componentId}.${pinId}`;
    const connectedComps = new Map<string, GraphComponent>();
    const visited = new Set<string>();
    const queue: string[] = [startNodeId];
    visited.add(startNodeId);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const node = this.nodes.get(currentId);
      
      if (node && node.componentId !== componentId) {
        const comp = this.components.get(node.componentId);
        if (comp) {
          connectedComps.set(comp.id, comp);
        }
      }

      const neighbors = this.adjacency.get(currentId);
      if (neighbors) {
        for (const neighborId of neighbors) {
          if (!visited.has(neighborId)) {
            visited.add(neighborId);
            queue.push(neighborId);
          }
        }
      }
    }

    return Array.from(connectedComps.values());
  }

  public getComponentsOfType(type: string): GraphComponent[] {
    const result: GraphComponent[] = [];
    for (const comp of this.components.values()) {
      if (comp.type === type) {
        result.push(comp);
      }
    }
    return result;
  }

  public closeSwitch(nodeIdA: string, nodeIdB: string): void {
    if (!this.nodes.has(nodeIdA) || !this.nodes.has(nodeIdB)) return;
    
    const edgeId = `temp_${nodeIdA}_${nodeIdB}`;
    this.tempEdges.set(edgeId, {
      id: edgeId,
      fromNodeId: nodeIdA,
      toNodeId: nodeIdB
    });
    
    this.adjacency.get(nodeIdA)?.add(nodeIdB);
    this.adjacency.get(nodeIdB)?.add(nodeIdA);
  }

  public openSwitch(nodeIdA: string, nodeIdB: string): void {
    const edgeId = `temp_${nodeIdA}_${nodeIdB}`;
    const altEdgeId = `temp_${nodeIdB}_${nodeIdA}`;
    this.tempEdges.delete(edgeId);
    this.tempEdges.delete(altEdgeId);
    
    this.adjacency.get(nodeIdA)?.delete(nodeIdB);
    this.adjacency.get(nodeIdB)?.delete(nodeIdA);
  }

  public hasPathToGround(startNodeId: string): boolean {
    return this.hasPathToPinType(startNodeId, 'ground');
  }

  public hasPathToPower(startNodeId: string): boolean {
    return this.hasPathToPinType(startNodeId, 'power');
  }

  public findPath(startNodeId: string, endNodeId: string): boolean {
    const visited = new Set<string>();
    const queue: string[] = [startNodeId];
    visited.add(startNodeId);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (currentId === endNodeId) return true;

      const node = this.nodes.get(currentId);
      if (node) {
        // Add all other pins of the SAME component as valid paths, EXCEPT for power supplies/microcontrollers and switches!
        const comp = this.components.get(node.componentId);
        if (comp && comp.pins && !['ARDUINO_UNO', 'BATTERY', 'PUSH_BUTTON', 'SWITCH', 'LED', 'ULTRASONIC_SENSOR', 'RELAY', 'BREADBOARD', 'MULTIMETER', 'CAPACITOR', 'DIODE', 'ZENER_DIODE', 'TRANSISTOR_NPN', 'TRANSISTOR_PNP', 'PHOTORESISTOR', 'THERMISTOR'].includes(comp.type)) {
          for (const pin of comp.pins) {
            if (pin.id !== node.pinId) {
              const internalNeighborId = `${comp.id}.${pin.id}`;
              if (!visited.has(internalNeighborId)) {
                visited.add(internalNeighborId);
                queue.push(internalNeighborId);
              }
            }
          }
        }
      }

      const neighbors = this.adjacency.get(currentId);
      if (neighbors) {
        for (const neighborId of neighbors) {
          if (!visited.has(neighborId)) {
            visited.add(neighborId);
            queue.push(neighborId);
          }
        }
      }
    }
    return false;
  }

  public getMaxConnectedVoltage(startNodeId: string): number {
    let maxVoltage = 0;
    const visited = new Set<string>();
    const queue: string[] = [startNodeId];
    visited.add(startNodeId);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const node = this.nodes.get(currentId);
      
      if (node) {
        if (node.voltage > maxVoltage) {
          maxVoltage = node.voltage;
        }

        const comp = this.components.get(node.componentId);
        if (comp && comp.pins && !['ARDUINO_UNO', 'BATTERY', 'PUSH_BUTTON', 'SWITCH', 'LED', 'ULTRASONIC_SENSOR', 'RELAY', 'BREADBOARD', 'MULTIMETER', 'CAPACITOR', 'DIODE', 'ZENER_DIODE', 'TRANSISTOR_NPN', 'TRANSISTOR_PNP', 'PHOTORESISTOR', 'THERMISTOR'].includes(comp.type)) {
          for (const pin of comp.pins) {
            if (pin.id !== node.pinId) {
              const internalNeighborId = `${comp.id}.${pin.id}`;
              if (!visited.has(internalNeighborId)) {
                visited.add(internalNeighborId);
                queue.push(internalNeighborId);
              }
            }
          }
        }
      }

      const neighbors = this.adjacency.get(currentId);
      if (neighbors) {
        for (const neighborId of neighbors) {
          if (!visited.has(neighborId)) {
            visited.add(neighborId);
            queue.push(neighborId);
          }
        }
      }
    }
    return maxVoltage;
  }

  public getMinConnectedVoltage(startNodeId: string): number {
    let minVoltage = Infinity;
    const visited = new Set<string>();
    const queue: string[] = [startNodeId];
    visited.add(startNodeId);

    // Also consider ground nodes as 0V even if they haven't explicitly been set
    if (this.hasPathToGround(startNodeId)) return 0;

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const node = this.nodes.get(currentId);
      
      if (node) {
        if (node.voltage < minVoltage) {
          minVoltage = node.voltage;
        }

        const comp = this.components.get(node.componentId);
        if (comp && comp.pins && !['ARDUINO_UNO', 'BATTERY', 'PUSH_BUTTON', 'SWITCH', 'LED', 'ULTRASONIC_SENSOR', 'RELAY', 'BREADBOARD', 'MULTIMETER', 'CAPACITOR', 'DIODE', 'ZENER_DIODE', 'TRANSISTOR_NPN', 'TRANSISTOR_PNP', 'PHOTORESISTOR', 'THERMISTOR'].includes(comp.type)) {
          for (const pin of comp.pins) {
            if (pin.id !== node.pinId) {
              const internalNeighborId = `${comp.id}.${pin.id}`;
              if (!visited.has(internalNeighborId)) {
                visited.add(internalNeighborId);
                queue.push(internalNeighborId);
              }
            }
          }
        }
      }

      const neighbors = this.adjacency.get(currentId);
      if (neighbors) {
        for (const neighborId of neighbors) {
          if (!visited.has(neighborId)) {
            visited.add(neighborId);
            queue.push(neighborId);
          }
        }
      }
    }
    return minVoltage === Infinity ? 0 : minVoltage;
  }

  private hasPathToPinType(startNodeId: string, targetType: string): boolean {
    const visited = new Set<string>();
    const queue: string[] = [startNodeId];
    visited.add(startNodeId);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const node = this.nodes.get(currentId);
      
      if (node) {
        if (node.pinType === targetType) {
          return true;
        }

        // Add all other pins of the SAME component as valid paths, EXCEPT for power supplies/microcontrollers and switches!
        const comp = this.components.get(node.componentId);
        if (comp && comp.pins && !['ARDUINO_UNO', 'BATTERY', 'PUSH_BUTTON', 'SWITCH', 'LED', 'ULTRASONIC_SENSOR', 'RELAY', 'BREADBOARD', 'MULTIMETER', 'CAPACITOR', 'DIODE', 'ZENER_DIODE', 'TRANSISTOR_NPN', 'TRANSISTOR_PNP', 'PHOTORESISTOR', 'THERMISTOR'].includes(comp.type)) {
          for (const pin of comp.pins) {
            if (pin.id !== node.pinId) {
              const internalNeighborId = `${comp.id}.${pin.id}`;
              if (!visited.has(internalNeighborId)) {
                visited.add(internalNeighborId);
                queue.push(internalNeighborId);
              }
            }
          }
        }
      }

      const neighbors = this.adjacency.get(currentId);
      if (neighbors) {
        for (const neighborId of neighbors) {
          if (!visited.has(neighborId)) {
            visited.add(neighborId);
            queue.push(neighborId);
          }
        }
      }
    }
    return false;
  }

  public serialize(): any {
    const nodes: Record<string, any> = {};
    const edges: Record<string, any> = {};
    const adjacency: Record<string, string[]> = {};
    const components: Record<string, any> = {};
    
    this.nodes.forEach((node, key) => { nodes[key] = { ...node }; });
    this.edges.forEach((edge, key) => { edges[key] = { ...edge }; });
    this.adjacency.forEach((adj, key) => { adjacency[key] = Array.from(adj); });
    this.components.forEach((comp, key) => { components[key] = { ...comp }; });

    return { nodes, edges, adjacency, components };
  }

  public loadSerialized(data: any): void {
    this.nodes.clear();
    this.edges.clear();
    this.adjacency.clear();
    this.components.clear();
    this.tempEdges.clear();

    if (data.nodes) {
      Object.entries(data.nodes).forEach(([k, v]) => this.nodes.set(k, v as any));
    }
    if (data.edges) {
      Object.entries(data.edges).forEach(([k, v]) => this.edges.set(k, v as any));
    }
    if (data.adjacency) {
      Object.entries(data.adjacency).forEach(([k, v]) => this.adjacency.set(k, new Set(v as string[])));
    }
    if (data.components) {
      Object.entries(data.components).forEach(([k, v]) => this.components.set(k, v as any));
    }
  }
}

export function calculateLEDState(ledComponent: GraphComponent, graph: CircuitGraph): LEDState {
  const anodeId = `${ledComponent.id}.ANODE`;
  const cathodeId = `${ledComponent.id}.CATHODE`;
  
  const vAnode = graph.getMaxConnectedVoltage(anodeId);
  const vCathode = graph.getMinConnectedVoltage(cathodeId);
  
  const voltageDrop = vAnode - vCathode;
  const forwardVoltage = ledComponent.properties?.forwardVoltage || 2.0;
  
  const seriesResistance = graph.findSeriesResistance(anodeId) || graph.findSeriesResistance(cathodeId);
  
  let current = 0;
  let brightness = 0;
  let isOn = false;

  if (voltageDrop > forwardVoltage) {
    if (seriesResistance > 0) {
      current = ((voltageDrop - forwardVoltage) / seriesResistance) * 1000;
    } else {
      current = 1000; // Fake a massive current when there is no resistor so it still lights up
    }
    brightness = Math.min(Math.max(current / 20.0, 0), 1.0);
    isOn = brightness > 0;
  }

  return { isOn, brightness, currentMa: current };
}

export interface RelayState {
  isActivated: boolean;
  coilVoltage?: number;
}

export function calculateRelayState(relayComponent: GraphComponent, graph: CircuitGraph): RelayState {
  const vIn = graph.getNodeVoltage(relayComponent.id, 'IN');
  const isActivated = vIn > 2.5;
  return { isActivated, coilVoltage: vIn };
}

export function calculateServoState(lastDutyCycle: number, minPulse = 544, maxPulse = 2400, servoType = 'positional'): ServoState {
  const pulseWidth = lastDutyCycle * 20000;
  
  if (servoType === 'continuous') {
    // 1500us is stop (deadzone 1480-1520)
    // < 1480 is backward (544 is full speed -1)
    // > 1520 is forward (2400 is full speed +1)
    let speed = 0;
    if (pulseWidth < 1480) {
      speed = -1.0 + Math.max(0, (pulseWidth - minPulse) / (1480 - minPulse));
      speed = Math.max(-1.0, speed);
    } else if (pulseWidth > 1520) {
      speed = Math.min(1.0, (pulseWidth - 1520) / (maxPulse - 1520));
    }
    return { speed };
  } else {
    let angle = 0;
    if (pulseWidth >= minPulse && pulseWidth <= maxPulse) {
      angle = ((pulseWidth - minPulse) / (maxPulse - minPulse)) * 180.0;
    } else if (pulseWidth > maxPulse) {
      angle = 180;
    }
    return { angle };
  }
}

export function calculateBuzzerState(buzzerComponent: GraphComponent, graph: CircuitGraph): BuzzerState {
  const vPositive = graph.getNodeVoltage(buzzerComponent.id, 'POSITIVE');
  const vNegative = graph.getNodeVoltage(buzzerComponent.id, 'NEGATIVE');
  
  const isActive = (vPositive - vNegative) > 2.0;
  
  return { isActive, frequency: buzzerComponent.properties?.frequency || 440 };
}

export function calculateResistorState(resistorComponent: GraphComponent, graph: CircuitGraph): ResistorState {
  const pin1Id = `${resistorComponent.id}.PIN_1`;
  const pin2Id = `${resistorComponent.id}.PIN_2`;
  
  const resistance = resistorComponent.properties?.resistance || 220;
  
  const connectedComps = [
    ...graph.getConnectedComponents(resistorComponent.id, 'PIN_1'),
    ...graph.getConnectedComponents(resistorComponent.id, 'PIN_2')
  ];
  
  let currentMa = 0;
  let voltageDrop = 0;
  let ledFound = false;

  for (const comp of connectedComps) {
    if (comp.type === 'LED') {
      const ledState = calculateLEDState(comp, graph);
      if (ledState.isOn) {
        currentMa = ledState.currentMa;
        voltageDrop = (currentMa / 1000) * resistance;
        ledFound = true;
        break;
      }
    }
  }

  if (!ledFound) {
    const v1Max = graph.getMaxConnectedVoltage(pin1Id);
    const v1Min = graph.getMinConnectedVoltage(pin1Id);
    const v2Max = graph.getMaxConnectedVoltage(pin2Id);
    const v2Min = graph.getMinConnectedVoltage(pin2Id);
    
    const vHigh = Math.max(v1Max, v2Max);
    const vLow = Math.min(v1Min, v2Min);
    
    const hasGround = graph.hasPathToGround(pin1Id) || graph.hasPathToGround(pin2Id) || vLow === 0;
    const hasPower = graph.hasPathToPower(pin1Id) || graph.hasPathToPower(pin2Id) || vHigh > 0;
    
    if (hasGround && hasPower) {
      voltageDrop = vHigh - vLow;
      currentMa = (voltageDrop / resistance) * 1000;
    }
  }

  const powerMw = voltageDrop * currentMa;
  
  return { voltageDrop, currentMa, powerMw };
}
