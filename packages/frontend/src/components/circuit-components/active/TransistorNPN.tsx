'use client';

import React, { useCallback, memo } from 'react';
import { Group, Rect, Circle, Text, Path } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { CircuitComponent } from '../../../types/components';
import { useWorkspaceStore } from '../../../store/workspaceStore';
import { useSimulationStore } from '../../../store/simulationStore';
import { CanvasContext } from '../../canvas/Canvas';

interface TransistorProps {
  component: CircuitComponent;
}

export const TransistorNPN = memo(({ component }: TransistorProps) => {
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

  const model = component.properties?.model || 'BC547';
  const operatingMode = componentState?.operatingMode || 'cutoff';
  const ic = componentState?.ic || 0;
  
  let glowColor = 'transparent';
  if (operatingMode === 'saturation') glowColor = '#10b981'; // Green
  else if (operatingMode === 'active') glowColor = '#3b82f6'; // Blue
  else glowColor = 'transparent';

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
          x={-5} y={0}
          width={40} height={80}
          stroke="#3b82f6" strokeWidth={2}
          dash={[6, 3]} fill="transparent" listening={false}
        />
      )}

      {/* TO-92 Package shape */}
      <Path
        data="M 10 10 L 40 10 A 15 15 0 0 1 40 70 L 10 70 Z"
        fill="#1e293b"
        shadowColor={glowColor}
        shadowBlur={10}
        shadowOpacity={0.8}
      />
      <Text x={15} y={20} text={String(model)} fill="#cbd5e1" fontSize={9} rotation={90} />

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
          <Rect x={-10} y={-2} width={10} height={4} fill="#94a3b8" />
          <Circle radius={6} fill="#e2e8f0" stroke="#64748b" strokeWidth={1} />
          <Circle radius={2} fill="#64748b" />
          <Text
            x={10} y={-5}
            text={pin.label}
            fontSize={10} fill="#64748b"
          />
        </Group>
      ))}

      {/* Live state overlay */}
      {operatingMode !== 'cutoff' && (
        <Text
          x={30} y={-10}
          text={`${ic.toFixed(1)}mA`}
          fontSize={10} fill="#10b981" fontStyle="bold"
        />
      )}
    </Group>
  );
});
