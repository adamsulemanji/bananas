import { BoardTile } from './gameUtils';
import { GRID_SIZE } from './gridUtils';

export interface ExtractedWord {
  word: string;
  tiles: Array<{ tileId: string; position: string; letter: string }>;
  direction: 'horizontal' | 'vertical';
  startPosition: string;
}

// Convert cell ID to row/col coordinates
function getCellCoordinates(cellId: string): [number, number] {
  const match = cellId.match(/cell-(\d+)/);
  if (!match) return [-1, -1];
  
  const index = parseInt(match[1]);
  const row = Math.floor(index / GRID_SIZE);
  const col = index % GRID_SIZE;
  
  return [row, col];
}

// Convert row/col to cell ID
function getCellId(row: number, col: number): string {
  return `cell-${row * GRID_SIZE + col}`;
}

// Build a 2D grid representation for easier traversal
function buildGrid(tiles: BoardTile[]): Map<string, string> {
  const grid = new Map<string, string>();
  
  tiles.forEach(tile => {
    grid.set(tile.position, tile.content);
  });
  
  return grid;
}

// Extract all words from the board
export function extractWordsFromBoard(tiles: BoardTile[]): ExtractedWord[] {
  if (tiles.length === 0) return [];
  
  const grid = buildGrid(tiles);
  const words: ExtractedWord[] = [];
  
  // Track which tiles have been included in words to avoid duplicates
  const processedHorizontal = new Set<string>();
  const processedVertical = new Set<string>();
  
  // Extract horizontal words
  for (let row = 0; row < GRID_SIZE; row++) {
    let currentWord = '';
    let wordTiles: Array<{ tileId: string; position: string; letter: string }> = [];
    let startCol = -1;
    
    for (let col = 0; col < GRID_SIZE; col++) {
      const cellId = getCellId(row, col);
      const letter = grid.get(cellId);
      
      if (letter) {
        if (currentWord === '') {
          startCol = col;
        }
        currentWord += letter;
        const tile = tiles.find(t => t.position === cellId);
        if (tile) {
          wordTiles.push({ tileId: tile.id, position: cellId, letter });
          processedHorizontal.add(cellId);
        }
      } else {
        // End of word
        if (currentWord.length > 1) {
          words.push({
            word: currentWord,
            tiles: wordTiles,
            direction: 'horizontal',
            startPosition: getCellId(row, startCol)
          });
        }
        currentWord = '';
        wordTiles = [];
        startCol = -1;
      }
    }
    
    // Check word at end of row
    if (currentWord.length > 1) {
      words.push({
        word: currentWord,
        tiles: wordTiles,
        direction: 'horizontal',
        startPosition: getCellId(row, startCol)
      });
    }
  }
  
  // Extract vertical words
  for (let col = 0; col < GRID_SIZE; col++) {
    let currentWord = '';
    let wordTiles: Array<{ tileId: string; position: string; letter: string }> = [];
    let startRow = -1;
    
    for (let row = 0; row < GRID_SIZE; row++) {
      const cellId = getCellId(row, col);
      const letter = grid.get(cellId);
      
      if (letter) {
        if (currentWord === '') {
          startRow = row;
        }
        currentWord += letter;
        const tile = tiles.find(t => t.position === cellId);
        if (tile) {
          wordTiles.push({ tileId: tile.id, position: cellId, letter });
          processedVertical.add(cellId);
        }
      } else {
        // End of word
        if (currentWord.length > 1) {
          words.push({
            word: currentWord,
            tiles: wordTiles,
            direction: 'vertical',
            startPosition: getCellId(startRow, col)
          });
        }
        currentWord = '';
        wordTiles = [];
        startRow = -1;
      }
    }
    
    // Check word at end of column
    if (currentWord.length > 1) {
      words.push({
        word: currentWord,
        tiles: wordTiles,
        direction: 'vertical',
        startPosition: getCellId(startRow, col)
      });
    }
  }
  
  return words;
}

// Check if all tiles form valid connected words
export function areAllTilesConnected(tiles: BoardTile[]): boolean {
  if (tiles.length === 0) return true;
  if (tiles.length === 1) return true;
  
  const grid = buildGrid(tiles);
  const visited = new Set<string>();
  const firstTile = tiles[0];
  
  // DFS to check connectivity
  function dfs(position: string) {
    if (visited.has(position)) return;
    visited.add(position);
    
    const [row, col] = getCellCoordinates(position);
    
    // Check all 4 directions
    const directions = [
      [-1, 0], [1, 0], [0, -1], [0, 1]
    ];
    
    for (const [dr, dc] of directions) {
      const newRow = row + dr;
      const newCol = col + dc;
      
      if (newRow >= 0 && newRow < GRID_SIZE && newCol >= 0 && newCol < GRID_SIZE) {
        const newPosition = getCellId(newRow, newCol);
        if (grid.has(newPosition) && !visited.has(newPosition)) {
          dfs(newPosition);
        }
      }
    }
  }
  
  dfs(firstTile.position);
  
  // All tiles should be visited if connected
  return visited.size === tiles.length;
}

// Get isolated tiles (tiles that aren't part of any word)
export function getIsolatedTiles(tiles: BoardTile[]): BoardTile[] {
  const words = extractWordsFromBoard(tiles);
  const tilesInWords = new Set<string>();
  
  words.forEach(word => {
    word.tiles.forEach(tile => {
      tilesInWords.add(tile.tileId);
    });
  });
  
  return tiles.filter(tile => !tilesInWords.has(tile.id));
} 