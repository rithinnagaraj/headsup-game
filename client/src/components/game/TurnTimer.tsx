'use client';

import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { formatTime, cn } from '@/lib/utils';

export function TurnTimer() {
  const gameState = useGameStore((s) => s.gameState);
  const [remaining, setRemaining] = useState(0);
  
  useEffect(() => {
    if (!gameState?.turnState) return;
    
    const updateTimer = () => {
      const { turnStartTime, turnDuration } = gameState.turnState!;
      const elapsed = Date.now() - turnStartTime;
      const remaining = Math.max(0, turnDuration - elapsed);
      setRemaining(remaining);
    };
    
    // Update immediately
    updateTimer();
    
    // Update every 100ms for smooth countdown
    const interval = setInterval(updateTimer, 100);
    
    return () => clearInterval(interval);
  }, [gameState?.turnState?.turnStartTime, gameState?.turnState?.turnDuration]);
  
  if (!gameState?.turnState) return null;
  
  const totalDuration = gameState.turnState.turnDuration;
  const percentage = (remaining / totalDuration) * 100;
  
  // Determine urgency level
  const urgency =
    remaining > 20000 ? 'normal' : remaining > 10000 ? 'warning' : 'danger';
  
  return (
    <div className="flex items-center gap-3">
      {/* Time display */}
      <span
        className={cn('font-mono text-2xl font-bold', {
          'text-green-400': urgency === 'normal',
          'text-yellow-400': urgency === 'warning',
          'text-red-400 animate-pulse': urgency === 'danger',
        })}
      >
        {formatTime(remaining)}
      </span>
      
      {/* Progress bar */}
      <div className="w-32 h-2 bg-game-border rounded-full overflow-hidden">
        <div
          className={cn('h-full transition-all duration-100', {
            'bg-green-500': urgency === 'normal',
            'bg-yellow-500': urgency === 'warning',
            'bg-red-500': urgency === 'danger',
          })}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
