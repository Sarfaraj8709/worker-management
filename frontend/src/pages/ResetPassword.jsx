import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { KeyRound, AlertCircle } from 'lucide-react';
import { resetPassword } from '../services/auth';

const ResetPassword = () => {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      setFormError('Password must be at least 8 characters and contain letters and numbers');
      return;
    }
    if (password !== confirm) {
      setFormError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      // The backend issued a fresh session cookie; reload so the
      // auth context picks it up.
      setTimeout(() => window.location.replace('/dashboard'), 1500);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not reset the password.');
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
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-white">Choose a new password</h2>
        </div>

        {done ? (
          <p className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-300">
            Password updated! All other sessions have been signed out. Redirecting you…
          </p>
        ) : (
          <>
            {formError && (
              <div className="flex items-center space-x-2 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-slate-300 mb-1">
                  New password
                </label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="block w-full rounded-xl border border-slate-700 bg-slate-950/50 py-3 px-3 text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm transition"
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-300 mb-1">
                  Confirm new password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat the password"
                  className="block w-full rounded-xl border border-slate-700 bg-slate-950/50 py-3 px-3 text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#69ECBF] py-3.5 text-sm font-semibold text-[#010907] hover:bg-[#8FF0D1] focus:outline-none focus:ring-2 focus:ring-emerald-400/40 transition shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Updating…' : 'Update password'}
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

export default ResetPassword;
