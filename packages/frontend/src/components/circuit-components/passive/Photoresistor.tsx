'use client';

import React, { useCallback, memo } from 'react';
import { Group, Rect, Circle, Text, Path } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { CircuitComponent } from '../../../types/components';
import { useWorkspaceStore } from '../../../store/workspaceStore';
import { useSimulationStore } from '../../../store/simulationStore';
import { CanvasContext } from '../../canvas/Canvas';

interface PhotoresistorProps {
  component: CircuitComponent;
}

export const Photoresistor = memo(({ component }: PhotoresistorProps) => {
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

  const lightLevel = Number(component.properties?.simulatedLightLevel ?? 50);
  
  // Calculate brightness indicator
  const glowOpacity = (lightLevel / 100) * 0.8;

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
      {/* LDR body */}
      <Circle x={30} y={35} radius={20} fill="#f8fafc" stroke="#94a3b8" strokeWidth={2} />
      
      {/* Snake/wavy resistor pattern on the face */}
      <Path
        data="M 15 35 Q 20 25 25 35 T 35 35 T 45 35"
        stroke="#ef4444"
        strokeWidth={3}
        fill="transparent"
      />
      <Path
        data="M 15 30 Q 20 40 25 30 T 35 30 T 45 30"
        stroke="#ef4444"
        strokeWidth={3}
        fill="transparent"
      />

      {/* Light glow overlay */}
      <Circle x={30} y={35} radius={25} fill="#fde047" opacity={glowOpacity} listening={false} />

      {/* Incoming light arrows */}
      <Group x={15} y={15}>
        <Path data="M 0 0 L -5 -5 M 0 0 L 5 -5 M 0 0 L 0 -10" stroke="#fbbf24" strokeWidth={1.5} rotation={45} />
        <Path data="M 5 0 L 0 -5 M 5 0 L 10 -5 M 5 0 L 5 -10" stroke="#fbbf24" strokeWidth={1.5} rotation={45} />
      </Group>

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
            {/* Wire lead extending up into body */}
          <Rect x={-2} y={-10} width={4} height={10} fill="#94a3b8" />
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

      {componentState?.currentResistance !== undefined && (
        <Text
          x={0} y={-5}
          text={`${(componentState.currentResistance / 1000).toFixed(1)}kΩ`}
          fontSize={10} fill="#3b82f6" fontStyle="bold"
        />
      )}
    </Group>
  );
});
