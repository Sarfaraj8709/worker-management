import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import ChatLauncher from '../components/chat/ChatLauncher';
import { ArrowLeft, MapPin, User, AlertCircle, CheckCircle2, Star, Image, FileText, KeyRound, Copy, RefreshCw, ShieldCheck, MessageCircle, Smartphone } from 'lucide-react';

const TicketDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const chatOpenFromUrl = searchParams.get('chat') === 'open';

  const [ticket, setTicket] = useState(null);
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Resolution form states (for Worker)
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionImage, setResolutionImage] = useState(null);
  const [resolutionPreview, setResolutionPreview] = useState('');
  const [submittingResolution, setSubmittingResolution] = useState(false);

  // Review form states (for Client)
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Job Start OTP states (Client generates, Worker verifies)
  const [otpState, setOtpState] = useState(null);
  const [generatingOtp, setGeneratingOtp] = useState(false);
  const [copied, setCopied] = useState(false);

  // Worker OTP entry states
  const [workerOtp, setWorkerOtp] = useState('');
  const [startingJob, setStartingJob] = useState(false);
  const [otpError, setOtpError] = useState('');

  const fetchTicketDetails = async () => {
    try {
      const res = await axios.get(`/tickets/${id}`);
      if (res.data.success) {
        setTicket(res.data.ticket);
        setReview(res.data.review);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch ticket details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicketDetails();
    if (user?.role === 'user') {
      fetchJobOtp();
    }
  }, [id]);

  // Client Action: Fetch current Job Start OTP (restores it after a page refresh)
  const fetchJobOtp = async () => {
    try {
      const res = await axios.get(`/tickets/${id}/otp`);
      if (res.data.success) {
        setOtpState(res.data.otp);
      }
    } catch (err) {
      // Not critical - the customer can regenerate the OTP if needed.
    }
  };

  // Client Action: Generate / regenerate Job Start OTP
  const handleGenerateOtp = async () => {
    setGeneratingOtp(true);
    setOtpError('');
    try {
      const res = await axios.post(`/tickets/${id}/otp`);
      if (res.data.success) {
        setOtpState(res.data.otp);
        setCopied(false);
        setWorkerOtp('');
      }
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Failed to generate OTP');
    } finally {
      setGeneratingOtp(false);
    }
  };

  // Client Action: Copy OTP to clipboard (with fallback for non-HTTPS / old browsers)
  const handleCopyOtp = async () => {
    const code = otpState?.code;
    if (!code) return;
    let ok = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code);
        ok = true;
      }
    } catch (err) {
      ok = false;
    }
    if (!ok) {
      const ta = document.createElement('textarea');
      ta.value = code;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, 99999);
      try {
        ok = document.execCommand('copy');
      } catch (err) {
        ok = false;
      }
      document.body.removeChild(ta);
    }
    if (ok) {
      setCopied(true);
      setOtpError('');
      setTimeout(() => setCopied(false), 2000);
    } else {
      setCopied(false);
      setOtpError('Copy failed - select the code above and copy it manually.');
    }
  };

  const getWorkerPhone = () =>
    ticket?.workerId?.phone ? String(ticket.workerId.phone).replace(/[^+\d]/g, '') : '';

  // Client Action: Share OTP to the worker via WhatsApp
  const handleWhatsAppShare = () => {
    const code = otpState?.code;
    if (!code) return;
    const phone = getWorkerPhone();
    if (!phone) {
      setOtpError('No worker phone number available - copy the code and share it manually.');
      return;
    }
    const name = ticket?.workerId?.name || 'technician';
    const message = `Hi ${name}, here is your FixMate Job Start OTP: ${code}. Enter it in the app to begin the job. It expires in 10 minutes.`;
    window.open(`https://wa.me/${phone.replace(/^\+/, '')}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  // Client Action: Share OTP to the worker via SMS
  const handleSmsShare = () => {
    const code = otpState?.code;
    if (!code) return;
    const phone = getWorkerPhone();
    if (!phone) {
      setOtpError('No worker phone number available - copy the code and share it manually.');
      return;
    }
    const message = `FixMate Job Start OTP: ${code}. Enter it in the app to begin the job. It expires in 10 minutes.`;
    window.location.href = `sms:${phone.replace(/^\+/, '')}?body=${encodeURIComponent(message)}`;
  };

  // Worker Action: Start job after verifying the customer's OTP
  const handleStartWithOtp = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(workerOtp)) {
      setOtpError('Please enter the 6-digit OTP shared by the customer.');
      return;
    }
    setStartingJob(true);
    setOtpError('');
    try {
      const res = await axios.post(`/worker/jobs/${id}/start`, { otp: workerOtp });
      if (res.data.success) {
        setWorkerOtp('');
        await fetchTicketDetails();
      }
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Failed to start job with OTP');
      if (err.response?.data?.otpLocked) {
        setOtpState((prev) => (prev ? { ...prev, status: 'expired', code: null } : prev));
      }
    } finally {
      setStartingJob(false);
    }
  };

  // Worker Action: Accept Job
  const handleAccept = async () => {
    try {
      const res = await axios.post(`/worker/jobs/${id}/accept`);
      if (res.data.success) {
        fetchTicketDetails();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error accepting job');
    }
  };

  // Worker Action: Reject/Decline Job
  const handleReject = async () => {
    if (!window.confirm('Are you sure you want to decline this job assignment?')) return;
    try {
      const res = await axios.post(`/worker/jobs/${id}/reject`);
      if (res.data.success) {
        navigate('/dashboard');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error rejecting job');
    }
  };

  // Worker Action: Submit completion
  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!resolutionNotes) {
      alert('Please provide resolution notes before completing.');
      return;
    }

    setSubmittingResolution(true);
    const data = new FormData();
    data.append('notes', resolutionNotes);
    if (resolutionImage) {
      data.append('resolutionImage', resolutionImage);
    }

    try {
      const res = await axios.post(`/worker/jobs/${id}/resolve`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      if (res.data.success) {
        fetchTicketDetails();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to complete job');
    } finally {
      setSubmittingResolution(false);
    }
  };

  // Client Action: Submit Review
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!comment) {
      alert('Please add a comment for your review.');
      return;
    }

    setSubmittingReview(true);
    try {
      const res = await axios.post(`/tickets/${id}/reviews`, { rating, comment });
      if (res.data.success) {
        fetchTicketDetails();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Client Action: Cancel ticket
  const handleCancelTicket = async () => {
    if (!window.confirm('Are you sure you want to cancel this ticket?')) return;
    try {
      const res = await axios.patch(`/tickets/${id}/status`, { status: 'Cancelled' });
      if (res.data.success) {
        fetchTicketDetails();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel ticket');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <AlertCircle className="h-12 w-12 text-rose-500 mb-2" />
          <h3 className="text-lg font-bold text-slate-200">Error Loading Ticket</h3>
          <p className="text-sm text-slate-400 mt-1">{error || 'Ticket not found.'}</p>
          <Link to="/dashboard" className="mt-4 bg-slate-800 text-xs px-4 py-2 border border-slate-700 rounded-lg text-slate-300">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isUserOwner = user.role === 'user' && ticket.userId._id === user._id;
  const isAssignedWorker = ticket.workerId && ticket.workerId._id === user._id;
  const isAdmin = user.role === 'admin';

  // Chat is available to the owner (once a worker is assigned), the assigned worker, or an admin
  const canChatHere = (isUserOwner && ticket.workerId) || isAssignedWorker || isAdmin;

  // Helper to format Date
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto max-w-5xl w-full px-4 py-8">
        {/* Back Link + Chat shortcut */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
          {canChatHere && (
            <Link
              to={`/tickets/${id}?chat=open`}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-4 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 transition"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Chat with {ticket.workerId ? ticket.workerId.name?.split(' ')[0] : 'the other party'}
            </Link>
          )}
        </div>

        {/* Outer Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info Columns (2 Span) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ticket Header card */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
              <div className="flex justify-between items-start flex-wrap gap-2">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                  ticket.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  ['In Progress', 'IN_PROGRESS'].includes(ticket.status) ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                  ['Assigned', 'ACCEPTED'].includes(ticket.status) ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                  ticket.status === 'Cancelled' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                  'bg-blue-500/10 text-blue-400 border-blue-500/20'
                }`}>
                  {ticket.status === 'IN_PROGRESS' ? 'In Progress' : ticket.status}
                </span>
                <div className="flex space-x-2">
                  <span className="bg-slate-800 text-slate-400 text-[10px] px-2.5 py-1 rounded font-semibold font-mono">
                    {ticket.category}
                  </span>
                  <span className="bg-slate-850 text-slate-400 text-[10px] px-2.5 py-1 rounded font-semibold font-mono">
                    {ticket.severity} Severity
                  </span>
                </div>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">
                {ticket.title}
              </h1>

              <div className="flex flex-wrap text-xs text-slate-500 gap-x-4 gap-y-1 pt-1">
                <span>Created: {formatDate(ticket.createdAt)}</span>
                {ticket.resolvedAt && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-400">Resolved: {formatDate(ticket.resolvedAt)}</span>
                  </>
                )}
              </div>

              <div className="border-t border-slate-800/80 pt-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">Issue Description</h3>
                <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {ticket.description}
                </p>
              </div>

              {/* Uploaded image if exists */}
              {ticket.images && ticket.images.length > 0 && (
                <div className="border-t border-slate-800/80 pt-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 font-mono">Attachment Photo</h3>
                  <div className="max-w-md rounded-xl border border-slate-800 overflow-hidden bg-slate-950">
                    {/* Make sure we prepend API url if paths are relative */}
                    <img
                      src={`http://localhost:5000${ticket.images[0]}`}
                      alt="Issue Attachment"
                      className="w-full h-auto object-cover max-h-80"
                      onError={(e) => {
                        e.target.style.display = 'none'; // Hide if file not found
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Job Start OTP Panel (Customer only view) */}
            {isUserOwner &&
              ticket.workerId &&
              ['Assigned', 'ACCEPTED'].includes(ticket.status) && (
                <div className="glass-card rounded-2xl p-6 border border-cyan-500/20 bg-cyan-500/5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 shrink-0">
                      <KeyRound className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-cyan-300">Job Start OTP</h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Generate a 6-digit code and share it with {ticket.workerId.name || 'your technician'}. The job can only begin once the worker enters this code.
                      </p>
                    </div>
                  </div>

                  {otpState?.status === 'pending' && otpState.code ? (
                    <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/70 p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Share this code with the worker</p>
                          <button
                            type="button"
                            onClick={handleCopyOtp}
                            title="Click to copy"
                            className="mt-2 block text-left font-mono text-4xl sm:text-5xl font-bold tracking-[0.35em] text-cyan-300 neon-text-cyan cursor-pointer select-all hover:text-cyan-200 transition"
                          >
                            {otpState.code}
                          </button>
                          {copied && <p className="mt-1 text-[11px] font-semibold text-emerald-400">Copied to clipboard!</p>}
                        </div>
                        <div className="flex flex-col items-start sm:items-end gap-2 text-xs text-slate-400">
                          <span className="inline-flex items-center gap-1.5">
                            Expires in
                            <OtpExpiryTimer expiresAt={otpState.expiresAt} />
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] uppercase tracking-[0.22em] text-slate-500 w-full sm:w-auto">
                          Send to {ticket.workerId.name || 'the worker'}
                        </span>
                        <button
                          type="button"
                          onClick={handleWhatsAppShare}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/15 border border-emerald-500/30 px-3 py-1.5 font-semibold text-emerald-300 hover:bg-emerald-600/25 transition"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          WhatsApp
                        </button>
                        <button
                          type="button"
                          onClick={handleSmsShare}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-semibold text-slate-200 hover:bg-slate-800 transition"
                        >
                          <Smartphone className="h-3.5 w-3.5" />
                          SMS
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyOtp}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-3 py-1.5 font-semibold text-cyan-300 hover:bg-cyan-500/20 transition"
                        >
                          {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          {copied ? 'Copied!' : 'Copy code'}
                        </button>
                      </div>
                      <div className="border-t border-slate-800 pt-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-slate-500">
                          The OTP becomes invalid once verified or after {otpState.maxAttempts} wrong attempts.
                        </p>
                        <button
                          type="button"
                          onClick={handleGenerateOtp}
                          disabled={generatingOtp}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition disabled:opacity-50"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          {generatingOtp ? 'Generating...' : 'Regenerate OTP'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="text-sm text-slate-300">
                        {otpState?.status === 'expired'
                          ? 'Your previous OTP expired or was locked. Generate a fresh code to share with the worker.'
                          : 'Your technician is assigned and ready. Generate an OTP before they start work.'}
                      </div>
                      <button
                        type="button"
                        onClick={handleGenerateOtp}
                        disabled={generatingOtp}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm px-4 py-2.5 transition disabled:opacity-50 shrink-0"
                      >
                        <KeyRound className="h-4 w-4" />
                        {generatingOtp ? 'Generating...' : otpState?.status === 'expired' ? 'Generate New OTP' : 'Generate OTP'}
                      </button>
                    </div>
                  )}

                  {otpError && <p className="text-xs text-rose-400">{otpError}</p>}
                </div>
              )}

            {/* Resolution Block */}
            {ticket.status === 'Completed' && (
              <div className="glass-card rounded-2xl p-6 border border-emerald-500/20 bg-emerald-500/5 space-y-4">
                <div className="flex items-center space-x-2 text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <h2 className="text-sm font-bold uppercase tracking-wider font-mono">Resolution Summary</h2>
                </div>
                <div className="space-y-3">
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">
                    {ticket.resolutionNotes || 'No notes provided by the technician.'}
                  </p>
                  {ticket.resolutionImage && (
                    <div className="max-w-md rounded-xl border border-slate-800 overflow-hidden bg-slate-950">
                      <img
                        src={`http://localhost:5000${ticket.resolutionImage}`}
                        alt="Resolution proof"
                        className="w-full h-auto object-cover max-h-80"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Client feedback section */}
            {ticket.status === 'Completed' && review && (
              <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Client Feedback</h3>
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`h-4.5 w-4.5 fill-current ${i < review.rating ? 'text-amber-400' : 'text-slate-700'}`} />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-slate-300 italic">
                  "{review.comment}"
                </p>
                <p className="text-[10px] text-slate-500 text-right">
                  - Given on {new Date(review.createdAt).toLocaleDateString()}
                </p>
              </div>
            )}

            {/* Submit resolution notes (Worker only view) */}
            {isAssignedWorker && ['In Progress', 'IN_PROGRESS'].includes(ticket.status) && (
              <div className="glass-card rounded-2xl p-6 border border-indigo-500/20 space-y-4">
                <div className="flex items-center space-x-2 text-indigo-400">
                  <FileText className="h-5 w-5" />
                  <h2 className="text-sm font-bold uppercase tracking-wider font-mono">Log Work Completion</h2>
                </div>

                <form onSubmit={handleResolveSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Resolution Summary / Notes*</label>
                    <textarea
                      rows="3"
                      required
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      className="block w-full rounded-xl border border-slate-700 bg-slate-950/50 py-2.5 px-3 text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm transition resize-none"
                      placeholder="Explain what steps you took to repair the issue..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Completion Photo Proof (Optional)</label>
                    <div className="flex items-center space-x-4">
                      <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-500 hover:text-slate-300 transition">
                        <Image className="h-5 w-5" />
                        <span className="text-[9px] mt-1">Upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              setResolutionImage(file);
                              setResolutionPreview(URL.createObjectURL(file));
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                      {resolutionPreview && (
                        <div className="relative h-16 w-24 border border-slate-800 rounded-xl overflow-hidden">
                          <img src={resolutionPreview} alt="Resolution" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              setResolutionImage(null);
                              setResolutionPreview('');
                            }}
                            className="absolute top-0.5 right-0.5 rounded-full bg-slate-950/80 p-0.5 text-xs text-slate-400 hover:text-white"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingResolution}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2.5 rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    {submittingResolution ? 'Logging Details...' : 'Mark Dispatched Repair as Completed'}
                  </button>
                </form>
              </div>
            )}

            {/* Leave Review Form (Client only view, when completed and review doesn't exist) */}
            {isUserOwner && ticket.status === 'Completed' && !review && (
              <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
                <div className="flex items-center space-x-1.5 text-amber-500">
                  <Star className="h-5 w-5 fill-current" />
                  <h3 className="text-sm font-bold uppercase tracking-wider font-mono">Rate Technician Service</h3>
                </div>

                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  {/* Star Rating Selectors */}
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400 mr-2">Your Rating:</span>
                    {[1, 2, 3, 4, 5].map((starNum) => (
                      <button
                        type="button"
                        key={starNum}
                        onClick={() => setRating(starNum)}
                        className="text-amber-500 hover:scale-110 transition cursor-pointer"
                      >
                        <Star className={`h-6 w-6 fill-current ${rating >= starNum ? 'text-amber-400' : 'text-slate-800'}`} />
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Feedback Comment*</label>
                    <textarea
                      rows="3"
                      required
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="block w-full rounded-xl border border-slate-700 bg-slate-950/50 py-2.5 px-3 text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm transition resize-none"
                      placeholder="Share your experience with the repair quality, timeliness, and behavior..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2.5 rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    {submittingReview ? 'Submitting...' : 'Submit Feedback & Complete Log'}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Right Sidebar Columns (1 Span) */}
          <div className="space-y-6">
            {/* Status Timeline Card */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Dispatch Timeline</h3>

              <div className="space-y-4 text-xs font-medium pl-2">
                <div className="flex items-center space-x-3">
                  <span className={`h-4.5 w-4.5 rounded-full flex items-center justify-center border font-bold font-mono text-[9px] ${
                    ['OPEN', 'Pending', 'Assigned', 'ACCEPTED', 'In Progress', 'IN_PROGRESS', 'Completed'].includes(ticket.status)
                      ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40'
                      : 'bg-slate-900 border-slate-800 text-slate-600'
                  }`}>✓</span>
                  <div>
                    <div className="text-slate-200">Issue Reported</div>
                    <div className="text-[10px] text-slate-500">{formatDate(ticket.createdAt)}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className={`h-4.5 w-4.5 rounded-full flex items-center justify-center border font-bold font-mono text-[9px] ${
                    ['Assigned', 'ACCEPTED', 'In Progress', 'IN_PROGRESS', 'Completed'].includes(ticket.status)
                      ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40'
                      : 'bg-slate-900 border-slate-800 text-slate-600'
                  }`}>✓</span>
                  <div>
                    <div className="text-slate-200 font-semibold">Worker Assigned</div>
                    <div className="text-[10px] text-slate-500">
                      {ticket.workerId ? 'Matching success' : 'Waiting for technician'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className={`h-4.5 w-4.5 rounded-full flex items-center justify-center border font-bold font-mono text-[9px] ${
                    ['In Progress', 'Completed'].includes(ticket.status)
                      ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40'
                      : 'bg-slate-900 border-slate-800 text-slate-600'
                  }`}>✓</span>
                  <div>
                    <div className="text-slate-200">Work Started</div>
                    <div className="text-[10px] text-slate-500">In Progress on site</div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className={`h-4.5 w-4.5 rounded-full flex items-center justify-center border font-bold font-mono text-[9px] ${
                    ticket.status === 'Completed'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-slate-900 border-slate-800 text-slate-600'
                  }`}>✓</span>
                  <div>
                    <div className="text-slate-200">Completed & Logged</div>
                    {ticket.resolvedAt && <div className="text-[10px] text-slate-500">{formatDate(ticket.resolvedAt)}</div>}
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Profiles */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Dispatched Profiles</h3>

              {/* Client Profile Card */}
              <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl space-y-2">
                <span className="text-[9px] uppercase tracking-wider font-mono text-slate-500">Reported By (Client)</span>
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-full bg-slate-850 flex items-center justify-center font-bold text-xs text-slate-300">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-slate-200">{ticket.userId.name}</div>
                    <div className="text-slate-400 mt-0.5">{ticket.userId.email}</div>
                    <div className="text-indigo-400 mt-1 font-semibold">{ticket.userId.phone}</div>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-start space-x-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0 mt-0.5" />
                  <span>{ticket.location.address} (Pincode: {ticket.location.pincode})</span>
                </div>
              </div>

              {/* Worker Profile Card */}
              {ticket.workerId ? (
                <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl space-y-2">
                  <span className="text-[9px] uppercase tracking-wider font-mono text-slate-500">Assigned Technician</span>
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-indigo-500/10 flex items-center justify-center font-bold text-xs text-indigo-400 border border-indigo-500/20">
                      <Star className="h-4 w-4 fill-current text-indigo-400" />
                    </div>
                    <div className="text-xs">
                      <div className="font-bold text-slate-200">{ticket.workerId.name}</div>
                      <div className="text-slate-400 mt-0.5">{ticket.workerId.email}</div>
                      <div className="text-indigo-400 mt-1 font-semibold">{ticket.workerId.phone}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/50 border border-slate-850 p-4 rounded-xl text-center text-xs text-slate-500 italic">
                  No technician assigned yet.
                </div>
              )}
            </div>

            {/* General Actions Panel */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Dispatches Control</h3>

              {/* Cancel Button for Client */}
              {isUserOwner && !['Completed', 'Cancelled'].includes(ticket.status) && (
                <button
                  onClick={handleCancelTicket}
                  className="w-full bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 hover:text-white font-semibold text-xs py-2.5 rounded-xl transition cursor-pointer"
                >
                  Cancel Support Request
                </button>
              )}

              {/* Accept/Decline Options for assigned Worker */}
              {isAssignedWorker && ticket.status === 'Assigned' && (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleAccept}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2.5 rounded-xl transition cursor-pointer"
                  >
                    Accept Work Assignment
                  </button>
                  <button
                    onClick={handleReject}
                    className="w-full border border-rose-500/20 bg-rose-500/5 text-rose-400 hover:bg-rose-500/10 font-semibold text-xs py-2.5 rounded-xl transition cursor-pointer"
                  >
                    Decline Assignment
                  </button>
                </div>
              )}

              {/* OTP-based Work Start for Worker */}
              {isAssignedWorker && ticket.status === 'ACCEPTED' && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
                    <div className="flex items-start gap-2.5">
                      <KeyRound className="h-4 w-4 text-cyan-400 mt-0.5 shrink-0" />
                      <div className="text-xs text-slate-300 space-y-1.5">
                        <p className="font-semibold text-cyan-300">Start with Job Start OTP</p>

                        {ticket.jobOtp?.status === 'verified' ? (
                          <p className="text-emerald-400">OTP verified. Work can now begin.</p>
                        ) : ticket.jobOtp?.status === 'expired' ? (
                          <p>Your OTP expired or was locked. Ask the customer to generate a new one.</p>
                        ) : ticket.jobOtp?.status === 'pending' ? (
                          <>
                            <p>Enter the 6-digit code shared by the customer.</p>
                            <p className="text-[10px] text-slate-500">
                              Expires in <OtpExpiryTimer expiresAt={ticket.jobOtp.expiresAt} /> · {Math.max(0, (ticket.jobOtp.maxAttempts || 5) - (ticket.jobOtp.attempts || 0))} attempts left
                            </p>
                          </>
                        ) : (
                          <p>Waiting for the customer to generate an OTP. Ask them to open this request and tap &quot;Generate OTP&quot;.</p>
                        )}
                      </div>
                    </div>

                    {ticket.jobOtp?.status === 'pending' && (
                      <form onSubmit={handleStartWithOtp} className="mt-3 space-y-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          pattern="[0-9]{6}"
                          required
                          value={workerOtp}
                          onChange={(e) => {
                            setWorkerOtp(e.target.value.replace(/\D/g, ''));
                            setOtpError('');
                          }}
                          placeholder="••••••"
                          disabled={startingJob}
                          className="block w-full rounded-xl border border-slate-700 bg-slate-950/60 py-2.5 px-3 text-center font-mono text-xl tracking-[0.5em] text-slate-100 placeholder-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition disabled:opacity-50"
                        />
                        <button
                          type="submit"
                          disabled={startingJob}
                          className="w-full inline-flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs py-2.5 rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          {startingJob ? 'Verifying OTP...' : 'Verify OTP & Start Job'}
                        </button>
                      </form>
                    )}

                    {otpError && <p className="text-[11px] text-rose-400 mt-1.5">{otpError}</p>}
                  </div>

                  <button
                    onClick={handleReject}
                    className="w-full border border-rose-500/20 bg-rose-500/5 text-rose-400 hover:bg-rose-500/10 font-semibold text-xs py-2.5 rounded-xl transition cursor-pointer"
                  >
                    Decline Assignment
                  </button>
                </div>
              )}

              {/* Status helper text */}
              <div className="text-[10px] text-slate-500 text-center leading-normal">
                Dispatches are audited automatically. For system issues contact support@taskflow.com.
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Real-time chat with the service partner */}
      {canChatHere && (
        <ChatLauncher ticketId={id} ticket={ticket} initialOpen={chatOpenFromUrl} />
      )}
    </div>
  );
};

const OtpExpiryTimer = ({ expiresAt }) => {
  const [remaining, setRemaining] = useState(() =>
    expiresAt ? Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)) : 0
  );

  useEffect(() => {
    if (!expiresAt) return undefined;
    let timer;
    const tick = () => {
      const secs = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setRemaining(secs);
      if (secs <= 0 && timer) clearInterval(timer);
    };
    tick();
    timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const label = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <span className={`font-mono tabular-nums ${remaining <= 60 ? 'text-rose-400' : 'text-slate-300'}`}>
      {label}
    </span>
  );
};

export default TicketDetails;
