// ============================================
// useGameSocket Hook - Socket Connection & Sync
// ============================================

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import {
  getSocket,
  connectSocket,
  disconnectSocket,
  GameSocket,
} from '@/lib/socket';
import {
  SerializableGameState,
  Player,
  GamePhase,
  TurnState,
  Question,
  Reaction,
  PlayerIdentity,
  GameFinishedPayload,
  ErrorPayload,
} from '@shared/types';

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useGameSocket() {
  const socketRef = useRef<GameSocket | null>(null);
  const isInitializedRef = useRef(false);
  
  // Store actions
  const setConnected = useGameStore((s) => s.setConnected);
  const setConnecting = useGameStore((s) => s.setConnecting);
  const setConnectionError = useGameStore((s) => s.setConnectionError);
  const setGameState = useGameStore((s) => s.setGameState);
  const setPhase = useGameStore((s) => s.setPhase);
  const setTurnState = useGameStore((s) => s.setTurnState);
  const updatePlayer = useGameStore((s) => s.updatePlayer);
  const addQuestion = useGameStore((s) => s.addQuestion);
  const updateQuestionVotes = useGameStore((s) => s.updateQuestionVotes);
  const addReaction = useGameStore((s) => s.addReaction);
  const removeReaction = useGameStore((s) => s.removeReaction);
  const setGuessLockUntil = useGameStore((s) => s.setGuessLockUntil);
  const addNotification = useGameStore((s) => s.addNotification);
  const clearPlayerState = useGameStore((s) => s.clearPlayerState);
  
  // ============================================
  // EVENT HANDLERS
  // ============================================
  
  const handleGameStateUpdate = useCallback(
    (state: SerializableGameState) => {
      setGameState(state);
    },
    [setGameState]
  );
  
  const handlePlayerJoined = useCallback(
    (player: Player) => {
      addNotification('info', `${player.name} joined the game`);
    },
    [addNotification]
  );
  
  const handlePlayerLeft = useCallback(
    (playerId: string) => {
      const gameState = useGameStore.getState().gameState;
      const player = gameState?.players[playerId];
      if (player) {
        addNotification('warning', `${player.name} left the game`);
      }
    },
    [addNotification]
  );
  
  const handlePhaseChanged = useCallback(
    (phase: GamePhase) => {
      setPhase(phase);
      
      switch (phase) {
        case 'ASSIGNMENT':
          addNotification('info', 'Assignment phase started! Assign an identity to your target.');
          break;
        case 'PLAYING':
          addNotification('success', 'Game started! Good luck!');
          break;
        case 'FINISHED':
          addNotification('info', 'Game over!');
          break;
      }
    },
    [setPhase, addNotification]
  );
  
  const handleTurnStarted = useCallback(
    (turnState: TurnState) => {
      setTurnState(turnState);
      
      const myPlayerId = useGameStore.getState().player.myPlayerId;
      const gameState = useGameStore.getState().gameState;
      
      if (turnState.activeGuesserId === myPlayerId) {
        addNotification('info', "It's your turn to ask a question!");
      } else if (gameState) {
        const activePlayer = gameState.players[turnState.activeGuesserId];
        if (activePlayer) {
          addNotification('info', `${activePlayer.name}'s turn to guess`);
        }
      }
    },
    [setTurnState, addNotification]
  );
  
  const handleTurnTimeout = useCallback(
    (nextGuesserId: string) => {
      const gameState = useGameStore.getState().gameState;
      if (gameState) {
        const nextPlayer = gameState.players[nextGuesserId];
        if (nextPlayer) {
          addNotification('warning', `Time's up! ${nextPlayer.name}'s turn now.`);
        }
      }
    },
    [addNotification]
  );
  
  const handleQuestionAsked = useCallback(
    (question: Question) => {
      addQuestion(question);
      
      const gameState = useGameStore.getState().gameState;
      const asker = gameState?.players[question.askerId];
      if (asker) {
        addNotification('info', `${asker.name} asked: "${question.text}"`);
      }
    },
    [addQuestion, addNotification]
  );
  
  const handleVoteReceived = useCallback(
    (data: { questionId: string; voteTally: Question['voteTally'] }) => {
      updateQuestionVotes(data.questionId, data.voteTally);
    },
    [updateQuestionVotes]
  );
  
  const handleCorrectGuess = useCallback(
    (data: { playerId: string; identity: PlayerIdentity }) => {
      const gameState = useGameStore.getState().gameState;
      const player = gameState?.players[data.playerId];
      
      if (player) {
        updatePlayer(data.playerId, {
          hasGuessedCorrectly: true,
          assignedIdentity: data.identity,
        });
        
        addNotification(
          'success',
          `🎉 ${player.name} guessed correctly! They were ${data.identity.displayName}!`
        );
      }
    },
    [updatePlayer, addNotification]
  );
  
  const handleWrongGuess = useCallback(
    (data: { playerId: string; lockUntil: number }) => {
      const myPlayerId = useGameStore.getState().player.myPlayerId;
      const gameState = useGameStore.getState().gameState;
      const player = gameState?.players[data.playerId];
      
      if (data.playerId === myPlayerId) {
        setGuessLockUntil(data.lockUntil);
        addNotification('error', 'Wrong guess! You are locked for 10 seconds.');
      } else if (player) {
        addNotification('warning', `${player.name} guessed wrong!`);
      }
    },
    [setGuessLockUntil, addNotification]
  );
  
  const handleReactionReceived = useCallback(
    (reaction: Reaction) => {
      addReaction(reaction);
      
      // Auto-remove reaction after 2 seconds
      setTimeout(() => {
        removeReaction(reaction.id);
      }, 2000);
    },
    [addReaction, removeReaction]
  );
  
  const handleGameFinished = useCallback(
    (data: GameFinishedPayload) => {
      const { rankings } = data;
      const winner = rankings[0];
      
      if (winner) {
        addNotification(
          'success',
          `🏆 ${winner.playerName} wins with ${winner.turnsToGuess} turns!`
        );
      }
    },
    [addNotification]
  );
  
  const handleError = useCallback(
    (error: ErrorPayload) => {
      addNotification('error', error.message);
    },
    [addNotification]
  );
  
  // ============================================
  // CONNECTION MANAGEMENT
  // ============================================
  
  const connect = useCallback(async () => {
    if (isInitializedRef.current) return;
    
    setConnecting(true);
    
    try {
      await connectSocket();
      socketRef.current = getSocket();
      isInitializedRef.current = true;
      setConnected(true);
      setConnectionError(null);
    } catch (error) {
      setConnectionError(
        error instanceof Error ? error.message : 'Failed to connect'
      );
      setConnected(false);
    }
  }, [setConnecting, setConnected, setConnectionError]);
  
  const disconnect = useCallback(() => {
    disconnectSocket();
    socketRef.current = null;
    isInitializedRef.current = false;
    setConnected(false);
    clearPlayerState();
  }, [setConnected, clearPlayerState]);
  
  // ============================================
  // EFFECT: Setup Socket Listeners
  // ============================================
  
  useEffect(() => {
    const socket = getSocket();
    
    // Connection events
    socket.on('connect', () => {
      setConnected(true);
      setConnectionError(null);
    });
    
    socket.on('disconnect', () => {
      setConnected(false);
    });
    
    socket.on('connect_error', (error) => {
      setConnectionError(error.message);
    });
    
    // Game events
    socket.on('game_state_update', handleGameStateUpdate);
    socket.on('player_joined', handlePlayerJoined);
    socket.on('player_left', handlePlayerLeft);
    socket.on('phase_changed', handlePhaseChanged);
    socket.on('turn_started', handleTurnStarted);
    socket.on('turn_timeout', handleTurnTimeout);
    socket.on('question_asked', handleQuestionAsked);
    socket.on('vote_received', handleVoteReceived);
    socket.on('correct_guess', handleCorrectGuess);
    socket.on('wrong_guess', handleWrongGuess);
    socket.on('reaction_received', handleReactionReceived);
    socket.on('game_finished', handleGameFinished);
    socket.on('error', handleError);
    
    // Cleanup
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('game_state_update');
      socket.off('player_joined');
      socket.off('player_left');
      socket.off('phase_changed');
      socket.off('turn_started');
      socket.off('turn_timeout');
      socket.off('question_asked');
      socket.off('vote_received');
      socket.off('correct_guess');
      socket.off('wrong_guess');
      socket.off('reaction_received');
      socket.off('game_finished');
      socket.off('error');
    };
  }, [
    setConnected,
    setConnectionError,
    handleGameStateUpdate,
    handlePlayerJoined,
    handlePlayerLeft,
    handlePhaseChanged,
    handleTurnStarted,
    handleTurnTimeout,
    handleQuestionAsked,
    handleVoteReceived,
    handleCorrectGuess,
    handleWrongGuess,
    handleReactionReceived,
    handleGameFinished,
    handleError,
  ]);
  
  return {
    connect,
    disconnect,
    socket: socketRef.current,
  };
}
