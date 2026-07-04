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

export const TransistorPNP = memo(({ component }: TransistorProps) => {
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

  const model = component.properties?.model || 'BC557';
  const operatingMode = componentState?.operatingMode || 'cutoff';
  const ic = componentState?.ic || 0;
  
  let glowColor = 'transparent';
  if (operatingMode === 'saturation') glowColor = '#10b981'; // Green
  else if (operatingMode === 'active') glowColor = '#8b5cf6'; // Purple for PNP
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
      {/* Bent Legs for 3D TO-92 */}
      <Path data="M 12 5 L 10 10 L 10 15" stroke="#94a3b8" strokeWidth={2} fill="transparent" />
      <Path data="M 20 5 L 20 15" stroke="#94a3b8" strokeWidth={2} fill="transparent" />
      <Path data="M 28 5 L 30 10 L 30 15" stroke="#94a3b8" strokeWidth={2} fill="transparent" />

      {/* TO-92 Package body (Front 3D view) */}
      <Path data="M 8 -15 Q 20 -22 32 -15 Z" fill="#0f172a" />
      <Rect 
        x={8} y={-15} width={24} height={20} fill="#1e293b" cornerRadius={1}
        shadowColor={glowColor}
        shadowBlur={10}
        shadowOpacity={0.8}
      />
      <Text x={8} y={-11} text={String(model)} fill="#94a3b8" fontSize={6} width={24} align="center" />

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
          <Circle radius={3} fill="#e2e8f0" stroke="#64748b" strokeWidth={1} />
          <Circle radius={1.5} fill="#64748b" />
          <Text
            x={-5} y={5}
            text={pin.label}
            fontSize={8} fill="#94a3b8" width={10} align="center"
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
