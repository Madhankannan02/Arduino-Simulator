'use client';

import React, { useCallback, memo } from 'react';
import { Group, Rect, Circle, Text, Path } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { CircuitComponent } from '../../../types/components';
import { useWorkspaceStore } from '../../../store/workspaceStore';
import { useSimulationStore } from '../../../store/simulationStore';
import { CanvasContext } from '../../canvas/Canvas';

interface ThermistorProps {
  component: CircuitComponent;
}

export const Thermistor = memo(({ component }: ThermistorProps) => {
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

  const type = component.properties?.type || 'NTC';
  
  // Body color changes based on temperature (heat map)
  let bodyColor = '#0ea5e9'; // Default cool blue
  if (componentState?.temperatureCelsius !== undefined) {
    const t = componentState.temperatureCelsius;
    if (t < 0) bodyColor = '#3b82f6';
    else if (t < 20) bodyColor = '#0ea5e9';
    else if (t < 40) bodyColor = '#22c55e';
    else if (t < 60) bodyColor = '#eab308';
    else if (t < 80) bodyColor = '#f97316';
    else bodyColor = '#ef4444';
  }

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
      {/* Thermistor bead */}
      <Circle x={30} y={35} radius={12} fill={bodyColor} shadowColor={bodyColor} shadowBlur={5} />
      
      {/* Type label */}
      <Text x={22} y={30} text={String(type)} fontSize={10} fill="white" fontStyle="bold" />
      
      {/* Schematic overlay: Resistor with a line through it */}
      <Path data="M 15 50 L 45 20" stroke="#1e293b" strokeWidth={2} />
      <Path data="M 15 50 L 10 50" stroke="#1e293b" strokeWidth={2} />

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
              e.target.getStage()!.container().style.cursor = 'crosshair';
              handlePinMouseEnter({ componentId: component.id, pinId: pin.id });
            }}
            onMouseLeave={(e) => {
              setHoveredPin(null);
              e.target.getStage()!.container().style.cursor = 'default';
              handlePinMouseLeave();
            }}
          >
            {/* Wire lead extending up to bead */}
          <Path data={`M 0 0 C 0 -10 ${pin.id === 'PIN_1' ? '20' : '-20'} -25 0 -25`} stroke="#94a3b8" strokeWidth={2} />
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

      {/* Live State */}
      {componentState?.temperatureCelsius !== undefined && (
        <Text
          x={0} y={0}
          text={`${componentState.temperatureCelsius.toFixed(1)}°C`}
          fontSize={10} fill={bodyColor} fontStyle="bold"
        />
      )}
    </Group>
  );
});
