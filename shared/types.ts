// ============================================
// SHARED TYPES - Used by both Server & Client
// ============================================

// ---- Player & Identity Types ----

export interface PlayerIdentity {
  displayName: string;        // e.g., "The Rock"
  allowedAliases: string[];   // e.g., ["Dwayne Johnson", "DJ"]
  imageUrl?: string;          // Optional image of the personality
}

export interface Player {
  id: string;                 // Socket ID
  name: string;               // Display name entered by player
  avatarUrl?: string;         // Selfie/avatar image
  targetPlayerId: string;     // Who this player assigns an identity TO (circular linked list)
  assignedIdentity?: PlayerIdentity;  // The identity assigned TO this player (by someone else)
  hasSubmittedAssignment: boolean;    // Has this player submitted their target's identity?
  hasGuessedCorrectly: boolean;       // Has this player won?
  turnsToGuess: number;       // Number of turns it took to guess (for scoring)
  isConnected: boolean;       // Connection status
  guessLockUntil: number;     // Timestamp when guess lock expires (penalty)
  forfeitOrder: number;       // 0 = not forfeited, >0 = order they forfeited (for ranking)
}

// ---- Question & Voting Types ----

export type VoteType = 'YES' | 'NO' | 'MAYBE';

export interface Vote {
  playerId: string;
  vote: VoteType;
}

export interface Question {
  id: string;
  askerId: string;            // Who asked the question
  text: string;               // The question text
  votes: Vote[];              // All votes received
  voteTally: {
    yes: number;
    no: number;
    maybe: number;
  };
  timestamp: number;
}

// ---- Reaction Types ----

export interface Reaction {
  id: string;
  fromPlayerId: string;
  toPlayerId: string;
  emoji: string;
  timestamp: number;
}

// ---- Game State Types ----

export type GamePhase = 
  | 'LOBBY'           // Players joining
  | 'ASSIGNMENT'      // Players assigning identities to targets
  | 'PLAYING'         // Main game loop
  | 'FINISHED';       // Game over

export interface TurnState {
  activeGuesserId: string;    // Current player asking questions
  turnNumber: number;         // Global turn counter
  turnStartTime: number;      // Timestamp when turn started
  turnDuration: number;       // 45000ms (45 seconds)
  currentQuestion?: Question; // The current question being voted on
}

export interface GameState {
  roomCode: string;
  hostId: string;
  phase: GamePhase;
  players: Map<string, Player>;  // Keyed by socket ID
  playerOrder: string[];         // Array of player IDs in circular order
  turnState?: TurnState;
  questionHistory: Question[];   // All questions asked
  createdAt: number;
  settings: GameSettings;
}

export interface GameSettings {
  turnDuration: number;       // Default: 45000ms
  guessLockDuration: number;  // Default: 10000ms (10 seconds)
  minPlayers: number;         // Default: 3
  maxPlayers: number;         // Default: 12
}

// ---- Serializable versions for transmission ----
// Maps cannot be serialized over Socket.io, so we use objects

export interface SerializableGameState {
  roomCode: string;
  hostId: string;
  phase: GamePhase;
  players: Record<string, Player>;  // Object instead of Map
  playerOrder: string[];
  turnState?: TurnState;
  questionHistory: Question[];
  createdAt: number;
  settings: GameSettings;
}

// ============================================
// SOCKET EVENT TYPES
// ============================================

// ---- Client -> Server Events ----

export interface ClientToServerEvents {
  // Lobby events
  create_room: (data: CreateRoomPayload, callback: (response: RoomResponse) => void) => void;
  join_room: (data: JoinRoomPayload, callback: (response: RoomResponse) => void) => void;
  leave_room: () => void;
  
  // Setup events
  start_assignment_phase: () => void;
  submit_assignment: (data: SubmitAssignmentPayload, callback: (response: GenericResponse) => void) => void;
  
  // Game events
  start_game: () => void;
  send_question: (data: SendQuestionPayload, callback: (response: GenericResponse) => void) => void;
  vote: (data: VotePayload) => void;
  make_guess: (data: MakeGuessPayload, callback: (response: GuessResponse) => void) => void;
  send_reaction: (data: SendReactionPayload) => void;
  forfeit: (callback: (response: ForfeitResponse) => void) => void;
  pass_turn: (callback: (response: GenericResponse) => void) => void;
  
  // Utility
  ping: (callback: () => void) => void;
}

// ---- Server -> Client Events ----

export interface ServerToClientEvents {
  // State sync
  game_state_update: (state: SerializableGameState) => void;
  
  // Lobby events
  player_joined: (player: Player) => void;
  player_left: (playerId: string) => void;
  
  // Phase transitions
  phase_changed: (phase: GamePhase) => void;
  
  // Turn events
  turn_started: (turnState: TurnState) => void;
  turn_timeout: (nextGuesserId: string) => void;
  
  // Question & voting
  question_asked: (question: Question) => void;
  vote_received: (data: { questionId: string; voteTally: Question['voteTally'] }) => void;
  
  // Guessing
  correct_guess: (data: { playerId: string; identity: PlayerIdentity }) => void;
  wrong_guess: (data: { playerId: string; lockUntil: number }) => void;
  
  // Forfeit & Pass
  player_forfeited: (data: { playerId: string; playerName: string; identity: PlayerIdentity }) => void;
  turn_passed: (data: { playerId: string; nextGuesserId: string }) => void;
  
  // Reactions
  reaction_received: (reaction: Reaction) => void;
  
  // Game end
  game_finished: (data: GameFinishedPayload) => void;
  
  // Errors
  error: (error: ErrorPayload) => void;
}

// ---- Event Payloads ----

export interface CreateRoomPayload {
  playerName: string;
  avatarUrl?: string;
}

export interface JoinRoomPayload {
  roomCode: string;
  playerName: string;
  avatarUrl?: string;
}

export interface RoomResponse {
  success: boolean;
  roomCode?: string;
  playerId?: string;
  error?: string;
}

export interface GenericResponse {
  success: boolean;
  error?: string;
}

export interface SubmitAssignmentPayload {
  displayName: string;
  allowedAliases: string[];
  imageUrl?: string;
}

export interface SendQuestionPayload {
  text: string;
}

export interface VotePayload {
  questionId: string;
  vote: VoteType;
}

export interface MakeGuessPayload {
  guess: string;
}

export interface GuessResponse {
  success: boolean;
  correct: boolean;
  lockUntil?: number;
  error?: string;
}

export interface ForfeitResponse {
  success: boolean;
  identity?: PlayerIdentity;
  error?: string;
}

export interface SendReactionPayload {
  toPlayerId: string;
  emoji: string;
}

export interface GameFinishedPayload {
  rankings: Array<{
    playerId: string;
    playerName: string;
    turnsToGuess: number;
    guessedCorrectly: boolean;
    forfeited: boolean;
  }>;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

// ============================================
// UTILITY TYPES
// ============================================

export interface RoomManagerInterface {
  createRoom(hostId: string, hostName: string, avatarUrl?: string): string;
  joinRoom(roomCode: string, playerId: string, playerName: string, avatarUrl?: string): GameState | null;
  getRoom(roomCode: string): GameState | undefined;
  getRoomByPlayerId(playerId: string): GameState | undefined;
  removePlayer(playerId: string): void;
}

// Default settings
export const DEFAULT_GAME_SETTINGS: GameSettings = {
  turnDuration: 45000,        // 45 seconds
  guessLockDuration: 10000,   // 10 seconds
  minPlayers: 3,
  maxPlayers: 12,
};
