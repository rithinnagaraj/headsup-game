'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { PlayerGrid } from '@/components/game/PlayerGrid';
import { QuestionPanel } from '@/components/game/QuestionPanel';
import { ChatHistory } from '@/components/game/ChatHistory';
import { TurnTimer } from '@/components/game/TurnTimer';
import { forfeit, passTurn } from '@/lib/socket';

export function PlayingPhase() {
  const gameState = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.player.myPlayerId);
  const addNotification = useGameStore((s) => s.addNotification);
  
  const [isForfeiting, setIsForfeiting] = useState(false);
  const [isPassing, setIsPassing] = useState(false);
  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false);
  const [revealedIdentity, setRevealedIdentity] = useState<string | null>(null);
  
  if (!gameState) return null;
  
  const activeGuesser = gameState.turnState?.activeGuesserId;
  const activePlayer = activeGuesser ? gameState.players[activeGuesser] : null;
  const isMyTurn = activeGuesser === myPlayerId;
  
  // Check if I've already guessed correctly or forfeited
  const myPlayer = myPlayerId ? gameState.players[myPlayerId] : null;
  const hasGuessedCorrectly = myPlayer?.hasGuessedCorrectly || false;
  const hasForfeited = (myPlayer?.forfeitOrder ?? 0) > 0;
  const isSpectator = hasGuessedCorrectly || hasForfeited;
  
  const handleForfeit = async () => {
    setIsForfeiting(true);
    try {
      const response = await forfeit();
      if (response.success && response.identity) {
        setRevealedIdentity(response.identity.displayName);
        setShowForfeitConfirm(false);
      } else {
        addNotification('error', response.error || 'Failed to forfeit');
      }
    } catch (error) {
      addNotification('error', 'Failed to forfeit');
    }
    setIsForfeiting(false);
  };
  
  const handlePass = async () => {
    setIsPassing(true);
    try {
      const response = await passTurn();
      if (!response.success) {
        addNotification('error', response.error || 'Failed to pass turn');
      }
    } catch (error) {
      addNotification('error', 'Failed to pass turn');
    }
    setIsPassing(false);
  };
  
  return (
    <div className="min-h-screen p-4 flex flex-col">
      {/* Forfeit Confirmation Modal */}
      {showForfeitConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">⚠️ Forfeit Game?</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to forfeit? You will see your identity but be placed at the bottom of the rankings.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowForfeitConfirm(false)}
                className="flex-1 py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleForfeit}
                disabled={isForfeiting}
                className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isForfeiting ? 'Forfeiting...' : 'Yes, Forfeit'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Revealed Identity Banner (for forfeited players) */}
      {revealedIdentity && (
        <div className="mb-4 max-w-6xl mx-auto w-full">
          <div className="bg-purple-900/50 border border-purple-500 rounded-lg p-4 text-center">
            <p className="text-gray-300">You forfeited. Your identity was:</p>
            <p className="text-2xl font-bold text-purple-400">{revealedIdentity}</p>
          </div>
        </div>
      )}
      
      {/* Header with turn info and timer */}
      <div className="mb-6">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">
              {isSpectator ? (
                <span className="text-gray-400">
                  {hasForfeited ? '👀 Spectating (Forfeited)' : '🎉 You guessed correctly!'}
                </span>
              ) : isMyTurn ? (
                <span className="text-purple-400">Your Turn!</span>
              ) : (
                <span>
                  <span className="text-gray-400">Current Turn: </span>
                  <span className="text-white">{activePlayer?.name}</span>
                </span>
              )}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Pass Button - Only show on your turn */}
            {isMyTurn && !isSpectator && (
              <button
                onClick={handlePass}
                disabled={isPassing}
                className="py-2 px-4 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
              >
                {isPassing ? 'Passing...' : '⏭️ Pass Turn'}
              </button>
            )}
            
            {/* Forfeit Button - Show for active players */}
            {!isSpectator && (
              <button
                onClick={() => setShowForfeitConfirm(true)}
                className="py-2 px-4 bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors text-sm font-medium"
              >
                🏳️ Forfeit
              </button>
            )}
            
            <TurnTimer />
          </div>
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
