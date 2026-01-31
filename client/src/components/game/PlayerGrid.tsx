'use client';

import { useRef, useState, useEffect } from 'react';
import { useGameStore, selectActiveReactions } from '@/store/gameStore';
import { sendReaction } from '@/lib/socket';
import { getInitials, cn } from '@/lib/utils';
import { Player, Reaction } from '@shared/types';
import { triggerCardConfetti } from '@/components/effects';
import { soundManager } from '@/lib/sounds';

const REACTION_EMOJIS = ['👍', '👎', '😂', '🤔', '😮', '🔥', '❤️', '👏'];

export function PlayerGrid() {
  const gameState = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.player.myPlayerId);
  const activeReactions = useGameStore(selectActiveReactions);
  
  if (!gameState) return null;
  
  const players = Object.values(gameState.players);
  const activeGuesserId = gameState.turnState?.activeGuesserId;
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {players.map((player) => (
        <PlayerCard
          key={player.id}
          player={player}
          isMe={player.id === myPlayerId}
          isActiveGuesser={player.id === activeGuesserId}
          reactions={activeReactions.filter((r) => r.toPlayerId === player.id)}
        />
      ))}
    </div>
  );
}

interface PlayerCardProps {
  player: Player;
  isMe: boolean;
  isActiveGuesser: boolean;
  reactions: Reaction[];
}

function PlayerCard({ player, isMe, isActiveGuesser, reactions }: PlayerCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [showRevealed, setShowRevealed] = useState(false);
  const prevGuessedRef = useRef(player.hasGuessedCorrectly);

  const handleReaction = (emoji: string) => {
    sendReaction({ toPlayerId: player.id, emoji });
  };
  
  // Initialize showRevealed if I already guessed correctly (e.g., on page refresh)
  useEffect(() => {
    if (player.hasGuessedCorrectly && isMe) {
      setShowRevealed(true);
    }
  }, []);
  
  // Detect when I guess correctly and trigger flip animation on MY card
  useEffect(() => {
    if (player.hasGuessedCorrectly && !prevGuessedRef.current && isMe) {
      // I just guessed correctly - trigger the flip on MY card!
      setIsFlipping(true);
      soundManager.play('ding');
      
      // After flip animation starts, show the revealed content
      setTimeout(() => {
        setShowRevealed(true);
        
        // Trigger confetti at the card position
        if (cardRef.current) {
          const rect = cardRef.current.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          triggerCardConfetti(centerX, centerY);
        }
      }, 400);
    }
    prevGuessedRef.current = player.hasGuessedCorrectly;
  }, [player.hasGuessedCorrectly, isMe]);
  
  // Determine what to show on the card:
  // - For MY card: hidden until I guess correctly
  // - For OTHER players: always show their identity
  const shouldShowHidden = isMe && !player.hasGuessedCorrectly;
  const identity = player.assignedIdentity;
  
  return (
    <div
      ref={cardRef}
      className={cn(
        'relative bg-game-card rounded-xl border-2 overflow-hidden transition-all',
        {
          'border-purple-500 pulse-ring': isActiveGuesser,
          'border-green-500': player.hasGuessedCorrectly,
          'border-game-border': !isActiveGuesser && !player.hasGuessedCorrectly,
          'opacity-50': !player.isConnected,
        }
      )}
    >
      {/* Floating Reactions */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {reactions.map((reaction) => (
          <div
            key={reaction.id}
            className="floating-emoji absolute text-3xl"
            style={{
              left: `${Math.random() * 60 + 20}%`,
              bottom: '20%',
            }}
          >
            {reaction.emoji}
          </div>
        ))}
      </div>
      
      {/* Card Content */}
      <div className="p-4">
        {/* Player Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm',
              player.hasGuessedCorrectly
                ? 'bg-green-500'
                : 'bg-gradient-to-br from-purple-500 to-pink-500'
            )}
          >
            {player.hasGuessedCorrectly ? '✓' : getInitials(player.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">
              {player.name}
              {isMe && <span className="text-purple-400 text-sm"> (You)</span>}
            </p>
            {isActiveGuesser && (
              <p className="text-xs text-purple-400">Guessing...</p>
            )}
          </div>
        </div>
        
        {/* Identity Card with 3D Flip */}
        {shouldShowHidden ? (
          // MY card - hidden until I guess correctly, then flips
          <div className={cn('card-3d-flip aspect-[3/4]', (isFlipping || showRevealed) && 'flipped')}>
            <div className="card-3d-inner w-full h-full">
              {/* Front of card (hidden identity - shown to me) */}
              <div className="card-3d-front rounded-lg flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-purple-600 to-pink-600">
                <span className="text-4xl mb-2">❓</span>
                <p className="font-bold">GUESS ME</p>
                <p className="text-xs opacity-80 mt-1">Your identity is hidden</p>
              </div>
              
              {/* Back of card (revealed identity - after I guess correctly) */}
              <div className="card-3d-back rounded-lg flex flex-col items-center justify-center p-4 text-center bg-game-bg">
                {identity?.imageUrl && (
                  <img
                    src={identity.imageUrl}
                    alt={identity.displayName}
                    className="w-16 h-16 rounded-full object-cover mb-2"
                  />
                )}
                <p className="font-bold text-lg">{identity?.displayName || '???'}</p>
                <p className="text-xs text-green-400 mt-1">
                  🎉 Guessed in {player.turnsToGuess} turns!
                </p>
              </div>
            </div>
          </div>
        ) : (
          // OTHER players' cards OR my card after guessing - always show identity
          <div className="aspect-[3/4] rounded-lg flex flex-col items-center justify-center p-4 text-center bg-game-bg">
            {identity?.imageUrl && (
              <img
                src={identity.imageUrl}
                alt={identity.displayName}
                className="w-16 h-16 rounded-full object-cover mb-2"
              />
            )}
            <p className="font-bold text-lg">{identity?.displayName || '???'}</p>
            {player.hasGuessedCorrectly && (
              <p className="text-xs text-green-400 mt-1">
                🎉 Guessed in {player.turnsToGuess} turns!
              </p>
            )}
          </div>
        )}
        
        {/* Reaction Buttons (only for other players) */}
        {!isMe && (
          <div className="mt-3 flex flex-wrap gap-1 justify-center">
            {REACTION_EMOJIS.slice(0, 4).map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="w-8 h-8 rounded-full bg-game-bg hover:bg-gray-600 flex items-center justify-center text-lg transition-transform hover:scale-110"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
