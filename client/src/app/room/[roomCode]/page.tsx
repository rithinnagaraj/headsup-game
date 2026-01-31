'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useGameSocket } from '@/hooks/useGameSocket';
import { useGameStore, selectGameState, selectPhase } from '@/store/gameStore';

// Phase components
import { LobbyPhase } from '@/components/phases/LobbyPhase';
import { AssignmentPhase } from '@/components/phases/AssignmentPhase';
import { PlayingPhase } from '@/components/phases/PlayingPhase';
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
  const isConnected = useGameStore((s) => s.connection.isConnected);
  
  // Connect on mount if not already connected
  useEffect(() => {
    if (!isConnected) {
      connect();
    }
  }, [connect, isConnected]);
  
  // Redirect if not in this room
  useEffect(() => {
    if (myRoomCode && myRoomCode !== roomCode.toUpperCase()) {
      router.push('/');
    }
  }, [myRoomCode, roomCode, router]);
  
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
