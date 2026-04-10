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
    const timeoutId = setTimeout(async () => {
      if (!isInitialized) return;
      setIsValidating(true);
      const result = await validateBoard(tiles);
      setValidation(result);
      setIsValidating(false);
      if (onValidationChange) onValidationChange(result.isValid);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [tiles, isInitialized, validateBoard, onValidationChange]);

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-crimson-body)',
    fontSize: '0.7rem',
    letterSpacing: '0.3em',
    textTransform: 'uppercase' as const,
    color: 'var(--aged)',
  };

  if (isInitializing) {
    return (
      <div className="p-3" style={{ border: '1px solid var(--case)', background: 'var(--press)' }}>
        <p style={{ ...labelStyle }}>Loading dictionary...</p>
      </div>
    );
  }

  if (!validation || isValidating) {
    return (
      <div className="p-3" style={{ border: '1px solid var(--case)', background: 'var(--press)' }}>
        <p style={{ ...labelStyle }}>Checking board...</p>
      </div>
    );
  }

  const isValid = validation.isValid;
  const hasInvalid = validation.invalidWords.length > 0;
  const hasIssue = !validation.isConnected || validation.isolatedTiles.length > 0;

  const accentColor = isValid ? 'var(--verdig)' : hasInvalid ? 'var(--vermil)' : hasIssue ? '#a07820' : 'var(--muted)';

  return (
    <div
      className="p-3 space-y-2"
      style={{
        border: `1px solid ${isValid ? 'rgba(58,106,72,0.5)' : hasInvalid ? 'rgba(184,64,32,0.5)' : 'var(--case)'}`,
        background: 'var(--press)',
      }}
    >
      <div className="flex items-center justify-between">
        <h3
          className="text-xs tracking-widest uppercase"
          style={{ fontFamily: 'var(--font-cinzel-display)', color: accentColor, fontSize: '0.65rem' }}
        >
          {isValid ? 'Board Valid ✓' : 'Board Invalid ✗'}
        </h3>
        {isValid && tiles.length === 0 && (
          <span style={{ fontFamily: 'var(--font-crimson-body)', color: 'var(--muted)', fontSize: '0.75rem', fontStyle: 'italic' }}>
            Place tiles to begin
          </span>
        )}
      </div>

      {showDetails && tiles.length > 0 && (
        <div className="space-y-1.5">
          {!validation.isConnected && (
            <p style={{ fontFamily: 'var(--font-crimson-body)', color: 'var(--vermil)', fontSize: '0.8rem', fontStyle: 'italic' }}>
              All tiles must be connected
            </p>
          )}
          {validation.isolatedTiles.length > 0 && (
            <p style={{ fontFamily: 'var(--font-crimson-body)', color: '#a07820', fontSize: '0.8rem', fontStyle: 'italic' }}>
              {validation.isolatedTiles.length} isolated tile{validation.isolatedTiles.length > 1 ? 's' : ''} not forming words
            </p>
          )}
          {validation.validWords.length > 0 && (
            <div>
              <p style={{ fontFamily: 'var(--font-crimson-body)', color: 'var(--verdig)', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                Valid ({validation.validWords.length}):
              </p>
              <div className="flex flex-wrap gap-1 mt-1">
                {validation.validWords.map((word, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 text-xs"
                    style={{
                      fontFamily: 'var(--font-courier-prime)',
                      background: 'rgba(58,106,72,0.15)',
                      border: '1px solid rgba(58,106,72,0.35)',
                      color: 'var(--verdig)',
                      borderRadius: '1px',
                    }}
                  >
                    {word.word}
                  </span>
                ))}
              </div>
            </div>
          )}
          {validation.invalidWords.length > 0 && (
            <div>
              <p style={{ fontFamily: 'var(--font-crimson-body)', color: 'var(--vermil)', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                Invalid ({validation.invalidWords.length}):
              </p>
              <div className="flex flex-wrap gap-1 mt-1">
                {validation.invalidWords.map((word, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 text-xs"
                    style={{
                      fontFamily: 'var(--font-courier-prime)',
                      background: 'rgba(184,64,32,0.15)',
                      border: '1px solid rgba(184,64,32,0.35)',
                      color: 'var(--vermil)',
                      borderRadius: '1px',
                    }}
                  >
                    {word.word}
                  </span>
                ))}
              </div>
            </div>
          )}
          {tiles.length > 0 && validation.allWords.length === 0 && (
            <p style={{ fontFamily: 'var(--font-crimson-body)', color: '#a07820', fontSize: '0.8rem', fontStyle: 'italic' }}>
              No words formed yet
            </p>
          )}
        </div>
      )}
    </div>
  );
}
