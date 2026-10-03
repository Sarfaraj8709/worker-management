import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, MailCheck } from 'lucide-react';
import { forgotPassword } from '../services/auth';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8 gradient-bg">
      <div className="w-full max-w-md space-y-8 glass-card p-8 rounded-2xl border border-slate-800">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
            <KeyRound className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-white">Reset Password</h2>
          <p className="mt-2 text-sm text-slate-400">
            Enter your account email and we'll send you a reset link.
          </p>
        </div>

        {sent ? (
          <div className="space-y-5 text-center">
            <div className="flex items-start space-x-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-300 text-left">
              <MailCheck className="h-5 w-5 shrink-0 mt-0.5" />
              <span>
                If an account exists for that email, a password reset link has
                been sent. The link expires in 10 minutes.
              </span>
            </div>
            <Link
              to="/login"
              className="block text-sm font-medium text-indigo-400 hover:text-indigo-300 transition"
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            {formError && (
              <p className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">
                {formError}
              </p>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="forgot-email" className="block text-sm font-medium text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="block w-full rounded-xl border border-slate-700 bg-slate-950/50 py-3 px-3 text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#69ECBF] py-3.5 text-sm font-semibold text-[#010907] hover:bg-[#8FF0D1] focus:outline-none focus:ring-2 focus:ring-emerald-400/40 transition shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>

            <Link
              to="/login"
              className="block text-center text-sm font-medium text-indigo-400 hover:text-indigo-300 transition"
            >
              Back to Sign In
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
