import React, { useMemo } from 'react';
import { Stage, Layer, Group } from 'react-konva';
import { ComponentType } from '../../types/components';
import { createComponent } from '../../utils/componentFactory';
import { ComponentRouter } from '../canvas/ComponentLayer';
import { CanvasContext } from '../canvas/Canvas';

const dummyContext = {
  handlePinMouseDown: () => {},
  handlePinMouseEnter: () => {},
  handlePinMouseLeave: () => {},
  handleGridMouseDown: () => {},
  handleGridMouseMove: () => {},
  handleGridMouseUp: () => {},
} as any;

interface ComponentThumbnailProps {
  type: ComponentType;
  size?: number;
}

export const ComponentThumbnail: React.FC<ComponentThumbnailProps> = ({ type, size = 32 }) => {
  const component = useMemo(() => createComponent(type, { x: 0, y: 0 }), [type]);

  const { scale, offsetX, offsetY } = useMemo(() => {
    switch (type) {
      case 'ARDUINO_UNO': return { scale: size / 210, offsetX: -100, offsetY: -74 };
      case 'BREADBOARD': return { scale: size / 330, offsetX: -165, offsetY: -90 };
      case 'LCD_16X2': return { scale: size / 176, offsetX: -76, offsetY: 36 };
      case 'LCD_16X2_I2C': return { scale: size / 176, offsetX: -76, offsetY: 36 };
      case 'LED': return { scale: size / 55, offsetX: -20, offsetY: -22.5 };
      case 'RESISTOR': return { scale: size / 70, offsetX: -30, offsetY: -12.5 };
      case 'PUSH_BUTTON': return { scale: size / 50, offsetX: -20, offsetY: -20 };
      case 'POTENTIOMETER': return { scale: size / 40, offsetX: -25, offsetY: -20 };
      case 'SERVO_MOTOR': return { scale: size / 68, offsetX: -25, offsetY: -8 };
      case 'BUZZER': return { scale: size / 72, offsetX: -20, offsetY: -4 };
      case 'ULTRASONIC_SENSOR': return { scale: size / 208, offsetX: 0, offsetY: 58 };
      case 'RELAY': return { scale: size / 100, offsetX: 0, offsetY: 0 };
      case 'TEMPERATURE_SENSOR': return { scale: size / 66, offsetX: 0, offsetY: 33 };
      case 'SEVEN_SEG_CC':
      case 'SEVEN_SEG_CA': return { scale: size / 100, offsetX: -30, offsetY: -45 };
      case 'CAPACITOR': return { scale: size / 100, offsetX: -30, offsetY: -40 };
      case 'TRANSISTOR_NPN':
      case 'TRANSISTOR_PNP': return { scale: size / 100, offsetX: -25, offsetY: -40 };
      case 'DIODE':
      case 'ZENER_DIODE': return { scale: size / 80, offsetX: -30, offsetY: -20 };
      case 'PHOTORESISTOR':
      case 'THERMISTOR': return { scale: size / 90, offsetX: -30, offsetY: -35 };
      case 'MULTIMETER': return { scale: size / 250, offsetX: -50, offsetY: -115 };
      default: return { scale: size / 100, offsetX: -50, offsetY: -50 };
    }
  }, [type, size]);

  return (
    <div className="flex items-center justify-center flex-shrink-0 pointer-events-none" style={{ width: size, height: size }}>
      <Stage width={size} height={size}>
        <CanvasContext.Provider value={dummyContext}>
          <Layer>
            <Group x={size / 2} y={size / 2} scaleX={scale} scaleY={scale}>
              <Group x={offsetX} y={offsetY}>
                <ComponentRouter component={component} />
              </Group>
            </Group>
          </Layer>
        </CanvasContext.Provider>
      </Stage>
    </div>
  );
};
