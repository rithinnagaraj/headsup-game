'use client';

import { useGameStore } from '@/store/gameStore';
import { PlayerGrid } from '@/components/game/PlayerGrid';
import { QuestionPanel } from '@/components/game/QuestionPanel';
import { ChatHistory } from '@/components/game/ChatHistory';
import { TurnTimer } from '@/components/game/TurnTimer';

export function PlayingPhase() {
  const gameState = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.player.myPlayerId);
  
  if (!gameState) return null;
  
  const activeGuesser = gameState.turnState?.activeGuesserId;
  const activePlayer = activeGuesser ? gameState.players[activeGuesser] : null;
  const isMyTurn = activeGuesser === myPlayerId;
  
  return (
    <div className="min-h-screen p-4 flex flex-col">
      {/* Header with turn info and timer */}
      <div className="mb-6">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">
              {isMyTurn ? (
                <span className="text-purple-400">Your Turn!</span>
              ) : (
                <span>
                  <span className="text-gray-400">Current Turn: </span>
                  <span className="text-white">{activePlayer?.name}</span>
                </span>
              )}
            </h1>
          </div>
          
          <TurnTimer />
        </div>
      </div>
      
      {/* Main game layout */}
      <div className="flex-1 max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Player Grid */}
        <div className="lg:col-span-2">
          <PlayerGrid />
        </div>
        
        {/* Right: Question Panel & Chat History */}
        <div className="space-y-4">
          <QuestionPanel />
          <ChatHistory />
        </div>
      </div>
    </div>
  );
}
