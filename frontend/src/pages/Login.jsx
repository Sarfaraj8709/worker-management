import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Wrench, Shield, HardHat, User, Key, AlertCircle } from 'lucide-react';

const Login = () => {
  const { login, error, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const navigate = useNavigate();

  const handleDemoLogin = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!email || !password) {
      setFormError('Please enter email and password');
      return;
    }

    const res = await login(email, password);
    if (res.success) {
      const role = res.user?.role;
      navigate(role === 'admin' || role === 'organization_admin' ? '/admin/dashboard' : '/dashboard');
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8 gradient-bg">
      <div className="w-full max-w-md space-y-8 glass-card p-8 rounded-2xl border border-slate-800">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
            <Wrench className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-white">Welcome Back</h2>
          <p className="mt-2 text-sm text-slate-400">
            Or{' '}
            <Link to="/register" className="font-semibold text-indigo-400 hover:text-indigo-300 transition duration-150">
              create a new account
            </Link>
          </p>
        </div>

        {/* Errors */}
        {(error || formError) && (
          <div className="flex items-center space-x-2 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{formError || error}</span>
          </div>
        )}

        {/* Login Form */}
        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <User className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border border-slate-700 bg-slate-950/50 py-3.5 pl-10 pr-3 text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm transition"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Key className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-slate-700 bg-slate-950/50 py-3.5 pl-10 pr-3 text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm transition"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition duration-150"
            >
              Forgot password?
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex justify-center rounded-xl bg-[#69ECBF] px-6 py-3 text-sm font-semibold text-[#010907] hover:bg-[#8FF0D1] focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:ring-offset-2 focus:ring-offset-[#010907] transition shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                'Sign In'
              )}
            </button>
          </div>
        </form>

        {/* Demo Accounts */}
        <div className="mt-8 border-t border-slate-800 pt-6">
          <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase text-center mb-4">
            Quick demo sign-in
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={() => handleDemoLogin('client1@client.com', 'client123')}
              className="flex items-center justify-center space-x-1 rounded-lg border border-slate-800 bg-slate-900/50 py-2 px-3 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition cursor-pointer"
            >
              <User className="h-3.5 w-3.5 text-indigo-400" />
              <span>Client Demo</span>
            </button>
            <button
              onClick={() => handleDemoLogin('worker1@worker.com', 'worker123')}
              className="flex items-center justify-center space-x-1 rounded-lg border border-slate-800 bg-slate-900/50 py-2 px-3 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition cursor-pointer"
            >
              <HardHat className="h-3.5 w-3.5 text-amber-400" />
              <span>Worker Demo</span>
            </button>
            <button
              onClick={() => handleDemoLogin('admin@worker.com', 'admin123')}
              className="flex items-center justify-center space-x-1 rounded-lg border border-slate-800 bg-slate-900/50 py-2 px-3 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition cursor-pointer"
            >
              <Shield className="h-3.5 w-3.5 text-violet-400" />
              <span>Admin Demo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
