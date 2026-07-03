'use client';

import React, { useCallback, memo } from 'react';
import { Group, Rect, Circle, Text, Path } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { CircuitComponent } from '../../../types/components';
import { useWorkspaceStore } from '../../../store/workspaceStore';
import { useSimulationStore } from '../../../store/simulationStore';
import { CanvasContext } from '../../canvas/Canvas';

interface MultimeterProps {
  component: CircuitComponent;
}

export const Multimeter = memo(({ component }: MultimeterProps) => {
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

  const displayValue = componentState?.displayValue || '---';
  const unit = componentState?.unit || '';
  const mode = componentState?.mode || component.properties?.mode || 'DCV';
  const isConnected = componentState?.isConnected || false;

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
          width={110} height={200}
          stroke="#3b82f6" strokeWidth={2}
          dash={[6, 3]} fill="transparent" listening={false}
        />
      )}

      {/* Multimeter Body */}
      <Rect x={10} y={10} width={80} height={150} fill="#facc15" cornerRadius={10} shadowColor="black" shadowBlur={10} shadowOpacity={0.3} />
      {/* Inner dark bezel */}
      <Rect x={15} y={15} width={70} height={60} fill="#1e293b" cornerRadius={5} />
      {/* Screen */}
      <Rect x={20} y={20} width={60} height={40} fill="#a3e635" cornerRadius={2} />
      
      {/* Screen Text */}
      <Text x={25} y={25} text={mode} fontSize={8} fill="#1e293b" />
      <Text x={25} y={35} text={displayValue} fontSize={18} fill="#1e293b" fontStyle="bold" width={50} align="right" />
      <Text x={60} y={25} text={unit} fontSize={8} fill="#1e293b" width={15} align="right" />

      {/* Selector Dial */}
      <Circle x={50} y={100} radius={25} fill="#334155" />
      <Circle x={50} y={100} radius={15} fill="#475569" />
      <Rect 
        x={50} y={100} width={4} height={15} fill="#e2e8f0" 
        offset={{x: 2, y: 15}}
        rotation={mode === 'DCV' ? -45 : mode === 'DCA' ? 0 : mode === 'resistance' ? 45 : 90} 
      />

      {/* Ports Area */}
      <Rect x={20} y={135} width={60} height={20} fill="#334155" cornerRadius={3} />
      <Circle x={30} y={145} radius={6} fill="#000000" />
      <Circle x={70} y={145} radius={6} fill="#ef4444" />
      
      {/* Probe Wires (Visual only, pins are placed at the ends) */}
      <Path data="M 30 145 C 30 180 30 200 30 220" stroke="#000000" strokeWidth={3} />
      <Path data="M 70 145 C 70 180 70 200 70 220" stroke="#ef4444" strokeWidth={3} />

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
          {/* Probe tips */}
          <Path 
            data="M -2 -15 L 2 -15 L 1 -5 L 1 0 L -1 0 L -1 -5 Z" 
            fill={pin.id === 'RED_PROBE' ? '#ef4444' : '#000000'} 
          />
          <Path data="M -0.5 0 L 0.5 0 L 0.5 10 L -0.5 10 Z" fill="#94a3b8" />
          
          <Circle radius={6} fill="#e2e8f0" stroke={pin.id === 'RED_PROBE' ? '#ef4444' : '#000000'} strokeWidth={1} />
          <Circle radius={2} fill={pin.id === 'RED_PROBE' ? '#ef4444' : '#000000'} />
        </Group>
      ))}

      {/* Connection warning */}
      {!isConnected && (
        <Text
          x={30} y={170}
          text="Open"
          fontSize={10} fill="#ef4444" fontStyle="bold"
        />
      )}
    </Group>
  );
});
