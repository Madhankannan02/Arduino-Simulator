import React, { useState, useCallback, memo } from 'react';
import { Group, Rect, Circle, Text } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { CircuitComponent } from '../../../types/components';
import { useWorkspaceStore } from '../../../store/workspaceStore';
import { useSimulationStore } from '../../../store/simulationStore';
import { CanvasContext } from '../../canvas/Canvas';

interface SevenSegmentCAProps {
  component: CircuitComponent;
}

export const SevenSegmentCA = memo(({ component }: SevenSegmentCAProps) => {
  const [hoveredPin, setHoveredPin] = useState<string | null>(null);
  const { handlePinMouseDown, handlePinMouseEnter, handlePinMouseLeave } = React.useContext(CanvasContext);
  
  // Read simulation state directly from store
  const componentState = useSimulationStore(
    s => s.componentStates[component.id]
  ) as any;

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

  const COMMONLY_USED_PINS = ['a','b','c','d','e','f','g','dp','COM1','COM2'];

  const renderPins = () => {
    return Object.values(component.pins).map((pin) => {
      const isCommon = COMMONLY_USED_PINS.includes(pin.id);
      const isHovered = hoveredPin === pin.id;
      return (
        <Group
          key={pin.id}
          x={pin.position.x}
          y={pin.position.y}
          onMouseEnter={() => {
            if (isCommon) {
              setHoveredPin(pin.id);
              document.body.style.cursor = 'crosshair';
              handlePinMouseEnter({ componentId: component.id, pinId: pin.id });
            }
          }}
          onMouseLeave={() => {
            if (isCommon) {
              setHoveredPin(null);
              document.body.style.cursor = 'default';
              handlePinMouseLeave();
            }
          }}
          onMouseDown={(e) => {
            if (isCommon) onPinMouseDown(e, pin.id);
          }}
        >
          {isCommon && (
            <Group y={0}>
              <Circle x={0} y={0} radius={6} fill="transparent" />
              <Circle
                x={0} y={0}
                radius={isHovered ? 2.5 : 1.5}
                fill={isHovered ? '#fbbf24' : '#171717'}
                stroke={isHovered ? '#fbbf24' : '#404040'}
                strokeWidth={isHovered ? 1 : 0.5}
              />
              {isHovered && (
                <Group x={-12} y={8}>
                  <Rect width={24} height={10} fill="#1f2937" cornerRadius={2} opacity={0.9} />
                  <Text
                    text={pin.label}
                    width={24} height={10}
                    align="center" verticalAlign="middle"
                    fontSize={6} fill="#fbbf24"
                    fontFamily="monospace" fontStyle="bold"
                  />
                </Group>
              )}
            </Group>
          )}
        </Group>
      );
    });
  };

  const getSegmentStyle = (segId: string) => {
    const isOn = componentState?.segments?.[segId];
    if (isOn) {
      return {
        fill: '#ff2200',
        stroke: '#ff4422',
        strokeWidth: 0.5,
        shadowColor: '#ff0000',
        shadowBlur: 8,
        shadowOpacity: 0.8
      };
    } else {
      return {
        fill: '#3d0808',
        stroke: '#4a0a0a',
        strokeWidth: 0.3,
        shadowColor: 'transparent',
        shadowBlur: 0,
        shadowOpacity: 0
      };
    }
  };

  return (
    <Group
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
      {/* Outer Housing */}
      <Rect
        x={0}
        y={0}
        width={60}
        height={75}
        fill="#1a1a1a"
        stroke="#333333"
        strokeWidth={1}
        cornerRadius={3}
      />

      {/* Display Face */}
      <Rect
        x={5}
        y={5}
        width={50}
        height={62}
        fill="#2d0a0a"
        stroke="#3d1010"
        strokeWidth={0.5}
        cornerRadius={2}
      />

      {/* Segments */}
      <Group>
        {/* A (Top) */}
        <Rect x={14} y={9} width={32} height={6} cornerRadius={1} {...getSegmentStyle('a')} />
        {/* B (Top Right) */}
        <Rect x={44} y={11} width={6} height={28} cornerRadius={1} {...getSegmentStyle('b')} />
        {/* C (Bottom Right) */}
        <Rect x={44} y={42} width={6} height={28} cornerRadius={1} {...getSegmentStyle('c')} />
        {/* D (Bottom) */}
        <Rect x={14} y={62} width={32} height={6} cornerRadius={1} {...getSegmentStyle('d')} />
        {/* E (Bottom Left) */}
        <Rect x={10} y={42} width={6} height={28} cornerRadius={1} {...getSegmentStyle('e')} />
        {/* F (Top Left) */}
        <Rect x={10} y={11} width={6} height={28} cornerRadius={1} {...getSegmentStyle('f')} />
        {/* G (Middle) */}
        <Rect x={14} y={36} width={32} height={6} cornerRadius={1} {...getSegmentStyle('g')} />
        {/* DP (Decimal Point) */}
        <Circle x={54} y={66} radius={4} {...getSegmentStyle('dp')} />
      </Group>

      {/* Labels */}
      <Text x={5} y={68} fontSize={6} fill="#3b82f6" fontStyle="bold" text="CA" />
      <Text x={20} y={68} fontSize={5} fill="#6b7280" text="5161AS" />

      {/* Pin Headers */}
      <Rect x={0} y={72} width={60} height={3} fill="#111111" />
      
      {/* 10 Pins Holes and Metal Contacts */}
      {[8, 13, 18, 23, 28, 33, 38, 43, 48, 53].map(xPos => (
        <Group key={xPos}>
          <Circle x={xPos} y={73} radius={1.5} fill="#d1d5db" />
          <Rect x={xPos - 0.5} y={74} width={1} height={8} fill="#d1d5db" />
        </Group>
      ))}

      {renderPins()}
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
