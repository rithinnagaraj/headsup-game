'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { submitAssignment, startGame } from '@/lib/socket';
import { getInitials } from '@/lib/utils';
import { GiphySearch } from '@/components/ui/GiphySearch';

export function AssignmentPhase() {
  const gameState = useGameStore((s) => s.gameState);
  const myPlayer = useGameStore((s) => s.getMyPlayer());
  const myTarget = useGameStore((s) => s.getMyTarget());
  const isHost = useGameStore((s) => s.isHost());
  
  const [displayName, setDisplayName] = useState('');
  const [aliasesInput, setAliasesInput] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  if (!gameState || !myPlayer || !myTarget) return null;
  
  const hasSubmitted = myPlayer.hasSubmittedAssignment;
  const allSubmitted = Object.values(gameState.players).every(
    (p) => p.hasSubmittedAssignment
  );
  const submittedCount = Object.values(gameState.players).filter(
    (p) => p.hasSubmittedAssignment
  ).length;
  
  const handleSubmit = async () => {
    if (!displayName.trim()) {
      setError('Please enter a display name');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    const aliases = aliasesInput
      .split(',')
      .map((a) => a.trim())
      .filter((a) => a.length > 0);
    
    try {
      const response = await submitAssignment({
        displayName: displayName.trim(),
        allowedAliases: aliases,
        imageUrl: imageUrl.trim() || undefined,
      });
      
      if (!response.success) {
        setError(response.error || 'Failed to submit assignment');
      }
    } catch (err) {
      setError('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleStartGame = () => {
    startGame();
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg bg-game-card rounded-2xl shadow-2xl border border-game-border p-8">
        <h2 className="text-2xl font-bold text-center mb-2">Assignment Phase</h2>
        <p className="text-gray-400 text-center mb-8">
          Assign an identity to your target player
        </p>
        
        {/* Target Player */}
        <div className="bg-game-bg rounded-xl p-6 mb-8 text-center">
          <p className="text-sm text-gray-400 mb-3">Your target is:</p>
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl font-bold mb-3">
              {getInitials(myTarget.name)}
            </div>
            <span className="text-xl font-semibold">{myTarget.name}</span>
          </div>
        </div>
        
        {!hasSubmitted ? (
          <>
            {/* Assignment Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Who will they be? *
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g., The Rock, Beyoncé, Albert Einstein"
                  className="w-full px-4 py-3 bg-game-bg border border-game-border rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Allowed Aliases (comma-separated)
                </label>
                <input
                  type="text"
                  value={aliasesInput}
                  onChange={(e) => setAliasesInput(e.target.value)}
                  placeholder="e.g., Dwayne Johnson, DJ, The People's Champion"
                  className="w-full px-4 py-3 bg-game-bg border border-game-border rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Alternative names that will be accepted as correct guesses
                </p>
              </div>
              
              {/* GIPHY Search */}
              <GiphySearch
                searchTerm={displayName}
                selectedUrl={imageUrl}
                onSelect={setImageUrl}
              />
              
              {error && (
                <div className="text-red-400 text-sm bg-red-400/10 px-4 py-2 rounded-lg">
                  {error}
                </div>
              )}
              
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                  isSubmitting
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transform hover:scale-[1.02]'
                }`}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Assignment'}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Waiting State */}
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-green-400 font-medium mb-4">Assignment Submitted!</p>
              
              <p className="text-gray-400 text-sm">
                Waiting for other players... ({submittedCount}/{Object.keys(gameState.players).length})
              </p>
              
              {/* Progress bar */}
              <div className="mt-4 h-2 bg-game-bg rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                  style={{
                    width: `${(submittedCount / Object.keys(gameState.players).length) * 100}%`,
                  }}
                />
              </div>
            </div>
            
            {/* Start Game Button (Host only, after all submitted) */}
            {isHost && allSubmitted && (
              <button
                onClick={handleStartGame}
                className="w-full py-4 rounded-xl font-semibold text-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 transition-all transform hover:scale-[1.02]"
              >
                🎮 Start the Game!
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
