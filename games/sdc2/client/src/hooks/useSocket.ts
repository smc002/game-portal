import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../shared/types/index.js';

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SERVER_URL = import.meta.env.VITE_SERVER_URL || '';
const SOCKET_PATH = import.meta.env.VITE_SOCKET_PATH || '/sdc2/socket.io';

export function useSocket() {
  const socketRef = useRef<GameSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket: GameSocket = io(SERVER_URL, {
      path: SOCKET_PATH,
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('[Socket] 已连接', socket.id);
      setConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] 断开', reason);
      setConnected(false);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  return { socket: socketRef.current, connected };
}
