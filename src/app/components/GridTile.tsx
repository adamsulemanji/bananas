'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';

interface GridTileProps {
  id: string;
  content: string;
  isSelected?: boolean;
  isGhost?: boolean;
  isInvalidWord?: boolean;
  style?: React.CSSProperties;
}

export default function GridTile({ id, content, isSelected, isGhost, isInvalidWord, style }: GridTileProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { overlayTile: !!style },
  });

  const dragTransform =
    transform && !style
      ? {
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0)${isDragging ? ' scale(1.06)' : ''}`,
          zIndex: isDragging ? 1000 : isSelected ? 900 : 1,
          transition: isDragging ? undefined : 'transform 0.15s ease',
          position: isDragging ? ('relative' as const) : undefined,
        }
      : isSelected
        ? { zIndex: 900 }
        : {};

  const bg = isInvalidWord
    ? '#2a1010'
    : isSelected && !isDragging
      ? 'rgba(201,242,61,0.15)'
      : 'var(--tile-bg)';

  const borderColor = isInvalidWord
    ? 'var(--red)'
    : isSelected && !isDragging
      ? 'var(--lime)'
      : 'var(--tile-b)';

  const boxShadow = isSelected && !isDragging
    ? 'var(--tw-shadow, 0 0 0 2px var(--lime), 0 0 14px rgba(201,242,61,0.25), inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -3px 0 rgba(0,0,0,0.18))'
    : isInvalidWord
      ? '0 0 0 1.5px var(--red), 0 0 10px rgba(240,84,84,0.2), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -3px 0 rgba(0,0,0,0.18)'
      : isDragging
        ? 'inset 0 1px 0 rgba(255,255,255,0.55), 0 8px 24px rgba(0,0,0,0.7)'
        : 'inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -3px 0 rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.45)';

  const tileStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '3px',
    border: `1.5px solid ${borderColor}`,
    background: bg,
    boxShadow,
    opacity: isGhost ? 0.3 : isDragging ? 0.75 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    transition: 'box-shadow 0.12s, background 0.12s, opacity 0.12s',
    ...style,
    ...dragTransform,
  };

  return (
    <div
      ref={setNodeRef}
      style={tileStyle}
      {...listeners}
      {...attributes}
      data-draggable-tile="true"
    >
      <span
        style={{
          fontFamily: 'var(--font-jetbrains), "JetBrains Mono", monospace',
          fontWeight: 700,
          fontSize: '0.78rem',
          lineHeight: 1,
          letterSpacing: '0.02em',
          color: isInvalidWord ? 'var(--red)' : 'var(--tile-t)',
          userSelect: 'none',
        }}
      >
        {content.toUpperCase()}
      </span>
    </div>
  );
}
