'use client';

import React, { useCallback, memo } from 'react';
import { Group, Rect, Circle, Text, Path } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { CircuitComponent } from '../../../types/components';
import { useWorkspaceStore } from '../../../store/workspaceStore';
import { useSimulationStore } from '../../../store/simulationStore';
import { CanvasContext } from '../../canvas/Canvas';

interface DiodeProps {
  component: CircuitComponent;
}

export const Diode = memo(({ component }: DiodeProps) => {
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

  const isBreakdown = componentState?.isBreakdown || false;
  const isForwardBiased = componentState?.isForwardBiased || false;
  
  let bodyColor = '#1e293b';
  if (isBreakdown) bodyColor = '#ef4444'; // Red for breakdown

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
      {/* Diode body */}
      <Rect x={15} y={22} width={30} height={16} fill={bodyColor} cornerRadius={2} />
      {/* Cathode stripe */}
      <Rect x={38} y={22} width={5} height={16} fill="#cbd5e1" cornerRadius={[0, 2, 2, 0]} />
      
      {/* Schematic overlay (subtle) */}
      <Path data="M 18 25 L 35 30 L 18 35 Z" fill="#334155" />
      <Rect x={35} y={25} width={2} height={10} fill="#334155" />

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
          {/* Wire lead extending inward */}
          <Rect x={pin.id === 'ANODE' ? 0 : -5} y={-2} width={5} height={4} fill="#94a3b8" />
          <Circle radius={6} fill="#e2e8f0" stroke="#64748b" strokeWidth={1} />
          <Circle radius={2} fill="#64748b" />
          <Text
            x={-5} y={-15}
            text={pin.label}
            fontSize={10} fill="#64748b"
          />
        </Group>
      ))}

      {isForwardBiased && (
        <Circle x={30} y={30} radius={25} fill="#10b981" opacity={0.2} listening={false} />
      )}
    </Group>
  );
});
