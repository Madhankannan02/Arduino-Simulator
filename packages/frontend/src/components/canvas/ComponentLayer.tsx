import React, { useEffect, useRef, memo } from 'react';
import { Layer, Group, Rect, Text } from 'react-konva';
import Konva from 'konva';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useSimulationStore } from '../../store/simulationStore';
import { CircuitComponent } from '../../types/components';

import { ArduinoUno } from '../circuit-components/arduino/ArduinoUno';
import { LED } from '../circuit-components/passive/LED';
import { Resistor } from '../circuit-components/passive/Resistor';
import { PushButton } from '../circuit-components/passive/PushButton';

import { Potentiometer } from '../circuit-components/passive/Potentiometer';
import { ServoMotor } from '../circuit-components/active/ServoMotor';
import { Buzzer } from '../circuit-components/active/Buzzer';
import { LCD16x2 } from '../circuit-components/active/LCD16x2';
import { LCD16x2_I2C } from '../circuit-components/active/LCD16x2_I2C';
import { UltrasonicSensor } from '../circuit-components/active/UltrasonicSensor';
import { Relay } from '../circuit-components/active/Relay';
import { TemperatureSensor } from '../circuit-components/active/TemperatureSensor';
import { Breadboard } from '../circuit-components/passive/Breadboard';
import { SevenSegmentCC } from '../circuit-components/active/SevenSegmentCC';
import { SevenSegmentCA } from '../circuit-components/active/SevenSegmentCA';
import { Capacitor } from '../circuit-components/passive/Capacitor';
import { TransistorNPN } from '../circuit-components/active/TransistorNPN';
import { TransistorPNP } from '../circuit-components/active/TransistorPNP';
import { Diode } from '../circuit-components/passive/Diode';
import { ZenerDiode } from '../circuit-components/passive/ZenerDiode';
import { Photoresistor } from '../circuit-components/passive/Photoresistor';
import { Thermistor } from '../circuit-components/passive/Thermistor';
import { Multimeter } from '../circuit-components/tools/Multimeter';
const FallbackComponent = ({ component }: { component: CircuitComponent }) => (
  <Group x={component.position.x} y={component.position.y} rotation={component.rotation}>
    <Rect width={100} height={100} fill="#374151" stroke="#4b5563" strokeWidth={2} cornerRadius={8} />
    <Text text={component.type} fill="white" align="center" verticalAlign="middle" width={100} height={100} padding={10} />
  </Group>
);

export const ComponentRouter = memo(({ component }: { component: CircuitComponent }) => {
  switch (component.type) {
    case 'ARDUINO_UNO': return <ArduinoUno component={component} />;
    case 'LED': return <LED component={component} />;
    case 'RESISTOR': return <Resistor component={component} />;
    case 'PUSH_BUTTON': return <PushButton component={component} />;
    case 'POTENTIOMETER': return <Potentiometer component={component} />;
    case 'SERVO_MOTOR': return <ServoMotor component={component} />;
    case 'BUZZER': return <Buzzer component={component} />;
    case 'LCD_16X2': return <LCD16x2 component={component} />;
    case 'LCD_16X2_I2C': return <LCD16x2_I2C component={component} />;
    case 'ULTRASONIC_SENSOR': return <UltrasonicSensor component={component} />;
    case 'RELAY': return <Relay component={component} />;
    case 'TEMPERATURE_SENSOR': return <TemperatureSensor component={component} />;
    case 'BREADBOARD': return <Breadboard component={component} />;
    case 'SEVEN_SEG_CC': return <SevenSegmentCC component={component} />;
    case 'SEVEN_SEG_CA': return <SevenSegmentCA component={component} />;
    case 'CAPACITOR': return <Capacitor component={component} />;
    case 'TRANSISTOR_NPN': return <TransistorNPN component={component} />;
    case 'TRANSISTOR_PNP': return <TransistorPNP component={component} />;
    case 'DIODE': return <Diode component={component} />;
    case 'ZENER_DIODE': return <ZenerDiode component={component} />;
    case 'PHOTORESISTOR': return <Photoresistor component={component} />;
    case 'THERMISTOR': return <Thermistor component={component} />;
    case 'MULTIMETER': return <Multimeter component={component} />;
    // Render fallback for un-implemented types
    default: return <FallbackComponent component={component} />;
  }
});

const MemoizedComponent = React.memo(
  ({ component }: { component: CircuitComponent }) => {
    return <ComponentRouter component={component} />;
  },
  (prev, next) => {
    // Re-render when position, rotation, properties, or pins change
    return (
      prev.component.position.x === next.component.position.x &&
      prev.component.position.y === next.component.position.y &&
      prev.component.rotation === next.component.rotation &&
      JSON.stringify(prev.component.properties) === JSON.stringify(next.component.properties) &&
      JSON.stringify(prev.component.pins) === JSON.stringify(next.component.pins)
    );
  }
);

export const ComponentLayer: React.FC<{ dimensions: { width: number, height: number } }> = ({ dimensions }) => {
  const components = useWorkspaceStore(state => state.components);
  const viewport = useWorkspaceStore(state => state.viewport);
  const layerRef = useRef<Konva.Layer>(null);

  // Call layer.batchDraw() when component states change from simulation
  useEffect(() => {
    const unsubscribe = useSimulationStore.subscribe(
      (state, oldState) => {
        if (state.componentStates !== oldState.componentStates && layerRef.current) {
          layerRef.current.batchDraw();
        }
      }
    );
    return () => unsubscribe();
  }, []);

  const sortedComponents = React.useMemo(() => {
    return [...components].sort((a, b) => {
      // Breadboards at the very bottom
      if (a.type === 'BREADBOARD' && b.type !== 'BREADBOARD') return -1;
      if (a.type !== 'BREADBOARD' && b.type === 'BREADBOARD') return 1;
      // Arduinos right above breadboards
      if (a.type === 'ARDUINO_UNO' && b.type !== 'ARDUINO_UNO') return -1;
      if (a.type !== 'ARDUINO_UNO' && b.type === 'ARDUINO_UNO') return 1;
      return 0;
    });
  }, [components]);

  const visibleComponents = React.useMemo(() => {
    const { x, y, scale } = viewport;
    const { width, height } = dimensions;

    const startX = -x / scale;
    const startY = -y / scale;
    const endX = startX + width / scale;
    const endY = startY + height / scale;

    // Use a generic bounding box check (max component size is ~400x400)
    const padding = 400;

    return sortedComponents.filter(c => {
      return (
        c.position.x >= startX - padding &&
        c.position.x <= endX + padding &&
        c.position.y >= startY - padding &&
        c.position.y <= endY + padding
      );
    });
  }, [sortedComponents, viewport, dimensions]);

  return (
    <Layer 
      ref={layerRef}
      x={viewport.x} 
      y={viewport.y} 
      scaleX={viewport.scale} 
      scaleY={viewport.scale}
    >
      {visibleComponents.map(comp => (
        <MemoizedComponent key={comp.id} component={comp} />
      ))}
    </Layer>
  );
};
