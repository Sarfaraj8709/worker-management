import React, { useEffect, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import ChatWindow from './ChatWindow';

const ChatLauncher = ({ ticketId, ticket, initialOpen = false }) => {
  const { socket } = useChat();
  const [open, setOpen] = useState(initialOpen);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    setOpen(initialOpen);
  }, [initialOpen]);

  // Track unread messages for this ticket while the launcher is closed
  useEffect(() => {
    if (!socket) return undefined;
    const onUnread = (payload) => {
      if (payload && String(payload.ticketId) === String(ticketId)) {
        setUnread(payload.unreadCount || 0);
      }
    };
    socket.on('chat:unread', onUnread);
    return () => socket.off('chat:unread', onUnread);
  }, [socket, ticketId]);

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  return (
    <>
      {/* Floating chat button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Open chat"
        className="fixed bottom-5 right-5 z-[90] flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-2xl shadow-emerald-950/60 ring-1 ring-emerald-400/30 transition hover:bg-emerald-500"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white ring-2 ring-[#0B0B0D]">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Floating chat panel */}
      {open && (
        <div className="fixed bottom-20 right-5 z-[90] flex h-[560px] max-h-[calc(100dvh-6.5rem)] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[#26262A] bg-[#0B0B0D] shadow-2xl shadow-black/70">
          <ChatWindow ticketId={ticketId} ticket={ticket} onClose={() => setOpen(false)} />
        </div>
      )}
    </>
  );
};

export default ChatLauncher;
