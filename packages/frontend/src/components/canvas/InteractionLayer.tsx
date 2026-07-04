import React, { useState, useRef, useEffect } from 'react';
import { Layer, Rect, Group } from 'react-konva';
import Konva from 'konva';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { CircuitComponent } from '../../types/components';

export const getComponentBounds = (comp: CircuitComponent) => {
  let width = 100;
  let height = 100;
  let offsetX = 0;
  let offsetY = 0;

  switch (comp.type) {
    case 'ARDUINO_UNO':
      width = 208; height = 148; offsetX = -4; offsetY = -4;
      break;
    case 'LED':
      width = 50; height = 55; offsetX = -5; offsetY = -5;
      break;
    case 'RESISTOR':
      width = 70; height = 35; offsetX = -5; offsetY = -5;
      break;
    case 'PUSH_BUTTON':
      width = 30; height = 40; offsetX = 0; offsetY = 0;
      break;
    case 'POTENTIOMETER':
      width = 60; height = 60; offsetX = -5; offsetY = -5;
      break;
    case 'SERVO_MOTOR':
      width = 60; height = 86; offsetX = -5; offsetY = -42;
      break;
    case 'BUZZER':
      width = 64; height = 72; offsetX = -12; offsetY = -32;
      break;
    case 'TEMPERATURE_SENSOR':
      width = 50; height = 66; offsetX = -25; offsetY = -66;
      break;
    case 'LCD_16X2':
      width = 176; height = 92; offsetX = -12; offsetY = -72;
      break;
    case 'LCD_16X2_I2C':
      // Height 72 for just the body. OffsetX -50 to include text labels. Width 214 to cover text+backpack+body
      width = 214; height = 72; offsetX = -50; offsetY = -72;
      break;
    case 'ULTRASONIC_SENSOR':
      width = 208; height = 116; offsetX = -103; offsetY = -116;
      break;
    case 'SEVEN_SEG_CC':
    case 'SEVEN_SEG_CA':
      width = 60; height = 90; offsetX = 0; offsetY = 0;
      break;
    case 'RELAY':
      width = 70; height = 100; offsetX = -35; offsetY = -50;
      break;
    case 'BREADBOARD':
      width = 320; height = 180; offsetX = 0; offsetY = 0;
      break;
    case 'TRANSISTOR_NPN':
    case 'TRANSISTOR_PNP':
      width = 30; height = 42; offsetX = 5; offsetY = -22;
      break;
    case 'CAPACITOR':
      width = 70; height = 90; offsetX = -5; offsetY = -5;
      break;
    case 'DIODE':
    case 'ZENER_DIODE':
      width = 70; height = 30; offsetX = -5; offsetY = 15;
      break;
    case 'PHOTORESISTOR':
      width = 60; height = 50; offsetX = 0; offsetY = 10;
      break;
    case 'THERMISTOR':
      width = 60; height = 40; offsetX = 0; offsetY = 15;
      break;
    case 'MULTIMETER':
      width = 110; height = 200; offsetX = -5; offsetY = -5;
      break;
  }
  
  return {
    x: comp.position.x + offsetX,
    y: comp.position.y + offsetY,
    width,
    height
  };
};

export const InteractionLayer: React.FC = () => {
  const components = useWorkspaceStore(state => state.components);
  const selectedComponentIds = useWorkspaceStore(state => state.selectedComponentIds);
  const selectComponent = useWorkspaceStore(state => state.selectComponent);
  const viewport = useWorkspaceStore(state => state.viewport);

  const [selectionStart, setSelectionStart] = useState<{ x: number, y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number, y: number } | null>(null);

  const layerRef = useRef<Konva.Layer>(null);

  useEffect(() => {
    const stage = layerRef.current?.getStage();
    if (!stage) return;

    const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Start selection only on empty stage background
      if (e.evt.button === 0 && e.target === stage) {
        if (e.cancelBubble) return;
        
        const pos = stage.getPointerPosition();
        if (pos) {
          const worldPos = {
            x: (pos.x - viewport.x) / viewport.scale,
            y: (pos.y - viewport.y) / viewport.scale
          };
          setSelectionStart(worldPos);
          setSelectionEnd(worldPos);
        }
      }
    };

    const handleMouseMove = (_e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!selectionStart) return;
      const pos = stage.getPointerPosition();
      if (pos) {
        setSelectionEnd({
          x: (pos.x - viewport.x) / viewport.scale,
          y: (pos.y - viewport.y) / viewport.scale
        });
      }
    };

    const handleMouseUp = () => {
      if (!selectionStart || !selectionEnd) return;
      
      const minX = Math.min(selectionStart.x, selectionEnd.x);
      const minY = Math.min(selectionStart.y, selectionEnd.y);
      const maxX = Math.max(selectionStart.x, selectionEnd.x);
      const maxY = Math.max(selectionStart.y, selectionEnd.y);
      
      if (maxX - minX > 5 || maxY - minY > 5) {
        components.forEach(comp => {
           const bounds = getComponentBounds(comp);
           if (
             bounds.x < maxX && bounds.x + bounds.width > minX &&
             bounds.y < maxY && bounds.y + bounds.height > minY
           ) {
             selectComponent(comp.id, true);
           }
        });
      }
      
      setSelectionStart(null);
      setSelectionEnd(null);
    };

    stage.on('mousedown', handleMouseDown);
    stage.on('mousemove', handleMouseMove);
    stage.on('mouseup', handleMouseUp);

    return () => {
      stage.off('mousedown', handleMouseDown);
      stage.off('mousemove', handleMouseMove);
      stage.off('mouseup', handleMouseUp);
    };
  }, [selectionStart, selectionEnd, viewport, components, selectComponent]);

  const selectedComponents = components.filter(c => selectedComponentIds.includes(c.id));

  return (
    <Layer 
      ref={layerRef} 
      listening={false}
      x={viewport.x} 
      y={viewport.y} 
      scaleX={viewport.scale} 
      scaleY={viewport.scale}
    >
      {/* Rubber-band Selection Rectangle */}
      {selectionStart && selectionEnd && (
        <Rect
          x={Math.min(selectionStart.x, selectionEnd.x)}
          y={Math.min(selectionStart.y, selectionEnd.y)}
          width={Math.abs(selectionEnd.x - selectionStart.x)}
          height={Math.abs(selectionEnd.y - selectionStart.y)}
          fill="rgba(44, 94, 74, 0.15)"
          stroke="#2C5E4A"
          strokeWidth={1 / viewport.scale}
        />
      )}

      {/* Component Selection Outlines */}
      {selectedComponents.map(comp => {
        const bounds = getComponentBounds(comp);
        const localX = bounds.x - comp.position.x;
        const localY = bounds.y - comp.position.y;
        const selX = localX - 8;
        const selY = localY - 8;
        const selW = bounds.width + 16;
        const selH = bounds.height + 16;
        const strokeW = 2 / viewport.scale;

        return (
          <Group 
            key={`sel-${comp.id}`} 
            x={comp.position.x} 
            y={comp.position.y} 
            rotation={comp.rotation || 0}
            scaleX={comp.properties?.flipX ? -1 : 1}
            scaleY={comp.properties?.flipY ? -1 : 1}
          >
            <Rect
              x={selX} y={selY}
              width={selW} height={selH}
              stroke="#2C5E4A"
              strokeWidth={strokeW}
              dash={[6 / viewport.scale, 3 / viewport.scale]}
            />
            <Rect x={selX - 4 / viewport.scale} y={selY - 4 / viewport.scale} width={8 / viewport.scale} height={8 / viewport.scale} fill="white" stroke="#2C5E4A" strokeWidth={strokeW / 2} />
            <Rect x={selX + selW - 4 / viewport.scale} y={selY - 4 / viewport.scale} width={8 / viewport.scale} height={8 / viewport.scale} fill="white" stroke="#2C5E4A" strokeWidth={strokeW / 2} />
            <Rect x={selX - 4 / viewport.scale} y={selY + selH - 4 / viewport.scale} width={8 / viewport.scale} height={8 / viewport.scale} fill="white" stroke="#2C5E4A" strokeWidth={strokeW / 2} />
            <Rect x={selX + selW - 4 / viewport.scale} y={selY + selH - 4 / viewport.scale} width={8 / viewport.scale} height={8 / viewport.scale} fill="white" stroke="#2C5E4A" strokeWidth={strokeW / 2} />
          </Group>
        );
      })}
    </Layer>
  );
};
