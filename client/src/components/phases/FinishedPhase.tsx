'use client';

import { useRouter } from 'next/navigation';
import { useGameStore } from '@/store/gameStore';
import { getInitials } from '@/lib/utils';

export function FinishedPhase() {
  const router = useRouter();
  const gameState = useGameStore((s) => s.gameState);
  const clearPlayerState = useGameStore((s) => s.clearPlayerState);
  
  if (!gameState) return null;
  
  // Sort players by performance (forfeited players at bottom)
  const rankings = Object.values(gameState.players)
    .map((player) => ({
      ...player,
      forfeited: (player.forfeitOrder ?? 0) > 0,
    }))
    .sort((a, b) => {
      // Forfeited players always at bottom
      if (a.forfeited !== b.forfeited) {
        return a.forfeited ? 1 : -1;
      }
      // Among forfeited players, earlier forfeit = lower rank
      if (a.forfeited && b.forfeited) {
        return (a.forfeitOrder ?? 0) - (b.forfeitOrder ?? 0);
      }
      // Players who guessed correctly rank higher
      if (a.hasGuessedCorrectly !== b.hasGuessedCorrectly) {
        return a.hasGuessedCorrectly ? -1 : 1;
      }
      // Among those who guessed, fewer turns = better
      return a.turnsToGuess - b.turnsToGuess;
    });
  
  const handlePlayAgain = () => {
    clearPlayerState();
    router.push('/');
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">🎉 Game Over!</h1>
          <p className="text-gray-400">Here are the final results</p>
        </div>
        
        {/* Scoreboard */}
        <div className="bg-game-card rounded-2xl shadow-2xl border border-game-border p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-center">🏆 Leaderboard</h2>
          
          <div className="space-y-3">
            {rankings.map((player, index) => (
              <div
                key={player.id}
                className={`flex items-center gap-4 p-4 rounded-xl ${
                  index === 0
                    ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30'
                    : index === 1
                    ? 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border border-gray-400/30'
                    : index === 2
                    ? 'bg-gradient-to-r from-amber-700/20 to-orange-700/20 border border-amber-700/30'
                    : 'bg-game-bg'
                }`}
              >
                {/* Rank */}
                <div className="w-8 h-8 flex items-center justify-center font-bold text-lg">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </div>
                
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold">
                  {getInitials(player.name)}
                </div>
                
                {/* Info */}
                <div className="flex-1">
                  <p className="font-semibold">{player.name}</p>
                  <p className="text-sm text-gray-400">
                    {player.assignedIdentity?.displayName || 'Unknown'}
                  </p>
                </div>
                
                {/* Score */}
                <div className="text-right">
                  {player.forfeited ? (
                    <>
                      <p className="text-orange-400 font-bold">Forfeit</p>
                      <p className="text-xs text-gray-400">Gave up</p>
                    </>
                  ) : player.hasGuessedCorrectly ? (
                    <>
                      <p className="text-green-400 font-bold">
                        {player.turnsToGuess} turns
                      </p>
                      <p className="text-xs text-gray-400">Guessed!</p>
                    </>
                  ) : (
                    <>
                      <p className="text-red-400 font-bold">DNF</p>
                      <p className="text-xs text-gray-400">Did not guess</p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Play Again Button */}
        <button
          onClick={handlePlayAgain}
          className="w-full py-4 rounded-xl font-semibold text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-[1.02]"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}
