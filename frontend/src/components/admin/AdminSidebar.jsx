import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  HardHat,
  Wrench,
  ClipboardList,
  CreditCard,
  Star,
  MessageSquareWarning,
  ShieldCheck,
  Tag,
  Package,
  Siren,
  BarChart3,
  FileText,
  ScrollText,
  Bell,
  Settings,
  Building2,
  LogOut,
  Wrench as LogoIcon,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Avatar from './Avatar';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [{ to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Management',
    items: [
      { to: '/admin/users', label: 'Users', icon: Users },
      { to: '/admin/properties', label: 'Properties', icon: Building2 },
      { to: '/admin/workers', label: 'Workers', icon: HardHat },
      { to: '/admin/services', label: 'Services', icon: Wrench },
      { to: '/admin/jobs', label: 'Jobs', icon: ClipboardList },
      { to: '/admin/payments', label: 'Payments', icon: CreditCard },
      { to: '/admin/reviews', label: 'Reviews', icon: Star },
      { to: '/admin/complaints', label: 'Complaints', icon: MessageSquareWarning },
    ],
  },
  {
    label: 'Compliance',
    items: [
      { to: '/admin/verification', label: 'Verification', icon: ShieldCheck },
      { to: '/admin/audit-log', label: 'Audit Log', icon: ScrollText },
    ],
  },
  {
    label: 'Growth',
    items: [
      { to: '/admin/promotions', label: 'Promotions', icon: Tag },
      { to: '/admin/packages', label: 'Packages', icon: Package },
      { to: '/admin/emergency', label: 'Emergency', icon: Siren },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/admin/reports', label: 'Reports', icon: FileText },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/admin/notifications', label: 'Notifications', icon: Bell },
      { to: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
];

const AdminSidebar = ({ mobileOpen = false, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pb-5 pt-5">
        <NavLink to="/admin/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0a1f17] shadow-md shadow-[#34d39926]">
            <LogoIcon className="h-5 w-5 text-[#10b981]" />
          </div>
          <div>
            <span className="block text-base font-bold tracking-tight text-white">FixMate</span>
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-[#10b981]">Admin Console</span>
          </div>
        </NavLink>
        <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-200 lg:hidden" aria-label="Close sidebar">
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/admin/dashboard'}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                        isActive
                          ? 'bg-indigo-600/15 text-indigo-300 ring-1 ring-inset ring-indigo-500/30'
                          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                      }`
                    }
                  >
                    <item.icon className="h-4.5 w-4.5 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-800 p-3">
        <div className="mb-2 flex items-center gap-3 rounded-xl bg-slate-900/60 p-3">
          <Avatar name={user?.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-200">{user?.name}</p>
            <p className="truncate text-[11px] text-slate-500">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 py-2 text-sm font-semibold text-slate-400 transition hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-[#153226] bg-[#04120d] lg:block">{content}</aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <aside className="absolute inset-y-0 left-0 w-72 overflow-y-auto border-r border-[#153226] bg-[#04120d]">{content}</aside>
        </div>
      )}
    </>
  );
};

export default AdminSidebar;
