import React, { useState } from 'react';
import { Menu, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Avatar from './Avatar';
import GlobalSearch from './GlobalSearch';
import NotificationCenter from './NotificationCenter';
import Button from './Button';
import { useNavigate } from 'react-router-dom';

const AdminNavbar = ({ onOpenSidebar }) => {
  const { user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 border-b border-[#153226] bg-[#010907]/85 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          onClick={onOpenSidebar}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 transition hover:text-slate-200 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-4.5 w-4.5" />
        </button>

        <button
          onClick={() => setSearchOpen(true)}
          className="hidden flex-1 items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/50 px-3.5 py-2.5 text-sm text-slate-500 transition hover:border-slate-700 hover:text-slate-300 sm:flex md:max-w-md"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Search users, jobs, services...</span>
          <kbd className="hidden rounded-md border border-slate-700 bg-slate-950 px-1.5 py-0.5 text-[10px] text-slate-500 md:block">
            /
          </kbd>
        </button>

        <button
          onClick={() => setSearchOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 transition hover:text-slate-200 sm:hidden"
          aria-label="Search"
        >
          <Search className="h-4.5 w-4.5" />
        </button>

        <div className="ml-auto flex items-center gap-2.5">
          <NotificationCenter />
          <button
            onClick={() => navigate('/admin/settings')}
            className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/50 py-1.5 pl-1.5 pr-3 transition hover:border-slate-700"
          >
            <Avatar name={user?.name} size="sm" />
            <span className="hidden text-left md:block">
              <span className="block text-xs font-semibold text-slate-200">{user?.name}</span>
              <span className="block text-[10px] uppercase tracking-wider text-indigo-400">Admin</span>
            </span>
          </button>
          <Button variant="secondary" size="sm" className="hidden lg:inline-flex" onClick={() => navigate('/admin/settings')}>
            Settings
          </Button>
        </div>
      </div>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
};

export default AdminNavbar;
