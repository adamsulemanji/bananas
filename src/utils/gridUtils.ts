import { GRID_SIZE } from './config';

export { GRID_SIZE };

// Generate IDs for all cells in the grid
export const generateGridCellIds = () => {
  return Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => `cell-${i}`);
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
    [-1, 0],
    [0, 1],
    [1, 0],
    [0, -1],
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

export function transposeTiles(
  selectedTiles: { id: string; position: string }[]
): Map<string, string> | null {
  if (selectedTiles.length === 0) return null;

  // Get the positions as row/col coordinates
  const positions = selectedTiles.map((tile) => {
    const index = parseInt(tile.position.replace('cell-', ''), 10);
    const row = Math.floor(index / GRID_SIZE);
    const col = index % GRID_SIZE;
    return { id: tile.id, row, col };
  });

  // Find the bounding box
  let minRow = Infinity,
    maxRow = -Infinity;
  let minCol = Infinity,
    maxCol = -Infinity;

  positions.forEach(({ row, col }) => {
    minRow = Math.min(minRow, row);
    maxRow = Math.max(maxRow, row);
    minCol = Math.min(minCol, col);
    maxCol = Math.max(maxCol, col);
  });

  // Calculate center of the bounding box
  const centerRow = (minRow + maxRow) / 2;
  const centerCol = (minCol + maxCol) / 2;

  // Transpose around the center
  const newPositions = new Map<string, string>();

  positions.forEach(({ id, row, col }) => {
    // Calculate relative position from center
    const relRow = row - centerRow;
    const relCol = col - centerCol;

    // Transpose: swap row and column offsets
    const newRelRow = relCol;
    const newRelCol = relRow;

    // Calculate new absolute position
    const newRow = Math.round(centerRow + newRelRow);
    const newCol = Math.round(centerCol + newRelCol);

    // Check if new position is within bounds
    if (newRow < 0 || newCol < 0 || newRow >= GRID_SIZE || newCol >= GRID_SIZE) {
      return null; // Can't transpose - would go out of bounds
    }

    const newCellId = `cell-${newRow * GRID_SIZE + newCol}`;
    newPositions.set(id, newCellId);
  });

  // Return null if any position would be out of bounds
  if (newPositions.size !== selectedTiles.length) {
    return null;
  }

  return newPositions;
}
