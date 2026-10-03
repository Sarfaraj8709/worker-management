import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Wrench, LogOut, PlusCircle, ClipboardList, TrendingUp, User, MapPin, Moon, Sun, ShieldCheck, MessageCircle } from 'lucide-react';
import { useUnreadCount } from '../hooks/useUnreadCount';

const Navbar = () => {
  const { user, workerProfile, logout, toggleWorkerAvailability } = useAuth();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(true);
  const unread = useUnreadCount();

  useEffect(() => {
    // initialize from localStorage or prefer system setting, default dark for the app
    try {
      const saved = localStorage.getItem('theme');
      if (saved) {
        setIsDark(saved === 'dark');
        document.documentElement.classList.toggle('light-mode', saved !== 'dark');
      } else {
        setIsDark(true);
        document.documentElement.classList.remove('light-mode');
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    try {
      document.documentElement.classList.toggle('light-mode', !next);
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch (e) {
      // ignore storage errors
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleAvailabilityToggle = async () => {
    if (toggleWorkerAvailability) {
      await toggleWorkerAvailability();
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-[#153226] bg-[#010907]/95 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center space-x-2 text-xl font-semibold tracking-tight text-white hover:opacity-90">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400/10 border border-emerald-300/20 shadow-md shadow-emerald-500/10">
                <Wrench className="h-5 w-5 text-[#69ECBF]" />
              </div>
              <span>FixMate</span>
              <span className="hidden sm:inline text-[10px] bg-emerald-400/[0.06] border border-emerald-300/15 px-2 py-0.5 rounded-full text-[#69ECBF] font-mono tracking-wide">
                Home Services
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          {user && (
            <div className="hidden md:flex items-center space-x-6 text-sm font-medium">
              <Link to="/dashboard" className="text-slate-300 hover:text-white transition duration-150">
                Dashboard
              </Link>
              <Link to="/messages" className="relative flex items-center space-x-1.5 text-slate-300 hover:text-white transition duration-150">
                <MessageCircle className="h-4 w-4 text-emerald-400" />
                <span>Messages</span>
                {unread > 0 && (
                  <span className="absolute -right-3 -top-2 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white ring-2 ring-[#010907]">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </Link>
              {user.role === 'worker' && (
                <Link to="/worker/verification" className="flex items-center space-x-1.5 text-slate-300 hover:text-white transition duration-150">
                  <ShieldCheck className="h-4 w-4 text-teal-400" />
                  <span>Documents &amp; Verification</span>
                </Link>
              )}
              {(user.role === 'admin' || user.role === 'organization_admin') && (
                <Link to="/admin/dashboard" className="text-slate-300 hover:text-white transition duration-150">
                  Admin Console
                </Link>
              )}
              {user.role === 'user' && (
                <>
                  <Link to="/tickets/new" className="flex items-center space-x-1.5 text-slate-300 hover:text-white transition duration-150">
                    <PlusCircle className="h-4 w-4 text-indigo-400" />
                    <span>Report Issue</span>
                  </Link>
                </>
              )}
            </div>
          )}

          {/* Right section: Profile & Logout */}
          <div className="flex items-center space-x-4">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title="Toggle theme"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition cursor-pointer"
            >
              {isDark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>

            {user ? (
              <>
                {/* Worker availability toggle */}
                {user.role === 'worker' && workerProfile && (
                  <div className="flex items-center space-x-2 bg-slate-800/50 border border-slate-700/60 rounded-full px-3 py-1 text-xs">
                    <span className="text-slate-400">Status:</span>
                    <button
                      onClick={handleAvailabilityToggle}
                      className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold transition cursor-pointer ${
                        workerProfile.isAvailable
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      <span className={`mr-1 h-1.5 w-1.5 rounded-full ${workerProfile.isAvailable ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                      {workerProfile.isAvailable ? 'Available' : 'Busy'}
                    </button>
                  </div>
                )}

                {/* Profile Widget */}
                <div className="flex items-center space-x-3 border-l border-slate-800 pl-4">
                  <div className="hidden lg:flex flex-col text-right">
                    <span className="text-xs font-semibold text-slate-200">{user.name}</span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">
                      {user.role}
                    </span>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-bold uppercase shadow-sm">
                    {user.name.charAt(0)}
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-rose-400 hover:border-rose-500/20 hover:bg-rose-500/5 transition cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="h-4.5 w-4.5" />
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white transition">
                  Login
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg bg-[#69ECBF] px-3.5 py-1.5 text-sm font-semibold text-[#010907] hover:bg-[#8FF0D1] shadow-sm transition"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
