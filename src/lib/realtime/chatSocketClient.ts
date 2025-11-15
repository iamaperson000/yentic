'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  io,
  type DisconnectReason,
  type ManagerOptions,
  type Socket,
  type SocketOptions,
} from 'socket.io-client';

const CHAT_NAMESPACE = '/chat';
const DEFAULT_TYPING_TTL = 3500; // milliseconds
const ACK_TIMEOUT_MS = 7000;

type AckError = { code: string; message: string };

type AckResponse<T extends object = object> = {
  ok: boolean;
  error?: AckError | null;
} & T;

export interface UseChatSocketOptions {
  sessionId?: string;
  /**
   * Optional user metadata that will be forwarded to the server.
   * Additional properties can be added as your protocol evolves.
   */
  user?: {
    id: string;
    displayName?: string;
  };
  /**
   * When true (default), the hook automatically joins/leaves the provided sessionId.
   */
  autoJoin?: boolean;
  /**
   * Optional token forwarded to the server for placeholder authorization.
   */
  authToken?: string;
  /**
   * Optional overrides forwarded to the socket.io-client constructor.
   * Useful if you want to tweak transports or reconnection behaviour for specific callers.
   */
  socketOptions?: Partial<ManagerOptions & SocketOptions>;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  displayName: string;
  text: string;
  sentAt: string;
}

export interface TypingIndicator {
  userId: string;
  displayName: string;
  expiresAt: number;
}

export interface ChatParticipant {
  socketId: string;
  userId: string;
  displayName: string;
  status?: string;
  lastSeenAt: string;
}

export interface UseChatSocketResult {
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastError: string | null;
  participants: ChatParticipant[];
  typingUsers: TypingIndicator[];
  messages: ChatMessage[];
  joinRoom: (
    roomId: string,
    metadata?: { userId?: string; displayName?: string },
  ) => Promise<AckResponse<{ roomId: string; participants?: ChatParticipant[] }>>;
  leaveRoom: (roomId: string) => Promise<AckResponse<{ roomId: string }>>;
  sendMessage: (
    text: string,
    options?: { roomId?: string; messageId?: string },
  ) => Promise<AckResponse<{ message?: ChatMessage }>>;
  emitTyping: (isTyping: boolean, roomId?: string) => void;
  updatePresence: (status: string, roomId?: string) => void;
  reconnect: () => void;
}

function getSocketUrl() {
  if (typeof window === 'undefined') {
    return null;
  }

  const baseUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (!baseUrl) {
    console.warn('NEXT_PUBLIC_SOCKET_URL is not defined. Socket client will remain idle.');
    return null;
  }

  return `${baseUrl}${CHAT_NAMESPACE}`;
}

/**
 * Reusable hook that manages a Socket.IO chat connection.
 * Compatible with both Next.js App Router and Pages Router environments.
 */
export function useChatSocket(options: UseChatSocketOptions = {}): UseChatSocketResult {
  const { sessionId, user, autoJoin = true, authToken, socketOptions } = options;
  const socketRef = useRef<Socket | null>(null);
  const [connectionState, setConnectionState] = useState<UseChatSocketResult['connectionState']>('connecting');
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const typingMapRef = useRef<Map<string, TypingIndicator>>(new Map());
  const lastJoinedRoomRef = useRef<string | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);

  const socketUrl = getSocketUrl();
  const derivedSocketOptions = useMemo(() => (socketOptions ? { ...socketOptions } : {}), [socketOptions]);

  useEffect(() => {
    if (!socketUrl) {
      return undefined;
    }

    const socket = io(socketUrl, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelayMax: 8000,
      withCredentials: true,
      transports: ['websocket'],
      auth: authToken ? { token: authToken } : undefined,
      ...derivedSocketOptions,
    });

    socketRef.current = socket;

    const handleConnect = () => {
      setConnectionState('connected');
      setLastError(null);
      logClientEvent('connect', { id: socket.id });
    };
    const handleDisconnect = (reason: DisconnectReason) => {
      setConnectionState('disconnected');
      logClientEvent('disconnect', { reason });
    };
    const handleReconnectAttempt = () => {
      setConnectionState('connecting');
      logClientEvent('reconnect_attempt', {});
    };
    const handleConnectError = (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      setConnectionState('error');
      setLastError(message);
      logClientEvent('connect_error', { message });
    };
    const handleMessage = (incoming: ChatMessage) => {
      setMessages(previous => {
        const next = previous.concat(incoming);
        return next.slice(-200);
      });
    };
    const handlePresence = (payload: { participants?: ChatParticipant[] }) => {
      if (Array.isArray(payload.participants)) {
        setParticipants(payload.participants);
      }
    };
    const handleTyping = (payload: { userId?: string; displayName?: string; isTyping?: boolean }) => {
      if (!payload?.userId) {
        return;
      }
      const expiresAt = Date.now() + DEFAULT_TYPING_TTL;
      if (payload.isTyping) {
        typingMapRef.current.set(payload.userId, {
          userId: payload.userId,
          displayName: payload.displayName ?? payload.userId,
          expiresAt,
        });
      } else {
        typingMapRef.current.delete(payload.userId);
      }
      setTypingUsers(Array.from(typingMapRef.current.values()));
    };
    const handleRoomJoined = (payload: { participants?: ChatParticipant[] }) => {
      if (Array.isArray(payload.participants)) {
        setParticipants(payload.participants);
      }
    };
    const handleRoomLeft = () => {
      setParticipants([]);
      typingMapRef.current = new Map();
      setTypingUsers([]);
      lastJoinedRoomRef.current = undefined;
    };
    const handleRoomError = (payload: { message?: string }) => {
      if (payload?.message) {
        setLastError(payload.message);
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.io.on('reconnect_attempt', handleReconnectAttempt);
    socket.on('connect_error', handleConnectError);
    socket.on('error', handleConnectError);
    socket.on('message', handleMessage);
    socket.on('presence-update', handlePresence);
    socket.on('typing', handleTyping);
    socket.on('room-joined', handleRoomJoined);
    socket.on('room-left', handleRoomLeft);
    socket.on('room-error', handleRoomError);

    socket.connect();

    return () => {
      socket.io.off('reconnect_attempt', handleReconnectAttempt);
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      typingMapRef.current = new Map();
      setTypingUsers([]);
      setParticipants([]);
      setMessages([]);
      setConnectionState('disconnected');
      lastJoinedRoomRef.current = undefined;
    };
  }, [socketUrl, authToken, derivedSocketOptions, socketOptions]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const interval = window.setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [userId, indicator] of typingMapRef.current.entries()) {
        if (indicator.expiresAt <= now) {
          typingMapRef.current.delete(userId);
          changed = true;
        }
      }
      if (changed) {
        setTypingUsers(Array.from(typingMapRef.current.values()));
      }
    }, 750);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const emitWithAck = useCallback(
    <T extends object>(eventName: string, payload: Record<string, unknown>) => {
      const socket = socketRef.current;
      if (!socket) {
        return Promise.resolve({
          ok: false,
          error: { code: 'SOCKET_UNAVAILABLE', message: 'Socket has not been initialised yet.' },
        } as AckResponse<T>);
      }

      return new Promise<AckResponse<T>>(resolve => {
        const timer = setTimeout(() => {
          resolve({
            ok: false,
            error: { code: 'ACK_TIMEOUT', message: `No acknowledgement received for ${eventName}.` },
          } as AckResponse<T>);
        }, ACK_TIMEOUT_MS);

        socket.emit(eventName, payload, (response: AckResponse<T>) => {
          clearTimeout(timer);
          const normalised = response ?? ({ ok: true } as AckResponse<T>);
          resolve(normalised);
        });
      });
    },
    [],
  );

  const resolvedSessionId = sessionId;

  const joinRoom = useCallback<UseChatSocketResult['joinRoom']>(
    (roomId, metadata) => {
      if (lastJoinedRoomRef.current !== roomId) {
        lastJoinedRoomRef.current = roomId;
        setMessages([]);
        typingMapRef.current = new Map();
        setTypingUsers([]);
      }

      const payload = {
        sessionId: roomId,
        userId: metadata?.userId ?? user?.id,
        displayName: metadata?.displayName ?? user?.displayName,
      };

      return emitWithAck<{ roomId: string; participants?: ChatParticipant[] }>('join-room', payload).then(response => {
        if (!response.ok && response.error) {
          setLastError(response.error.message);
        }
        return response;
      });
    },
    [emitWithAck, user?.displayName, user?.id],
  );

  const leaveRoom = useCallback<UseChatSocketResult['leaveRoom']>(
    roomId => {
      if (lastJoinedRoomRef.current === roomId) {
        lastJoinedRoomRef.current = undefined;
      }

      return emitWithAck<{ roomId: string }>('leave-room', { sessionId: roomId }).then(response => {
        if (!response.ok && response.error) {
          setLastError(response.error.message);
        }
        return response;
      });
    },
    [emitWithAck],
  );

  const sendMessage = useCallback<UseChatSocketResult['sendMessage']>(
    (text, options) => {
      const targetRoom = options?.roomId ?? resolvedSessionId;
      const trimmed = text.trim();
      if (!targetRoom || !trimmed) {
        return Promise.resolve({
          ok: false,
          error: { code: 'MESSAGE_REQUIRED', message: 'A roomId and non-empty text are required.' },
        } as AckResponse<{ message?: ChatMessage }>);
      }

      const payload = {
        sessionId: targetRoom,
        message: {
          id: options?.messageId,
          text: trimmed,
          userId: user?.id,
          displayName: user?.displayName,
        },
      };

      return emitWithAck<{ message?: ChatMessage }>('send-message', payload).then(response => {
        if (!response.ok && response.error) {
          setLastError(response.error.message);
        }
        return response;
      });
    },
    [emitWithAck, resolvedSessionId, user?.displayName, user?.id],
  );

  const emitTyping = useCallback<UseChatSocketResult['emitTyping']>(
    (isTyping, roomId) => {
      const targetRoom = roomId ?? resolvedSessionId;
      const socket = socketRef.current;
      if (!socket || !targetRoom) {
        return;
      }

      socket.emit('typing', {
        sessionId: targetRoom,
        isTyping,
        userId: user?.id,
        displayName: user?.displayName,
      });
    },
    [resolvedSessionId, user?.displayName, user?.id],
  );

  const updatePresence = useCallback<UseChatSocketResult['updatePresence']>(
    (status, roomId) => {
      const targetRoom = roomId ?? resolvedSessionId;
      const socket = socketRef.current;
      if (!socket || !targetRoom) {
        return;
      }

      socket.emit('presence-update', {
        sessionId: targetRoom,
        status,
      });
    },
    [resolvedSessionId],
  );

  const reconnect = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) {
      return;
    }

    setConnectionState('connecting');
    socket.connect();
    socket.emit('client-reconnecting', { sessionId: resolvedSessionId });
  }, [resolvedSessionId]);

  useEffect(() => {
    if (!autoJoin || !resolvedSessionId) {
      return undefined;
    }

    const performJoin = () => {
      void joinRoom(resolvedSessionId).catch(() => {
        /* errors are stored via setLastError */
      });
    };

    const socket = socketRef.current;
    if (socket?.connected) {
      performJoin();
    } else {
      socket?.once('connect', performJoin);
    }

    return () => {
      const activeSocket = socketRef.current;
      if (!activeSocket) {
        return;
      }

      if (activeSocket.connected) {
        void leaveRoom(resolvedSessionId);
      } else {
        activeSocket.off('connect', performJoin);
      }
    };
  }, [autoJoin, joinRoom, leaveRoom, resolvedSessionId]);

  const missingSocketUrlMessage = 'Missing NEXT_PUBLIC_SOCKET_URL environment variable.';
  const connectionStateForReturn: UseChatSocketResult['connectionState'] = socketUrl
    ? connectionState
    : 'error';
  const lastErrorForReturn = socketUrl ? lastError : missingSocketUrlMessage;

  const result = useMemo<UseChatSocketResult>(
    () => ({
      connectionState: connectionStateForReturn,
      lastError: lastErrorForReturn,
      participants,
      typingUsers,
      messages,
      joinRoom,
      leaveRoom,
      sendMessage,
      emitTyping,
      updatePresence,
      reconnect,
    }),
    [connectionStateForReturn, emitTyping, joinRoom, lastErrorForReturn, leaveRoom, messages, participants, reconnect, sendMessage, typingUsers, updatePresence],
  );

  return result;
}

function logClientEvent(event: string, metadata: Record<string, unknown>) {
  if (process.env.NODE_ENV !== 'production') {
    console.debug(`[socket-client] ${event}`, metadata);
  }
}
