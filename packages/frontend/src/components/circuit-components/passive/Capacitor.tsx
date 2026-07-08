'use client';

import React, { useCallback, memo } from 'react';
import { Group, Rect, Circle, Text, Path } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { CircuitComponent } from '../../../types/components';
import { useWorkspaceStore } from '../../../store/workspaceStore';
import { useSimulationStore } from '../../../store/simulationStore';
import { CanvasContext } from '../../canvas/Canvas';

interface CapacitorProps {
  component: CircuitComponent;
}

export const Capacitor = memo(({ component }: CapacitorProps) => {
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

  const type = component.properties?.type || 'electrolytic';
  const capacitance = component.properties?.capacitance || 100;
  const voltageRating = component.properties?.voltageRating || 25;
  const chargePercent = componentState?.chargePercent || 0;
  const isOvervoltage = componentState?.isOvervoltage || false;
  const isReversePolarized = componentState?.isReversePolarized || false;

  let bodyColor = '#1e293b';
  if (isOvervoltage || isReversePolarized) {
    bodyColor = '#ef4444'; // Red warning
  } else if (type === 'ceramic') {
    bodyColor = '#f59e0b'; // Orange/yellow disc
  } else if (type === 'film') {
    bodyColor = '#dc2626'; // Red film box
  }

  // Animation for charging - subtle glow based on charge
  const glowOpacity = (chargePercent / 100) * 0.5;

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
      {type === 'electrolytic' && (
        <Group>
          {/* Main body */}
          <Rect x={10} y={10} width={40} height={60} fill={bodyColor} cornerRadius={5} 
            shadowColor="#3b82f6" shadowBlur={15} shadowOpacity={glowOpacity} />
          {/* Negative stripe */}
          <Rect x={40} y={10} width={10} height={60} fill="#cbd5e1" 
            cornerRadius={[0, 5, 5, 0]} />
          <Text x={40} y={10} width={10} height={60} text="-" fill="black" fontSize={18} align="center" verticalAlign="middle" />
          {/* Positive marking */}
          <Text x={10} y={10} width={30} height={60} text="+" fill="white" fontSize={16} align="center" verticalAlign="middle" opacity={0.7} />
          {/* Charge indicator fill */}
          {chargePercent > 0 && (
            <Rect x={10} y={70 - (chargePercent/100)*60} width={30} height={(chargePercent/100)*60} 
              fill="#3b82f6" opacity={0.3} cornerRadius={[0,0,0,5]} listening={false} />
          )}
        </Group>
      )}

      {type === 'ceramic' && (
        <Group>
          {/* Epoxy dipped legs covering the wire leads */}
          <Path
            data="M17.5,58 L17.5,74 Q20,77 22.5,74 L22.5,58 Z M37.5,58 L37.5,74 Q40,77 42.5,74 L42.5,58 Z"
            fill={bodyColor}
          />
          {/* Main ceramic disc body */}
          <Circle x={30} y={40} radius={25} fill={bodyColor} 
            shadowColor="#f59e0b" shadowBlur={15} shadowOpacity={glowOpacity > 0 ? glowOpacity : 0.2} />
          {/* 3D Specular Highlight */}
          <Circle x={25} y={32} radius={14} fill="white" opacity={0.15} />
        </Group>
      )}

      {type === 'film' && (
        <Group>
          {/* Flared epoxy bottom corners covering the wire leads */}
          <Path
            data="M17.5,55 L17.5,74 Q20,77 22.5,74 L22.5,55 Z M37.5,55 L37.5,74 Q40,77 42.5,74 L42.5,55 Z"
            fill={bodyColor}
          />
          {/* Main film box body */}
          <Rect x={8} y={15} width={44} height={42} fill={bodyColor} cornerRadius={[4, 4, 2, 2]} 
            shadowColor="#ef4444" shadowBlur={15} shadowOpacity={glowOpacity > 0 ? glowOpacity : 0.2} />
          {/* Top glossy edge highlight */}
          <Rect x={10} y={17} width={40} height={4} fill="white" opacity={0.25} cornerRadius={2} />
          {/* Side glossy edge highlights */}
          <Rect x={9} y={20} width={2} height={32} fill="white" opacity={0.15} cornerRadius={1} />
          <Rect x={49} y={20} width={2} height={32} fill="white" opacity={0.15} cornerRadius={1} />
        </Group>
      )}

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
            {/* Wire lead extending up into component body */}
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

      {/* Live state overlay */}
      {componentState?.chargeVoltage !== undefined && (
        <Text
          x={0} y={-15}
          text={`${componentState.chargeVoltage.toFixed(2)}V`}
          fontSize={12} fill="#3b82f6" fontStyle="bold"
        />
      )}
    </Group>
  );
});
