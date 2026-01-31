// ============================================
// ZUSTAND STORE - Client Game State
// ============================================

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  SerializableGameState,
  Player,
  GamePhase,
  TurnState,
  Question,
  Reaction,
  PlayerIdentity,
  GameFinishedPayload,
} from '@shared/types';

// ============================================
// STORE TYPES
// ============================================

interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
}

interface PlayerState {
  myPlayerId: string | null;
  myRoomCode: string | null;
}

interface UIState {
  activeReactions: Reaction[];
  showGuessInput: boolean;
  guessLockUntil: number;
  notifications: Notification[];
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  timestamp: number;
}

export interface GameStore {
  // Connection state
  connection: ConnectionState;
  
  // Player identity
  player: PlayerState;
  
  // Game state (synced from server)
  gameState: SerializableGameState | null;
  
  // UI state (local only)
  ui: UIState;
  
  // ---- Connection Actions ----
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setConnectionError: (error: string | null) => void;
  
  // ---- Player Actions ----
  setMyPlayerId: (playerId: string) => void;
  setMyRoomCode: (roomCode: string) => void;
  clearPlayerState: () => void;
  
  // ---- Game State Actions ----
  setGameState: (state: SerializableGameState) => void;
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;
  setPhase: (phase: GamePhase) => void;
  setTurnState: (turnState: TurnState) => void;
  addQuestion: (question: Question) => void;
  updateQuestionVotes: (questionId: string, voteTally: Question['voteTally']) => void;
  
  // ---- UI Actions ----
  addReaction: (reaction: Reaction) => void;
  removeReaction: (reactionId: string) => void;
  setGuessLockUntil: (timestamp: number) => void;
  addNotification: (type: Notification['type'], message: string) => void;
  removeNotification: (id: string) => void;
  
  // ---- Computed Getters ----
  getMyPlayer: () => Player | null;
  getMyTarget: () => Player | null;
  getMyIdentity: () => PlayerIdentity | undefined;
  isMyTurn: () => boolean;
  isHost: () => boolean;
  getActivePlayers: () => Player[];
  getSpectators: () => Player[];
  getCurrentQuestion: () => Question | undefined;
  getRemainingTurnTime: () => number;
  canIGuess: () => boolean;
}

// ============================================
// STORE IMPLEMENTATION
// ============================================

export const useGameStore = create<GameStore>()(
  subscribeWithSelector((set, get) => ({
    // ---- Initial State ----
    connection: {
      isConnected: false,
      isConnecting: false,
      connectionError: null,
    },
    
    player: {
      myPlayerId: null,
      myRoomCode: null,
    },
    
    gameState: null,
    
    ui: {
      activeReactions: [],
      showGuessInput: false,
      guessLockUntil: 0,
      notifications: [],
    },
    
    // ---- Connection Actions ----
    setConnected: (connected) =>
      set((state) => ({
        connection: { ...state.connection, isConnected: connected, isConnecting: false },
      })),
    
    setConnecting: (connecting) =>
      set((state) => ({
        connection: { ...state.connection, isConnecting: connecting },
      })),
    
    setConnectionError: (error) =>
      set((state) => ({
        connection: { ...state.connection, connectionError: error, isConnecting: false },
      })),
    
    // ---- Player Actions ----
    setMyPlayerId: (playerId) =>
      set((state) => ({
        player: { ...state.player, myPlayerId: playerId },
      })),
    
    setMyRoomCode: (roomCode) =>
      set((state) => ({
        player: { ...state.player, myRoomCode: roomCode },
      })),
    
    clearPlayerState: () =>
      set({
        player: { myPlayerId: null, myRoomCode: null },
        gameState: null,
      }),
    
    // ---- Game State Actions ----
    setGameState: (gameState) => set({ gameState }),
    
    updatePlayer: (playerId, updates) =>
      set((state) => {
        if (!state.gameState) return state;
        
        const players = { ...state.gameState.players };
        if (players[playerId]) {
          players[playerId] = { ...players[playerId], ...updates };
        }
        
        return {
          gameState: { ...state.gameState, players },
        };
      }),
    
    setPhase: (phase) =>
      set((state) => {
        if (!state.gameState) return state;
        return {
          gameState: { ...state.gameState, phase },
        };
      }),
    
    setTurnState: (turnState) =>
      set((state) => {
        if (!state.gameState) return state;
        return {
          gameState: { ...state.gameState, turnState },
        };
      }),
    
    addQuestion: (question) =>
      set((state) => {
        if (!state.gameState) return state;
        return {
          gameState: {
            ...state.gameState,
            questionHistory: [...state.gameState.questionHistory, question],
            turnState: state.gameState.turnState
              ? { ...state.gameState.turnState, currentQuestion: question }
              : undefined,
          },
        };
      }),
    
    updateQuestionVotes: (questionId, voteTally) =>
      set((state) => {
        if (!state.gameState?.turnState?.currentQuestion) return state;
        
        if (state.gameState.turnState.currentQuestion.id === questionId) {
          return {
            gameState: {
              ...state.gameState,
              turnState: {
                ...state.gameState.turnState,
                currentQuestion: {
                  ...state.gameState.turnState.currentQuestion,
                  voteTally,
                },
              },
            },
          };
        }
        return state;
      }),
    
    // ---- UI Actions ----
    addReaction: (reaction) =>
      set((state) => ({
        ui: {
          ...state.ui,
          activeReactions: [...state.ui.activeReactions, reaction],
        },
      })),
    
    removeReaction: (reactionId) =>
      set((state) => ({
        ui: {
          ...state.ui,
          activeReactions: state.ui.activeReactions.filter((r) => r.id !== reactionId),
        },
      })),
    
    setGuessLockUntil: (timestamp) =>
      set((state) => ({
        ui: { ...state.ui, guessLockUntil: timestamp },
      })),
    
    addNotification: (type, message) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      set((state) => ({
        ui: {
          ...state.ui,
          notifications: [
            ...state.ui.notifications,
            { id, type, message, timestamp: Date.now() },
          ],
        },
      }));
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        get().removeNotification(id);
      }, 5000);
    },
    
    removeNotification: (id) =>
      set((state) => ({
        ui: {
          ...state.ui,
          notifications: state.ui.notifications.filter((n) => n.id !== id),
        },
      })),
    
    // ---- Computed Getters ----
    getMyPlayer: () => {
      const { gameState, player } = get();
      if (!gameState || !player.myPlayerId) return null;
      return gameState.players[player.myPlayerId] || null;
    },
    
    getMyTarget: () => {
      const { gameState, player } = get();
      if (!gameState || !player.myPlayerId) return null;
      
      const myPlayer = gameState.players[player.myPlayerId];
      if (!myPlayer) return null;
      
      return gameState.players[myPlayer.targetPlayerId] || null;
    },
    
    getMyIdentity: () => {
      const myPlayer = get().getMyPlayer();
      return myPlayer?.assignedIdentity;
    },
    
    isMyTurn: () => {
      const { gameState, player } = get();
      if (!gameState?.turnState || !player.myPlayerId) return false;
      return gameState.turnState.activeGuesserId === player.myPlayerId;
    },
    
    isHost: () => {
      const { gameState, player } = get();
      if (!gameState || !player.myPlayerId) return false;
      return gameState.hostId === player.myPlayerId;
    },
    
    getActivePlayers: () => {
      const { gameState } = get();
      if (!gameState) return [];
      
      return Object.values(gameState.players).filter(
        (p) => p.isConnected && !p.hasGuessedCorrectly
      );
    },
    
    getSpectators: () => {
      const { gameState } = get();
      if (!gameState) return [];
      
      return Object.values(gameState.players).filter(
        (p) => p.isConnected && p.hasGuessedCorrectly
      );
    },
    
    getCurrentQuestion: () => {
      const { gameState } = get();
      return gameState?.turnState?.currentQuestion;
    },
    
    getRemainingTurnTime: () => {
      const { gameState } = get();
      if (!gameState?.turnState) return 0;
      
      const { turnStartTime, turnDuration } = gameState.turnState;
      const elapsed = Date.now() - turnStartTime;
      const remaining = turnDuration - elapsed;
      
      return Math.max(0, remaining);
    },
    
    canIGuess: () => {
      const { ui } = get();
      const isMyTurn = get().isMyTurn();
      const now = Date.now();
      
      return isMyTurn && ui.guessLockUntil < now;
    },
  }))
);

// ============================================
// STORE SELECTORS (for optimized re-renders)
// ============================================

export const selectConnection = (state: GameStore) => state.connection;
export const selectGameState = (state: GameStore) => state.gameState;
export const selectPhase = (state: GameStore) => state.gameState?.phase;
export const selectPlayers = (state: GameStore) => state.gameState?.players;
export const selectTurnState = (state: GameStore) => state.gameState?.turnState;
export const selectQuestionHistory = (state: GameStore) => state.gameState?.questionHistory;
export const selectNotifications = (state: GameStore) => state.ui.notifications;
export const selectActiveReactions = (state: GameStore) => state.ui.activeReactions;
