import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const ChatContext = createContext(null);

const SOCKET_URL = 'http://localhost:5000';

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      setSocket(null);
      setConnected(false);
      return;
    }

    // JWT is stored in an httpOnly cookie, so the handshake carries it automatically
    const s = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onConnectError = () => setConnected(false);

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('connect_error', onConnectError);

    setSocket(s);

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('connect_error', onConnectError);
      s.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [user]);

  return <ChatContext.Provider value={{ socket, connected }}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
