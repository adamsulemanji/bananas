'use client';

import { SocketProvider } from '@/contexts/SocketContext';
import { useWordValidation } from '@/hooks/useWordValidation';

function DictionaryPreloader() {
  // Initialize dictionary on app start
  useWordValidation();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SocketProvider>
      <DictionaryPreloader />
      {children}
    </SocketProvider>
  );
}
