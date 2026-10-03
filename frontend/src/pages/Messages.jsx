import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { MessageCircle, ChevronRight, Loader2, Wifi, WifiOff, CheckCheck, Check } from 'lucide-react';
import { timeAgo } from '../utils/format';

const JOB_STATUS_STYLE = {
  OPEN: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Assigned: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  ACCEPTED: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  IN_PROGRESS: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  WORKER_ON_THE_WAY: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  ARRIVED: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  Completed: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  Cancelled: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  EXPIRED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const Messages = () => {
  const { user } = useAuth();
  const { socket, connected } = useChat();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refreshTimer = useRef(null);

  const myId = user ? String(user._id) : '';

  const fetchConversations = useCallback(async () => {
    try {
      const res = await axios.get('/chat/conversations');
      if (res.data.success) {
        setConversations(res.data.conversations || []);
        setError('');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Debounced refetch whenever real-time activity lands
  useEffect(() => {
    if (!socket) return undefined;
    const refresh = () => {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(fetchConversations, 350);
    };
    socket.on('chat:message', refresh);
    socket.on('chat:read', refresh);
    socket.on('chat:unread', refresh);
    return () => {
      clearTimeout(refreshTimer.current);
      socket.off('chat:message', refresh);
      socket.off('chat:read', refresh);
      socket.off('chat:unread', refresh);
    };
  }, [socket, fetchConversations]);

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return (
    <div className="min-h-screen bg-[#010907] text-slate-100 flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Messages</h1>
            <p className="mt-1 text-sm text-slate-400">
              Chat in real time with your service partner during an active job.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {connected ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400">
                <Wifi className="h-3.5 w-3.5" /> Live
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400">
                <WifiOff className="h-3.5 w-3.5" /> Offline
              </span>
            )}
            {totalUnread > 0 && (
              <span className="rounded-full bg-rose-500/15 border border-rose-500/25 px-3 py-1.5 text-xs font-bold text-rose-400">
                {totalUnread} unread
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-800 bg-[#101012] py-16 text-center">
            <MessageCircle className="h-10 w-10 text-slate-600" />
            <p className="text-sm text-slate-400">{error}</p>
            <button
              type="button"
              onClick={() => {
                setError('');
                setLoading(true);
                fetchConversations();
              }}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
            >
              Retry
            </button>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-800 bg-[#101012] py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-400">
              <MessageCircle className="h-8 w-8" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">No conversations yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-400">
                Once a {user?.role === 'worker' ? 'job is assigned to you' : 'worker is assigned to your job'}, you can
                chat with them here in real time.
              </p>
            </div>
            <Link
              to="/dashboard"
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conv) => {
              const other = conv.otherParty;
              const last = conv.lastMessage;
              const ownLast = last && String(last.senderId) === myId;
              const statusClass =
                JOB_STATUS_STYLE[conv.ticket.status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';

              return (
                <button
                  key={conv.ticket._id}
                  type="button"
                  onClick={() => navigate(`/tickets/${conv.ticket._id}?chat=open`)}
                  className="group flex w-full items-center gap-4 rounded-2xl border border-[#232326] bg-[#101012] p-4 text-left transition hover:border-emerald-500/40 hover:bg-[#141416]"
                >
                  <div className="relative shrink-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600/15 text-emerald-400 border border-emerald-500/25 font-bold">
                      {(other?.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#101012] ${
                        other?.online ? 'bg-emerald-500' : 'bg-slate-600'
                      }`}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-bold text-white">
                        {other?.name || 'No partner assigned'}
                      </p>
                      <span className="shrink-0 text-[11px] text-slate-500">
                        {last ? timeAgo(last.createdAt) : timeAgo(conv.ticket.updatedAt)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <p
                        className={`truncate text-xs ${
                          conv.unreadCount > 0 ? 'font-semibold text-slate-200' : 'text-slate-500'
                        }`}
                      >
                        {last ? (
                          <>
                            {ownLast && (
                              <span className="mr-1 inline-flex items-center gap-0.5 text-emerald-400">
                                {last.readBy && last.readBy.length > 0 ? (
                                  <CheckCheck className="h-3 w-3" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )}
                                You:
                              </span>
                            )}
                            {last.message}
                          </>
                        ) : (
                          'Say hello to start the conversation'
                        )}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="shrink-0 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusClass}`}>
                    {conv.ticket.status === 'IN_PROGRESS' ? 'In Progress' : conv.ticket.status}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-emerald-400" />
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Messages;
