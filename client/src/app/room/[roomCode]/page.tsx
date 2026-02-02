'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useGameSocket } from '@/hooks/useGameSocket';
import { useGameStore, selectGameState, selectPhase } from '@/store/gameStore';
import { joinRoom } from '@/lib/socket';

// Phase components
import { LobbyPhase } from '@/components/phases/LobbyPhase';
import { AssignmentPhase } from '@/components/phases/AssignmentPhase';
import { PlayingPhase } from '@/components/phases/PlayingPhase';
import { IRLPlayingPhase } from '@/components/phases/IRLPlayingPhase';
import { FinishedPhase } from '@/components/phases/FinishedPhase';
import { Notifications } from '@/components/ui/Notifications';
import { ConnectionStatus } from '@/components/ui/ConnectionStatus';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.roomCode as string;
  
  const { connect } = useGameSocket();
  const gameState = useGameStore(selectGameState);
  const phase = useGameStore(selectPhase);
  const myRoomCode = useGameStore((s) => s.player.myRoomCode);
  const myPlayerId = useGameStore((s) => s.player.myPlayerId);
  const isConnected = useGameStore((s) => s.connection.isConnected);
  const setMyPlayerId = useGameStore((s) => s.setMyPlayerId);
  const setMyRoomCode = useGameStore((s) => s.setMyRoomCode);
  
  // State for direct link join
  const [needsToJoin, setNeedsToJoin] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  
  // Connect on mount if not already connected
  useEffect(() => {
    if (!isConnected) {
      connect();
    }
  }, [connect, isConnected]);
  
  // Check if user needs to join (accessed via direct link without being in the room)
  useEffect(() => {
    if (isConnected && !myPlayerId && !myRoomCode) {
      // User accessed via direct link but hasn't joined
      setNeedsToJoin(true);
    }
  }, [isConnected, myPlayerId, myRoomCode]);
  
  // Redirect if in a different room
  useEffect(() => {
    if (myRoomCode && myRoomCode !== roomCode.toUpperCase()) {
      router.push('/');
    }
  }, [myRoomCode, roomCode, router]);
  
  // Handle direct link join
  const handleDirectJoin = async () => {
    if (!playerName.trim()) {
      setJoinError('Please enter your name');
      return;
    }
    
    setIsJoining(true);
    setJoinError(null);
    
    try {
      const response = await joinRoom({
        roomCode: roomCode.toUpperCase(),
        playerName: playerName.trim(),
      });
      
      if (response.success && response.roomCode && response.playerId) {
        setMyPlayerId(response.playerId);
        setMyRoomCode(response.roomCode);
        setNeedsToJoin(false);
      } else {
        setJoinError(response.error || 'Failed to join room. The room may not exist or the game has already started.');
      }
    } catch (err) {
      setJoinError('Connection failed. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };
  
  // Show direct link join form
  if (needsToJoin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-game-card rounded-2xl shadow-2xl border border-game-border p-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent mb-2">
              Join Game
            </h1>
            <p className="text-gray-400">
              Room: <span className="font-mono text-purple-400 font-bold">{roomCode.toUpperCase()}</span>
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Your Name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDirectJoin()}
                placeholder="Enter your name"
                maxLength={20}
                autoFocus
                className="w-full px-4 py-3 bg-game-bg border border-game-border rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
            
            {joinError && (
              <div className="text-red-400 text-sm bg-red-400/10 px-4 py-2 rounded-lg">
                {joinError}
              </div>
            )}
            
            <button
              onClick={handleDirectJoin}
              disabled={isJoining}
              className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all ${
                isJoining
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transform hover:scale-[1.02]'
              }`}
            >
              {isJoining ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Joining...
                </span>
              ) : (
                'Join Game'
              )}
            </button>
            
            <button
              onClick={() => router.push('/')}
              className="w-full py-3 text-gray-400 hover:text-white transition-colors"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Show loading if no game state yet
  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Connecting to room...</p>
        </div>
      </div>
    );
  }
  
  // Render phase-specific component
  const renderPhase = () => {
    switch (phase) {
      case 'LOBBY':
        return <LobbyPhase />;
      case 'ASSIGNMENT':
        return <AssignmentPhase />;
      case 'PLAYING':
        // Check if IRL mode
        if (gameState?.settings?.gameMode === 'irl') {
          return <IRLPlayingPhase />;
        }
        return <PlayingPhase />;
      case 'FINISHED':
        return <FinishedPhase />;
      default:
        return <LobbyPhase />;
    }
  };
  
  return (
    <div className="min-h-screen relative">
      {/* Connection status indicator */}
      <ConnectionStatus />
      
      {/* Notifications */}
      <Notifications />
      
      {/* Main content */}
      {renderPhase()}
    </div>
  );
}
