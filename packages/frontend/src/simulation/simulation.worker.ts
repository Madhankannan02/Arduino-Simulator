import {
  CPU,
  AVRIOPort,
  AVRTimer,
  AVRUSART,
  portBConfig,
  portCConfig,
  portDConfig,
  timer0Config,
  timer1Config,
  timer2Config,
  usart0Config,
  avrInstruction,
  AVRADC,
  adcConfig,
  AVRTWI,
  twiConfig,
  TWIEventHandler
} from 'avr8js';

import { CircuitGraph, calculateLEDState, calculateBuzzerState, calculateServoState, calculateRelayState, calculateResistorState } from './engine/CircuitGraph';
import { HD44780 } from './engine/HD44780';
import { DIGIT_SEGMENTS } from '../utils/sevenSegmentLookup';

class I2CHandler implements TWIEventHandler {
  private activeAddress: number | null = null;
  private isWrite = false;

  constructor(private twi: AVRTWI) {}

  start(_repeated: boolean) {
    this.twi.completeStart();
  }

  stop() {
    this.twi.completeStop();
    this.activeAddress = null;
  }

  connectToSlave(addr: number, write: boolean) {
    this.activeAddress = addr;
    this.isWrite = write;
    // For now, always ACK connection to any slave (like LCD at 0x27)
    this.twi.completeConnect(true);
  }

  writeByte(value: number) {
    if (this.activeAddress !== null && this.isWrite) {
      if (this.activeAddress === 0x27 || this.activeAddress === 0x3F) {
        if (circuitGraph) {
          for (const [id, comp] of circuitGraph.components.entries()) {
            if (comp.type === 'LCD_16X2_I2C') {
              if (!lcdControllers[id]) {
                lcdControllers[id] = new HD44780();
              }
              const lcd = lcdControllers[id];
              const rs = (value & 0x01) !== 0;
              const rw = (value & 0x02) !== 0;
              const e = (value & 0x04) !== 0;
              const backlight = (value & 0x08) !== 0;
              const dataNibble = (value >> 4) & 0x0F;

              const oldLastEnable = lcd.lastEnable;
              lcd.processPins(rs, rw, e, dataNibble, backlight);

              if (oldLastEnable !== lcd.lastEnable) {
                queueComponentUpdate(id, { 
                  rows: lcd.rows, 
                  cursorRow: lcd.cursorRow, 
                  cursorCol: lcd.cursorCol,
                  backlight: lcd.backlight,
                  cursorVisible: lcd.cursorOn || lcd.blinkOn
                });
              }
            }
          }
        }
      }
    }
    this.twi.completeWrite(true);
  }

  readByte(_ack: boolean) {
    this.twi.completeRead(0xFF);
  }
}

class AVRRunner {
  cpu: CPU;
  timer0: AVRTimer;
  timer1: AVRTimer;
  timer2: AVRTimer;
  portB: AVRIOPort;
  portC: AVRIOPort;
  portD: AVRIOPort;
  usart: AVRUSART;
  adc: AVRADC;
  twi: AVRTWI;

  constructor(flashData: Uint8Array) {
    const program = new Uint16Array(flashData.buffer);
    this.cpu = new CPU(program);
    this.timer0 = new AVRTimer(this.cpu, timer0Config);
    this.timer1 = new AVRTimer(this.cpu, timer1Config);
    this.timer2 = new AVRTimer(this.cpu, timer2Config);
    this.portB = new AVRIOPort(this.cpu, portBConfig);
    this.portC = new AVRIOPort(this.cpu, portCConfig);
    this.portD = new AVRIOPort(this.cpu, portDConfig);
    this.usart = new AVRUSART(this.cpu, usart0Config, 16000000);
    this.adc = new AVRADC(this.cpu, adcConfig);
    this.twi = new AVRTWI(this.cpu, twiConfig, 16000000);
    this.twi.eventHandler = new I2CHandler(this.twi);
  }
}

let avrRunner: AVRRunner | null = null;
let circuitGraph: CircuitGraph | null = null;
let simulationLoopTimer: NodeJS.Timeout | null = null;
let isRunning = false;
let serialBuffer = "";
let pendingUpdates: Record<string, any> = {};
const pinHighTicks: Record<string, number> = {};
const lcdControllers: Record<string, HD44780> = {};

// Simulated distance for ultrasonic sensor (in cm)
let simulatedDistanceCm = 50;
let simulatedTempCelsius = 25.0;
let simulatedHumidity = 60;

// Track TRIG pin state per sensor component
const trigState: Record<string, boolean> = {};
const dhtLowCycle: Record<string, number> = {};

// Runtime monitoring
let simulationStartTime = 0;
let lastActivityTime = 0;
let stackWarningPosted = false;

function registerActivity() {
  lastActivityTime = performance.now();
}

// Queue for precise hardware pin toggles
const scheduledPinToggles: Array<{
  cpuCycle: number;
  pinName: string;
  state: boolean;
}> = [];
let nextToggleCycle = Infinity;

function setArduinoPin(pinName: string, state: boolean) {
  if (!avrRunner) return;
  if (pinName.startsWith('D')) {
    const pinNum = parseInt(pinName.substring(1), 10);
    if (pinNum >= 0 && pinNum <= 7) {
      avrRunner.portD.setPin(pinNum, state);
    } else if (pinNum >= 8 && pinNum <= 13) {
      avrRunner.portB.setPin(pinNum - 8, state);
    }
  } else if (pinName.startsWith('A')) {
    const pinNum = parseInt(pinName.substring(1), 10);
    if (pinNum >= 0 && pinNum <= 5) {
      avrRunner.portC.setPin(pinNum, state);
    }
  }
}

let lastHex: string | null = null;
let lastGraphData: any = null;
let lastTickTime = 0;

let lastPortB = 0;
let lastPortC = 0;
let lastPortD = 0;

function parseIntelHex(hexString: string): Uint8Array {
  const flash = new Uint8Array(32768);
  flash.fill(0xFF);
  const lines = hexString.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line[0] !== ':') {
      throw new Error(`Malformed hex at line ${i + 1}: Missing ':'`);
    }

    const byteCount = parseInt(line.substring(1, 3), 16);
    const address = parseInt(line.substring(3, 7), 16);
    const recordType = parseInt(line.substring(7, 9), 16);

    let checksum = 0;
    for (let j = 1; j < line.length - 2; j += 2) {
      checksum += parseInt(line.substring(j, j + 2), 16);
    }
    checksum = (~checksum + 1) & 0xFF;
    const fileChecksum = parseInt(line.substring(line.length - 2), 16);

    if (checksum !== fileChecksum) {
      throw new Error(`Checksum mismatch at line ${i + 1}`);
    }

    if (recordType === 0) {
      for (let j = 0; j < byteCount; j++) {
        const dataByte = parseInt(line.substring(9 + j * 2, 11 + j * 2), 16);
        if (address + j < flash.length) {
          flash[address + j] = dataByte;
        }
      }
    } else if (recordType === 1) {
      break;
    }
  }

  return flash;
}


let capacitorStates: Map<string, { chargeVoltage: number, lastUpdateTime: number }> = new Map();

function stopSimulation() {
  isRunning = false;
  if (simulationLoopTimer) {
    clearTimeout(simulationLoopTimer);
    simulationLoopTimer = null;
  }
  avrRunner = null;
  circuitGraph = null;
  pendingUpdates = {};
  scheduledPinToggles.length = 0;
  nextToggleCycle = Infinity;
  for (const key in lcdControllers) delete lcdControllers[key];
  for (const key in dhtLowCycle) delete dhtLowCycle[key];
  simulationStartTime = 0;
  lastActivityTime = 0;
  stackWarningPosted = false;
  capacitorStates.clear();

}



function updateComponentsState(now: number) {
  if (!circuitGraph) return;

  for (const [id, comp] of circuitGraph.components.entries()) {
    // CAPACITOR
    if (comp.type === 'CAPACITOR') {
      let state = capacitorStates.get(id);
      if (!state) {
        state = { chargeVoltage: 0, lastUpdateTime: now };
        capacitorStates.set(id, state);
      }
      
      const dt = Math.max(0.001, (now - state.lastUpdateTime) / 1000);
      state.lastUpdateTime = now;

      const isPolarized = comp.properties?.type === 'electrolytic';
      const pin1Id = isPolarized ? 'POSITIVE' : 'PIN_1';
      const pin2Id = isPolarized ? 'NEGATIVE' : 'PIN_2';
      
      const v1 = circuitGraph.getMaxConnectedVoltage(`${id}.${pin1Id}`);
      const v2 = circuitGraph.getMinConnectedVoltage(`${id}.${pin2Id}`);
      
      let appliedVoltage = v1 - v2;
      if (appliedVoltage < 0 && !isPolarized) {
        appliedVoltage = -appliedVoltage;
      }
      
      const seriesResistance = Math.max(10, circuitGraph.findSeriesResistance(`${id}.${pin1Id}`));
      const capacitance = (Number(comp.properties?.capacitance) || 10) * 1e-6;
      const tau = seriesResistance * capacitance;
      
      let isReversePolarized = false;
      if (isPolarized && (v2 - v1) > 0.1) {
        isReversePolarized = true;
      }

      const newCharge = appliedVoltage + (state.chargeVoltage - appliedVoltage) * Math.exp(-dt / tau);
      let currentMa = (capacitance * Math.abs(newCharge - state.chargeVoltage) / dt) * 1000;
      if (currentMa < 0.001) currentMa = 0;
      
      state.chargeVoltage = newCharge;

      const voltageRating = Number(comp.properties?.voltageRating) || 25;
      const chargePercent = Math.min(100, Math.max(0, (state.chargeVoltage / voltageRating) * 100));
      const storedEnergy = 0.5 * capacitance * state.chargeVoltage * state.chargeVoltage * 1e6;
      const isOvervoltage = state.chargeVoltage > voltageRating;

      queueComponentUpdate(id, {
        chargeVoltage: state.chargeVoltage,
        chargePercent,
        storedEnergy,
        isFullyCharged: Math.abs(appliedVoltage - state.chargeVoltage) < 0.05,
        isCharging: appliedVoltage > state.chargeVoltage + 0.05,
        isDischarging: appliedVoltage < state.chargeVoltage - 0.05,
        currentMa,
        isOvervoltage,
        isReversePolarized
      });
    }
    
    // TRANSISTOR NPN
    else if (comp.type === 'TRANSISTOR_NPN') {
      const vBase = circuitGraph.getMaxConnectedVoltage(`${id}.BASE`);
      const vEmitter = circuitGraph.getMinConnectedVoltage(`${id}.EMITTER`);
      const vCollector = circuitGraph.getMaxConnectedVoltage(`${id}.COLLECTOR`);
      
      const vbe = vBase - vEmitter;
      let isOn = false;
      let ib = 0;
      let ic = 0;
      let operatingMode = 'cutoff';
      const hFE = Number(comp.properties?.hFE) || 100;
      const maxIc = Number(comp.properties?.maxCollectorCurrentMa) || 200;
      const maxVce = Number(comp.properties?.maxVce) || 45;
      const vce = vCollector - vEmitter;

      if (vbe >= 0.7) {
        const rb = Math.max(10, circuitGraph.findSeriesResistance(`${id}.BASE`));
        ib = ((vbe - 0.7) / rb) * 1000000; // microamps
        
        const ic_desired = (ib / 1000) * hFE; // mA
        
        const rc = Math.max(1, circuitGraph.findSeriesResistance(`${id}.COLLECTOR`));
        const ic_available = Math.max(0, (vCollector - 0.2) / rc) * 1000; // mA
        
        if (ic_desired > ic_available) {
          operatingMode = 'saturation';
          ic = ic_available;
          circuitGraph.closeSwitch(`${id}.COLLECTOR`, `${id}.EMITTER`);
          isOn = true;
        } else {
          operatingMode = 'active';
          ic = ic_desired;
          if (ic > 1) {
            circuitGraph.closeSwitch(`${id}.COLLECTOR`, `${id}.EMITTER`);
            isOn = true;
          } else {
            circuitGraph.openSwitch(`${id}.COLLECTOR`, `${id}.EMITTER`);
          }
        }
      } else {
        circuitGraph.openSwitch(`${id}.COLLECTOR`, `${id}.EMITTER`);
      }

      queueComponentUpdate(id, {
        isOn, vbe, vce, ib, ic, operatingMode,
        gainActual: ib > 0 ? (ic / (ib / 1000)) : 0,
        isOvercurrent: ic > maxIc,
        isOvervoltage: vce > maxVce
      });
    }

    // TRANSISTOR PNP
    else if (comp.type === 'TRANSISTOR_PNP') {
      const vBase = circuitGraph.getMinConnectedVoltage(`${id}.BASE`);
      const vEmitter = circuitGraph.getMaxConnectedVoltage(`${id}.EMITTER`);
      const vCollector = circuitGraph.getMinConnectedVoltage(`${id}.COLLECTOR`);
      
      const veb = vEmitter - vBase;
      let isOn = false;
      let ib = 0;
      let ic = 0;
      let operatingMode = 'cutoff';
      const hFE = Number(comp.properties?.hFE) || 100;
      const maxIc = Number(comp.properties?.maxCollectorCurrentMa) || 200;
      const maxVce = Number(comp.properties?.maxVce) || 45;
      const vec = vEmitter - vCollector;

      if (veb >= 0.7) {
        const rb = Math.max(10, circuitGraph.findSeriesResistance(`${id}.BASE`));
        ib = ((veb - 0.7) / rb) * 1000000;
        
        const ic_desired = (ib / 1000) * hFE;
        
        const rc = Math.max(1, circuitGraph.findSeriesResistance(`${id}.COLLECTOR`));
        const ic_available = Math.max(0, (vEmitter - 0.2 - vCollector) / rc) * 1000;
        
        if (ic_desired > ic_available) {
          operatingMode = 'saturation';
          ic = ic_available;
          circuitGraph.closeSwitch(`${id}.EMITTER`, `${id}.COLLECTOR`);
          isOn = true;
        } else {
          operatingMode = 'active';
          ic = ic_desired;
          if (ic > 1) {
            circuitGraph.closeSwitch(`${id}.EMITTER`, `${id}.COLLECTOR`);
            isOn = true;
          } else {
            circuitGraph.openSwitch(`${id}.EMITTER`, `${id}.COLLECTOR`);
          }
        }
      } else {
        circuitGraph.openSwitch(`${id}.EMITTER`, `${id}.COLLECTOR`);
      }

      queueComponentUpdate(id, {
        isOn, vbe: -veb, vce: -vec, ib, ic, operatingMode,
        gainActual: ib > 0 ? (ic / (ib / 1000)) : 0,
        isOvercurrent: ic > maxIc,
        isOvervoltage: vec > maxVce
      });
    }

    // DIODE
    else if (comp.type === 'DIODE') {
      const vAnode = circuitGraph.getMaxConnectedVoltage(`${id}.ANODE`);
      const vCathode = circuitGraph.getMinConnectedVoltage(`${id}.CATHODE`);
      const vDiff = vAnode - vCathode;
      
      const type = comp.properties?.type || 'silicon';
      const vf = type === 'schottky' || type === 'germanium' ? 0.3 : 0.7;
      const piv = Number(comp.properties?.piv) || 50;
      const maxCurrent = Number(comp.properties?.maxCurrentMa) || 200;
      
      let isForwardBiased = false;
      let isReverseBlocked = false;
      let isBreakdown = false;
      let currentMa = 0;
      let actualVdrop = 0;
      
      if (vDiff > vf) {
        isForwardBiased = true;
        circuitGraph.closeSwitch(`${id}.ANODE`, `${id}.CATHODE`);
        const r = Math.max(1, circuitGraph.findSeriesResistance(`${id}.ANODE`));
        currentMa = ((vDiff - vf) / r) * 1000;
        actualVdrop = vf;
      } else if (vDiff < -piv) {
        isBreakdown = true;
        actualVdrop = Math.abs(vDiff);
        circuitGraph.closeSwitch(`${id}.ANODE`, `${id}.CATHODE`);
      } else {
        isReverseBlocked = true;
        circuitGraph.openSwitch(`${id}.ANODE`, `${id}.CATHODE`);
        actualVdrop = Math.max(0, vDiff);
      }

      const powerDissipationMw = actualVdrop * currentMa;

      queueComponentUpdate(id, {
        isForwardBiased, isReverseBlocked, isBreakdown,
        voltageDrop: actualVdrop, currentMa, powerDissipationMw,
        isOvercurrent: currentMa > maxCurrent
      });
    }

    // ZENER DIODE
    else if (comp.type === 'ZENER_DIODE') {
      const vAnode = circuitGraph.getMaxConnectedVoltage(`${id}.ANODE`);
      const vCathode = circuitGraph.getMinConnectedVoltage(`${id}.CATHODE`);
      const vDiff = vAnode - vCathode;
      const vz = Number(comp.properties?.zenerVoltage) || 5.1;
      const maxPowerW = Number(comp.properties?.powerRatingW) || 0.5;
      
      let isForwardBiased = false;
      let isReverseZenerConduction = false;
      let currentMa = 0;
      let actualVdrop = 0;
      let regulationStatus = 'below_threshold';
      
      if (vDiff > 0.7) {
        isForwardBiased = true;
        circuitGraph.closeSwitch(`${id}.ANODE`, `${id}.CATHODE`);
        const r = Math.max(1, circuitGraph.findSeriesResistance(`${id}.ANODE`));
        currentMa = ((vDiff - 0.7) / r) * 1000;
      } else if (vCathode - vAnode >= vz) {
        isReverseZenerConduction = true;
        regulationStatus = 'regulating';
        const r = Math.max(1, circuitGraph.findSeriesResistance(`${id}.CATHODE`));
        currentMa = (((vCathode - vAnode) - vz) / r) * 1000;
        actualVdrop = vz;
      } else {
        circuitGraph.openSwitch(`${id}.ANODE`, `${id}.CATHODE`);
      }

      const powerDissipationMw = vz * currentMa;
      const isOverpower = powerDissipationMw > maxPowerW * 1000;
      if (isOverpower) regulationStatus = 'overpower';

      queueComponentUpdate(id, {
        isForwardBiased, isReverseZenerConduction,
        regulatedVoltage: actualVdrop, currentMa,
        powerDissipationMw, isOverpower, regulationStatus
      });
    }

    // PHOTORESISTOR (LDR)
    else if (comp.type === 'PHOTORESISTOR') {
      const light = Number(comp.properties?.simulatedLightLevel) || 0;
      const darkR = Number(comp.properties?.darkResistance) || 1000000;
      const brightR = Number(comp.properties?.brightResistance) || 200;
      
      const normalizedLight = light / 100;
      const currentResistance = brightR + (darkR - brightR) * Math.pow(1 - normalizedLight, 3);
      
      circuitGraph.setDynamicResistance(id, currentResistance);
      circuitGraph.closeSwitch(`${id}.PIN_1`, `${id}.PIN_2`);

      const v1 = circuitGraph.getMaxConnectedVoltage(`${id}.PIN_1`);
      const v2 = circuitGraph.getMinConnectedVoltage(`${id}.PIN_2`);
      const voltageAcross = Math.abs(v1 - v2);
      const currentMa = (voltageAcross / currentResistance) * 1000;

      const seriesR = circuitGraph.findSeriesResistance(`${id}.PIN_1`);
      let analogReadValue = 0;
      if (seriesR > 0) {
        const vOut = 5.0 * (currentResistance / (seriesR + currentResistance));
        analogReadValue = Math.floor((vOut / 5.0) * 1023);
      }

      let cat = 'dark';
      if (light > 80) cat = 'very_bright';
      else if (light > 60) cat = 'bright';
      else if (light > 40) cat = 'normal';
      else if (light > 20) cat = 'dim';

      queueComponentUpdate(id, {
        lightLevel: light, currentResistance, voltageAcross,
        currentMa, analogReadValue, resistanceCategory: cat,
        description: `Light level: ${light}%`
      });
    }

    // THERMISTOR
    else if (comp.type === 'THERMISTOR') {
      const tempC = Number(comp.properties?.simulatedTemperature) ?? 25;
      const r0 = Number(comp.properties?.nominalResistance) || 10000;
      const b = Number(comp.properties?.bCoefficient) || 3950;
      const t0 = 298.15;
      const tk = tempC + 273.15;
      
      let currentResistance = r0 * Math.exp(b * (1/tk - 1/t0));
      if (comp.properties?.type === 'PTC') {
        currentResistance = r0 * Math.exp(b * (1/t0 - 1/tk));
      }

      circuitGraph.setDynamicResistance(id, currentResistance);
      circuitGraph.closeSwitch(`${id}.PIN_1`, `${id}.PIN_2`);

      const v1 = circuitGraph.getMaxConnectedVoltage(`${id}.PIN_1`);
      const v2 = circuitGraph.getMinConnectedVoltage(`${id}.PIN_2`);
      const voltageAcross = Math.abs(v1 - v2);
      const currentMa = (voltageAcross / currentResistance) * 1000;

      const seriesR = circuitGraph.findSeriesResistance(`${id}.PIN_1`);
      let analogReadValue = 0;
      if (seriesR > 0) {
        const vOut = 5.0 * (currentResistance / (seriesR + currentResistance));
        analogReadValue = Math.floor((vOut / 5.0) * 1023);
      }

      queueComponentUpdate(id, {
        temperatureCelsius: tempC,
        temperatureFahrenheit: (tempC * 9/5) + 32,
        temperatureKelvin: tk,
        currentResistance, voltageAcross, currentMa,
        analogReadValue, resistanceDescription: `Temp: ${tempC}°C`
      });
    }

    // MULTIMETER
    else if (comp.type === 'MULTIMETER') {
      const mode = String(comp.properties?.mode || 'DCV');
      const vRed = circuitGraph.getMaxConnectedVoltage(`${id}.RED_PROBE`);
      const vBlack = circuitGraph.getMinConnectedVoltage(`${id}.BLACK_PROBE`);
      
      const nodeR = circuitGraph.nodes.get(`${id}.RED_PROBE`);
      const nodeB = circuitGraph.nodes.get(`${id}.BLACK_PROBE`);
      const isConnected = !!(nodeR && nodeB && circuitGraph.adjacency.get(`${id}.RED_PROBE`)?.size && circuitGraph.adjacency.get(`${id}.BLACK_PROBE`)?.size);
      
      let displayValue = '---';
      let rawValue = 0;
      let unit = '';
      let isOverload = false;
      let warningMessage = '';
      let signalStrength = 'open';

      if (isConnected) {
        if (mode === 'DCV') {
          const v = vRed - vBlack;
          rawValue = v;
          if (Math.abs(v) < 1.0 && Math.abs(v) > 0.001) {
            displayValue = (v * 1000).toPrecision(4);
            unit = 'mV';
          } else {
            displayValue = v.toPrecision(4);
            unit = 'V';
          }
        } else if (mode === 'DCA') {
          const r = Math.max(1, circuitGraph.findSeriesResistance(`${id}.RED_PROBE`));
          const iMa = ((vRed - vBlack) / r) * 1000;
          rawValue = iMa;
          if (Math.abs(iMa) >= 1000) {
            displayValue = (iMa / 1000).toPrecision(4);
            unit = 'A';
          } else {
            displayValue = iMa.toPrecision(4);
            unit = 'mA';
          }
        } else if (mode === 'resistance') {
          if (Math.abs(vRed - vBlack) > 0.1) {
            warningMessage = 'Voltage present - remove before resistance check';
            displayValue = 'OL';
          } else {
            const r = circuitGraph.findSeriesResistance(`${id}.RED_PROBE`);
            rawValue = r;
            if (r > 10000000 || r === 0) {
              displayValue = 'OL';
            } else if (r >= 1000000) {
              displayValue = (r / 1000000).toPrecision(4); unit = 'MΩ';
            } else if (r >= 1000) {
              displayValue = (r / 1000).toPrecision(4); unit = 'kΩ';
            } else {
              displayValue = r.toPrecision(4); unit = 'Ω';
            }
          }
        } else if (mode === 'continuity') {
          const r = circuitGraph.findSeriesResistance(`${id}.RED_PROBE`);
          if (r < 50 && r > 0) {
            displayValue = 'BEEP';
            signalStrength = 'strong';
          } else {
            displayValue = 'OL';
          }
        } else if (mode === 'diode') {
          const v = vRed - vBlack;
          if (v > 0.1 && v < 2.0) {
            displayValue = (v * 1000).toPrecision(4);
            unit = 'mV';
          } else {
            displayValue = 'OL';
          }
        }
      }

      queueComponentUpdate(id, {
        mode, displayValue, rawValue, unit, isOverload,
        isConnected, warningMessage, signalStrength
      });
    }
  }
}

function simulationLoop() {
  if (!isRunning) return;

  const now = performance.now();
  const elapsed = now - lastTickTime;
  lastTickTime = now;

  let cyclesToRun = Math.floor(elapsed * 16000);

  // Cap to ~30ms worth of cycles per frame to prevent worker thread lockup
  // (death spirals when simulation falls behind real-time)
  const MAX_CYCLES_PER_FRAME = 500000;
  if (cyclesToRun > MAX_CYCLES_PER_FRAME) {
    cyclesToRun = MAX_CYCLES_PER_FRAME;
  }

  if (avrRunner) {
    for (let i = 0; i < cyclesToRun; i++) {
      if (avrRunner.cpu.cycles >= nextToggleCycle) {
        nextToggleCycle = Infinity;
        for (let j = scheduledPinToggles.length - 1; j >= 0; j--) {
          if (avrRunner.cpu.cycles >= scheduledPinToggles[j].cpuCycle) {
             setArduinoPin(scheduledPinToggles[j].pinName, scheduledPinToggles[j].state);
             // DEBUG LOG
             postMessage({ type: 'SERIAL_OUTPUT', payload: { text: `[SIM] Toggled ${scheduledPinToggles[j].pinName} to ${scheduledPinToggles[j].state} at cycle ${avrRunner.cpu.cycles}\n` } });
             
             scheduledPinToggles.splice(j, 1);
          } else {
             nextToggleCycle = Math.min(nextToggleCycle, scheduledPinToggles[j].cpuCycle);
          }
        }
      }

      avrInstruction(avrRunner.cpu);
      avrRunner.cpu.tick();

      if (avrRunner.cpu.cycles % 2000 === 0 && !stackWarningPosted) {
        const spl = avrRunner.cpu.data[0x5D];
        const sph = avrRunner.cpu.data[0x5E];
        const sp = (sph << 8) | spl;
        const usedStack = 0x8FF - sp;
        if (usedStack > 1800) {
          stackWarningPosted = true;
          postMessage({ type: 'WARNING', payload: { text: `Stack Overflow Risk: Used ${usedStack} bytes of stack memory.` } });
        }
      }
    }
  }

  // Check no activity timeout
  if (now - lastActivityTime > 8000 && now - simulationStartTime > 5000) {
    postMessage({ type: 'WARNING', payload: { text: 'No circuit activity detected for 8 seconds. The loop may lack output or be waiting for input.' } });
    lastActivityTime = now; // Reset to fire again in 8s
  }

  updateComponentsState(now);
  flushUpdates();
  simulationLoopTimer = setTimeout(simulationLoop, 16);
}

function queueComponentUpdate(componentId: string, state: any) {
  if (!pendingUpdates[componentId]) {
    pendingUpdates[componentId] = {};
  }
  Object.assign(pendingUpdates[componentId], state);
}

function flushUpdates() {
  if (Object.keys(pendingUpdates).length > 0) {
    postMessage({ type: 'BATCH_UPDATE', payload: { updates: pendingUpdates } });
    pendingUpdates = {};
  }
}

function broadcastVoltageUpdates(updatedNodes: Map<string, number>) {
  for (const [nodeId, voltage] of updatedNodes.entries()) {
    const dotIdx = nodeId.indexOf('.');
    if (dotIdx > 0) {
      const compId = nodeId.substring(0, dotIdx);
      const pinId = nodeId.substring(dotIdx + 1);
      postMessage({ type: 'PIN_CHANGE', payload: { componentId: compId, pinId, voltage } });
    }
  }
}

function handlePinChange(pinName: string, voltage: number) {
  registerActivity();
  // Always notify UI for Arduino visual pins
  postMessage({ type: 'PIN_CHANGE', payload: { componentId: 'arduino-uno', pinId: pinName, voltage } });

  // ULTRASONIC SENSOR SIMULATION
  // When TRIG pin changes, simulate ECHO response
  if (circuitGraph && voltage === 0) {
    // TRIG just went LOW - check if it was HIGH before (falling edge)
    const previousVoltage = trigState[pinName];
    if (previousVoltage === true) {
      // Find if this pin is connected to a TRIG pin of an ultrasonic sensor
      let arduinoId = null;
      for (const [id, comp] of circuitGraph.components.entries()) {
        if (comp.type === 'ARDUINO_UNO') { arduinoId = id; break; }
      }
      
      if (arduinoId) {
        const connectedComponents = circuitGraph.getConnectedComponents(arduinoId, pinName);
        
        for (const comp of connectedComponents) {
          if (comp.type === 'ULTRASONIC_SENSOR') {
            const durationUs = simulatedDistanceCm * 58;
            
            // Post event to UI
            postMessage({
              type: 'ULTRASONIC_ECHO',
              payload: {
                sensorId: comp.id,
                durationUs: durationUs,
                distanceCm: simulatedDistanceCm
              }
            });

            // Hardware simulation: find ECHO pin and send pulse
            if (avrRunner) {
              let echoArduinoPin = null;
              for (let bit = 0; bit <= 13; bit++) {
                if (circuitGraph.findPath(`${comp.id}.ECHO`, `${arduinoId}.D${bit}`)) {
                  echoArduinoPin = `D${bit}`; break;
                }
              }
              if (!echoArduinoPin) {
                for (let bit = 0; bit <= 5; bit++) {
                  if (circuitGraph.findPath(`${comp.id}.ECHO`, `${arduinoId}.A${bit}`)) {
                    echoArduinoPin = `A${bit}`; break;
                  }
                }
              }

              if (echoArduinoPin) {
                // Real HC-SR04 delays about 450us before ECHO goes HIGH
                const startDelayUs = 450;
                
                const startCycle = avrRunner.cpu.cycles + (startDelayUs * 16);
                const endCycle = startCycle + (durationUs * 16);

                scheduledPinToggles.push({ cpuCycle: startCycle, pinName: echoArduinoPin, state: true });
                scheduledPinToggles.push({ cpuCycle: endCycle, pinName: echoArduinoPin, state: false });
                
                nextToggleCycle = Math.min(nextToggleCycle, startCycle);
                
                postMessage({ type: 'SERIAL_OUTPUT', payload: { text: `[SIM] Found ECHO on ${echoArduinoPin}, pulse scheduled for ${durationUs}us\n` } });
              } else {
                postMessage({ type: 'SERIAL_OUTPUT', payload: { text: `[SIM] ERROR: ECHO pin wire not found in graph!\n` } });
              }
            }
          }
        }
      }
    }
  }
  
  // Track TRIG state
  trigState[pinName] = voltage > 2.5;

  // DHT11 SENSOR SIMULATION
  if (circuitGraph) {
    if (voltage < 2.5) {
      if (!dhtLowCycle[pinName] && avrRunner) {
        dhtLowCycle[pinName] = avrRunner.cpu.cycles;
      }
    } else {
      if (dhtLowCycle[pinName] && avrRunner) {
        const cyclesLow = avrRunner.cpu.cycles - dhtLowCycle[pinName];
        dhtLowCycle[pinName] = 0;

        // MCU start signal is ~18ms (288,000 cycles at 16MHz). Check for > 10ms (160,000 cycles).
        if (cyclesLow > 160000) {
          let arduinoId = null;
          for (const [id, comp] of circuitGraph.components.entries()) {
            if (comp.type === 'ARDUINO_UNO') { arduinoId = id; break; }
          }

          if (arduinoId) {
            const connectedComponents = circuitGraph.getConnectedComponents(arduinoId, pinName);
            for (const comp of connectedComponents) {
              if (comp.type === 'TEMPERATURE_SENSOR') {
                // Generate 40-bit DHT response
                const tempInt = Math.floor(simulatedTempCelsius);
                const tempDec = Math.round((simulatedTempCelsius - tempInt) * 10);
                const humInt = Math.floor(simulatedHumidity);
                const humDec = Math.round((simulatedHumidity - humInt) * 10);
                const checksum = (tempInt + tempDec + humInt + humDec) & 0xFF;

                const dataBits: boolean[] = [];
                const pushByte = (b: number) => {
                  for (let i = 7; i >= 0; i--) {
                    dataBits.push(((b >> i) & 1) === 1);
                  }
                };
                pushByte(humInt);
                pushByte(humDec);
                pushByte(tempInt);
                pushByte(tempDec);
                pushByte(checksum);

                // Delay 40us before response
                let currentCycle = avrRunner.cpu.cycles + 40 * 16;
                
                // DHT response 80us LOW, 80us HIGH
                scheduledPinToggles.push({ cpuCycle: currentCycle, pinName, state: false });
                currentCycle += 80 * 16;
                scheduledPinToggles.push({ cpuCycle: currentCycle, pinName, state: true });
                currentCycle += 80 * 16;

                // 40 bits of data
                for (const bit of dataBits) {
                  scheduledPinToggles.push({ cpuCycle: currentCycle, pinName, state: false });
                  currentCycle += 50 * 16; // 50us LOW
                  scheduledPinToggles.push({ cpuCycle: currentCycle, pinName, state: true });
                  currentCycle += (bit ? 70 : 28) * 16; // 70us HIGH for '1', 28us HIGH for '0'
                }

                // End of transmission (50us LOW) then return to floating HIGH
                scheduledPinToggles.push({ cpuCycle: currentCycle, pinName, state: false });
                currentCycle += 50 * 16;
                scheduledPinToggles.push({ cpuCycle: currentCycle, pinName, state: true });

                nextToggleCycle = Math.min(nextToggleCycle, avrRunner.cpu.cycles + 40 * 16);
                postMessage({ type: 'SERIAL_OUTPUT', payload: { text: `[SIM] DHT11 responding on ${pinName}\n` } });
              }
            }
          }
        }
      }
    }
  }

  if (circuitGraph) {
    // 1. Find the real Arduino ID in the graph
    let arduinoId = null;
    for (const [id, comp] of circuitGraph.components.entries()) {
      if (comp.type === 'ARDUINO_UNO') { arduinoId = id; break; }
    }

    if (arduinoId) {
      const nodeId = `${arduinoId}.${pinName}`;
      // 2. Propagate
      const updatedNodes = circuitGraph.propagateVoltage(nodeId, voltage);
      broadcastVoltageUpdates(updatedNodes);

      // 3. Update graph topology (components that modify switches/connections)
      for (const [id, comp] of circuitGraph.components.entries()) {
        if (comp.type === 'RELAY') {
          const state = calculateRelayState(comp, circuitGraph);
          
          queueComponentUpdate(id, state);
          
          const comNode = `${id}.COM`;
          const noNode = `${id}.NO`;
          const ncNode = `${id}.NC`;
          
          if (state.isActivated) {
            circuitGraph.openSwitch(comNode, ncNode);
            circuitGraph.closeSwitch(comNode, noNode);
          } else {
            circuitGraph.openSwitch(comNode, noNode);
            circuitGraph.closeSwitch(comNode, ncNode);
          }
        }
      }

      // 4. Update state-dependent components (LEDs, LCDs, etc.)
      for (const [id, comp] of circuitGraph.components.entries()) {
        if (comp.type === 'LED') {
          const state = calculateLEDState(comp, circuitGraph);
          queueComponentUpdate(id, state);
        } else if (comp.type === 'RESISTOR') {
          const state = calculateResistorState(comp, circuitGraph);
          queueComponentUpdate(id, state);
        } else if (comp.type === 'BUZZER') {
          const state = calculateBuzzerState(comp, circuitGraph);
          queueComponentUpdate(id, state);
        } else if (comp.type === 'LCD_16X2') {
          if (!lcdControllers[id]) {
            lcdControllers[id] = new HD44780();
          }
          const rs = circuitGraph.getNodeVoltage(id, 'RS') > 2.5;
          const rw = circuitGraph.getNodeVoltage(id, 'RW') > 2.5;
          const e = circuitGraph.getNodeVoltage(id, 'E') > 2.5;
          const d4 = circuitGraph.getNodeVoltage(id, 'D4') > 2.5 ? 1 : 0;
          const d5 = circuitGraph.getNodeVoltage(id, 'D5') > 2.5 ? 1 : 0;
          const d6 = circuitGraph.getNodeVoltage(id, 'D6') > 2.5 ? 1 : 0;
          const d7 = circuitGraph.getNodeVoltage(id, 'D7') > 2.5 ? 1 : 0;
          const a = circuitGraph.getNodeVoltage(id, 'A') > 2.5;

          const dataNibble = (d7 << 3) | (d6 << 2) | (d5 << 1) | d4;
          
          const lcd = lcdControllers[id];
          const oldLastEnable = lcd.lastEnable;
          
          lcd.processPins(rs, rw, e, dataNibble, a);
          
          if (oldLastEnable !== lcd.lastEnable) {
            queueComponentUpdate(id, { 
              rows: lcd.rows, 
              cursorRow: lcd.cursorRow, 
              cursorCol: lcd.cursorCol,
              backlight: lcd.backlight,
              cursorVisible: lcd.cursorOn || lcd.blinkOn
            });
          }
        } else if (comp.type === 'TEMPERATURE_SENSOR') {
          const vccVoltage = circuitGraph.getNodeVoltage(id, 'VCC');
          const isActive = vccVoltage > 2.5;
          queueComponentUpdate(id, {
            isActive,
            temperatureCelsius: simulatedTempCelsius,
            temperatureFahrenheit: simulatedTempCelsius * 9/5 + 32,
            humidity: simulatedHumidity
          });
        } else if (comp.type === 'SEVEN_SEG_CC') {
          const comVoltage = circuitGraph.getNodeVoltage(id, 'COM1');
          const isOn = comVoltage < 0.5; // COM connected to GND
          
          const segments: Record<string, boolean> = {};
          const segmentPins = ['a','b','c','d','e','f','g','dp'];
          
          segmentPins.forEach(seg => {
            const v = circuitGraph!.getNodeVoltage(id, seg);
            // CC: segment ON when pin is HIGH and COM is at GND
            segments[seg] = isOn && v > 2.5;
          });
          
          let displayedDigit: number | null = null;
          for (const [digit, pattern] of Object.entries(DIGIT_SEGMENTS)) {
            const matches = segmentPins.every(s => 
              s === 'dp' ? true : (segments[s] === pattern[s])
            );
            if (matches) {
              displayedDigit = parseInt(digit);
              break;
            }
          }
          
          queueComponentUpdate(id, { segments, displayedDigit, isOn });
        } else if (comp.type === 'SEVEN_SEG_CA') {
          const comVoltage = circuitGraph.getNodeVoltage(id, 'COM1');
          const isOn = comVoltage > 2.5; // COM connected to 5V
          
          const segments: Record<string, boolean> = {};
          const segmentPins = ['a','b','c','d','e','f','g','dp'];
          
          segmentPins.forEach(seg => {
            const v = circuitGraph!.getNodeVoltage(id, seg);
            // CA: segment ON when pin is LOW and COM is at 5V
            segments[seg] = isOn && v < 2.5;
          });
          
          let displayedDigit: number | null = null;
          for (const [digit, pattern] of Object.entries(DIGIT_SEGMENTS)) {
            const matches = segmentPins.every(s =>
              s === 'dp' ? true : (segments[s] === pattern[s])
            );
            if (matches) {
              displayedDigit = parseInt(digit);
              break;
            }
          }
          
          queueComponentUpdate(id, { segments, displayedDigit, isOn });
        }
      }

      // Track pulses for Servos
      if (avrRunner) {
        if (voltage > 2.5) {
          pinHighTicks[pinName] = avrRunner.cpu.cycles;
        } else if (voltage < 2.5 && pinHighTicks[pinName] !== undefined) {
          const pulseTicks = avrRunner.cpu.cycles - pinHighTicks[pinName];
          const pulseWidthUs = pulseTicks / 16;
          
          for (const [id, comp] of circuitGraph.components.entries()) {
            if (comp.type === 'SERVO_MOTOR') {
              if (circuitGraph.findPath(nodeId, `${id}.SIGNAL`)) {
                // calculateServoState expects dutyCycle based on 20000us period
                const pseudoDutyCycle = pulseWidthUs / 20000;
                const servoType = comp.properties?.servoType || 'positional';
                const state = calculateServoState(pseudoDutyCycle, 544, 2400, servoType);
                queueComponentUpdate(id, state);
              }
            }
          }
        }
      }
    }
  }
}

function handlePWMChange(pinName: string, dutyCycle: number) {
  handlePinChange(pinName, dutyCycle * 5.0);

  if (circuitGraph) {
    let arduinoId = null;
    for (const [id, comp] of circuitGraph.components.entries()) {
      if (comp.type === 'ARDUINO_UNO') { arduinoId = id; break; }
    }
    if (arduinoId) {
      for (const [id, comp] of circuitGraph.components.entries()) {
        if (comp.type === 'SERVO_MOTOR') {
          // Check if this servo is attached to this pin
          if (circuitGraph.findPath(`${arduinoId}.${pinName}`, `${id}.SIGNAL`)) {
            const state = calculateServoState(dutyCycle);
            queueComponentUpdate(id, state);
          }
        }
      }
    }
  }
}

export function setAnalogInputVoltage(channel: number, voltage: number) {
  if (avrRunner && avrRunner.adc) {
    avrRunner.adc.channelValues[channel] = voltage;
  }
}

function initializeSimulation(hex: string, graphData: any) {
  try {
    const flashData = parseIntelHex(hex);

    avrRunner = new AVRRunner(flashData);

    // Reset previous port states
    lastPortB = 0;
    lastPortC = 0;
    lastPortD = 0;

    // Build circuit graph from topology data
    circuitGraph = new CircuitGraph();
    if (graphData) {
      circuitGraph.loadSerialized(graphData);

      // Seed initial ground and power pins for any arduinos
      for (const [nodeId, node] of circuitGraph.nodes.entries()) {
        const comp = circuitGraph.components.get(node.componentId);
        if (comp && comp.type === 'ARDUINO_UNO') {
          if (node.pinType === 'power') {
            const v = nodeId.includes('3V3') ? 3.3 : 5.0;
            const updated = circuitGraph.propagateVoltage(nodeId, v);
            broadcastVoltageUpdates(updated);
          } else if (node.pinType === 'ground') {
            const updated = circuitGraph.propagateVoltage(nodeId, 0.0);
            broadcastVoltageUpdates(updated);
          }
        }
      }

      // Initialize Push Buttons to Released (HIGH) state
      for (const [id, comp] of circuitGraph.components.entries()) {
        if (comp.type === 'PUSH_BUTTON') {
          let arduinoId = null;
          for (const [aid, c] of circuitGraph.components.entries()) {
            if (c.type === 'ARDUINO_UNO') { arduinoId = aid; break; }
          }
          if (arduinoId) {
            const allPins = ['D0','D1','D2','D3','D4','D5','D6','D7','D8','D9','D10','D11','D12','D13', 'A0','A1','A2','A3','A4','A5'];
            for (const pin of allPins) {
              let reachesArduino = false;
              for (const pinObj of comp.pins || []) {
                if (circuitGraph.findPath(`${id}.${pinObj.id}`, `${arduinoId}.${pin}`)) {
                  reachesArduino = true;
                  break;
                }
              }
              if (reachesArduino) {
                setArduinoPin(pin, true); // True = High = Released
              }
            }
          }
        }
      }
    }

    // PORT LISTENERS
    avrRunner.portB.addListener((value: number) => {
      for (let bit = 0; bit < 6; bit++) {
        const isHigh = (value & (1 << bit)) !== 0;
        const wasHigh = (lastPortB & (1 << bit)) !== 0;
        if (isHigh !== wasHigh) {
          let pinName = '';
          if (bit === 0) pinName = 'D8';
          else if (bit === 1) pinName = 'D9';
          else if (bit === 2) pinName = 'D10';
          else if (bit === 3) pinName = 'D11';
          else if (bit === 4) pinName = 'D12';
          else if (bit === 5) pinName = 'D13';
          if (pinName) handlePinChange(pinName, isHigh ? 5.0 : 0.0);
        }
      }
      lastPortB = value;
    });

    avrRunner.portC.addListener((value: number) => {
      for (let bit = 0; bit < 6; bit++) {
        const isHigh = (value & (1 << bit)) !== 0;
        const wasHigh = (lastPortC & (1 << bit)) !== 0;
        if (isHigh !== wasHigh) {
          let pinName = 'A' + bit;
          handlePinChange(pinName, isHigh ? 5.0 : 0.0);
        }
      }
      lastPortC = value;
    });

    avrRunner.portD.addListener((value: number) => {
      for (let bit = 0; bit < 8; bit++) {
        const isHigh = (value & (1 << bit)) !== 0;
        const wasHigh = (lastPortD & (1 << bit)) !== 0;
        if (isHigh !== wasHigh) {
          let pinName = 'D' + bit;
          handlePinChange(pinName, isHigh ? 5.0 : 0.0);
        }
      }
      lastPortD = value;
    });

    // SERIAL UART SETUP
    avrRunner.usart.onByteTransmit = (value: number) => {
      registerActivity();
      serialBuffer += String.fromCharCode(value);
      if (value === 10 || serialBuffer.length >= 128) {
        postMessage({ type: 'SERIAL_OUTPUT', payload: { text: serialBuffer } });
        serialBuffer = '';
      }
    };

    const attachPWMHook = (addr: number, pinName: string, bitMask: number, tccrAddr: number) => {
      const origHook = avrRunner!.cpu.writeHooks[addr];
      avrRunner!.cpu.writeHooks[addr] = (value: number, oldValue: number, addrArgs: number, mask: number) => {
        const handled = origHook ? origHook(value, oldValue, addrArgs, mask) : false;
        if (avrRunner!.cpu.data[tccrAddr] & bitMask) {
          handlePWMChange(pinName, value / 255.0);
        }
        return handled;
      };
    };

    // OCR1AL (0x8A) -> D9, TCCR1A (0x80) bit 7
    attachPWMHook(0x8A, 'D9', 0x80, 0x80);
    // OCR1BL (0x88) -> D10, TCCR1A (0x80) bit 5
    attachPWMHook(0x88, 'D10', 0x20, 0x80);
    // OCR2A (0xB3) -> D11, TCCR2A (0xB0) bit 7
    attachPWMHook(0xB3, 'D11', 0x80, 0xB0);
    // OCR2B (0xB4) -> D3, TCCR2A (0xB0) bit 5
    attachPWMHook(0xB4, 'D3', 0x20, 0xB0);

    // ADMUX Invalid Channel Check (0x7C)
    const origAdmuxHook = avrRunner.cpu.writeHooks[0x7C];
    avrRunner.cpu.writeHooks[0x7C] = (value: number, oldValue: number, addrArgs: number, mask: number) => {
      const ch = value & 0x07;
      if (ch > 5) {
        postMessage({ type: 'WARNING', payload: { text: `Invalid analog channel selected: A${ch}. Valid channels are A0-A5.` } });
      }
      return origAdmuxHook ? origAdmuxHook(value, oldValue, addrArgs, mask) : false;
    };

    lastHex = hex;
    lastGraphData = graphData;

    postMessage({ type: 'STATUS', value: 'READY' });
  } catch (error: any) {
    postMessage({ type: 'ERROR', error: error ? (error.message || String(error)) : 'Unknown error' });
  }
}

self.onmessage = function (e) {
  const { type, payload } = e.data;

  switch (type) {
    case 'INITIALIZE':
      initializeSimulation(payload.hex, payload.graphData);
      break;

    case 'START':
      if (simulationLoopTimer) clearTimeout(simulationLoopTimer);
      isRunning = true;
      lastTickTime = performance.now();
      if (!simulationStartTime) {
        simulationStartTime = lastTickTime;
        lastActivityTime = lastTickTime;
      }
      simulationLoop();
      postMessage({ type: 'STATUS', value: 'RUNNING' });
      break;

    case 'PAUSE':
      isRunning = false;
      if (simulationLoopTimer) {
        clearTimeout(simulationLoopTimer);
        simulationLoopTimer = null;
      }
      postMessage({ type: 'STATUS', value: 'PAUSED' });
      break;

    case 'STOP':
      stopSimulation();
      postMessage({ type: 'STATUS', value: 'IDLE' });
      break;

    case 'RESET':
      stopSimulation();
      if (lastHex && lastGraphData) {
        initializeSimulation(lastHex, lastGraphData);
      }
      break;

    case 'UPDATE_PROPERTIES':
      if (circuitGraph) {
        const comp = circuitGraph.components.get(payload.componentId);
        if (comp) {
          comp.properties = { ...comp.properties, ...payload.properties };
        }
      }
      break;

    case 'EXTERNAL_INPUT':
      if (payload.type === 'potentiometer' && circuitGraph) {
        const voltage = (payload.value / 1023) * 5.0;
        queueComponentUpdate(payload.componentId, { value: payload.value, voltage });

        let arduinoId = null;
        for (const [id, comp] of circuitGraph.components.entries()) {
          if (comp.type === 'ARDUINO_UNO') { arduinoId = id; break; }
        }
        if (arduinoId) {
          for (let i = 0; i < 6; i++) {
            if (circuitGraph.findPath(`${payload.componentId}.WIPER`, `${arduinoId}.A${i}`)) {
              setAnalogInputVoltage(i, voltage);
              break;
            }
          }
        }
      }
      
      // Handle digital inputs (like PUSH_BUTTON)
      if (circuitGraph && payload.componentId) {
        const comp = circuitGraph.components.get(payload.componentId);
        if (comp && comp.type === 'PUSH_BUTTON') {
          const state = payload.value === 1; // 1 = released (HIGH), 0 = pressed (LOW)
          
          let arduinoId = null;
          for (const [aid, c] of circuitGraph.components.entries()) {
            if (c.type === 'ARDUINO_UNO') { arduinoId = aid; break; }
          }
          
          if (arduinoId) {
            const allPins = ['D0','D1','D2','D3','D4','D5','D6','D7','D8','D9','D10','D11','D12','D13', 'A0','A1','A2','A3','A4','A5'];
            for (const pin of allPins) {
              let reachesArduino = false;
              for (const pinObj of comp.pins || []) {
                if (circuitGraph.findPath(`${payload.componentId}.${pinObj.id}`, `${arduinoId}.${pin}`)) {
                  reachesArduino = true;
                  break;
                }
              }
              if (reachesArduino) {
                setArduinoPin(pin, state);
                registerActivity();
              }
            }
          }
        }
      }

      // Handle legacy raw ADC input if any
      if (payload.pinId && payload.pinId.startsWith('A') && payload.value > 1) {
        const channel = parseInt(payload.pinId.substring(1), 10);
        if (!isNaN(channel)) {
          setAnalogInputVoltage(channel, payload.value);
          registerActivity();
        }
      }
      break;

    case 'SERIAL_INPUT':
      registerActivity();
      if (avrRunner) {
        for (let i = 0; i < payload.text.length; i++) {
          avrRunner.usart.writeByte(payload.text.charCodeAt(i));
        }
      }
      break;

    case 'SET_SENSOR_VALUES':
      if (payload.temperature !== undefined) simulatedTempCelsius = payload.temperature;
      if (payload.humidity !== undefined) simulatedHumidity = payload.humidity;
      break;

    case 'SET_SENSOR_DISTANCE':
      simulatedDistanceCm = payload.distanceCm;
      break;
  }
};
