'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { sendQuestion, vote, makeGuess } from '@/lib/socket';
import { cn } from '@/lib/utils';
import { VoteType } from '@shared/types';

export function QuestionPanel() {
  const gameState = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.player.myPlayerId);
  const isMyTurn = useGameStore((s) => s.isMyTurn());
  const canIGuess = useGameStore((s) => s.canIGuess());
  const guessLockUntil = useGameStore((s) => s.ui.guessLockUntil);
  
  const [questionInput, setQuestionInput] = useState('');
  const [guessInput, setGuessInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showGuessInput, setShowGuessInput] = useState(false);
  const [myVote, setMyVote] = useState<VoteType | null>(null);
  
  if (!gameState) return null;
  
  const currentQuestion = gameState.turnState?.currentQuestion;
  const isAsker = currentQuestion?.askerId === myPlayerId;
  const lockTimeRemaining = Math.max(0, guessLockUntil - Date.now());
  
  const handleAskQuestion = async () => {
    if (!questionInput.trim()) return;
    
    setIsSubmitting(true);
    try {
      const response = await sendQuestion({ text: questionInput.trim() });
      if (response.success) {
        setQuestionInput('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleVote = (voteType: VoteType) => {
    if (!currentQuestion) return;
    
    setMyVote(voteType);
    vote({ questionId: currentQuestion.id, vote: voteType });
  };
  
  const handleMakeGuess = async () => {
    if (!guessInput.trim()) return;
    
    setIsSubmitting(true);
    try {
      const response = await makeGuess({ guess: guessInput.trim() });
      if (response.success) {
        setGuessInput('');
        setShowGuessInput(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="bg-game-card rounded-xl border border-game-border p-4">
      <h3 className="font-bold mb-4">Question Panel</h3>
      
      {/* Current Question Display */}
      {currentQuestion && (
        <div className="mb-4 p-4 bg-game-bg rounded-lg">
          <p className="text-sm text-gray-400 mb-1">Current Question:</p>
          <p className="font-medium mb-3">"{currentQuestion.text}"</p>
          
          {/* Vote Buttons (for non-askers) */}
          {!isAsker && (
            <div className="flex gap-2">
              <VoteButton
                type="YES"
                count={currentQuestion.voteTally.yes}
                isSelected={myVote === 'YES'}
                onClick={() => handleVote('YES')}
              />
              <VoteButton
                type="NO"
                count={currentQuestion.voteTally.no}
                isSelected={myVote === 'NO'}
                onClick={() => handleVote('NO')}
              />
              <VoteButton
                type="MAYBE"
                count={currentQuestion.voteTally.maybe}
                isSelected={myVote === 'MAYBE'}
                onClick={() => handleVote('MAYBE')}
              />
            </div>
          )}
          
          {/* Vote Tally (for asker) */}
          {isAsker && (
            <div className="flex gap-4 text-sm">
              <span className="text-green-400">
                ✓ Yes: {currentQuestion.voteTally.yes}
              </span>
              <span className="text-red-400">
                ✕ No: {currentQuestion.voteTally.no}
              </span>
              <span className="text-yellow-400">
                ? Maybe: {currentQuestion.voteTally.maybe}
              </span>
            </div>
          )}
        </div>
      )}
      
      {/* Question Input (when it's my turn and no current question) */}
      {isMyTurn && !currentQuestion && (
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">
            Ask a Yes/No question:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
              placeholder="Am I a musician?"
              className="flex-1 px-4 py-2 bg-game-bg border border-game-border rounded-lg focus:outline-none focus:border-purple-500"
              disabled={isSubmitting}
            />
            <button
              onClick={handleAskQuestion}
              disabled={isSubmitting || !questionInput.trim()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg font-medium transition-colors"
            >
              Ask
            </button>
          </div>
        </div>
      )}
      
      {/* Make a Guess Button (when it's my turn) */}
      {isMyTurn && (
        <div className="border-t border-game-border pt-4 mt-4">
          {!showGuessInput ? (
            <button
              onClick={() => setShowGuessInput(true)}
              disabled={!canIGuess}
              className={cn(
                'w-full py-3 rounded-lg font-semibold transition-all',
                canIGuess
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                  : 'bg-gray-600 cursor-not-allowed'
              )}
            >
              {canIGuess ? (
                '🎯 Make a Guess'
              ) : (
                `Locked for ${Math.ceil(lockTimeRemaining / 1000)}s`
              )}
            </button>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={guessInput}
                onChange={(e) => setGuessInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleMakeGuess()}
                placeholder="Type your guess..."
                className="w-full px-4 py-3 bg-game-bg border border-green-500 rounded-lg focus:outline-none"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleMakeGuess}
                  disabled={isSubmitting || !guessInput.trim()}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-medium"
                >
                  Submit Guess
                </button>
                <button
                  onClick={() => setShowGuessInput(false)}
                  className="px-4 py-2 bg-game-border hover:bg-gray-600 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Not your turn message */}
      {!isMyTurn && (
        <p className="text-center text-gray-400 text-sm">
          Wait for your turn to ask questions
        </p>
      )}
    </div>
  );
}

interface VoteButtonProps {
  type: VoteType;
  count: number;
  isSelected: boolean;
  onClick: () => void;
}

function VoteButton({ type, count, isSelected, onClick }: VoteButtonProps) {
  const colors = {
    YES: {
      bg: 'bg-green-500/20 hover:bg-green-500/30',
      selected: 'bg-green-500',
      text: 'text-green-400',
    },
    NO: {
      bg: 'bg-red-500/20 hover:bg-red-500/30',
      selected: 'bg-red-500',
      text: 'text-red-400',
    },
    MAYBE: {
      bg: 'bg-yellow-500/20 hover:bg-yellow-500/30',
      selected: 'bg-yellow-500',
      text: 'text-yellow-400',
    },
  };
  
  const style = colors[type];
  
  return (
    <button
      onClick={onClick}
      className={cn(
        'vote-btn flex-1 py-2 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2',
        isSelected ? `${style.selected} text-white` : `${style.bg} ${style.text}`
      )}
    >
      <span>{type}</span>
      <span className="text-xs opacity-80">({count})</span>
    </button>
  );
}
