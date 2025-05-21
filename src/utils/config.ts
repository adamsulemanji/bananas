// Game configuration settings
export const GRID_SIZE = 25;
export const INITIAL_HAND_SIZE = 21; 
export const REFILL_AMOUNT = 3;

export const GAME_STYLES = {
  // Grid styles
  grid: "grid-cols-[repeat(25,_minmax(0,_1fr))] gap-0 w-full max-w-5xl border border-amber-800 bg-amber-100 p-px",
  
  // General UI
  mainContainer: "min-h-screen p-4 flex flex-col items-center bg-amber-50",
  title: "text-2xl font-bold mb-4 text-black",
  
  // TilePalette
  tilePalette: {
    container: "flex flex-col gap-2 p-3 border border-amber-800 rounded-md mb-4 bg-amber-50",
    title: "font-semibold text-black text-sm",
    tilesContainer: "flex flex-wrap gap-1", 
    tileWrapper: "w-8 h-8",
    infoContainer: "flex justify-between items-center mt-1",
    remainingText: "text-xs text-gray-500",
    handCountText: "text-xs text-gray-700 text-right mt-1"
  },
  
  // TrashArea
  trashArea: {
    container: "mt-4 p-3 border-2 rounded-md w-full max-w-md flex items-center justify-center",
    activeContainer: "border-amber-600 bg-amber-100",
    inactiveContainer: "border-amber-400",
    activeIcon: "text-amber-700",
    inactiveIcon: "text-amber-500",
    activeText: "text-amber-700 font-semibold",
    inactiveText: "text-amber-600",
    text: "text-sm"
  },

  // GridCell component styles
  gridCell: {
    base: "w-full h-full aspect-square border border-amber-800/30 p-0.5",
    highlighted: "bg-amber-200",
  },

  // GridTile component styles
  gridTile: {
    base: "w-full h-full bg-yellow-100 border border-yellow-700 text-black rounded-sm shadow-sm flex items-center justify-center cursor-grab active:cursor-grabbing font-semibold text-sm",
    dragging: "opacity-80 shadow-lg",
    contentContainer: "relative w-full h-full flex items-center justify-center",
    letterText: "text-center",
  }
}; 