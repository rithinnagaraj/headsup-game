'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { PlayerGrid } from '@/components/game/PlayerGrid';
import { forfeit, passTurn, claimCorrectGuess } from '@/lib/socket';
import { triggerCardConfetti } from '@/components/effects';
import { soundManager } from '@/lib/sounds';

export function IRLPlayingPhase() {
  const gameState = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.player.myPlayerId);
  const addNotification = useGameStore((s) => s.addNotification);
  
  const [isForfeiting, setIsForfeiting] = useState(false);
  const [isPassing, setIsPassing] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
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
    } catch {
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
    } catch {
      addNotification('error', 'Failed to pass turn');
    }
    setIsPassing(false);
  };
  
  const handleClaimCorrect = async () => {
    setIsClaiming(true);
    try {
      const response = await claimCorrectGuess();
      if (response.success && response.identity) {
        soundManager.play('ding');
        // Trigger confetti in center of screen
        triggerCardConfetti(window.innerWidth / 2, window.innerHeight / 2);
        addNotification('success', `🎉 You were ${response.identity.displayName}!`);
      } else {
        addNotification('error', response.error || 'Failed to claim guess');
      }
    } catch {
      addNotification('error', 'Failed to claim guess');
    }
    setIsClaiming(false);
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
        <div className="mb-4 max-w-4xl mx-auto w-full">
          <div className="bg-purple-900/50 border border-purple-500 rounded-lg p-4 text-center">
            <p className="text-gray-300">You forfeited. Your identity was:</p>
            <p className="text-2xl font-bold text-purple-400">{revealedIdentity}</p>
          </div>
        </div>
      )}
      
      {/* IRL Mode Banner */}
      <div className="mb-4 max-w-4xl mx-auto w-full">
        <div className="bg-pink-900/30 border border-pink-500/50 rounded-lg p-3 text-center">
          <p className="text-pink-300">
            🎉 <span className="font-semibold">In-Person Mode</span> — Talk and guess face-to-face!
          </p>
        </div>
      </div>
      
      {/* Header with turn info */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 max-w-4xl mx-auto">
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
          
          <div className="flex items-center gap-3 flex-wrap">
            {/* I Guessed Correctly Button - Only for active players who haven't guessed */}
            {!isSpectator && (
              <button
                onClick={handleClaimCorrect}
                disabled={isClaiming}
                className="py-2 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-lg transition-all text-sm font-medium disabled:opacity-50 transform hover:scale-105"
              >
                {isClaiming ? 'Claiming...' : '🎯 I Guessed It!'}
              </button>
            )}
            
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
          </div>
        </div>
      </div>
      
      {/* Main game layout - Just the player grid for IRL mode */}
      <div className="flex-1 max-w-4xl mx-auto w-full">
        <PlayerGrid />
      </div>
      
      {/* Instructions for IRL play */}
      <div className="mt-6 max-w-4xl mx-auto w-full">
        <div className="bg-game-card/50 border border-game-border rounded-lg p-4">
          <h3 className="font-semibold text-gray-300 mb-2">🎮 How to Play IRL</h3>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• Ask yes/no questions out loud to the group</li>
            <li>• Others answer verbally — no voting buttons needed!</li>
            <li>• When you figure out your identity, click <span className="text-green-400 font-medium">"I Guessed It!"</span></li>
            <li>• Pass your turn when you&apos;re done asking questions</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
