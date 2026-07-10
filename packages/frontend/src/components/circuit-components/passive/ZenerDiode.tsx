'use client';

import React, { useCallback, memo } from 'react';
import { Group, Rect, Circle, Text, Path } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { CircuitComponent } from '../../../types/components';
import { useWorkspaceStore } from '../../../store/workspaceStore';
import { useSimulationStore } from '../../../store/simulationStore';
import { CanvasContext } from '../../canvas/Canvas';

interface ZenerDiodeProps {
  component: CircuitComponent;
}

export const ZenerDiode = memo(({ component }: ZenerDiodeProps) => {
  const [hoveredPin, setHoveredPin] = React.useState<string | null>(null);
  const { handlePinMouseDown, handlePinMouseEnter, handlePinMouseLeave } = React.useContext(CanvasContext);
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

  const isReverseZenerConduction = componentState?.isReverseZenerConduction || false;
  const isOverpower = componentState?.isOverpower || false;
  
  let bodyColor = '#f97316'; // Orange glass body typical of zener
  if (isOverpower) bodyColor = '#ef4444'; // Red for overpower

  return (
    <Group
      x={component.position.x}
      y={component.position.y}
      rotation={component.rotation}
      draggable
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onTap={handleClick}
    >
      {/* Zener body */}
      <Rect x={15} y={22} width={30} height={16} fill={bodyColor} cornerRadius={2} opacity={0.8} />
      {/* Cathode stripe */}
      <Rect x={38} y={22} width={5} height={16} fill="#000000" cornerRadius={[0, 2, 2, 0]} />
      
      {/* Zener Schematic overlay */}
      <Path data="M 18 25 L 35 30 L 18 35 Z" fill="#78350f" />
      <Path data="M 32 23 L 35 25 L 35 35 L 38 37" stroke="#78350f" strokeWidth={2} />

      {/* Pins */}
      {Object.values(component.pins).map(pin => {
        const isHovered = hoveredPin === pin.id;
        return (
          <Group
            key={pin.id}
            x={pin.position.x}
            y={pin.position.y}
            onMouseDown={(e) => onPinMouseDown(e, pin.id)}
            onMouseEnter={(e) => {
              setHoveredPin(pin.id);
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'crosshair';
              handlePinMouseEnter({ componentId: component.id, pinId: pin.id });
            }}
            onMouseLeave={(e) => {
              setHoveredPin(null);
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'default';
              handlePinMouseLeave();
            }}
          >
            {/* Wire lead extending inward */}
          <Rect x={pin.id === 'ANODE' ? 0 : -5} y={-2} width={5} height={4} fill="#94a3b8" />
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
        );
      })}

      {isReverseZenerConduction && (
        <Circle x={30} y={30} radius={25} fill="#f59e0b" opacity={0.3} listening={false} />
      )}
    </Group>
  );
});
