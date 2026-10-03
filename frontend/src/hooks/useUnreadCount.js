import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useChat } from '../context/ChatContext';

export const useUnreadCount = () => {
  const { socket } = useChat();
  const [unread, setUnread] = useState(0);
  const timer = useRef(null);

  const refresh = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const res = await axios.get('/chat/unread-count');
        if (res.data.success) setUnread(res.data.unread);
      } catch {
        // ignore - count updates are best effort
      }
    }, 250);
  };

  useEffect(() => {
    if (!socket) return undefined;
    refresh();
    socket.on('chat:unread', refresh);
    socket.on('chat:message', refresh);
    socket.on('chat:read', refresh);
    socket.on('connect', refresh);
    return () => {
      clearTimeout(timer.current);
      socket.off('chat:unread', refresh);
      socket.off('chat:message', refresh);
      socket.off('chat:read', refresh);
      socket.off('connect', refresh);
    };
  }, [socket]);

  return unread;
};
