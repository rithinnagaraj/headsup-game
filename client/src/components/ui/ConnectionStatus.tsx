'use client';

import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';

export function ConnectionStatus() {
  const { isConnected, isConnecting } = useGameStore((s) => s.connection);
  
  return (
    <div className="fixed top-4 left-4 z-50">
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium',
          {
            'bg-green-500/20 text-green-400': isConnected,
            'bg-yellow-500/20 text-yellow-400': isConnecting,
            'bg-red-500/20 text-red-400': !isConnected && !isConnecting,
          }
        )}
      >
        <span
          className={cn('w-2 h-2 rounded-full', {
            'bg-green-400': isConnected,
            'bg-yellow-400 animate-pulse': isConnecting,
            'bg-red-400': !isConnected && !isConnecting,
          })}
        />
        {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}
      </div>
    </div>
  );
}
