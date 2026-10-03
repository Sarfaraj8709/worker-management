import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { HardHat, Award, DollarSign, CheckCircle2, ChevronRight, MapPin, Eye, ArrowRight, Clock3, ShieldCheck, KeyRound, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const WorkerDashboard = () => {
  const { user, workerProfile, toggleWorkerAvailability } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [availableRequests, setAvailableRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [availableLoading, setAvailableLoading] = useState(true);

  const fetchJobs = async () => {
    try {
      const res = await axios.get('/worker/jobs');
      if (res.data.success) {
        setJobs(res.data.jobs);
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error('Error fetching worker jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableRequests = async () => {
    try {
      setAvailableLoading(true);
      const res = await axios.get('/requests/available');
      if (res.data.success) {
        setAvailableRequests(res.data.requests || []);
      }
    } catch (err) {
      console.error('Error fetching available requests:', err);
    } finally {
      setAvailableLoading(false);
    }
  };

  const formatTimeLabel = (dateString) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'TBD';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  useEffect(() => {
    fetchJobs();
    fetchAvailableRequests();
  }, []);

  const handleAcceptJob = async (jobId) => {
    try {
      const res = await axios.post(`/worker/jobs/${jobId}/accept`);
      if (res.data.success) {
        fetchJobs();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error accepting job');
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      const res = await axios.patch(`/requests/${requestId}/accept`);
      if (res.data.success) {
        await fetchAvailableRequests();
        await fetchJobs();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error accepting request');
    }
  };

  const handleRejectJob = async (jobId) => {
    if (!window.confirm('Are you sure you want to decline this job assignment?')) return;
    try {
      const res = await axios.post(`/worker/jobs/${jobId}/reject`);
      if (res.data.success) {
        fetchJobs();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error rejecting job');
    }
  };

  const renderNavigationLink = (job) => {
    const loc = job.location || {};
    const destination = `${loc.address || ''}, ${loc.pincode || ''}`.trim().replace(/^,|,$/g, '');
    if (!destination) return null;
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
    return (
      <a
        href={mapsUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center space-x-1 border border-slate-800 bg-slate-900 text-slate-300 font-semibold text-xs px-3.5 py-2.5 rounded-xl hover:bg-slate-800 transition w-full text-center"
      >
        <ArrowRight className="h-4 w-4" />
        <span>Navigate</span>
      </a>
    );
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  // Active Job: Status includes accepted or in progress work
  const activeJobs = jobs.filter((job) => ['Assigned', 'ACCEPTED', 'In Progress', 'IN_PROGRESS'].includes(job.status));
  const pendingAssignments = jobs.filter((job) => ['Assigned', 'ACCEPTED'].includes(job.status)).length;
  const todaysJobs = jobs.filter((job) => {
    const created = new Date(job.createdAt);
    const today = new Date();
    return (
      created.getDate() === today.getDate() &&
      created.getMonth() === today.getMonth() &&
      created.getFullYear() === today.getFullYear()
    );
  }).length;
  // Completed/History Jobs
  const historyJobs = jobs.filter((job) => ['Completed', 'Cancelled'].includes(job.status));

  return (
    <div className="space-y-6">
      {/* Worker Summary */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.6fr,1fr] gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-400 font-semibold">{getGreeting()}, {user?.name || 'Technician'} 👋</p>
              <h1 className="mt-3 text-3xl sm:text-4xl font-semibold text-white tracking-tight">Today&apos;s workboard</h1>
              <p className="mt-2 text-sm text-slate-400 max-w-xl">
                Manage requests, accept jobs, navigate to assignments, and keep your profile ready for better matching.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 px-5 py-4 shadow-sm shadow-slate-900/20">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Availability</p>
              <p className={`mt-3 inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold ${workerProfile?.isAvailable ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'}`}>
                <span className={`mr-2 h-2.5 w-2.5 rounded-full ${workerProfile?.isAvailable ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                {workerProfile?.isAvailable ? 'Available' : 'Busy'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Today&apos;s Jobs</p>
              <p className="mt-3 text-3xl font-semibold text-white">{todaysJobs}</p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Earnings</p>
              <p className="mt-3 text-3xl font-semibold text-white">₹ {stats?.estimatedEarnings || 0}</p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Active Assignments</p>
              <p className="mt-3 text-3xl font-semibold text-white">{pendingAssignments}</p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Rating</p>
              <p className="mt-3 text-3xl font-semibold text-white">⭐ {stats?.rating || 5.0}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-card rounded-3xl p-5 border border-slate-800">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 border border-slate-700 text-slate-200">
                <ShieldCheck className="h-6 w-6 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Profile Snapshot</p>
                <h2 className="mt-2 text-xl font-semibold text-white">{user?.name || 'Your Technician Profile'}</h2>
                <p className="mt-2 text-sm text-slate-400">{workerProfile?.serviceArea ? `Service area: ${workerProfile.serviceArea}` : 'Service area not set yet.'}</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Skills</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(workerProfile?.skills || []).map((skill) => (
                    <span key={skill} className="rounded-full bg-slate-800 px-3 py-1 text-[11px] text-slate-200">{skill}</span>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Documents / KYC</p>
                <p className="mt-3 text-sm text-slate-300">{user?.address?.pincode ? 'Address verified' : 'KYC pending'}</p>
                <Link
                  to="/worker/verification"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-teal-600/15 px-3 py-1.5 text-xs font-semibold text-teal-300 border border-teal-500/20 transition hover:bg-teal-600/25"
                >
                  <ShieldCheck className="h-3.5 w-3.5" /> Manage Documents
                </Link>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-5 border border-slate-800">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Service Area</p>
                <p className="mt-2 text-lg font-semibold text-white">{workerProfile?.serviceArea || 'Not set'}</p>
              </div>
              <div className="rounded-3xl bg-slate-950/70 px-4 py-3 text-sm text-slate-300 border border-slate-800">Current pace</div>
            </div>
            <div className="mt-4 flex items-center gap-3 text-sm text-slate-400">
              <Clock3 className="h-4 w-4" />
              <span>Keep your availability ON to receive jobs in your selected service area.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-5 border border-slate-800/80 flex items-center space-x-4">
          <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shrink-0">
            <Award className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-mono">Performance Rating</p>
            <p className="text-2xl font-bold text-slate-100 mt-0.5">{stats?.rating || 5.0} / 5.0</p>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border border-slate-800/80 flex items-center space-x-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-mono">Jobs Completed</p>
            <p className="text-2xl font-bold text-slate-100 mt-0.5">{stats?.jobsCompleted || 0}</p>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border border-slate-800/80 flex items-center space-x-4">
          <div className="h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shrink-0">
            <DollarSign className="h-6 w-6 text-indigo-500" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-mono">Estimated Earnings</p>
            <p className="text-2xl font-bold text-slate-100 mt-0.5">₹ {stats?.estimatedEarnings || 0}</p>
          </div>
        </div>
      </div>

      {/* Available Requests */}
      <div className="space-y-4">
        <div className="glass-card rounded-3xl p-5 border border-slate-800">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Available Requests</h2>
              <p className="text-sm text-slate-400">Open service requests matching your skills and service area.</p>
            </div>
            <span className="rounded-full bg-slate-950/80 px-3 py-1 text-xs font-semibold text-slate-300 border border-slate-800">{availableLoading ? 'Loading…' : `${availableRequests.length} available`}</span>
          </div>

          {workerProfile?.isAvailable === false ? (
            <div className="mt-6 rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6 text-sm text-amber-200">
              You are currently marked busy. Switch availability on to receive new open requests.
            </div>
          ) : availableLoading ? (
            <div className="mt-6 flex items-center justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
            </div>
          ) : availableRequests.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/80 p-6 text-sm text-slate-400">
              There are no open requests available for your skills at the moment. Stay available and refresh periodically.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {availableRequests.map((request) => (
                <div key={request._id} className="rounded-3xl border border-slate-800 bg-slate-950/95 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-[0.24em] text-slate-500">{request.category}</div>
                      <h3 className="text-xl font-semibold text-white mt-2">{request.title}</h3>
                      {request.subCategory && (
                        <p className="text-sm text-cyan-300 mt-1">
                          <span className="font-semibold">Issue:</span> {request.subCategory}
                        </p>
                      )}
                      <p className="text-sm text-slate-400 mt-2 line-clamp-2">{request.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                      <span className="rounded-full bg-slate-900 px-3 py-2">{request.severity} Severity</span>
                      <span className="rounded-full bg-slate-900 px-3 py-2">{new Date(request.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-300">
                      <div className="font-semibold text-slate-100">Customer</div>
                      <div className="mt-2 text-sm">{request.userId?.name || 'Customer'}</div>
                      <div className="text-xs text-slate-500">{request.userId?.phone || 'No phone'}</div>
                    </div>
                    <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-300">
                      <div className="font-semibold text-slate-100">Location</div>
                      <div className="mt-2 text-sm">{request.location?.address || 'Location pending'}</div>
                      <div className="text-xs text-slate-500">Pincode {request.location?.pincode || 'N/A'}</div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => handleAcceptRequest(request._id)}
                      className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition"
                    >
                      Accept Request
                    </button>
                    <span className="text-sm text-slate-500">Waiting {Math.max(0, Math.floor((Date.now() - new Date(request.createdAt).getTime()) / 60000))} minutes</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active Job Feed */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white tracking-tight">Today&apos;s Schedule</h2>
        <p className="text-sm text-slate-400">Review upcoming requests, accept new jobs, and navigate to customer locations.</p>

        {activeJobs.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center p-12 text-center rounded-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 border border-slate-700/60 mb-4">
              <HardHat className="h-6 w-6 text-slate-500" />
            </div>
            <h3 className="text-base font-bold text-slate-200">No active dispatches</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-sm">
              Keep your status set to "Available". When an issue matching your skills arises in pincode "{workerProfile?.serviceArea || 'your service area'}", you will be matched automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeJobs.map((job) => (
              <div key={job._id} className="glass-card rounded-xl p-5 border border-indigo-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 h-1 w-24 bg-gradient-to-r from-indigo-500 to-violet-600"></div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        ['Assigned', 'ACCEPTED'].includes(job.status)
                          ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {['Assigned', 'ACCEPTED'].includes(job.status) ? 'Assigned (Pending Start)' : 'In Progress'}
                      </span>
                      <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                        {job.severity} Severity
                      </span>
                      {job.status === 'ACCEPTED' && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          job.jobOtp?.status === 'pending'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : job.jobOtp?.status === 'expired'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {job.jobOtp?.status === 'pending'
                            ? 'OTP shared — ready to start'
                            : job.jobOtp?.status === 'expired'
                              ? 'OTP expired'
                              : 'Waiting for customer OTP'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-500">
                      <span className="inline-flex h-7 items-center rounded-full bg-slate-950/80 px-3 py-1 text-[11px] font-semibold text-slate-300">
                        {formatTimeLabel(job.scheduledAt || job.createdAt)}
                      </span>
                      <span className="inline-flex h-7 items-center rounded-full bg-slate-950/80 px-3 py-1 text-[11px] font-semibold text-slate-300">
                        {job.status === 'Assigned' ? 'Request' : 'In Progress'}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-100 mt-3">{job.title}</h3>
                    <p className="text-sm text-slate-400 mt-1">{job.description}</p>
 
                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-xs text-slate-500">
                      <div className="flex items-center space-x-1.5">
                        <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                        <span>{job.location?.address || 'Location pending'}{job.location?.pincode ? ` • ${job.location.pincode}` : ''}</span>
                      </div>
                      <div>
                        <span>Customer: <strong className="text-slate-300">{job.userId?.name || 'Customer'}</strong>{job.userId?.phone ? ` (${job.userId.phone})` : ''}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto shrink-0 pt-3 md:pt-0 border-t border-slate-800 md:border-t-0 justify-end">
                    <Link
                      to={`/tickets/${job._id}`}
                      className="inline-flex items-center justify-center space-x-1 border border-slate-800 bg-slate-900 text-slate-300 font-semibold text-xs px-3.5 py-2.5 rounded-xl hover:bg-slate-800 transition"
                    >
                      <Eye className="h-4 w-4" />
                      <span>Details & Work Log</span>
                    </Link>

                    <Link
                      to={`/tickets/${job._id}?chat=open`}
                      className="inline-flex items-center justify-center space-x-1 border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 font-semibold text-xs px-3.5 py-2.5 rounded-xl hover:bg-emerald-500/20 transition"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>Chat</span>
                    </Link>

                    {renderNavigationLink(job)}

                    {job.status === 'Assigned' && (
                      <div className="flex gap-2 w-full">
                        <button
                          onClick={() => handleAcceptJob(job._id)}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl transition cursor-pointer"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleRejectJob(job._id)}
                          className="flex-1 border border-rose-500/20 bg-rose-500/5 text-rose-400 hover:bg-rose-500/10 font-semibold text-xs px-3.5 py-2.5 rounded-xl transition cursor-pointer"
                        >
                          Decline
                        </button>
                      </div>
                    )}

                    {job.status === 'ACCEPTED' && (
                      <div className="flex flex-col gap-2 w-full">
                        <Link
                          to={`/tickets/${job._id}`}
                          className="inline-flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl transition"
                        >
                          <KeyRound className="h-4 w-4" />
                          {job.jobOtp?.status === 'pending' ? 'Enter OTP to Start Work' : 'Get OTP to Start Work'}
                        </Link>
                        <button
                          onClick={() => handleRejectJob(job._id)}
                          className="w-full border border-rose-500/20 bg-rose-500/5 text-rose-400 hover:bg-rose-500/10 font-semibold text-xs px-3.5 py-2.5 rounded-xl transition cursor-pointer"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white tracking-tight">Completed Tasks History</h2>
        {historyJobs.length === 0 ? (
          <div className="text-center py-6 text-sm text-slate-500 italic">No historical records found.</div>
        ) : (
          <div className="glass-card rounded-xl border border-slate-800 divide-y divide-slate-850">
            {historyJobs.map((job) => (
              <Link
                key={job._id}
                to={`/tickets/${job._id}`}
                className="flex items-center justify-between p-4 hover:bg-slate-800/40 transition group"
              >
                <div>
                  <h4 className="text-sm font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">
                    {job.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Category: {job.category} • Resolved: {job.resolvedAt ? new Date(job.resolvedAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    job.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                  }`}>
                    {job.status}
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkerDashboard;
