import { GRID_SIZE } from './config';

// Generate IDs for all cells in the grid
export const generateGridCellIds = () => {
  return Array.from(
    { length: GRID_SIZE * GRID_SIZE }, 
    (_, i) => `cell-${i}`
  );
};

// Get the row and column from a cell ID
export const getCellCoordinates = (cellId: string): [number, number] => {
  const index = parseInt(cellId.replace('cell-', ''), 10);
  const row = Math.floor(index / GRID_SIZE);
  const col = index % GRID_SIZE;
  return [row, col];
};

// Get the cell ID from row and column coordinates
export const getCellIdFromCoordinates = (row: number, col: number): string => {
  const index = row * GRID_SIZE + col;
  return `cell-${index}`;
};

// Check if a cell is within the grid boundaries
export const isValidCell = (row: number, col: number): boolean => {
  return row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE;
};

// Get the adjacent cells to a given cell
export const getAdjacentCells = (cellId: string): string[] => {
  const [row, col] = getCellCoordinates(cellId);
  const adjacent: string[] = [];
  
  // Check up, right, down, left
  const directions = [
    [-1, 0], [0, 1], [1, 0], [0, -1]
  ];
  
  for (const [dRow, dCol] of directions) {
    const newRow = row + dRow;
    const newCol = col + dCol;
    
    if (isValidCell(newRow, newCol)) {
      adjacent.push(getCellIdFromCoordinates(newRow, newCol));
    }
  }
  
  return adjacent;
}; 