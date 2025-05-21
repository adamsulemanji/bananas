// Letter distribution for Bananagrams
// Following a similar distribution to the actual game
const LETTER_DISTRIBUTION = {
  A: 13, B: 3, C: 3, D: 6, E: 18, F: 3, G: 4, H: 3, I: 12,
  J: 2, K: 2, L: 5, M: 3, N: 8, O: 11, P: 3, Q: 2, R: 9,
  S: 6, T: 9, U: 6, V: 3, W: 3, X: 2, Y: 3, Z: 2
};

// Generate a set of tiles based on the letter distribution
export function generateTiles(): { id: string; letter: string }[] {
  const tiles: { id: string; letter: string }[] = [];
  let tileId = 0;

  // For each letter in our distribution, add the specified number of tiles
  Object.entries(LETTER_DISTRIBUTION).forEach(([letter, count]) => {
    for (let i = 0; i < count; i++) {
      tiles.push({
        id: `tile-${tileId++}`,
        letter
      });
    }
  });

  // Shuffle the tiles
  return shuffleArray(tiles);
}

// Shuffle an array using the Fisher-Yates algorithm
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Draw a specific number of tiles from the remaining pile
export function drawTiles(remainingTiles: { id: string; letter: string }[], count: number): { 
  drawnTiles: { id: string; letter: string }[]; 
  remainingTiles: { id: string; letter: string }[] 
} {
  if (count >= remainingTiles.length) {
    return {
      drawnTiles: [...remainingTiles],
      remainingTiles: []
    };
  }

  const drawnTiles = remainingTiles.slice(0, count);
  const newRemaining = remainingTiles.slice(count);
  
  return {
    drawnTiles,
    remainingTiles: newRemaining
  };
} 