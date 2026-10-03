import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MailCheck, AlertCircle } from 'lucide-react';
import { verifyEmail, resendVerification } from '../services/auth';
import { useAuth } from '../context/AuthContext';

const VerifyEmail = () => {
  const { token } = useParams();
  const { logout } = useAuth();
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resent, setResent] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const res = await verifyEmail(token);
        if (!cancelled && res.success) {
          setStatus('success');
          // The backend issued a fresh session cookie; reload so the
          // auth context picks it up.
          setTimeout(() => window.location.replace('/dashboard'), 1500);
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setMessage(
            err.response?.data?.message ||
              'This verification link is invalid or has expired.'
          );
          // Clean up any stale session cookie from an old login
          logout().catch(() => {});
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleResend = async (e) => {
    e.preventDefault();
    setResent(false);
    try {
      await resendVerification(resendEmail);
      setResent(true);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not send the email.');
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8 gradient-bg">
      <div className="w-full max-w-md space-y-8 glass-card p-8 rounded-2xl border border-slate-800 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
          <MailCheck className="h-6 w-6 text-white" />
        </div>

        {status === 'verifying' && (
          <>
            <h2 className="text-2xl font-bold text-white">Verifying your email…</h2>
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          </>
        )}

        {status === 'success' && (
          <>
            <h2 className="text-2xl font-bold text-emerald-400">Email verified!</h2>
            <p className="text-sm text-slate-400">Redirecting you to your dashboard…</p>
          </>
        )}

        {status === 'error' && (
          <div className="space-y-5 text-left">
            <div className="flex items-start space-x-2 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{message}</span>
            </div>

            {!resent ? (
              <form onSubmit={handleResend} className="space-y-3">
                <label htmlFor="resend-email" className="block text-sm font-medium text-slate-300">
                  Request a new verification link
                </label>
                <input
                  id="resend-email"
                  type="email"
                  required
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="block w-full rounded-xl border border-slate-700 bg-slate-950/50 py-3 px-3 text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm transition"
                />
                <button
                  type="submit"
                  className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition cursor-pointer"
                >
                  Resend verification email
                </button>
              </form>
            ) : (
              <p className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-300">
                If that account exists and is unverified, a new link is on its way.
              </p>
            )}

            <Link
              to="/login"
              className="block text-center text-sm font-medium text-indigo-400 hover:text-indigo-300 transition"
            >
              Back to Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
