'use client';

import { useEffect, useState } from 'react';
import { BoardTile } from '@/utils/gameUtils';
import { useWordValidation, ValidationResult } from '@/hooks/useWordValidation';

interface BoardValidationProps {
  tiles: BoardTile[];
  onValidationChange?: (isValid: boolean) => void;
  showDetails?: boolean;
}

export default function BoardValidation({ tiles, onValidationChange, showDetails = true }: BoardValidationProps) {
  const { validateBoard, isInitialized, isInitializing } = useWordValidation();
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Debounced validation
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (!isInitialized) return;
      
      setIsValidating(true);
      const result = await validateBoard(tiles);
      setValidation(result);
      setIsValidating(false);
      
      if (onValidationChange) {
        onValidationChange(result.isValid);
      }
    }, 300); // 300ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [tiles, isInitialized, validateBoard, onValidationChange]);

  if (isInitializing) {
    return (
      <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-md">
        <p className="text-sm text-yellow-800">Loading dictionary...</p>
      </div>
    );
  }

  if (!validation || isValidating) {
    return (
      <div className="p-3 bg-gray-50 border border-gray-300 rounded-md">
        <p className="text-sm text-gray-600">Checking board...</p>
      </div>
    );
  }

  const getStatusClasses = () => {
    if (validation.isValid) {
      return {
        bg: 'bg-green-50',
        border: 'border-green-300',
        text: 'text-green-800'
      };
    }
    if (validation.invalidWords.length > 0) {
      return {
        bg: 'bg-red-50',
        border: 'border-red-300',
        text: 'text-red-800'
      };
    }
    if (!validation.isConnected || validation.isolatedTiles.length > 0) {
      return {
        bg: 'bg-yellow-50',
        border: 'border-yellow-300',
        text: 'text-yellow-800'
      };
    }
    return {
      bg: 'bg-gray-50',
      border: 'border-gray-300',
      text: 'text-gray-800'
    };
  };

  const statusClasses = getStatusClasses();

  return (
    <div className={`p-3 ${statusClasses.bg} border ${statusClasses.border} rounded-md space-y-2`}>
      {/* Main Status */}
      <div className="flex items-center justify-between">
        <h3 className={`font-semibold ${statusClasses.text}`}>
          Board Status: {validation.isValid ? 'Valid ✓' : 'Invalid ✗'}
        </h3>
        {validation.isValid && tiles.length === 0 && (
          <span className="text-sm text-gray-600">Place tiles to begin</span>
        )}
      </div>

      {/* Detailed feedback */}
      {showDetails && tiles.length > 0 && (
        <div className="space-y-1 text-sm">
          {/* Connection status */}
          {!validation.isConnected && (
            <p className="text-red-600">❌ All tiles must be connected</p>
          )}
          
          {/* Isolated tiles */}
          {validation.isolatedTiles.length > 0 && (
            <p className="text-yellow-600">
              ⚠️ {validation.isolatedTiles.length} isolated tile{validation.isolatedTiles.length > 1 ? 's' : ''} not forming words
            </p>
          )}
          
          {/* Valid words */}
          {validation.validWords.length > 0 && (
            <div>
              <p className="text-green-600">
                ✓ Valid words ({validation.validWords.length}):
              </p>
              <div className="flex flex-wrap gap-1 mt-1">
                {validation.validWords.map((word, idx) => (
                  <span key={idx} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                    {word.word}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Invalid words */}
          {validation.invalidWords.length > 0 && (
            <div>
              <p className="text-red-600">
                ✗ Invalid words ({validation.invalidWords.length}):
              </p>
              <div className="flex flex-wrap gap-1 mt-1">
                {validation.invalidWords.map((word, idx) => (
                  <span key={idx} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                    {word.word}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* No words formed */}
          {tiles.length > 0 && validation.allWords.length === 0 && (
            <p className="text-yellow-600">⚠️ No valid words formed yet</p>
          )}
        </div>
      )}
    </div>
  );
} 