import React, { useState, useContext, useRef, useEffect, useCallback, memo } from 'react';
import { Group, Rect, Shape, Circle, Line, Text } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import Konva from 'konva';
import { CircuitComponent, Point } from '../../../types/components';
import { useWorkspaceStore } from '../../../store/workspaceStore';
import { getAbsolutePinPosition } from '../../../utils/geometry';
import { useSimulationStore } from '../../../store/simulationStore';
import { CanvasContext } from '../../canvas/Canvas';

interface BreadboardProps {
  component: CircuitComponent;
}

export const Breadboard = memo(({ component }: BreadboardProps) => {
  // State
  const [hoveredPin, setHoveredPin] = useState<string | null>(null);
  
  // Context
  const { handlePinMouseDown, handlePinMouseEnter, handlePinMouseLeave } = useContext(CanvasContext);
  
  const components = useWorkspaceStore(s => s.components);
  
  const outerGroupRef = useRef<Konva.Group>(null);
  const pcbGroupRef = useRef<Konva.Group>(null);

  const topPosRectRef = useRef<Konva.Rect>(null);
  const topPosTextRef = useRef<Konva.Text>(null);
  const topNegRectRef = useRef<Konva.Rect>(null);
  const bottomPosRectRef = useRef<Konva.Rect>(null);
  const bottomPosTextRef = useRef<Konva.Text>(null);
  const bottomNegRectRef = useRef<Konva.Rect>(null);

  // Compute implicitly connected pins
  const connectedPins = React.useMemo(() => {
    const connected = new Set<string>();
    
    const otherPins: Point[] = [];
    components.forEach(comp => {
      if (comp.id === component.id) return;
      Object.values(comp.pins).forEach(pin => {
        otherPins.push(getAbsolutePinPosition(comp, pin));
      });
    });

    Object.values(component.pins).forEach(bbPin => {
      const bbAbs = getAbsolutePinPosition(component, bbPin);
      for (const p of otherPins) {
        if (Math.abs(bbAbs.x - p.x) < 1.0 && Math.abs(bbAbs.y - p.y) < 1.0) {
          connected.add(bbPin.id);
          break;
        }
      }
    });

    return connected;
  }, [components, component]);

  // Caching the static parts including the holes
  useEffect(() => {
    if (pcbGroupRef.current) {
      pcbGroupRef.current.clearCache();
      pcbGroupRef.current.cache({
        x: -10,
        y: -10,
        width: 350,
        height: 200,
        pixelRatio: 2
      });
    }
  }, [component.rotation, connectedPins]);

  // Update voltages via refs
  useEffect(() => {
    const unsubscribe = useSimulationStore.subscribe(
      (state) => state.pinVoltages,
      (voltages: any) => {
        const topPosV = voltages[`${component.id}-TP_0`] || voltages[`${component.id}:TP_0`] || 0;
        const topNegV = voltages[`${component.id}-TN_0`] || voltages[`${component.id}:TN_0`] || 0;
        const bottomPosV = voltages[`${component.id}-BP_0`] || voltages[`${component.id}:BP_0`] || 0;
        const bottomNegV = voltages[`${component.id}-BN_0`] || voltages[`${component.id}:BN_0`] || 0;

        if (topPosRectRef.current) topPosRectRef.current.fill(topPosV > 0 ? '#fca5a5' : '#fee2e2');
        if (topPosTextRef.current) {
          topPosTextRef.current.text(topPosV > 0 ? `${topPosV}V` : '');
        }

        if (topNegRectRef.current) topNegRectRef.current.fill(topNegV === 0 ? '#eff6ff' : '#eff6ff');

        if (bottomPosRectRef.current) bottomPosRectRef.current.fill(bottomPosV > 0 ? '#fca5a5' : '#fee2e2');
        if (bottomPosTextRef.current) {
          bottomPosTextRef.current.text(bottomPosV > 0 ? `${bottomPosV}V` : '');
        }

        if (bottomNegRectRef.current) bottomNegRectRef.current.fill(bottomNegV === 0 ? '#eff6ff' : '#eff6ff');
      }
    );
    return unsubscribe;
  }, [component.id]);

  const getPinAtPointer = (e: KonvaEventObject<MouseEvent>): string | null => {
    const stage = e.target.getStage();
    if (!stage || !outerGroupRef.current) return null;
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;

    const transform = outerGroupRef.current.getAbsoluteTransform().copy();
    transform.invert();
    const local = transform.point(pointer);

    const SNAP = 4.0;
    let closest: string | null = null;
    let closestDist = Infinity;

    for (const pin of Object.values(component.pins)) {
      const dx = Math.abs(local.x - pin.position.x);
      const dy = Math.abs(local.y - pin.position.y);
      if (dx <= SNAP && dy <= SNAP) {
        const dist = dx + dy;
        if (dist < closestDist) {
          closestDist = dist;
          closest = pin.id;
        }
      }
    }
    return closest;
  };
  
  const handleDragStart = useCallback(() => {
    useWorkspaceStore.getState().pushHistory();
  }, []);
  
  const handleDragMove = useCallback((e: KonvaEventObject<DragEvent>) => {
    useWorkspaceStore.getState().moveSelectedComponents(component.id, e.target.x(), e.target.y());
  }, [component.id]);
  
  const handleDragEnd = useCallback((e: KonvaEventObject<DragEvent>) => {
    useWorkspaceStore.getState().moveSelectedComponents(component.id, e.target.x(), e.target.y());
  }, [component.id]);
  
  const handleClick = useCallback((e: KonvaEventObject<MouseEvent>) => {
    useWorkspaceStore.getState().selectComponent(component.id, e.evt.shiftKey);
  }, [component.id]);
  
  const onPinMouseDown = useCallback((e: KonvaEventObject<MouseEvent>, pinId: string) => {
    e.cancelBubble = true;
    handlePinMouseDown({ componentId: component.id, pinId });
  }, [component.id, handlePinMouseDown]);

  return (
    <Group
      ref={outerGroupRef}
      x={component.position.x}
      y={component.position.y}
      rotation={component.rotation}
      scaleX={component.properties?.flipX ? -1 : 1}
      scaleY={component.properties?.flipY ? -1 : 1}
      draggable
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onTap={handleClick}
    >
      <Group ref={pcbGroupRef} listening={false}>
        {/* Main board background */}
        <Rect
          width={330} height={180}
          fill="#f5f0e8"
          stroke="#d4c9b0" strokeWidth={1}
          cornerRadius={4}
        />
        
        <Line points={[24, 5, 322, 5]} stroke="#dc2626" strokeWidth={0.5} />
        <Text x={14} y={1} text="+" fontSize={8} fill="#dc2626" fontStyle="bold" />
        
        <Line points={[24, 15, 322, 15]} stroke="#2563eb" strokeWidth={0.5} />
        <Text x={14} y={11} text="−" fontSize={8} fill="#2563eb" fontStyle="bold" />
        
        <Line points={[8, 30, 322, 30]} stroke="#d4c9b0" strokeWidth={1} />
        
        {['a','b','c','d','e'].map((letter, i) => (
          <Text key={letter} x={10} y={37 + i * 10} text={letter} fontSize={5} fill="#9ca3af" />
        ))}
        {['f','g','h','i','j'].map((letter, i) => (
          <Text key={letter} x={10} y={97 + i * 10} text={letter} fontSize={5} fill="#9ca3af" />
        ))}
        
        {[0, 4, 9, 14, 19, 24, 29].map(colIndex => (
          <Text
            key={colIndex}
            x={20 + colIndex * 10 - 3}
            y={31}
            text={String(colIndex + 1)}
            fontSize={4} fill="#9ca3af"
          />
        ))}
        
        <Rect x={0} y={85} width={330} height={10} fill="#e8e0d0" />
        <Line points={[8, 90, 322, 90]} stroke="#c8bda8" strokeWidth={1} dash={[4, 4]} />
        <Line points={[8, 150, 322, 150]} stroke="#d4c9b0" strokeWidth={1} />
        
        <Line points={[24, 155, 322, 155]} stroke="#dc2626" strokeWidth={0.5} />
        <Text x={14} y={151} text="+" fontSize={8} fill="#dc2626" fontStyle="bold" />
        
        <Line points={[24, 165, 322, 165]} stroke="#2563eb" strokeWidth={0.5} />
        <Text x={14} y={161} text="−" fontSize={8} fill="#2563eb" fontStyle="bold" />
        
        <Shape
          sceneFunc={(ctx) => {
            Object.values(component.pins).forEach((pin) => {
              ctx.beginPath();
              ctx.arc(pin.position.x, pin.position.y, 2.5, 0, Math.PI * 2);
              ctx.fillStyle = '#c8bda8';
              ctx.fill();
              ctx.strokeStyle = '#a09080';
              ctx.lineWidth = 0.5;
              ctx.stroke();

              if (connectedPins.has(pin.id)) {
                ctx.beginPath();
                ctx.arc(pin.position.x, pin.position.y, 4, 0, Math.PI * 2);
                ctx.strokeStyle = '#22c55e';
                ctx.lineWidth = 2;
                ctx.stroke();
              }
            });
          }}
        />
      </Group>

      {/* DYNAMIC RAILS */}
      <Group listening={false}>
        <Rect ref={topPosRectRef} x={8} y={3} width={314} height={4} fill="#fee2e2" />
        <Text ref={topPosTextRef} x={305} y={2} text="" fontSize={5} fill="#dc2626" fontStyle="bold" />
        <Rect ref={topNegRectRef} x={8} y={13} width={314} height={4} fill="#eff6ff" />
        <Rect ref={bottomPosRectRef} x={8} y={153} width={314} height={4} fill="#fee2e2" />
        <Text ref={bottomPosTextRef} x={305} y={152} text="" fontSize={5} fill="#dc2626" fontStyle="bold" />
        <Rect ref={bottomNegRectRef} x={8} y={163} width={314} height={4} fill="#eff6ff" />
      </Group>
      
      {/* PIN HOVER HIGHLIGHTS */}
      {hoveredPin && component.pins[hoveredPin] && (
        <Circle
          x={component.pins[hoveredPin].position.x}
          y={component.pins[hoveredPin].position.y}
          radius={4}
          fill="#fbbf24"
          opacity={0.9}
          listening={false}
        />
      )}
      {hoveredPin && component.pins[hoveredPin] && (
        <Group 
          x={component.pins[hoveredPin].position.x + 6} 
          y={component.pins[hoveredPin].position.y - 10}
          listening={false}
        >
          <Rect
            width={40} height={14}
            fill="#1f2937" opacity={0.9} cornerRadius={3}
          />
          <Text
            text={hoveredPin}
            x={0} y={4} width={40} align="center"
            fontSize={8} fill="#ffffff"
          />
        </Group>
      )}

      {/* HIT OVERLAY */}
      <Rect
        x={0} y={0} width={330} height={180}
        fill="rgba(0,0,0,0.001)"
        onMouseMove={(e) => {
          const pinId = getPinAtPointer(e);
          if (pinId !== hoveredPin) {
            setHoveredPin(pinId);
            if (pinId) {
              document.body.style.cursor = 'crosshair';
              handlePinMouseEnter({ componentId: component.id, pinId });
            } else {
              document.body.style.cursor = 'default';
              handlePinMouseLeave();
            }
          }
        }}
        onMouseLeave={() => {
          setHoveredPin(null);
          document.body.style.cursor = 'default';
          handlePinMouseLeave();
        }}
        onMouseDown={(e) => {
          const pinId = getPinAtPointer(e);
          if (pinId) onPinMouseDown(e, pinId);
        }}
      />
    </Group>
  );
}, (prev, next) => {
  return (
    prev.component.position.x === next.component.position.x &&
    prev.component.position.y === next.component.position.y &&
    prev.component.rotation === next.component.rotation &&
    JSON.stringify(prev.component.properties) === JSON.stringify(next.component.properties)
  );
});
