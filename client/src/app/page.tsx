'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGameSocket } from '@/hooks/useGameSocket';
import { useGameStore } from '@/store/gameStore';
import { createRoom, joinRoom } from '@/lib/socket';
import { cn } from '@/lib/utils';

export default function HomePage() {
  const router = useRouter();
  const { connect } = useGameSocket();
  
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const setMyPlayerId = useGameStore((s) => s.setMyPlayerId);
  const setMyRoomCode = useGameStore((s) => s.setMyRoomCode);
  
  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      await connect();
      
      const response = await createRoom({ playerName: playerName.trim() });
      
      if (response.success && response.roomCode && response.playerId) {
        setMyPlayerId(response.playerId);
        setMyRoomCode(response.roomCode);
        router.push(`/room/${response.roomCode}`);
      } else {
        setError(response.error || 'Failed to create room');
      }
    } catch (err) {
      setError('Connection failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      await connect();
      
      const response = await joinRoom({
        roomCode: roomCode.toUpperCase().trim(),
        playerName: playerName.trim(),
      });
      
      if (response.success && response.roomCode && response.playerId) {
        setMyPlayerId(response.playerId);
        setMyRoomCode(response.roomCode);
        router.push(`/room/${response.roomCode}`);
      } else {
        setError(response.error || 'Failed to join room');
      }
    } catch (err) {
      setError('Connection failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Logo & Title */}
      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent mb-4">
          Who Am I?
        </h1>
        <p className="text-gray-400 text-lg">
          The ultimate multiplayer guessing game
        </p>
      </div>
      
      {/* Main Card */}
      <div className="w-full max-w-md bg-game-card rounded-2xl shadow-2xl border border-game-border p-8">
        {mode === 'select' && (
          <div className="space-y-4">
            <button
              onClick={() => setMode('create')}
              className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl font-semibold text-lg transition-all transform hover:scale-[1.02]"
            >
              Create a Room
            </button>
            <button
              onClick={() => setMode('join')}
              className="w-full py-4 px-6 bg-game-border hover:bg-gray-600 rounded-xl font-semibold text-lg transition-all transform hover:scale-[1.02]"
            >
              Join a Room
            </button>
          </div>
        )}
        
        {(mode === 'create' || mode === 'join') && (
          <div className="space-y-6">
            <button
              onClick={() => {
                setMode('select');
                setError(null);
              }}
              className="text-gray-400 hover:text-white flex items-center gap-2 mb-4"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            
            <h2 className="text-2xl font-bold">
              {mode === 'create' ? 'Create a Room' : 'Join a Room'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Your Name</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={20}
                  className="w-full px-4 py-3 bg-game-bg border border-game-border rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
              
              {mode === 'join' && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Room Code</label>
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    className="w-full px-4 py-3 bg-game-bg border border-game-border rounded-lg focus:outline-none focus:border-purple-500 transition-colors uppercase tracking-widest text-center font-mono text-xl"
                  />
                </div>
              )}
              
              {error && (
                <div className="text-red-400 text-sm bg-red-400/10 px-4 py-2 rounded-lg">
                  {error}
                </div>
              )}
              
              <button
                onClick={mode === 'create' ? handleCreateRoom : handleJoinRoom}
                disabled={isLoading}
                className={cn(
                  'w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all',
                  isLoading
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transform hover:scale-[1.02]'
                )}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Connecting...
                  </span>
                ) : mode === 'create' ? (
                  'Create Room'
                ) : (
                  'Join Room'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <p className="mt-8 text-gray-500 text-sm">
        Built with ❤️ for game nights
      </p>
    </div>
  );
}
