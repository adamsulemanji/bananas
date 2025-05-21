'use client';

import { useState, useCallback, RefObject } from 'react';
import { BoardTile } from '../utils/gameUtils';

export interface MarqueeRect {
  x: number;
  y: number;
  width: number;
  height: number;
  startX: number; // Store initial X for calculations
  startY: number; // Store initial Y for calculations
}

interface UseMarqueeSelectionProps {
  gridRef: RefObject<HTMLDivElement | null>; // Allow null for current ref
  tiles: BoardTile[]; // All tiles currently on the board
  onSelectTiles: (selectedIds: string[]) => void; // Callback to update selected tiles in parent
  isEnabled: boolean; // To enable/disable marquee selection (e.g. only when not dragging a tile)
}

export function useMarqueeSelection({
  gridRef,
  tiles,
  onSelectTiles,
  isEnabled
}: UseMarqueeSelectionProps) {
  const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!isEnabled || !gridRef.current) return;
    // Prevent starting marquee if clicking on an already draggable tile to allow tile drag
    if ((event.target as HTMLElement).closest('[data-draggable-tile="true"]')) {
      return;
    }

    setIsSelecting(true);
    const gridBounds = gridRef.current.getBoundingClientRect();
    const x = event.clientX - gridBounds.left;
    const y = event.clientY - gridBounds.top;
    setMarqueeRect({ x, y, width: 0, height: 0, startX: x, startY: y });
  }, [isEnabled, gridRef]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelecting || !marqueeRect || !gridRef.current) return;

    const gridBounds = gridRef.current.getBoundingClientRect();
    const currentX = event.clientX - gridBounds.left;
    const currentY = event.clientY - gridBounds.top;

    const newX = Math.min(currentX, marqueeRect.startX);
    const newY = Math.min(currentY, marqueeRect.startY);
    const newWidth = Math.abs(currentX - marqueeRect.startX);
    const newHeight = Math.abs(currentY - marqueeRect.startY);

    setMarqueeRect(prev => prev ? { ...prev, x: newX, y: newY, width: newWidth, height: newHeight } : null);
  }, [isSelecting, marqueeRect, gridRef]);

  const handleMouseUp = useCallback(() => {
    if (!isSelecting || !marqueeRect || !gridRef.current) {
      setIsSelecting(false);
      setMarqueeRect(null);
      return;
    }

    const selectedIds: string[] = [];
    const gridBounds = gridRef.current.getBoundingClientRect();

    tiles.forEach(tile => {
      const cellElement = document.getElementById(tile.position); 
      if (cellElement) {
        const cellRect = cellElement.getBoundingClientRect();
        const tileX = cellRect.left - gridBounds.left + (cellRect.width / 2); // Center of the tile
        const tileY = cellRect.top - gridBounds.top + (cellRect.height / 2); // Center of the tile

        if (
          tileX >= marqueeRect.x &&
          tileX <= marqueeRect.x + marqueeRect.width &&
          tileY >= marqueeRect.y &&
          tileY <= marqueeRect.y + marqueeRect.height
        ) {
          selectedIds.push(tile.id);
        }
      }
    });
    
    onSelectTiles(selectedIds);
    setIsSelecting(false);
    setMarqueeRect(null);
  }, [isSelecting, marqueeRect, tiles, onSelectTiles, gridRef]);

  return {
    marqueeRect,
    isSelecting,
    initiateMarquee: handleMouseDown, // Renamed for clarity in page.tsx
    dragMarquee: handleMouseMove,     // Renamed for clarity
    endMarquee: handleMouseUp,        // Renamed for clarity
  };
} 