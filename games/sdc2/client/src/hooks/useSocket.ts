import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../shared/types/index.js';

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SERVER_URL = import.meta.env.VITE_SERVER_URL || '';
const SOCKET_PATH = import.meta.env.VITE_SOCKET_PATH || '/sdc2/socket.io';

export function useSocket() {
  const socketRef = useRef<GameSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [idleDisconnected, setIdleDisconnected] = useState(false);

  useEffect(() => {
    const socket: GameSocket = io(SERVER_URL, {
      path: SOCKET_PATH,
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('[Socket] 已连接', socket.id);
      setConnected(true);
      setIdleDisconnected(false);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] 断开', reason);
      setConnected(false);
    });

    // 空闲断开：禁止自动重连
    socket.on('idle:disconnect', () => {
      console.log('[Socket] 服务端因空闲断开连接');
      setIdleDisconnected(true);
      socket.io.opts.reconnection = false;
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  const reconnect = useCallback(() => {
    const socket = socketRef.current;
    if (socket) {
      socket.io.opts.reconnection = true;
      setIdleDisconnected(false);
      socket.connect();
    }
  }, []);

  return { socket: socketRef.current, connected, idleDisconnected, reconnect };
}
