'use client';

import React, { useCallback, memo } from 'react';
import { Group, Rect, Circle, Text } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { CircuitComponent } from '../../../types/components';
import { useWorkspaceStore } from '../../../store/workspaceStore';
import { useSimulationStore } from '../../../store/simulationStore';
import { CanvasContext } from '../../canvas/Canvas';

interface CapacitorProps {
  component: CircuitComponent;
}

export const Capacitor = memo(({ component }: CapacitorProps) => {
  const { handlePinMouseDown, handlePinMouseEnter, handlePinMouseLeave } = React.useContext(CanvasContext);
  const isSelected = useWorkspaceStore(state => state.selectedComponentIds.includes(component.id));
  
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
    bodyColor = '#0ea5e9'; // Blue box
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
      {isSelected && (
        <Rect
          x={-5} y={-5}
          width={70} height={90}
          stroke="#3b82f6" strokeWidth={2}
          dash={[6, 3]} fill="transparent" listening={false}
        />
      )}

      {type === 'electrolytic' && (
        <Group>
          {/* Main body */}
          <Rect x={10} y={10} width={40} height={60} fill={bodyColor} cornerRadius={5} 
            shadowColor="#3b82f6" shadowBlur={15} shadowOpacity={glowOpacity} />
          {/* Negative stripe */}
          <Rect x={40} y={10} width={10} height={60} fill="#cbd5e1" 
            cornerRadius={[0, 5, 5, 0]} />
          <Text x={42} y={35} text="-" fill="black" fontSize={16} />
          {/* Positive marking */}
          <Text x={15} y={15} text="+" fill="white" fontSize={12} />
          {/* Charge indicator fill */}
          {chargePercent > 0 && (
            <Rect x={10} y={70 - (chargePercent/100)*60} width={30} height={(chargePercent/100)*60} 
              fill="#3b82f6" opacity={0.3} cornerRadius={[0,0,0,5]} listening={false} />
          )}
          {/* Labels */}
          <Text x={12} y={30} text={`${capacitance}µF`} fill="white" fontSize={11} width={28} align="center" />
          <Text x={12} y={45} text={`${voltageRating}V`} fill="gray" fontSize={9} width={28} align="center" />
        </Group>
      )}

      {type === 'ceramic' && (
        <Group>
          <Circle x={30} y={40} radius={25} fill={bodyColor} 
            shadowColor="#f59e0b" shadowBlur={10} shadowOpacity={glowOpacity} />
          <Text x={15} y={35} text={`${capacitance}`} fill="black" fontSize={12} width={30} align="center" />
        </Group>
      )}

      {type === 'film' && (
        <Group>
          <Rect x={10} y={20} width={40} height={40} fill={bodyColor} cornerRadius={2} 
            shadowColor="#0ea5e9" shadowBlur={10} shadowOpacity={glowOpacity} />
          <Text x={10} y={30} text={`${capacitance}µ`} fill="white" fontSize={11} width={40} align="center" />
        </Group>
      )}

      {/* Pins */}
      {Object.values(component.pins).map(pin => (
        <Group
          key={pin.id}
          x={pin.position.x}
          y={pin.position.y}
          onMouseDown={(e) => onPinMouseDown(e, pin.id)}
          onMouseEnter={(e) => {
            e.target.getStage()!.container().style.cursor = 'crosshair';
            handlePinMouseEnter({ componentId: component.id, pinId: pin.id });
          }}
          onMouseLeave={(e) => {
            e.target.getStage()!.container().style.cursor = 'default';
            handlePinMouseLeave();
          }}
        >
          {/* Wire lead extending up into component body */}
          <Rect x={-2} y={-10} width={4} height={10} fill="#94a3b8" />
          <Circle radius={6} fill="#e2e8f0" stroke="#64748b" strokeWidth={1} />
          <Circle radius={2} fill="#64748b" />
          {/* Pin Label */}
          {type === 'electrolytic' && (
            <Text
              x={-10} y={8}
              text={pin.label}
              fontSize={10} fill="#64748b" align="center" width={20}
            />
          )}
        </Group>
      ))}

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
