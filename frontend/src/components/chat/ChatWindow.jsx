import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { MessageCircle, X, Send, Check, CheckCheck, Loader2, Wifi, WifiOff, Lock, ShieldCheck } from 'lucide-react';
import { chatTime, groupByDay } from '../../utils/chat';

const QUICK_REPLIES = [
  "I'm on my way",
  'I have reached the location',
  'Please share the Job Start OTP',
  'How much longer?',
  'Thanks for your service!',
];

const isSystemMessage = (m) => m.type === 'system' || m.senderRole === 'system';

const ChatWindow = ({ ticketId, ticket, onClose }) => {
  const { user } = useAuth();
  const { socket, connected } = useChat();

  const [messages, setMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineIds, setOnlineIds] = useState([]);
  const [readLocked, setReadLocked] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');

  const listRef = useRef(null);
  const bottomRef = useRef(null);
  const typingTimerRef = useRef(null);
  const atBottomRef = useRef(true);

  const myId = user ? String(user._id) : '';
  const isOwner = !!(ticket && ticket.userId && user && String(ticket.userId._id || ticket.userId) === myId);
  const isAssignedWorker = !!(ticket && ticket.workerId && user && String(ticket.workerId._id || ticket.workerId) === myId);
  const isAdmin = !!(user && ['admin', 'organization_admin'].includes(user.role));
  const canChat = !!(ticket && user && (isOwner || isAssignedWorker || isAdmin));

  // The "other party" shown in the header (customer <-> worker)
  const peer = isAssignedWorker || isAdmin ? ticket?.userId : ticket?.workerId;
  const peerId = peer ? String(peer._id || peer) : '';
  const peerName = peer?.name || (ticket?.workerId ? 'Assigned Worker' : 'Customer');
  const peerOnline = !!peerId && onlineIds.includes(peerId);

  const loadMessages = useCallback(
    async (before) => {
      try {
        const res = await axios.get(`/chat/${ticketId}/messages`, {
          params: before ? { before, limit: 50 } : { limit: 50 },
        });
        if (res.data.success) {
          const incoming = res.data.messages || [];
          setHasMore(!!res.data.hasMore);
          if (before) {
            setMessages((prev) => [...incoming, ...prev]);
          } else {
            setMessages(incoming);
          }
        }
      } catch (err) {
        if (!before) setLoadError(err.response?.data?.message || 'Could not load messages');
      } finally {
        setLoadingHistory(false);
      }
    },
    [ticketId]
  );

  useEffect(() => {
    if (canChat) loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canChat, ticketId]);

  // Join the ticket room + wire real-time listeners
  useEffect(() => {
    if (!socket || !canChat || !ticketId) return undefined;

    socket.emit('chat:join', { ticketId });

    const onMessage = (msg) => {
      if (String(msg.ticketId) !== String(ticketId)) return;
      setMessages((prev) => (prev.some((m) => String(m._id) === String(msg._id)) ? prev : [...prev, msg]));
    };
    const onTyping = ({ userId, isTyping }) => {
      setTypingUsers((prev) => {
        const next = { ...prev };
        if (!isTyping) delete next[userId];
        else next[userId] = true;
        return next;
      });
    };
    const onRead = ({ messageIds, readerId }) => {
      const ids = Array.isArray(messageIds) ? messageIds.map(String) : [];
      setMessages((prev) =>
        prev.map((m) =>
          ids.includes(String(m._id)) ? { ...m, readBy: Array.from(new Set([...(m.readBy || []), readerId])) } : m
        )
      );
    };
    const onPresence = ({ onlineIds: ids }) => setOnlineIds(Array.isArray(ids) ? ids.map(String) : []);
    const onError = ({ message, locked }) => {
      if (message) setError(message);
      if (locked) setReadLocked(true);
    };

    socket.on('chat:message', onMessage);
    socket.on('chat:typing', onTyping);
    socket.on('chat:read', onRead);
    socket.on('chat:presence', onPresence);
    socket.on('presence:update', onPresence);
    socket.on('chat:error', onError);

    return () => {
      socket.emit('chat:leave', { ticketId });
      socket.off('chat:message', onMessage);
      socket.off('chat:typing', onTyping);
      socket.off('chat:read', onRead);
      socket.off('chat:presence', onPresence);
      socket.off('presence:update', onPresence);
      socket.off('chat:error', onError);
    };
  }, [socket, canChat, ticketId]);

  // Auto-scroll on new content when the user is at the bottom
  useEffect(() => {
    if (atBottomRef.current) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // Mark incoming messages as read
  useEffect(() => {
    if (!socket || !canChat || !myId || messages.length === 0) return;
    const unreadIds = messages
      .filter((m) => m.senderId && String(m.senderId) !== myId && !isSystemMessage(m) && !(m.readBy || []).includes(myId))
      .map((m) => m._id);
    if (unreadIds.length > 0) socket.emit('chat:read', { ticketId, messageIds: unreadIds });
  }, [messages, socket, canChat, ticketId, myId]);

  const loadOlder = async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    await loadMessages(messages[0]._id);
    setLoadingMore(false);
  };

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || !canChat || sending) return;
    if (readLocked) {
      setError('This conversation is read-only because the job is finished.');
      return;
    }
    setError('');
    setSending(true);
    try {
      if (socket && connected) {
        socket.emit('chat:message', { ticketId, message: text });
        setDraft('');
      } else {
        await axios.post(`/chat/${ticketId}/messages`, { message: text });
        setDraft('');
        await loadMessages();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const emitTyping = (isTyping) => {
    if (socket && canChat) socket.emit('chat:typing', { ticketId, isTyping });
  };

  const handleDraftChange = (e) => {
    setDraft(e.target.value);
    emitTyping(true);
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => emitTyping(false), 1200);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const typingPeer = Object.keys(typingUsers).some((id) => id !== myId);
  const anyTyping = typingPeer && messages.length > 0;

  const groups = groupByDay(messages);

  return (
    <div className="flex h-full flex-col bg-[#0B0B0D] text-slate-100">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[#1E1E21] bg-[#101012] px-4 py-3">
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600/15 text-emerald-400 border border-emerald-500/25 font-bold text-sm">
          {peerName.charAt(0).toUpperCase()}
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#101012] ${
              peerOnline ? 'bg-emerald-500' : 'bg-slate-500'
            }`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{peerName}</p>
          <p className="flex items-center gap-1 text-[11px] text-slate-400">
            {peerOnline ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Online
              </>
            ) : (
              'Offline'
            )}
            <span className="text-slate-600">·</span>
            {connected ? (
              <Wifi className="h-3 w-3 text-emerald-400" />
            ) : (
              <WifiOff className="h-3 w-3 text-amber-400" />
            )}
          </p>
        </div>
        {ticket?.status && (
          <span className="hidden sm:inline-flex rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-slate-300">
            {ticket.status === 'IN_PROGRESS' ? 'In Progress' : ticket.status}
          </span>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 transition hover:text-white hover:border-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        onScroll={() => {
          const el = listRef.current;
          if (!el) return;
          atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="chat-scroll flex-1 space-y-1 overflow-y-auto px-4 py-4"
      >
        {loadingHistory ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
          </div>
        ) : loadError ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <MessageCircle className="h-8 w-8 text-slate-600" />
            <p className="text-xs text-slate-400">{loadError}</p>
            <button
              type="button"
              onClick={() => {
                setLoadError('');
                setLoadingHistory(true);
                loadMessages();
              }}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800"
            >
              Retry
            </button>
          </div>
        ) : messages.length === 0 && !typingPeer ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <MessageCircle className="h-8 w-8 text-slate-600" />
            <p className="text-sm font-semibold text-slate-300">No messages yet</p>
            <p className="max-w-[220px] text-xs text-slate-500">
              Coordinate with {peerName.split(' ')[0]} about this job in real time.
            </p>
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="flex justify-center py-1">
                <button
                  type="button"
                  onClick={loadOlder}
                  disabled={loadingMore}
                  className="rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-[11px] font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                >
                  {loadingMore ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Load older messages'}
                </button>
              </div>
            )}

            {groups.map((group) => (
              <div key={group.label}>
                <div className="my-3 flex items-center justify-center">
                  <span className="rounded-full bg-[#1A1A1D] px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {group.label}
                  </span>
                </div>
                {group.items.map((msg) =>
                  isSystemMessage(msg) ? (
                    <div key={String(msg._id)} className="my-2 flex justify-center px-8">
                      <p className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-center text-[11px] text-slate-400">
                        <ShieldCheck className="h-3 w-3 text-emerald-500/70" />
                        {msg.message}
                      </p>
                    </div>
                  ) : (
                    <MessageBubble key={String(msg._id)} msg={msg} own={String(msg.senderId) === myId} peerId={peerId} />
                  )
                )}
              </div>
            ))}

            {anyTyping && (
              <div className="flex items-center gap-2 px-1 py-1">
                <div className="rounded-2xl rounded-bl-md bg-[#1C1C1F] px-3.5 py-2.5">
                  <div className="flex gap-1">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Quick replies */}
      {!readLocked && messages.length > 0 && (
        <div className="chat-scroll flex gap-2 overflow-x-auto border-t border-[#1E1E21] bg-[#04120d] px-3 py-2">
          {QUICK_REPLIES.map((reply) => (
            <button
              key={reply}
              type="button"
              onClick={() => {
                setDraft(reply);
                emitTyping(false);
              }}
              className="shrink-0 rounded-full border border-emerald-500/25 bg-emerald-500/5 px-3 py-1 text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-500/15"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <div className="border-t border-[#1E1E21] bg-[#04120d] p-3">
        {readLocked ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-3 text-xs text-slate-400">
            <Lock className="h-3.5 w-3.5 text-slate-500" />
            Conversation is read-only — the job is finished.
          </div>
        ) : (
          <>
            {error && <p className="mb-2 px-1 text-[11px] text-rose-400">{error}</p>}
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={handleDraftChange}
                onKeyDown={handleKeyDown}
                rows={1}
                maxLength={2000}
                placeholder="Type a message…"
                className="chat-scroll max-h-28 flex-1 resize-none rounded-xl border border-slate-800 bg-[#101012] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30"
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={sending || !draft.trim()}
                aria-label="Send message"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-950/40 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {sending ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Send className="h-4.5 w-4.5" />}
              </button>
            </div>
            <p className="mt-1.5 px-1 text-[10px] text-slate-600">
              {connected ? 'Connected · messages delivered in real time' : 'Reconnecting… messages will be sent on reconnect'}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

const MessageBubble = ({ msg, own, peerId }) => (
  <div className={`flex ${own ? 'justify-end' : 'justify-start'} px-1`}>
    <div
      className={`max-w-[78%] rounded-2xl px-3.5 py-2 shadow-sm ${
        own
          ? 'rounded-br-md bg-emerald-600 text-white'
          : 'rounded-bl-md border border-[#26262A] bg-[#1C1C1F] text-slate-100'
      }`}
    >
      {!own && (
        <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400">
          {msg.senderName || 'User'}
        </p>
      )}
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{msg.message}</p>
      <div className={`mt-1 flex items-center gap-1 ${own ? 'justify-end' : 'justify-start'}`}>
        <span className={`text-[10px] ${own ? 'text-emerald-200/80' : 'text-slate-500'}`}>{chatTime(msg.createdAt)}</span>
        {own &&
          (peerId && (msg.readBy || []).map(String).includes(peerId) ? (
            <CheckCheck className="h-3.5 w-3.5 text-emerald-200" />
          ) : (
            <Check className="h-3.5 w-3.5 text-emerald-200/70" />
          ))}
      </div>
    </div>
  </div>
);

export default ChatWindow;
