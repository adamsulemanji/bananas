import React from 'react';
import { BoardSquare } from './BoardSquare';

type BoardProps = {
  boardState: Record<string, { id: string; letter: string } | null>;
  boardSize: number;
};

// Define special squares like in Scrabble
const getSquareColor = (row: number, col: number): string => {
  // Triple word score squares (red)
  if (
    (row === 0 && (col === 0 || col === 7 || col === 14)) || 
    (row === 7 && (col === 0 || col === 14)) || 
    (row === 14 && (col === 0 || col === 7 || col === 14))
  ) {
    return 'bg-red-700';
  }
  
  // Double word score squares (pink)
  if (
    (row === 1 && (col === 1 || col === 13)) ||
    (row === 2 && (col === 2 || col === 12)) ||
    (row === 3 && (col === 3 || col === 11)) ||
    (row === 4 && (col === 4 || col === 10)) ||
    (row === 10 && (col === 4 || col === 10)) ||
    (row === 11 && (col === 3 || col === 11)) ||
    (row === 12 && (col === 2 || col === 12)) ||
    (row === 13 && (col === 1 || col === 13))
  ) {
    return 'bg-pink-400';
  }
  
  // Triple letter score squares (blue)
  if (
    (row === 1 && (col === 5 || col === 9)) ||
    (row === 5 && (col === 1 || col === 5 || col === 9 || col === 13)) ||
    (row === 9 && (col === 1 || col === 5 || col === 9 || col === 13)) ||
    (row === 13 && (col === 5 || col === 9))
  ) {
    return 'bg-blue-600';
  }
  
  // Double letter score squares (light blue)
  if (
    (row === 0 && (col === 3 || col === 11)) ||
    (row === 2 && (col === 6 || col === 8)) ||
    (row === 3 && (col === 0 || col === 7 || col === 14)) ||
    (row === 6 && (col === 2 || col === 6 || col === 8 || col === 12)) ||
    (row === 7 && (col === 3 || col === 11)) ||
    (row === 8 && (col === 2 || col === 6 || col === 8 || col === 12)) ||
    (row === 11 && (col === 0 || col === 7 || col === 14)) ||
    (row === 12 && (col === 6 || col === 8)) ||
    (row === 14 && (col === 3 || col === 11))
  ) {
    return 'bg-blue-400';
  }
  
  // Center square (star)
  if (row === 7 && col === 7) {
    return 'bg-pink-500';
  }
  
  // Default square
  return 'bg-green-800';
};

export function Board({ boardState, boardSize }: BoardProps) {
  // Create a grid of squares based on boardSize
  const squares = [];
  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col < boardSize; col++) {
      const squareId = `square-${row}-${col}`;
      const letterObj = boardState[squareId];
      const bgColor = getSquareColor(row, col);
      
      squares.push(
        <BoardSquare key={squareId} id={squareId} bgColor={bgColor}>
          {letterObj && (
            <div className="w-11 h-11 bg-yellow-100 rounded-md flex items-center justify-center font-bold text-xl border-2 border-yellow-700 text-black">
              {letterObj.letter}
            </div>
          )}
        </BoardSquare>
      );
    }
  }

  return (
    <div 
      className="grid gap-[1px] bg-black p-2 rounded-lg shadow-lg border-4 border-gray-800"
      style={{ 
        gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))`,
        width: 'fit-content'
      }}
    >
      {squares}
    </div>
  );
} 