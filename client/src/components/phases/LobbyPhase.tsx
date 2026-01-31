'use client';

import { useGameStore } from '@/store/gameStore';
import { startAssignmentPhase } from '@/lib/socket';
import { copyToClipboard, getInitials } from '@/lib/utils';
import { useState } from 'react';

export function LobbyPhase() {
  const gameState = useGameStore((s) => s.gameState);
  const isHost = useGameStore((s) => s.isHost());
  const [copied, setCopied] = useState(false);
  
  if (!gameState) return null;
  
  const players = Object.values(gameState.players);
  const minPlayers = gameState.settings.minPlayers;
  const canStart = players.length >= minPlayers;
  
  const handleCopyCode = async () => {
    const success = await copyToClipboard(gameState.roomCode);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const handleStartGame = () => {
    startAssignmentPhase();
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg bg-game-card rounded-2xl shadow-2xl border border-game-border p-8">
        {/* Room Code */}
        <div className="text-center mb-8">
          <p className="text-gray-400 text-sm mb-2">Room Code</p>
          <button
            onClick={handleCopyCode}
            className="group relative inline-flex items-center gap-2"
          >
            <span className="text-4xl font-mono font-bold tracking-widest text-purple-400">
              {gameState.roomCode}
            </span>
            <svg
              className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            {copied && (
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                Copied!
              </span>
            )}
          </button>
          <p className="text-gray-500 text-sm mt-2">
            Share this code with friends to join
          </p>
        </div>
        
        {/* Players List */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>Players</span>
            <span className="text-sm text-gray-400">
              ({players.length}/{gameState.settings.maxPlayers})
            </span>
          </h3>
          
          <div className="space-y-2">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-3 p-3 bg-game-bg rounded-lg"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold">
                  {getInitials(player.name)}
                </div>
                
                {/* Name */}
                <span className="flex-1 font-medium">{player.name}</span>
                
                {/* Host badge */}
                {player.id === gameState.hostId && (
                  <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                    Host
                  </span>
                )}
              </div>
            ))}
          </div>
          
          {/* Waiting message */}
          {players.length < minPlayers && (
            <p className="text-center text-gray-400 text-sm mt-4">
              Waiting for {minPlayers - players.length} more player(s)...
            </p>
          )}
        </div>
        
        {/* Start Button (Host only) */}
        {isHost && (
          <button
            onClick={handleStartGame}
            disabled={!canStart}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
              canStart
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transform hover:scale-[1.02]'
                : 'bg-gray-600 cursor-not-allowed'
            }`}
          >
            {canStart ? 'Start Game' : `Need ${minPlayers - players.length} More Players`}
          </button>
        )}
        
        {!isHost && (
          <p className="text-center text-gray-400">
            Waiting for host to start the game...
          </p>
        )}
      </div>
    </div>
  );
}
