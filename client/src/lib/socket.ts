// ============================================
// SOCKET SERVICE - Type-safe Socket.io Client
// ============================================

import { io, Socket } from 'socket.io-client';
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
} from '@shared/types';

// Type-safe socket
export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// Singleton socket instance
let socket: GameSocket | null = null;

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

// ============================================
// SOCKET INITIALIZATION
// ============================================

export function getSocket(): GameSocket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function connectSocket(): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = getSocket();
    
    if (s.connected) {
      resolve();
      return;
    }
    
    const onConnect = () => {
      s.off('connect', onConnect);
      s.off('connect_error', onError);
      resolve();
    };
    
    const onError = (error: Error) => {
      s.off('connect', onConnect);
      s.off('connect_error', onError);
      reject(error);
    };
    
    s.on('connect', onConnect);
    s.on('connect_error', onError);
    s.connect();
  });
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
  }
}

// ============================================
// SOCKET EMITTERS (Promise-wrapped)
// ============================================

export function createRoom(data: CreateRoomPayload): Promise<RoomResponse> {
  return new Promise((resolve) => {
    const s = getSocket();
    s.emit('create_room', data, (response) => {
      resolve(response);
    });
  });
}

export function joinRoom(data: JoinRoomPayload): Promise<RoomResponse> {
  return new Promise((resolve) => {
    const s = getSocket();
    s.emit('join_room', data, (response) => {
      resolve(response);
    });
  });
}

export function leaveRoom(): void {
  const s = getSocket();
  s.emit('leave_room');
}

export function startAssignmentPhase(): void {
  const s = getSocket();
  s.emit('start_assignment_phase');
}

export function submitAssignment(data: SubmitAssignmentPayload): Promise<GenericResponse> {
  return new Promise((resolve) => {
    const s = getSocket();
    s.emit('submit_assignment', data, (response) => {
      resolve(response);
    });
  });
}

export function startGame(): void {
  const s = getSocket();
  s.emit('start_game');
}

export function sendQuestion(data: SendQuestionPayload): Promise<GenericResponse> {
  return new Promise((resolve) => {
    const s = getSocket();
    s.emit('send_question', data, (response) => {
      resolve(response);
    });
  });
}

export function vote(data: VotePayload): void {
  const s = getSocket();
  s.emit('vote', data);
}

export function makeGuess(data: MakeGuessPayload): Promise<GuessResponse> {
  return new Promise((resolve) => {
    const s = getSocket();
    s.emit('make_guess', data, (response) => {
      resolve(response);
    });
  });
}

export function sendReaction(data: SendReactionPayload): void {
  const s = getSocket();
  s.emit('send_reaction', data);
}

export function ping(): Promise<number> {
  return new Promise((resolve) => {
    const start = Date.now();
    const s = getSocket();
    s.emit('ping', () => {
      resolve(Date.now() - start);
    });
  });
}
