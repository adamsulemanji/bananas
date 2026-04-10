import { useState, useEffect, useCallback } from 'react';
import { BoardTile } from '@/utils/gameUtils';
import { wordValidator } from '@/utils/wordValidator';
import { extractWordsFromBoard, areAllTilesConnected, getIsolatedTiles, ExtractedWord } from '@/utils/wordExtraction';

export interface ValidationResult {
  isValid: boolean;
  allWords: ExtractedWord[];
  validWords: ExtractedWord[];
  invalidWords: ExtractedWord[];
  isolatedTiles: BoardTile[];
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useWordValidation() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  // Initialize the word validator on mount
  useEffect(() => {
    const init = async () => {
      if (isInitializing || isInitialized) return;

      setIsInitializing(true);
      try {
        await wordValidator.initialize();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize word validator:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    init();
  }, [isInitialized, isInitializing]);

  // Validate board function
  const validateBoard = useCallback(async (tiles: BoardTile[]): Promise<ValidationResult> => {
    if (tiles.length === 0) {
      return {
        isValid: true,
        allWords: [],
        validWords: [],
        invalidWords: [],
        isolatedTiles: [],
        isConnected: true,
        isLoading: false,
        error: null,
      };
    }

    // Compute structure regardless of dictionary readiness
    const extractedWords = extractWordsFromBoard(tiles);
    const isConnected = areAllTilesConnected(tiles);
    const isolatedTiles = getIsolatedTiles(tiles);

    // If not initialized, return early with partial validation
    if (!isInitialized) {
      return {
        isValid: false,
        allWords: extractedWords,
        validWords: [],
        invalidWords: [],
        isolatedTiles,
        isConnected,
        isLoading: true,
        error: 'Dictionary is still loading...',
      };
    }

    let validWords: ExtractedWord[] = [];
    let invalidWords: ExtractedWord[] = [];

    try {
      extractedWords.forEach((wordData) => {
        if (wordValidator.isValidWord(wordData.word)) {
          validWords.push(wordData);
        } else {
          invalidWords.push(wordData);
        }
      });

      // Board can only be fully valid if dictionary initialized and all checks pass
      const isValid =
        isConnected &&
        isolatedTiles.length === 0 &&
        invalidWords.length === 0 &&
        extractedWords.length > 0;

      return {
        isValid,
        allWords: extractedWords, validWords, invalidWords, isolatedTiles, isConnected, isLoading: false, error: null
      };
    } catch (error) {
      return {
        isValid: false,
        allWords: [],
        validWords: [],
        invalidWords: [],
        isolatedTiles: [],
        isConnected: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      };
    }

  }, [isInitialized]);

  // Quick validation for a single word
  const validateWord = useCallback((word: string): boolean => {
    if (!isInitialized) return false;
    return wordValidator.isValidWord(word);
  }, [isInitialized]);

  // Get word suggestions
  const getWordSuggestions = useCallback((prefix: string, limit: number = 10): string[] => {
    if (!isInitialized) return [];
    return wordValidator.getWordsStartingWith(prefix, limit);
  }, [isInitialized]);

  return {
    validateBoard,
    validateWord,
    getWordSuggestions,
    isInitialized,
    isInitializing,
  };
}