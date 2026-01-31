'use client';

import { useEffect, useState, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { formatTime, cn } from '@/lib/utils';
import { soundManager } from '@/lib/sounds';

export function TurnTimer() {
  const gameState = useGameStore((s) => s.gameState);
  const [remaining, setRemaining] = useState(0);
  const lastTickRef = useRef<number>(0);
  
  useEffect(() => {
    if (!gameState?.turnState) return;
    
    const updateTimer = () => {
      const { turnStartTime, turnDuration } = gameState.turnState!;
      const elapsed = Date.now() - turnStartTime;
      const remaining = Math.max(0, turnDuration - elapsed);
      setRemaining(remaining);
      
      // Play tick sound every second when under 10 seconds
      if (remaining <= 10000 && remaining > 0) {
        const currentSecond = Math.ceil(remaining / 1000);
        if (currentSecond !== lastTickRef.current) {
          lastTickRef.current = currentSecond;
          soundManager.play('tick');
        }
      }
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
  const isTension = remaining <= 10000 && remaining > 0;
  
  return (
    <div className={cn('flex items-center gap-3', isTension && 'timer-tension')}>
      {/* Time display */}
      <span
        className={cn('font-mono text-2xl font-bold transition-all', {
          'text-green-400': urgency === 'normal',
          'text-yellow-400': urgency === 'warning',
          'text-red-400': urgency === 'danger',
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
            'timer-bar-danger': urgency === 'danger',
          })}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {/* Tension indicator */}
      {isTension && (
        <span className="text-red-400 text-sm font-bold animate-pulse">
          ⚠️ HURRY!
        </span>
      )}
    </div>
  );
}
