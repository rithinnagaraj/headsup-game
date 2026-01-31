// ============================================
// MAIN SERVER - Express + Socket.io
// ============================================

import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  CreateRoomPayload,
  JoinRoomPayload,
  SubmitAssignmentPayload,
  SendQuestionPayload,
  VotePayload,
  MakeGuessPayload,
  SendReactionPayload,
  RoomResponse,
  GenericResponse,
  GuessResponse,
  Reaction,
  GameState,
} from '../shared/types';
import { roomManager } from './RoomManager';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// SERVER SETUP
// ============================================

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function broadcastGameState(room: GameState): void {
  room.players.forEach((player, playerId) => {
    const socket = io.sockets.sockets.get(playerId);
    if (socket) {
      const playerState = roomManager.serializeGameStateForPlayer(room, playerId);
      socket.emit('game_state_update', playerState);
    }
  });
}

function broadcastToRoom(roomCode: string, event: keyof ServerToClientEvents, data: any): void {
  io.to(roomCode).emit(event, data);
}

function startTurnTimerWithBroadcast(roomCode: string): void {
  roomManager.startTurnTimer(roomCode, (room, nextGuesserId) => {
    // Broadcast turn timeout
    broadcastToRoom(roomCode, 'turn_timeout', nextGuesserId);
    
    // Broadcast updated game state
    broadcastGameState(room);
    
    // Start new timer for next turn
    if (room.phase === 'PLAYING') {
      startTurnTimerWithBroadcast(roomCode);
    }
  });
}

// ============================================
// SOCKET CONNECTION HANDLER
// ============================================

io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // ----------------------------------------
  // ROOM MANAGEMENT EVENTS
  // ----------------------------------------

  socket.on('create_room', (data: CreateRoomPayload, callback: (response: RoomResponse) => void) => {
    try {
      const { playerName, avatarUrl } = data;

      if (!playerName || playerName.trim().length === 0) {
        callback({ success: false, error: 'Player name is required' });
        return;
      }

      const roomCode = roomManager.createRoom(socket.id, playerName.trim(), avatarUrl);
      
      socket.join(roomCode);
      
      const room = roomManager.getRoom(roomCode);
      if (room) {
        socket.emit('game_state_update', roomManager.serializeGameState(room));
      }

      console.log(`[Room] Created room ${roomCode} by ${playerName}`);
      callback({ success: true, roomCode, playerId: socket.id });
    } catch (error) {
      console.error('[Room] Error creating room:', error);
      callback({ success: false, error: 'Failed to create room' });
    }
  });

  socket.on('join_room', (data: JoinRoomPayload, callback: (response: RoomResponse) => void) => {
    try {
      const { roomCode, playerName, avatarUrl } = data;

      if (!playerName || playerName.trim().length === 0) {
        callback({ success: false, error: 'Player name is required' });
        return;
      }

      if (!roomCode || roomCode.trim().length === 0) {
        callback({ success: false, error: 'Room code is required' });
        return;
      }

      const room = roomManager.joinRoom(roomCode.toUpperCase(), socket.id, playerName.trim(), avatarUrl);

      if (!room) {
        callback({ success: false, error: 'Room not found or game already started' });
        return;
      }

      socket.join(room.roomCode);

      // Notify existing players
      const newPlayer = room.players.get(socket.id);
      if (newPlayer) {
        socket.to(room.roomCode).emit('player_joined', newPlayer);
      }

      // Send full state to all players
      broadcastGameState(room);

      console.log(`[Room] ${playerName} joined room ${roomCode}`);
      callback({ success: true, roomCode: room.roomCode, playerId: socket.id });
    } catch (error) {
      console.error('[Room] Error joining room:', error);
      callback({ success: false, error: 'Failed to join room' });
    }
  });

  socket.on('leave_room', () => {
    handleDisconnect(socket);
  });

  // ----------------------------------------
  // PHASE TRANSITION EVENTS
  // ----------------------------------------

  socket.on('start_assignment_phase', () => {
    try {
      const room = roomManager.getRoomByPlayerId(socket.id);
      if (!room) {
        socket.emit('error', { code: 'NO_ROOM', message: 'You are not in a room' });
        return;
      }

      const success = roomManager.startAssignmentPhase(room.roomCode, socket.id);
      
      if (!success) {
        socket.emit('error', { 
          code: 'PHASE_ERROR', 
          message: 'Cannot start assignment phase. Are you the host and do you have enough players?' 
        });
        return;
      }

      broadcastToRoom(room.roomCode, 'phase_changed', 'ASSIGNMENT');
      broadcastGameState(room);
      
      console.log(`[Game] Room ${room.roomCode} entered ASSIGNMENT phase`);
    } catch (error) {
      console.error('[Game] Error starting assignment phase:', error);
      socket.emit('error', { code: 'SERVER_ERROR', message: 'Failed to start assignment phase' });
    }
  });

  socket.on('submit_assignment', (data: SubmitAssignmentPayload, callback: (response: GenericResponse) => void) => {
    try {
      const { displayName, allowedAliases, imageUrl } = data;

      if (!displayName || displayName.trim().length === 0) {
        callback({ success: false, error: 'Display name is required' });
        return;
      }

      const result = roomManager.submitAssignment(socket.id, {
        displayName: displayName.trim(),
        allowedAliases: allowedAliases.map(a => a.trim()).filter(a => a.length > 0),
        imageUrl,
      });

      if (!result.success) {
        callback({ success: false, error: 'Failed to submit assignment' });
        return;
      }

      // Broadcast updated state
      if (result.room) {
        broadcastGameState(result.room);
      }

      callback({ success: true });

      // If all players submitted, notify (host can then start the game)
      if (result.allSubmitted && result.room) {
        console.log(`[Game] All assignments submitted in room ${result.room.roomCode}`);
      }
    } catch (error) {
      console.error('[Game] Error submitting assignment:', error);
      callback({ success: false, error: 'Failed to submit assignment' });
    }
  });

  socket.on('start_game', () => {
    try {
      const room = roomManager.getRoomByPlayerId(socket.id);
      if (!room) {
        socket.emit('error', { code: 'NO_ROOM', message: 'You are not in a room' });
        return;
      }

      const result = roomManager.startGame(room.roomCode, socket.id);

      if (!result.success || !result.room) {
        socket.emit('error', { 
          code: 'START_ERROR', 
          message: 'Cannot start game. Are you the host and have all players submitted?' 
        });
        return;
      }

      broadcastToRoom(room.roomCode, 'phase_changed', 'PLAYING');
      
      if (result.room.turnState) {
        broadcastToRoom(room.roomCode, 'turn_started', result.room.turnState);
      }

      broadcastGameState(result.room);

      // Start the turn timer
      startTurnTimerWithBroadcast(room.roomCode);

      console.log(`[Game] Room ${room.roomCode} started playing!`);
    } catch (error) {
      console.error('[Game] Error starting game:', error);
      socket.emit('error', { code: 'SERVER_ERROR', message: 'Failed to start game' });
    }
  });

  // ----------------------------------------
  // GAMEPLAY EVENTS
  // ----------------------------------------

  socket.on('send_question', (data: SendQuestionPayload, callback: (response: GenericResponse) => void) => {
    try {
      const { text } = data;

      if (!text || text.trim().length === 0) {
        callback({ success: false, error: 'Question text is required' });
        return;
      }

      const result = roomManager.submitQuestion(socket.id, text);

      if (!result.success || !result.question || !result.room) {
        callback({ success: false, error: 'Failed to submit question. Is it your turn?' });
        return;
      }

      // Broadcast question to all players
      broadcastToRoom(result.room.roomCode, 'question_asked', result.question);
      broadcastGameState(result.room);

      callback({ success: true });

      console.log(`[Game] Question asked in room ${result.room.roomCode}: "${text.substring(0, 50)}..."`);
    } catch (error) {
      console.error('[Game] Error submitting question:', error);
      callback({ success: false, error: 'Failed to submit question' });
    }
  });

  socket.on('vote', (data: VotePayload) => {
    try {
      const { questionId, vote } = data;

      if (!['YES', 'NO', 'MAYBE'].includes(vote)) {
        socket.emit('error', { code: 'INVALID_VOTE', message: 'Invalid vote type' });
        return;
      }

      const result = roomManager.submitVote(socket.id, questionId, vote);

      if (!result.success || !result.question || !result.room) {
        return; // Silently fail for votes (real-time, no callback)
      }

      // REAL-TIME: Broadcast vote tally immediately (as per PRD)
      broadcastToRoom(result.room.roomCode, 'vote_received', {
        questionId: result.question.id,
        voteTally: result.question.voteTally,
      });

    } catch (error) {
      console.error('[Game] Error submitting vote:', error);
    }
  });

  socket.on('make_guess', (data: MakeGuessPayload, callback: (response: GuessResponse) => void) => {
    try {
      const { guess } = data;

      if (!guess || guess.trim().length === 0) {
        callback({ success: false, correct: false, error: 'Guess is required' });
        return;
      }

      const result = roomManager.makeGuess(socket.id, guess.trim());

      if (!result.success) {
        callback({ 
          success: false, 
          correct: false, 
          lockUntil: result.lockUntil,
          error: result.lockUntil > Date.now() ? 'You are locked from guessing' : 'Failed to make guess'
        });
        return;
      }

      if (result.correct && result.room) {
        const player = result.room.players.get(socket.id);
        
        // Broadcast correct guess
        broadcastToRoom(result.room.roomCode, 'correct_guess', {
          playerId: socket.id,
          identity: player?.assignedIdentity!,
        });

        // Check if game finished
        if (result.gameFinished) {
          const rankings = roomManager.getGameResults(result.room.roomCode);
          if (rankings) {
            broadcastToRoom(result.room.roomCode, 'game_finished', rankings);
          }
          broadcastToRoom(result.room.roomCode, 'phase_changed', 'FINISHED');
        } else {
          // Start new turn timer for next player
          roomManager.clearTurnTimer(result.room.roomCode);
          
          if (result.room.turnState) {
            broadcastToRoom(result.room.roomCode, 'turn_started', result.room.turnState);
          }
          
          startTurnTimerWithBroadcast(result.room.roomCode);
        }

        broadcastGameState(result.room);
        callback({ success: true, correct: true });

        console.log(`[Game] ${player?.name} guessed correctly in room ${result.room.roomCode}!`);
      } else if (result.room) {
        // Wrong guess
        broadcastToRoom(result.room.roomCode, 'wrong_guess', {
          playerId: socket.id,
          lockUntil: result.lockUntil,
        });

        broadcastGameState(result.room);
        callback({ success: true, correct: false, lockUntil: result.lockUntil });
      }
    } catch (error) {
      console.error('[Game] Error making guess:', error);
      callback({ success: false, correct: false, error: 'Failed to make guess' });
    }
  });

  socket.on('send_reaction', (data: SendReactionPayload) => {
    try {
      const { toPlayerId, emoji } = data;

      const room = roomManager.getRoomByPlayerId(socket.id);
      if (!room) return;

      const reaction: Reaction = {
        id: uuidv4(),
        fromPlayerId: socket.id,
        toPlayerId,
        emoji,
        timestamp: Date.now(),
      };

      // Broadcast reaction to all players in the room
      broadcastToRoom(room.roomCode, 'reaction_received', reaction);

    } catch (error) {
      console.error('[Game] Error sending reaction:', error);
    }
  });

  // ----------------------------------------
  // UTILITY EVENTS
  // ----------------------------------------

  socket.on('ping', (callback) => {
    callback();
  });

  // ----------------------------------------
  // DISCONNECT HANDLER
  // ----------------------------------------

  socket.on('disconnect', () => {
    handleDisconnect(socket);
  });
});

function handleDisconnect(socket: Socket<ClientToServerEvents, ServerToClientEvents>): void {
  console.log(`[Socket] Client disconnected: ${socket.id}`);

  const result = roomManager.removePlayer(socket.id);

  if (result.room) {
    // Notify remaining players
    socket.to(result.room.roomCode).emit('player_left', socket.id);
    broadcastGameState(result.room);

    // If game is in progress and active guesser left, advance turn
    if (
      result.room.phase === 'PLAYING' && 
      result.room.turnState?.activeGuesserId === socket.id
    ) {
      const advanceResult = roomManager.advanceTurn(result.room.roomCode);
      if (advanceResult.room && advanceResult.nextGuesserId) {
        roomManager.clearTurnTimer(result.room.roomCode);
        broadcastToRoom(result.room.roomCode, 'turn_started', advanceResult.room.turnState!);
        broadcastGameState(advanceResult.room);
        startTurnTimerWithBroadcast(result.room.roomCode);
      }
    }
  }
}

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                    WHO AM I? SERVER                       ║
╠═══════════════════════════════════════════════════════════╣
║  Status: Running                                          ║
║  Port: ${PORT}                                              ║
║  Socket.io: Enabled                                       ║
║  CORS: ${process.env.CLIENT_URL || 'http://localhost:3000'}                        
╚═══════════════════════════════════════════════════════════╝
  `);
});

export { io, app, httpServer };
