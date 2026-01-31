// ============================================
// ROOM MANAGER - Handles all room & game logic
// ============================================

import { v4 as uuidv4 } from 'uuid';
import {
  GameState,
  Player,
  PlayerIdentity,
  GamePhase,
  TurnState,
  Question,
  Vote,
  VoteType,
  SerializableGameState,
  DEFAULT_GAME_SETTINGS,
  GameSettings,
  GameFinishedPayload,
} from '../shared/types';

// Fuzzy string matching using Levenshtein distance
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

function fuzzyMatch(input: string, target: string, threshold: number = 0.8): boolean {
  const normalizedInput = input.toLowerCase().trim();
  const normalizedTarget = target.toLowerCase().trim();
  
  // Exact match
  if (normalizedInput === normalizedTarget) return true;
  
  // Levenshtein similarity
  const maxLen = Math.max(normalizedInput.length, normalizedTarget.length);
  if (maxLen === 0) return true;
  
  const distance = levenshteinDistance(normalizedInput, normalizedTarget);
  const similarity = 1 - distance / maxLen;
  
  return similarity >= threshold;
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoiding confusing chars like 0/O, 1/I
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export class RoomManager {
  private rooms: Map<string, GameState> = new Map();
  private playerToRoom: Map<string, string> = new Map(); // playerId -> roomCode
  private turnTimers: Map<string, NodeJS.Timeout> = new Map(); // roomCode -> timer

  // ============================================
  // ROOM LIFECYCLE
  // ============================================

  createRoom(hostId: string, hostName: string, avatarUrl?: string): string {
    let roomCode: string;
    do {
      roomCode = generateRoomCode();
    } while (this.rooms.has(roomCode));

    const host: Player = {
      id: hostId,
      name: hostName,
      avatarUrl,
      targetPlayerId: '', // Will be set during assignment phase
      hasSubmittedAssignment: false,
      hasGuessedCorrectly: false,
      turnsToGuess: 0,
      isConnected: true,
      guessLockUntil: 0,
    };

    const gameState: GameState = {
      roomCode,
      hostId,
      phase: 'LOBBY',
      players: new Map([[hostId, host]]),
      playerOrder: [hostId],
      questionHistory: [],
      createdAt: Date.now(),
      settings: { ...DEFAULT_GAME_SETTINGS },
    };

    this.rooms.set(roomCode, gameState);
    this.playerToRoom.set(hostId, roomCode);

    return roomCode;
  }

  joinRoom(roomCode: string, playerId: string, playerName: string, avatarUrl?: string): GameState | null {
    const room = this.rooms.get(roomCode.toUpperCase());
    
    if (!room) return null;
    if (room.phase !== 'LOBBY') return null;
    if (room.players.size >= room.settings.maxPlayers) return null;

    const player: Player = {
      id: playerId,
      name: playerName,
      avatarUrl,
      targetPlayerId: '',
      hasSubmittedAssignment: false,
      hasGuessedCorrectly: false,
      turnsToGuess: 0,
      isConnected: true,
      guessLockUntil: 0,
    };

    room.players.set(playerId, player);
    room.playerOrder.push(playerId);
    this.playerToRoom.set(playerId, roomCode);

    return room;
  }

  getRoom(roomCode: string): GameState | undefined {
    return this.rooms.get(roomCode.toUpperCase());
  }

  getRoomByPlayerId(playerId: string): GameState | undefined {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return undefined;
    return this.rooms.get(roomCode);
  }

  removePlayer(playerId: string): { room: GameState | null; wasHost: boolean } {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return { room: null, wasHost: false };

    const room = this.rooms.get(roomCode);
    if (!room) return { room: null, wasHost: false };

    const wasHost = room.hostId === playerId;
    
    // Mark player as disconnected instead of removing during active game
    if (room.phase === 'PLAYING') {
      const player = room.players.get(playerId);
      if (player) {
        player.isConnected = false;
      }
    } else {
      room.players.delete(playerId);
      room.playerOrder = room.playerOrder.filter(id => id !== playerId);
    }

    this.playerToRoom.delete(playerId);

    // If host left during lobby, assign new host
    if (wasHost && room.players.size > 0) {
      const newHostId = room.playerOrder[0];
      if (newHostId) {
        room.hostId = newHostId;
      }
    }

    // Delete room if empty
    if (room.players.size === 0 || (room.phase !== 'PLAYING' && room.playerOrder.length === 0)) {
      this.clearTurnTimer(roomCode);
      this.rooms.delete(roomCode);
      return { room: null, wasHost };
    }

    return { room, wasHost };
  }

  // ============================================
  // CIRCULAR LINKED LIST - Target Assignment
  // ============================================

  /**
   * Creates a circular linked list where each player is assigned to the NEXT player.
   * Player A assigns identity TO Player B, Player B assigns TO Player C, etc.
   * This means Player A's target is B, B's target is C, C's target is A.
   */
  assignTargets(roomCode: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room) return false;
    if (room.playerOrder.length < room.settings.minPlayers) return false;

    // Shuffle player order for randomness
    const shuffledOrder = this.shuffleArray([...room.playerOrder]);
    room.playerOrder = shuffledOrder;

    // Create circular linked list: each player's target is the NEXT player in the list
    for (let i = 0; i < shuffledOrder.length; i++) {
      const currentPlayerId = shuffledOrder[i];
      const nextPlayerId = shuffledOrder[(i + 1) % shuffledOrder.length];
      
      const player = room.players.get(currentPlayerId);
      if (player) {
        player.targetPlayerId = nextPlayerId;
      }
    }

    return true;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // ============================================
  // PHASE TRANSITIONS
  // ============================================

  startAssignmentPhase(roomCode: string, requesterId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room) return false;
    if (room.hostId !== requesterId) return false;
    if (room.phase !== 'LOBBY') return false;
    if (room.players.size < room.settings.minPlayers) return false;

    // Assign targets using circular linked list
    this.assignTargets(roomCode);
    room.phase = 'ASSIGNMENT';

    return true;
  }

  submitAssignment(
    playerId: string,
    identity: PlayerIdentity
  ): { success: boolean; allSubmitted: boolean; room: GameState | null } {
    const room = this.getRoomByPlayerId(playerId);
    if (!room) return { success: false, allSubmitted: false, room: null };
    if (room.phase !== 'ASSIGNMENT') return { success: false, allSubmitted: false, room: null };

    const assigner = room.players.get(playerId);
    if (!assigner) return { success: false, allSubmitted: false, room: null };
    if (assigner.hasSubmittedAssignment) return { success: false, allSubmitted: false, room: null };

    // Get the target player (who this player assigns an identity TO)
    const targetPlayer = room.players.get(assigner.targetPlayerId);
    if (!targetPlayer) return { success: false, allSubmitted: false, room: null };

    // Assign the identity TO the target player
    targetPlayer.assignedIdentity = identity;
    assigner.hasSubmittedAssignment = true;

    // Check if all players have submitted
    const allSubmitted = Array.from(room.players.values()).every(p => p.hasSubmittedAssignment);

    return { success: true, allSubmitted, room };
  }

  startGame(roomCode: string, requesterId: string): { success: boolean; room: GameState | null } {
    const room = this.rooms.get(roomCode);
    if (!room) return { success: false, room: null };
    if (room.hostId !== requesterId) return { success: false, room: null };
    if (room.phase !== 'ASSIGNMENT') return { success: false, room: null };

    // Verify all assignments are complete
    const allSubmitted = Array.from(room.players.values()).every(p => p.hasSubmittedAssignment);
    if (!allSubmitted) return { success: false, room: null };

    room.phase = 'PLAYING';

    // Initialize turn state - first player in order starts
    this.initializeTurn(room, room.playerOrder[0]);

    return { success: true, room };
  }

  // ============================================
  // TURN MANAGEMENT
  // ============================================

  private initializeTurn(room: GameState, guesserId: string): void {
    const now = Date.now();
    
    room.turnState = {
      activeGuesserId: guesserId,
      turnNumber: (room.turnState?.turnNumber || 0) + 1,
      turnStartTime: now,
      turnDuration: room.settings.turnDuration,
      currentQuestion: undefined,
    };
  }

  startTurnTimer(
    roomCode: string,
    onTimeout: (room: GameState, nextGuesserId: string) => void
  ): void {
    const room = this.rooms.get(roomCode);
    if (!room || !room.turnState) return;

    // Clear any existing timer
    this.clearTurnTimer(roomCode);

    const timer = setTimeout(() => {
      const currentRoom = this.rooms.get(roomCode);
      if (!currentRoom || currentRoom.phase !== 'PLAYING') return;

      const nextGuesserId = this.getNextGuesser(roomCode);
      if (nextGuesserId) {
        this.advanceTurn(roomCode);
        onTimeout(currentRoom, nextGuesserId);
      }
    }, room.settings.turnDuration);

    this.turnTimers.set(roomCode, timer);
  }

  clearTurnTimer(roomCode: string): void {
    const timer = this.turnTimers.get(roomCode);
    if (timer) {
      clearTimeout(timer);
      this.turnTimers.delete(roomCode);
    }
  }

  /**
   * Gets the next eligible guesser (skips players who have already guessed correctly)
   */
  getNextGuesser(roomCode: string): string | null {
    const room = this.rooms.get(roomCode);
    if (!room || !room.turnState) return null;

    const currentIndex = room.playerOrder.indexOf(room.turnState.activeGuesserId);
    const playerCount = room.playerOrder.length;

    // Find next player who hasn't guessed correctly and is connected
    for (let i = 1; i <= playerCount; i++) {
      const nextIndex = (currentIndex + i) % playerCount;
      const nextPlayerId = room.playerOrder[nextIndex];
      const nextPlayer = room.players.get(nextPlayerId);

      if (nextPlayer && !nextPlayer.hasGuessedCorrectly && nextPlayer.isConnected) {
        return nextPlayerId;
      }
    }

    return null; // No eligible players left
  }

  advanceTurn(roomCode: string): { room: GameState | null; nextGuesserId: string | null } {
    const room = this.rooms.get(roomCode);
    if (!room) return { room: null, nextGuesserId: null };

    const nextGuesserId = this.getNextGuesser(roomCode);
    
    if (!nextGuesserId) {
      // Game over - no more guessers
      room.phase = 'FINISHED';
      this.clearTurnTimer(roomCode);
      return { room, nextGuesserId: null };
    }

    this.initializeTurn(room, nextGuesserId);
    return { room, nextGuesserId };
  }

  // ============================================
  // QUESTION & VOTING
  // ============================================

  submitQuestion(playerId: string, questionText: string): { success: boolean; question: Question | null; room: GameState | null } {
    const room = this.getRoomByPlayerId(playerId);
    if (!room) return { success: false, question: null, room: null };
    if (room.phase !== 'PLAYING') return { success: false, question: null, room: null };
    if (!room.turnState) return { success: false, question: null, room: null };
    if (room.turnState.activeGuesserId !== playerId) return { success: false, question: null, room: null };

    // Create new question
    const question: Question = {
      id: uuidv4(),
      askerId: playerId,
      text: questionText.trim(),
      votes: [],
      voteTally: { yes: 0, no: 0, maybe: 0 },
      timestamp: Date.now(),
    };

    room.turnState.currentQuestion = question;
    room.questionHistory.push(question);

    // Increment turn count for the asking player
    const player = room.players.get(playerId);
    if (player) {
      player.turnsToGuess++;
    }

    return { success: true, question, room };
  }

  submitVote(
    playerId: string,
    questionId: string,
    vote: VoteType
  ): { success: boolean; question: Question | null; room: GameState | null } {
    const room = this.getRoomByPlayerId(playerId);
    if (!room) return { success: false, question: null, room: null };
    if (room.phase !== 'PLAYING') return { success: false, question: null, room: null };
    if (!room.turnState?.currentQuestion) return { success: false, question: null, room: null };

    const question = room.turnState.currentQuestion;
    if (question.id !== questionId) return { success: false, question: null, room: null };

    // Can't vote on your own question
    if (question.askerId === playerId) return { success: false, question: null, room: null };

    // Check if already voted
    const existingVoteIndex = question.votes.findIndex(v => v.playerId === playerId);
    
    if (existingVoteIndex >= 0) {
      // Update existing vote
      const oldVote = question.votes[existingVoteIndex].vote;
      question.voteTally[oldVote.toLowerCase() as 'yes' | 'no' | 'maybe']--;
      question.votes[existingVoteIndex].vote = vote;
    } else {
      // Add new vote
      question.votes.push({ playerId, vote });
    }

    // Update tally
    question.voteTally[vote.toLowerCase() as 'yes' | 'no' | 'maybe']++;

    return { success: true, question, room };
  }

  // ============================================
  // GUESSING LOGIC
  // ============================================

  makeGuess(
    playerId: string,
    guess: string
  ): { 
    success: boolean; 
    correct: boolean; 
    lockUntil: number; 
    room: GameState | null;
    gameFinished: boolean;
  } {
    const room = this.getRoomByPlayerId(playerId);
    if (!room) return { success: false, correct: false, lockUntil: 0, room: null, gameFinished: false };
    if (room.phase !== 'PLAYING') return { success: false, correct: false, lockUntil: 0, room: null, gameFinished: false };
    if (!room.turnState) return { success: false, correct: false, lockUntil: 0, room: null, gameFinished: false };
    if (room.turnState.activeGuesserId !== playerId) return { success: false, correct: false, lockUntil: 0, room: null, gameFinished: false };

    const player = room.players.get(playerId);
    if (!player) return { success: false, correct: false, lockUntil: 0, room: null, gameFinished: false };

    // Check if player is locked from guessing
    const now = Date.now();
    if (player.guessLockUntil > now) {
      return { success: false, correct: false, lockUntil: player.guessLockUntil, room, gameFinished: false };
    }

    const identity = player.assignedIdentity;
    if (!identity) return { success: false, correct: false, lockUntil: 0, room: null, gameFinished: false };

    // Check against display name and all aliases using fuzzy matching
    const allPossibleNames = [identity.displayName, ...identity.allowedAliases];
    const isCorrect = allPossibleNames.some(name => fuzzyMatch(guess, name));

    if (isCorrect) {
      player.hasGuessedCorrectly = true;
      
      // Check if game is finished (all players guessed)
      const allGuessed = Array.from(room.players.values())
        .filter(p => p.isConnected)
        .every(p => p.hasGuessedCorrectly);

      if (allGuessed) {
        room.phase = 'FINISHED';
        this.clearTurnTimer(room.roomCode);
        return { success: true, correct: true, lockUntil: 0, room, gameFinished: true };
      }

      // Advance to next turn (winner becomes spectator-participant)
      this.advanceTurn(room.roomCode);
      
      return { success: true, correct: true, lockUntil: 0, room, gameFinished: false };
    } else {
      // Wrong guess - apply penalty lock
      const lockUntil = now + room.settings.guessLockDuration;
      player.guessLockUntil = lockUntil;
      
      return { success: true, correct: false, lockUntil, room, gameFinished: false };
    }
  }

  // ============================================
  // GAME COMPLETION
  // ============================================

  getGameResults(roomCode: string): GameFinishedPayload | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const rankings = Array.from(room.players.values())
      .map(player => ({
        playerId: player.id,
        playerName: player.name,
        turnsToGuess: player.turnsToGuess,
        guessedCorrectly: player.hasGuessedCorrectly,
      }))
      .sort((a, b) => {
        // Players who guessed correctly rank higher
        if (a.guessedCorrectly !== b.guessedCorrectly) {
          return a.guessedCorrectly ? -1 : 1;
        }
        // Among those who guessed, fewer turns = better
        return a.turnsToGuess - b.turnsToGuess;
      });

    return { rankings };
  }

  // ============================================
  // SERIALIZATION
  // ============================================

  serializeGameState(room: GameState): SerializableGameState {
    return {
      roomCode: room.roomCode,
      hostId: room.hostId,
      phase: room.phase,
      players: Object.fromEntries(room.players),
      playerOrder: room.playerOrder,
      turnState: room.turnState,
      questionHistory: room.questionHistory,
      createdAt: room.createdAt,
      settings: room.settings,
    };
  }

  /**
   * Creates a view of the game state for a specific player
   * Hides the player's own assigned identity
   */
  serializeGameStateForPlayer(room: GameState, playerId: string): SerializableGameState {
    const serialized = this.serializeGameState(room);
    
    // Hide the requesting player's own identity (the core game mechanic)
    const playerData = serialized.players[playerId];
    if (playerData && !playerData.hasGuessedCorrectly) {
      serialized.players[playerId] = {
        ...playerData,
        assignedIdentity: undefined, // Hidden from self
      };
    }

    return serialized;
  }
}

// Singleton instance
export const roomManager = new RoomManager();
