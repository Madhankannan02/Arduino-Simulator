<div align="center">
  <img src="https://img.shields.io/badge/c-%2300599C.svg?style=for-the-badge&logo=c&logoColor=white" alt="C" />
  <img src="https://img.shields.io/badge/c++-%2300599C.svg?style=for-the-badge&logo=c%2B%2B&logoColor=white" alt="C++" />
  <img src="https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3" />
  <img src="https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5" />
  <img src="https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E" alt="JavaScript" />
  <img src="https://img.shields.io/badge/python-%2314354C.svg?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/markdown-%23000000.svg?style=for-the-badge&logo=markdown&logoColor=white" alt="Markdown" />
  <img src="https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB" alt="Express.js" />
  <br />
  <img src="https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB" alt="React" />
  <img src="https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/WordPress-%23117AC9.svg?style=for-the-badge&logo=WordPress&logoColor=white" alt="WordPress" />
  <img src="https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/adobe%20illustrator-%23FF9A00.svg?style=for-the-badge&logo=adobe%20illustrator&logoColor=white" alt="Adobe Illustrator" />
  <img src="https://img.shields.io/badge/adobe%20photoshop-%2331A8FF.svg?style=for-the-badge&logo=adobe%20photoshop&logoColor=white" alt="Adobe Photoshop" />
  <br />
  <img src="https://img.shields.io/badge/Adobe%20Premiere%20Pro-%239999FF.svg?style=for-the-badge&logo=Adobe%20Premiere%20Pro&logoColor=white" alt="Adobe Premiere Pro" />
  <img src="https://img.shields.io/badge/Adobe%20XD-%23470137.svg?style=for-the-badge&logo=Adobe%20XD&logoColor=%23FF61F6" alt="Adobe XD" />
  <img src="https://img.shields.io/badge/figma-%23F24E1E.svg?style=for-the-badge&logo=figma&logoColor=white" alt="Figma" />
  <img src="https://img.shields.io/badge/Canva-%2300C4CC.svg?style=for-the-badge&logo=Canva&logoColor=white" alt="Canva" />
  <img src="https://img.shields.io/badge/github-%23121011.svg?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" />
  <img src="https://img.shields.io/badge/jasmine-%238A4182.svg?style=for-the-badge&logo=jasmine&logoColor=white" alt="Jasmine" />
  <img src="https://img.shields.io/badge/-Vitest-272C36?style=for-the-badge&logo=vitest&logoColor=FCC72B" alt="Vitest" />
</div>
# Oscilink

A full-stack monorepo for a browser-based Arduino electronics simulator. This project aims to provide a robust, interactive environment for designing circuits and writing code for Arduino microcontrollers directly in the browser.

## Features Implemented So Far

### 1. Interactive Infinite Canvas
- **Engine**: Built with React-Konva for high-performance 2D rendering.
- **Pan & Zoom**: Smooth panning (middle-click or spacebar drag) and mouse-wheel zooming that centers on the cursor pointer. Includes bounds constraints (0.1x to 5.0x scale).
- **Dynamic Dot Grid**: An infinite background grid that calculates visible bounds to dynamically render world-coordinate dots optimally without lagging the browser.
- **Floating Controls**: Dedicated UI overlay for zooming in/out, resetting to 100%, and an auto-calculating **"Fit to Screen"** feature to focus on all active components.

### 2. State Management Architecture
Centralized application state using Zustand + Immer:
- **`workspaceStore`**: The central nervous system for the canvas. Manages the active viewport, placed components, wiring, selection states, history (undo/redo), and handles graph serialization for the simulation engine.
- **`simulationStore`**: Manages the localized state of individual components (e.g., LED brightness, Servo angles) alongside global circuit errors and the Arduino serial output.
- **`editorStore`**: Tracks the active C++ code, compilation results, hex binaries, and compiler diagnostics.

### 3. Exhaustive Type System
A strictly typed foundation mapping the physical characteristics of microcontrollers and circuits:
- **`types/components.ts`**: Types for component definitions, custom pins (PWM, Analog, Digital, I2C, SPI), wires, point grids, and physical bounding boxes.
- **`types/simulation.ts`**: Types for the active engine state, compilation results, component sub-states, and serialized mathematical graph nodes/edges representing the circuit topology.

### 4. Layout & UI Structure
- A responsive, non-scrolling, three-panel Flexbox layout tailored for complex IDEs.
- Custom dark-theme Tailwind configuration styled perfectly for deep focus.
- **My Projects Panel**: A beautifully redesigned light theme panel with a custom confirm modal for robust project management.

### 5. Component Factory System
A highly rigid factory architecture (`componentFactory.ts`) ensuring flawless initialization of physical circuit components onto the canvas:
- Dynamically generates fully formed `CircuitComponent` objects with standardized default properties and unique UUIDs.
- Exhaustive pin layouts built directly into the factory (spanning the Arduino Uno's 200x140 boundary constraints, LCD 16x2 grid arrays, Breadboard rails, and standard 2-pin passives).
- Utilizes strict `SCREAMING_SNAKE_CASE` constants tightly bound to the TypeScript union types to guarantee instantiation reliability and block invalid component requests.

### 6. Interactive Circuit Components
- **Visual Design**: Beautiful, responsive SVGs and Konva shapes tailored for circuit accuracy.
- **Components Implemented**:
  - `ArduinoUno`: Fully featured SVG-based Uno board with active selection states, pin hovering, and strict data-pin connection limits.
  - `LED`: Interpolates physical brightness based on the engine's `simulationStore` state. Emits a realistic glow effect when powered.
  - `Resistor`: Procedurally generated color bands calculated dynamically based on its `resistance` property.
  - `PushButton`: Fully interactive with visual pressing animations, triggering immediate events to the simulation core.
  - `Servo`: Continuous rotation servo support with a toggle switch directly in the properties panel.
  - `TemperatureSensor` (DHT11): Features a custom UI panel with sliders to dynamically adjust simulated temperature and humidity values.
  - `Capacitor`: Fully modeled with capacitance, voltage ratings, and live state tracking (voltage drop, charge percentage). Visuals dynamically indicate overvoltage events.
  - `Transistors` (NPN & PNP): Features true-to-life 3D front-facing TO-92 packages with carefully spaced pins mapped to breadboard constraints.
  - `Diodes` (Standard & Zener): Directional flow limiters with appropriate voltage drops and visual indicators.
  - `Photoresistor` (LDR): Simulated light-dependent resistor that dynamically changes its resistance value.
  - `Thermistor`: Analog temperature sensor component.
  - `Multimeter`: A versatile diagnostic tool with a realistic LCD display screen that can toggle between measuring Volts, Amps, and Ohms.
  - `Cycle-Accurate Protocol Simulation`: The backend Web Worker natively simulates complex bit-banged 1-wire protocols (like the DHT11's 40-bit handshake) cycle-by-cycle directly into the `avr8js` CPU scheduler, allowing actual C++ sensor libraries to successfully communicate with simulated components.

### 7. Advanced Rendering Layers & Wiring
A strictly ordered Konva rendering stack to guarantee 60fps performance during complex interactions:
- **`GridLayer`**: Background visual reference dots.
- **`WireLayer`**: Interactive wiring system.
  - Features precise **Manhattan routing** (L-shaped logic) for elegant wire pathways.
  - Batches static non-selected wires into a single massive Konva `<Shape>` via a custom scene function to eliminate node-count bloat.
  - Selected or errored wires use animated dashed paths and render independently.
- **`ComponentLayer`**: Routes and memoizes active circuit components. Directly subscribes to `simulationStore` via Zustand to trigger pinpoint `layer.batchDraw()` updates, completely bypassing standard React render loops for raw speed.
- **`InteractionLayer`**: A top-level layer responsible for global interactions, such as rubber-band selection logic across the canvas and drawing global bounding boxes, ensuring component definitions remain clean and free of excessive logic.

### 8. Modern Landing Page
- **Next.js App**: A highly optimized, SEO-friendly landing page built with Next.js 14 and React 18.
- **Framer Motion**: Smooth scroll-based animations for an engaging presentation.
- **Tailwind CSS**: Beautifully crafted custom sections, typography, and marketing copy.

## Tech Stack
### Landing Page (`packages/landing`)
- Next.js 14 (App Router)
- React 18
- Tailwind CSS v3
- Framer Motion

### Frontend (`packages/frontend`)
- React 18 & Vite
- TypeScript
- Tailwind CSS v3
- Zustand (w/ Immer & Devtools)
- React-Konva
- Monaco Editor (Prepared)
- Lucide React (Icons)

### Backend (`packages/backend`)
- Node.js & Express
- TypeScript
- CORS, Helmet, Express Rate Limit

## Setup Instructions

1. **Install dependencies:**
   This project relies on `pnpm` workspaces. Ensure pnpm is installed, then run:
   ```bash
   pnpm install
   ```

2. **Start Development Servers:**
   The root package.json utilizes parallel execution to run the frontend, backend, and landing page concurrently.
   ```bash
   pnpm run dev
   ```
   - **Landing Page** (Next.js): [http://localhost:3000/](http://localhost:3000/)
   - **Frontend App** (Vite): [http://localhost:5173/](http://localhost:5173/)
   - **Backend API**: [http://localhost:3001/](http://localhost:3001/)
