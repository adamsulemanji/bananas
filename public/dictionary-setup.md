# Dictionary Setup for Word Validation

To enable word validation in the Bananagrams game, you need to add a dictionary file.

## Quick Setup

1. Download a dictionary file. We recommend one of these options:

   **Option A: Enable1 Word List (Recommended)**
   - Download from: https://github.com/dolph/dictionary/blob/master/enable1.txt
   - Contains ~172,000 words
   - Commonly used for word games
   
   **Option B: SCOWL Word Lists**
   - Visit: http://wordlist.aspell.net/
   - Choose size 70 for a good balance (~150,000 words)
   
   **Option C: Collins Scrabble Words**
   - Available from various sources
   - Official Scrabble tournament word list

2. Save the file as `dictionary.txt` in the `/public` folder

3. Make sure the file format is:
   - One word per line
   - No extra formatting
   - UTF-8 encoding

## File Structure
```
bananas/
├── public/
│   ├── dictionary.txt    <-- Place your dictionary file here
│   └── ... other files
└── src/
    └── utils/
        └── wordValidator.ts
```

## Testing

The word validator includes a fallback dictionary with common words for testing. If the main dictionary fails to load, you'll see a console warning and the game will use the fallback list.

## Performance

- The dictionary is loaded once when the app starts
- Words are stored in a JavaScript Set for O(1) lookup time
- Validation is instant after initial load
- The dictionary uses about 10-20MB of memory

## Customization

You can modify the minimum word length in `wordValidator.ts`:
```typescript
// Currently set to 2 letters minimum
if (normalized.length < 2) {
  return false;
}
``` 