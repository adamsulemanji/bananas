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

  useEffect(() => {
    const id = setTimeout(async () => {
      if (!isInitialized) return;
      setIsValidating(true);
      const result = await validateBoard(tiles);
      setValidation(result);
      setIsValidating(false);
      onValidationChange?.(result.isValid);
    }, 300);
    return () => clearTimeout(id);
  }, [tiles, isInitialized, validateBoard, onValidationChange]);

  const chipStyle = (valid: boolean): React.CSSProperties => ({
    fontFamily: 'var(--font-jetbrains)',
    fontSize: '0.7rem',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '4px',
    background: valid ? 'var(--green-bg)' : 'var(--red-bg)',
    border: `1px solid ${valid ? 'rgba(56,201,138,0.3)' : 'rgba(240,84,84,0.3)'}`,
    color: valid ? 'var(--green)' : 'var(--red)',
  });

  if (isInitializing) {
    return (
      <div className="px-3 py-2 rounded-lg text-xs font-medium" style={{ background: 'var(--surface)', color: 'var(--text3)', border: '1.5px solid var(--border)' }}>
        Loading dictionary…
      </div>
    );
  }

  if (!validation || isValidating) {
    return (
      <div className="px-3 py-2 rounded-lg text-xs font-medium" style={{ background: 'var(--surface)', color: 'var(--text3)', border: '1.5px solid var(--border)' }}>
        Checking…
      </div>
    );
  }

  const isValid = validation.isValid;

  return (
    <div
      className="p-3 rounded-lg space-y-2"
      style={{
        background: 'var(--surface)',
        border: `1.5px solid ${isValid ? 'rgba(56,201,138,0.35)' : validation.invalidWords.length > 0 ? 'rgba(240,84,84,0.35)' : 'var(--border)'}`,
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: isValid ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--font-outfit)' }}
        >
          {isValid ? 'Board Valid' : 'Board Invalid'}
        </span>
        {isValid && tiles.length === 0 && (
          <span className="text-xs" style={{ color: 'var(--text3)' }}>Place tiles to begin</span>
        )}
      </div>

      {showDetails && tiles.length > 0 && (
        <div className="space-y-2">
          {!validation.isConnected && (
            <p className="text-xs" style={{ color: 'var(--red)' }}>Tiles must be connected</p>
          )}
          {validation.isolatedTiles.length > 0 && (
            <p className="text-xs" style={{ color: '#f5c842' }}>
              {validation.isolatedTiles.length} isolated tile{validation.isolatedTiles.length > 1 ? 's' : ''}
            </p>
          )}
          {validation.validWords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {validation.validWords.map((w, i) => (
                <span key={i} style={chipStyle(true)}>{w.word}</span>
              ))}
            </div>
          )}
          {validation.invalidWords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {validation.invalidWords.map((w, i) => (
                <span key={i} style={chipStyle(false)}>{w.word}</span>
              ))}
            </div>
          )}
          {tiles.length > 0 && validation.allWords.length === 0 && (
            <p className="text-xs" style={{ color: 'var(--text3)' }}>No words yet</p>
          )}
        </div>
      )}
    </div>
  );
}
