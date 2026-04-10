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
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0) ${isDragging ? 'scale(1.08)' : ''}`,
          zIndex: isDragging ? 1000 : isSelected ? 900 : 1,
          transition: isDragging ? undefined : 'transform 0.2s ease',
          position: isDragging ? ('relative' as const) : undefined,
        }
      : isSelected
        ? { zIndex: 900 }
        : {};

  const tileStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '2px',
    border: `1px solid ${
      isInvalidWord
        ? '#b84020'
        : isSelected && !isDragging
          ? 'var(--brass)'
          : 'var(--tile-border)'
    }`,
    background: isInvalidWord
      ? '#3d1008'
      : isSelected && !isDragging
        ? 'rgba(200,148,26,0.18)'
        : 'var(--tile-bg)',
    boxShadow: isSelected && !isDragging
      ? '0 0 0 2px var(--brass), 0 0 10px rgba(200,148,26,0.28), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -2px 0 rgba(0,0,0,0.2)'
      : isInvalidWord
        ? 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -2px 0 rgba(0,0,0,0.25), 0 0 8px rgba(184,64,32,0.35)'
        : isDragging
          ? 'inset 0 1px 0 rgba(255,255,255,0.45), 0 8px 24px rgba(0,0,0,0.75)'
          : 'inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -2px 0 rgba(0,0,0,0.22), 0 2px 5px rgba(0,0,0,0.5)',
    opacity: isGhost ? 0.3 : isDragging ? 0.8 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    transition: 'box-shadow 0.15s, background 0.15s',
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
          fontFamily: 'var(--font-courier-prime), "Courier New", monospace',
          fontWeight: 700,
          fontSize: '0.8rem',
          lineHeight: 1,
          color: isInvalidWord ? '#f87171' : 'var(--ink)',
          userSelect: 'none',
          letterSpacing: '0.02em',
        }}
      >
        {content.toUpperCase()}
      </span>
    </div>
  );
}
