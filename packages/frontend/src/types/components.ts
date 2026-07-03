export type PinType = 'digital' | 'analog' | 'power' | 'ground' | 'PWM' | 'I2C_SDA' | 'I2C_SCL' | 'SPI';
export type PinDirection = 'input' | 'output' | 'bidirectional';
export type ComponentType =
  | 'ARDUINO_UNO'
  | 'LED'
  | 'RESISTOR'
  | 'PUSH_BUTTON'
  | 'POTENTIOMETER'
  | 'SERVO_MOTOR'
  | 'LCD_16X2'
  | 'BUZZER'
  | 'ULTRASONIC_SENSOR'
  | 'TEMPERATURE_SENSOR'
  | 'RELAY'
  | 'BREADBOARD'
  | 'LCD_16X2_I2C'
  | 'SEVEN_SEG_CC'
  | 'SEVEN_SEG_CA'
  | 'CAPACITOR'
  | 'TRANSISTOR_NPN'
  | 'TRANSISTOR_PNP'
  | 'DIODE'
  | 'ZENER_DIODE'
  | 'PHOTORESISTOR'
  | 'THERMISTOR'
  | 'MULTIMETER';

export type LEDColor = 'red' | 'green' | 'blue' | 'yellow' | 'white';
export type WireColor = 'red' | 'black' | 'blue' | 'green' | 'yellow' | 'orange' | 'white';

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Pin {
  id: string;
  label: string;
  type: PinType;
  direction: PinDirection;
  position: Point;
  connectedWireIds: string[];
  voltage: number;
}

export type ComponentProperties = Record<string, number | string | boolean>;

export interface CircuitComponent {
  id: string;
  type: ComponentType;
  position: Point;
  rotation: number;
  pins: Record<string, Pin>;
  properties: ComponentProperties;
  zIndex: number;
  isNew?: boolean;
}

export interface Wire {
  id: string;
  from: {
    componentId: string;
    pinId: string;
  };
  to: {
    componentId: string;
    pinId: string;
  };
  points: number[];
  color: WireColor;
  isSelected: boolean;
  isError: boolean;
}

export interface PinRef {
  componentId: string;
  pinId: string;
}

export interface SelectionBox {
  start: Point;
  end: Point;
}
