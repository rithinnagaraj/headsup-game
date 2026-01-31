'use client';

import { useGameStore } from '@/store/gameStore';
import { formatRelativeTime } from '@/lib/utils';

export function ChatHistory() {
  const gameState = useGameStore((s) => s.gameState);
  
  if (!gameState) return null;
  
  const questions = [...gameState.questionHistory].reverse();
  
  return (
    <div className="bg-game-card rounded-xl border border-game-border p-4 max-h-80 flex flex-col">
      <h3 className="font-bold mb-3 flex-shrink-0">Question History</h3>
      
      {questions.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-4">
          No questions asked yet
        </p>
      ) : (
        <div className="overflow-y-auto flex-1 space-y-3 pr-2">
          {questions.map((question) => {
            const asker = gameState.players[question.askerId];
            
            return (
              <div
                key={question.id}
                className="bg-game-bg rounded-lg p-3 text-sm"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-purple-400">
                    {asker?.name || 'Unknown'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatRelativeTime(question.timestamp)}
                  </span>
                </div>
                
                <p className="text-gray-200 mb-2">"{question.text}"</p>
                
                <div className="flex gap-3 text-xs">
                  <span className="text-green-400">
                    ✓ {question.voteTally.yes}
                  </span>
                  <span className="text-red-400">
                    ✕ {question.voteTally.no}
                  </span>
                  <span className="text-yellow-400">
                    ? {question.voteTally.maybe}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
