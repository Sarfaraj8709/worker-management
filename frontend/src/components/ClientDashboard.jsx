import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  MapPin,
  Bell,
  MessageCircle,
  Home,
  ClipboardList,
  Plus,
  User,
  Sparkles,
  ShieldCheck,
  Clock3,
  Star,
  ChevronRight,
  ArrowRight,
  Droplet,
  Zap,
  Snowflake,
  Wrench,
  Brush,
  DoorOpen,
  Settings2,
  X,
  BadgeCheck,
} from 'lucide-react';
import {
  defaultServiceCategories,
  fetchCustomerTickets,
  fetchServiceCategories,
  fetchRecommendedWorkers,
  estimateTicketAmount,
  getSpendingHistory,
  mockNotifications,
} from '../services/dashboard';

const getRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const diff = Date.now() - date.getTime();
  if (Number.isNaN(diff) || diff < 0) return 'just now';
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

const formatScheduleLabel = (ticket) => {
  if (!ticket) return '';
  const now = new Date();
  const base = ticket.scheduledAt ? new Date(ticket.scheduledAt) : new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateLabel = base.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const timeLabel = base.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${dateLabel} • ${timeLabel}`;
};

const categoryIconByName = {
  Plumbing: Droplet,
  Electrical: Zap,
  'AC Repair': Snowflake,
  'Appliance Repair': Wrench,
  Carpentry: Brush,
  Cleaning: Sparkles,
  Painting: Brush,
  'Door & Window': DoorOpen,
};

const miniActions = [
  {
    label: 'Report a Problem',
    icon: Plus,
    to: '/tickets/new',
    variant: 'primary',
  },
  {
    label: 'Book a Service',
    icon: ShieldCheck,
    to: '/tickets/new',
    variant: 'secondary',
  },
  {
    label: 'View Requests',
    icon: ClipboardList,
    to: '#requests',
    variant: 'secondary',
  },
  {
    label: 'Find a Professional',
    icon: User,
    to: '/tickets/new',
    variant: 'secondary',
  },
  {
    label: 'Messages',
    icon: MessageCircle,
    to: '#notifications',
    variant: 'secondary',
  },
];

const spendingHistory = getSpendingHistory();

const baseActions = [
  { name: 'Home', to: '/dashboard', icon: Home },
  { name: 'Requests', to: '#requests', icon: ClipboardList },
  { name: 'Report', to: '/tickets/new', icon: Plus },
  { name: 'Messages', to: '#notifications', icon: MessageCircle },
  { name: 'Profile', to: '/dashboard', icon: User },
];

const ClientDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [services, setServices] = useState(defaultServiceCategories);
  const [professionals, setProfessionals] = useState([]);
  const [selectedPro, setSelectedPro] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [headerSearch, setHeaderSearch] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);

  const greetingName = user?.name?.split(' ')[0] || 'Sarfaraz';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [ticketList, serviceList, workerList] = await Promise.all([
        fetchCustomerTickets(),
        fetchServiceCategories(),
        fetchRecommendedWorkers(),
      ]);
      setTickets(ticketList);
      setServices(serviceList);
      setProfessionals(workerList);
    } catch (err) {
      console.error('Dashboard load error:', err);
      setError('Unable to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSearchNavigate = (query) => {
    const normalized = query?.trim();
    if (!normalized) {
      navigate('/tickets/new');
      return;
    }
    navigate(`/tickets/new?title=${encodeURIComponent(normalized)}`);
  };

  const activeRequest = useMemo(() => {
    return (
      tickets.find((ticket) => ['In Progress', 'IN_PROGRESS', 'ACCEPTED', 'Assigned'].includes(ticket.status)) ||
      tickets.find((ticket) => ['OPEN', 'Pending'].includes(ticket.status))
    );
  }, [tickets]);

  const upcomingService = useMemo(
    () => tickets.find((ticket) => ['OPEN', 'Pending'].includes(ticket.status) || ((['ACCEPTED', 'Assigned'].includes(ticket.status) && !activeRequest))),
    [tickets, activeRequest]
  );

  const recentServices = useMemo(() => tickets.slice(0, 4), [tickets]);

  const stats = useMemo(() => {
    const activeCount = tickets.filter((ticket) => ['OPEN', 'Pending', 'ACCEPTED', 'Assigned', 'In Progress', 'IN_PROGRESS'].includes(ticket.status)).length;
    const completedCount = tickets.filter((ticket) => ticket.status === 'Completed').length;
    const totalSpent = tickets.reduce((sum, ticket) => sum + estimateTicketAmount(ticket), 0);
    return {
      completed: completedCount,
      activeRequests: activeCount,
      totalSpent,
      rating: 4.8,
    };
  }, [tickets]);

  const ticketStatusLabel = (status) => {
    switch (status) {
      case 'OPEN':
        return 'Searching for Professional';
      case 'Pending':
        return 'Searching for Professional';
      case 'ACCEPTED':
        return 'Worker Assigned';
      case 'Assigned':
        return 'Worker Assigned';
      case 'In Progress':
      case 'IN_PROGRESS':
        return 'Work Started';
      case 'Completed':
        return 'Completed';
      case 'Cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const progressSteps = ['Request Created', 'Finding Worker', 'Worker Assigned', 'On The Way', 'Work Started', 'Completed'];

  const getProgressIndex = (status) => {
    switch (status) {
      case 'OPEN':
      case 'Pending':
        return 1;
      case 'ACCEPTED':
      case 'Assigned':
        return 2;
      case 'In Progress':
      case 'IN_PROGRESS':
        return 4;
      case 'Completed':
        return 5;
      case 'Cancelled':
        return 0;
      default:
        return 0;
    }
  };

  const getRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const diff = Date.now() - date.getTime();
    if (Number.isNaN(diff) || diff < 0) return 'just now';
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const formatScheduleLabel = (ticket) => {
    if (!ticket) return '';
    const now = new Date();
    const base = ticket.scheduledAt ? new Date(ticket.scheduledAt) : new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const dateLabel = base.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    const timeLabel = base.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    return `${dateLabel} • ${timeLabel}`;
  };

  const serviceLocation = useMemo(() => {
    if (user?.address) {
      const parts = [user.address.street, user.address.city, user.address.state].filter(Boolean);
      return parts.length ? parts.join(', ') : user.address.pincode || 'Home';
    }
    return 'Add your service address';
  }, [user]);

  const favoriteProfessionals = professionals.slice(0, 4);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return <ErrorState onRetry={loadDashboardData} />;
  }

  return (
    <div className="relative pb-24 xl:pb-0">
      <div className="grid gap-6 xl:grid-cols-[280px,1fr]">
        <aside className="hidden xl:block rounded-[32px] border border-[#153226] bg-[#04120d] p-6 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.6)]">
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Customer Menu</p>
              <h2 className="mt-4 text-lg font-semibold text-slate-100">FixMate Home</h2>
            </div>
            <nav className="space-y-1">
              {[
                { label: 'Dashboard', to: '/dashboard', icon: Home },
                { label: 'My Requests', to: '#requests', icon: ClipboardList },
                { label: 'Services', to: '#services', icon: ShieldCheck },
                { label: 'Find Professionals', to: '/tickets/new', icon: User },
                { label: 'Messages', to: '#notifications', icon: MessageCircle },
                { label: 'Addresses', to: '#location', icon: MapPin },
                { label: 'Payments', to: '#activity', icon: Sparkles },
                { label: 'Reviews', to: '#recent-services', icon: Star },
                { label: 'Notifications', to: '#notifications', icon: Bell },
                { label: 'Settings', to: '/dashboard', icon: Settings2 },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.to}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-400 transition hover:bg-[#0a1f17] hover:text-slate-100"
                >
                  <item.icon className="h-4.5 w-4.5 text-slate-500" />
                  <span>{item.label}</span>
                </a>
              ))}
            </nav>
          </div>
 
          <div className="mt-10 rounded-[32px] border border-[#153226] bg-[#061811] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0e2a20] text-[#C7D2FE] font-semibold shadow-[0_10px_30px_-24px_rgba(105, 236, 191,0.5)]">
                {greetingName.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-100">{user?.name || 'Customer'}</p>
                <p className="text-xs text-slate-500">{user?.email || 'No email available'}</p>
              </div>
            </div>
            <div className="mt-5 rounded-[24px] bg-[#04120d] px-4 py-3 text-sm text-slate-300 border border-[#153226]">
              <div className="text-slate-100 font-semibold">Active</div>
              <div className="text-slate-500">Your account is ready to request service.</div>
            </div>
          </div>
        </aside>

        <section className="space-y-8">
          <DashboardHeader
            user={user}
            name={greetingName}
            greeting={getGreeting()}
            searchValue={headerSearch}
            onSearchChange={setHeaderSearch}
            onSearchSubmit={() => handleSearchNavigate(headerSearch)}
            unreadCount={mockNotifications.filter((notification) => notification.unread).length}
            notifications={mockNotifications}
            onLogout={handleLogout}
            profileOpen={profileOpen}
            setProfileOpen={setProfileOpen}
            locationLabel={serviceLocation}
          />

          <DashboardHero
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onSearchSubmit={() => handleSearchNavigate(searchTerm)}
            onPrimaryAction={() => navigate('/tickets/new')}
            onSecondaryAction={() => navigate('/tickets/new')}
          />

          <div className="grid gap-6 xl:grid-cols-[1.45fr,0.55fr]">
            <div className="space-y-6">
              <ServiceCategories categories={services} onSelect={(category) => navigate(`/tickets/new?category=${encodeURIComponent(category)}`)} />

              <ActiveRequestCard
                activeRequest={activeRequest}
                progressSteps={progressSteps}
                currentStep={getProgressIndex(activeRequest?.status)}
                ticketStatusLabel={ticketStatusLabel}
                onTrack={() => navigate(activeRequest ? `/tickets/${activeRequest._id}` : '/tickets/new')}
                onChat={() => navigate(activeRequest ? `/tickets/${activeRequest._id}?chat=open` : '/tickets/new')}
              />

              <QuickActions actions={miniActions} />
            </div>

            <div className="space-y-6">
              <UpcomingService upcomingService={upcomingService} onView={() => {
                if (upcomingService) {
                  navigate(`/tickets/${upcomingService._id}`);
                } else {
                  navigate('/tickets/new');
                }
              }} />
              <ActivityOverview stats={stats} spendingHistory={spendingHistory} />
              <OffersCard />
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.85fr,0.7fr]">
            <RecommendedProfessionals
              professionals={favoriteProfessionals}
              onBook={(category) => navigate(`/tickets/new?category=${encodeURIComponent(category)}`)}
              onViewProfile={(pro) => setSelectedPro(pro)}
            />
            <div className="space-y-6">
              <RecentServices services={recentServices} onViewAll={() => window.location.assign('#recent-services')} />
              <SavedLocation location={serviceLocation} />
              <NotificationPreview notifications={mockNotifications} />
            </div>
          </div>
        </section>
      </div>

      <WorkerProfileModal
        pro={selectedPro}
        onClose={() => setSelectedPro(null)}
        onBook={(category) => navigate(`/tickets/new${category ? `?category=${encodeURIComponent(category)}` : ''}`)}
      />

      <MobileBottomNav items={baseActions} />
    </div>
  );
};

const DashboardHeader = ({
  user,
  name,
  greeting,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  unreadCount,
  onLogout,
  profileOpen,
  setProfileOpen,
  locationLabel,
}) => {
  const navigate = useNavigate();

  return (
    <div className="rounded-[32px] border border-[#153226] bg-[#061811] p-6 shadow-[0_20px_80px_-60px_rgba(105, 236, 191,0.25)] backdrop-blur-sm">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">{greeting}, {name} 👋</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-100">Need something fixed today?</h1>
          <p className="max-w-2xl text-slate-400">Find trusted professionals for your home and property services.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(220px,1fr),auto,auto,auto] items-center">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onSearchSubmit();
            }}
            className="relative"
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-500" />
            <input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search for a service or describe your problem"
              className="dashboard-input w-full rounded-2xl py-3 pl-10 pr-4 text-sm text-slate-100 outline-none transition focus:border-[#10b981] focus:ring-2 focus:ring-[#34d39933]"
            />
          </form>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-2xl border border-[#153226] bg-[#04120d] px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-[#0a1f17]"
          >
            <MapPin className="h-4.5 w-4.5 text-[#10b981]" />
            <span>{locationLabel || 'Update service location'}</span>
          </button>

          <button
            type="button"
            className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#153226] bg-[#04120d] text-slate-200 transition hover:bg-[#0a1f17]"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-2 top-2 inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
            )}
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen(!profileOpen)}
              className="inline-flex items-center gap-3 rounded-2xl border border-[#153226] bg-[#04120d] px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-[#0a1f17]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0e2a20] text-[#C7D2FE] font-semibold">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-100">{user?.name || 'Customer'}</p>
                <p className="text-xs text-slate-500">My Account</p>
              </div>
            </button>

            {profileOpen && (
              <div className="absolute right-0 z-20 mt-3 w-56 rounded-[28px] border border-[#153226] bg-[#061811] shadow-[0_20px_60px_-40px_rgba(0,0,0,0.5)]">
                <button
                  type="button"
                  onClick={() => {
                    navigate('/dashboard');
                    setProfileOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-slate-200 hover:bg-[#0a1f17]"
                >
                  My Profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigate('/dashboard');
                    setProfileOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-slate-200 hover:bg-[#0a1f17]"
                >
                  Settings
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigate('/dashboard');
                    setProfileOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-slate-200 hover:bg-[#0a1f17]"
                >
                  Help Center
                </button>
                <div className="border-t border-[#153226]" />
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full px-4 py-3 text-left text-sm font-semibold text-rose-500 hover:bg-[#0a1f17]"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const DashboardHero = ({ searchTerm, onSearchChange, onSearchSubmit, onPrimaryAction, onSecondaryAction }) => {
  return (
    <section className="rounded-[32px] border border-[#153226] bg-[#061811] p-8 shadow-[0_20px_80px_-60px_rgba(105, 236, 191,0.25)]">
      <div className="grid gap-8 lg:grid-cols-[1.5fr,0.9fr] lg:items-center">
        <div className="space-y-6">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-[#10b981]">FixMate for customers</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-slate-100">What can we help you fix today?</h2>
            <p className="mt-3 max-w-2xl text-base leading-8 text-slate-400">
              Find trusted professionals near you and get the problem fixed.
            </p>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              onSearchSubmit();
            }}
            className="flex flex-col gap-4"
          >
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <input
                value={searchTerm}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search for a service or describe your problem..."
                className="dashboard-input w-full rounded-[28px] py-4 pl-14 pr-4 text-sm text-slate-100 outline-none transition focus:border-[#10b981] focus:ring-2 focus:ring-[#34d39933]"
              />
            </label>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
              {['Water leakage', 'AC not cooling', 'Broken door', 'Electrical problem', 'Washing machine repair'].map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => onSearchChange(example)}
                  className="rounded-full border border-[#153226] bg-[#04120d] px-4 py-2 text-slate-300 transition hover:border-[#10b981] hover:text-slate-100"
                >
                  {example}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-start">
              <button
                type="button"
                onClick={onPrimaryAction}
                className="inline-flex items-center justify-center rounded-full bg-[#10b981] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#34d399] shadow-[0_10px_40px_-30px_rgba(105, 236, 191,0.8)]"
              >
                Report a Problem
              </button>
              <button
                type="button"
                onClick={onSecondaryAction}
                className="inline-flex items-center justify-center rounded-full border border-[#153226] bg-[#04120d] px-6 py-3 text-sm font-semibold text-slate-100 transition hover:bg-[#0a1f17]"
              >
                Browse Services
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-[32px] border border-[#153226] bg-[#04120d] p-6 shadow-[0_20px_80px_-60px_rgba(0,0,0,0.4)]">
          <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Fast service essentials</p>
          <div className="mt-6 space-y-4">
            <div className="flex items-start gap-3 rounded-[28px] bg-[#061811] p-4 shadow-[0_10px_30px_-24px_rgba(0,0,0,0.5)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0a1f17] text-[#10b981]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-100">Verified professionals</p>
                <p className="text-sm text-slate-400">Only trusted workers with customer ratings.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-[28px] bg-[#061811] p-4 shadow-[0_10px_30px_-24px_rgba(0,0,0,0.5)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1B1B22] text-emerald-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-100">Transparent pricing</p>
                <p className="text-sm text-slate-400">Know the cost before the worker arrives.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-[28px] bg-[#061811] p-4 shadow-[0_10px_30px_-24px_rgba(0,0,0,0.5)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0a1f17] text-slate-200">
                <Clock3 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-100">Live updates</p>
                <p className="text-sm text-slate-400">Track progress from assignment to completion.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const ServiceCategories = ({ categories, onSelect }) => {
  return (
    <section id="services" className="rounded-[32px] border border-[#153226] bg-[#061811] p-6 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.6)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-[#10b981]">Popular Services</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-100">Get professional help for your everyday problems.</h2>
        </div>
        <Link
          to="/tickets/new"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#10b981] transition hover:text-[#34d399]"
        >
          View All Services
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {categories.map((category) => {
          const Icon = categoryIconByName[category.name] || Wrench;
          return (
            <button
              key={category.name}
              type="button"
              onClick={() => onSelect(category.name)}
              className="group flex flex-col gap-4 rounded-[28px] border border-[#153226] bg-[#04120d] p-5 text-left transition hover:border-[#255342] hover:bg-[#0a1f17]"
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0e2a20] text-[#10b981] shadow-[0_10px_30px_-20px_rgba(105, 236, 191,0.5)]">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-100">{category.name}</h3>
                <p className="mt-2 text-sm text-slate-400">{category.description}</p>
              </div>
              <span className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-[#10b981] opacity-0 transition group-hover:opacity-100">
                Order Now
                <ChevronRight className="h-4 w-4" />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

const ActiveRequestCard = ({ activeRequest, progressSteps, currentStep, ticketStatusLabel, onTrack, onChat }) => {
  if (!activeRequest) {
    return (
      <section className="rounded-[32px] border border-[#153226] bg-[#061811] p-6 shadow-[0_20px_80px_-60px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-4 rounded-[28px] border border-[#153226] bg-[#04120d] p-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-[28px] bg-[#0a1f17] text-[#10b981]">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">No active service request</p>
            <p className="mt-1 text-sm text-slate-400">Report a problem to get a qualified professional assigned quickly.</p>
          </div>
        </div>
      </section>
    );
  }

  const ticketNumber = `FM-${String(activeRequest._id || '').slice(-5).toUpperCase()}`;
  const workerName = activeRequest.workerId?.name || 'Pending assignment';
  const workerRating = activeRequest.workerId ? 4.8 : null;
  const distance = activeRequest.location?.pincode ? '2.4 km away' : 'Location pending';

  return (
    <section className="rounded-[32px] border border-[#153226] bg-[#061811] p-6 shadow-[0_20px_80px_-60px_rgba(0,0,0,0.6)] dashboard-glow">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#0a1f17] px-3 py-1 text-sm font-semibold text-[#69ecbf]">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Your Active Request
          </div>
          <h3 className="text-2xl font-semibold text-slate-100">{activeRequest.category}</h3>
          <p className="text-sm text-slate-400">Request #{ticketNumber}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[28px] border border-[#153226] bg-[#04120d] p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Status</p>
              <p className="mt-2 text-sm font-semibold text-slate-100">{ticketStatusLabel(activeRequest.status)}</p>
            </div>
            <div className="rounded-[28px] border border-[#153226] bg-[#04120d] p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Professional</p>
              <p className="mt-2 text-sm font-semibold text-slate-100">{workerName}</p>
              {workerRating && (
                <span className="mt-1 inline-flex items-center gap-1 text-xs text-slate-400">
                  <Star className="h-3.5 w-3.5 text-amber-500" />
                  {workerRating} · {activeRequest.workerId?.completedJobs || 324} jobs
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-[#153226] bg-[#04120d] p-5 text-sm text-slate-200">
          <p className="text-sm font-semibold text-slate-100">ETA</p>
          <p className="mt-2 text-3xl font-semibold text-slate-100">18 min</p>
          <p className="mt-1 text-slate-400">Updated {getRelativeTime(activeRequest.updatedAt || activeRequest.createdAt)}</p>
        </div>
      </div>

      <div className="mt-6 rounded-[28px] border border-[#153226] bg-[#04120d] p-5">
        <div className="flex items-center justify-between text-sm font-semibold text-slate-400">
          <span>Progress</span>
          <span className="text-slate-500">Step {Math.min(currentStep + 1, progressSteps.length)} / {progressSteps.length}</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {progressSteps.map((label, index) => {
            const completed = index <= currentStep;
            return (
              <div key={label} className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full border ${
                  completed ? 'border-[#10b981] bg-[#10b981] text-white' : 'border-[#153226] bg-[#04120d] text-slate-400'
                }`}> {index + 1} </div>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${completed ? 'text-slate-100' : 'text-slate-500'}`}>{label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={onTrack}
          className="inline-flex items-center justify-center rounded-full bg-[#10b981] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#34d399]"
        >
          Track Worker
        </button>
        <button
          type="button"
          onClick={onChat}
          className="inline-flex items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
        >
          <MessageCircle className="h-4 w-4" />
          Chat
        </button>
      </div>
    </section>
  );
};

const QuickActions = ({ actions }) => {
  return (
    <section className="rounded-[32px] border border-[#153226] bg-[#061811] p-6 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.6)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-[#10b981]">Quick Actions</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-100">Tap a task and get going.</h2>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              to={action.to}
              className={`group flex items-center gap-3 rounded-[28px] border px-4 py-4 text-sm font-semibold transition ${
                action.variant === 'primary'
                  ? 'border-transparent bg-[#10b981] text-white hover:bg-[#34d399]'
                  : 'border-[#153226] bg-[#04120d] text-slate-100 hover:bg-[#0a1f17]'
              }`}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0a1f17] text-[#10b981] shadow-[0_10px_30px_-22px_rgba(105, 236, 191,0.45)]">
                <Icon className="h-5 w-5" />
              </span>
              <span>{action.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

const UpcomingService = ({ upcomingService, onView }) => {
  if (!upcomingService) {
    return (
      <section className="rounded-[32px] border border-[#153226] bg-[#061811] p-6 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.6)]">
        <div className="space-y-3 text-center">
          <p className="text-sm uppercase tracking-[0.28em] text-[#10b981]">Upcoming Service</p>
          <h2 className="text-xl font-semibold text-slate-100">No upcoming services.</h2>
          <p className="text-sm text-slate-400">You can schedule your next request from the hero or quick actions above.</p>
          <button
            type="button"
            onClick={onView}
            className="inline-flex items-center justify-center rounded-full border border-[#10b981] bg-[#04120d] px-5 py-3 text-sm font-semibold text-[#10b981] transition hover:bg-[#0a1f17]"
          >
            Report Your First Problem
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[32px] border border-[#153226] bg-[#061811] p-6 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.6)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-[#10b981]">Upcoming Service</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-100">{upcomingService.title || upcomingService.category}</h2>
        </div>
        <span className="rounded-full bg-[#04120d] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 border border-[#153226]">
          Scheduled
        </span>
      </div>

      <div className="mt-6 space-y-4">
        <div className="rounded-[28px] border border-[#153226] bg-[#04120d] p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">When</p>
          <p className="mt-2 text-lg font-semibold text-slate-100">{formatScheduleLabel(upcomingService)}</p>
        </div>
        <div className="rounded-[28px] border border-[#153226] bg-[#04120d] p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Professional</p>
          <p className="mt-2 text-lg font-semibold text-slate-100">{upcomingService.workerId?.name || 'Assigned soon'}</p>
          <p className="mt-1 text-sm text-slate-400">{upcomingService.workerId ? `⭐ ${upcomingService.workerId.rating || 4.8}` : 'You’ll be matched shortly'}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onView}
          className="inline-flex items-center justify-center rounded-full bg-[#10b981] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#34d399]"
        >
          View Details
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full border border-[#153226] bg-[#04120d] px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-[#0a1f17]"
        >
          Reschedule
        </button>
      </div>
    </section>
  );
};

const RecommendedProfessionals = ({ professionals, onBook, onViewProfile }) => {
  return (
    <section className="rounded-[32px] border border-[#153226] bg-[#061811] p-6 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.6)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-[#10b981]">Recommended Professionals</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-100">Registered workers near you.</h2>
        </div>
        <Link to="/tickets/new" className="text-sm font-semibold text-[#10b981] transition hover:text-[#34d399]">
          Browse all
        </Link>
      </div>

      {professionals.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-[28px] border border-dashed border-[#153226] bg-[#04120d] px-6 py-10 text-center">
          <User className="h-8 w-8 text-slate-600" />
          <p className="text-sm font-semibold text-slate-300">No registered workers yet</p>
          <p className="max-w-sm text-sm text-slate-500">
            Once workers register and get verified on the platform, they will appear here.
          </p>
          <button
            type="button"
            onClick={() => onBook('')}
            className="mt-2 inline-flex items-center justify-center rounded-full border border-[#10b981] bg-[#04120d] px-4 py-2 text-sm font-semibold text-[#10b981] transition hover:bg-[#0a1f17]"
          >
            Request a Service
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {professionals.map((pro) => (
            <div key={pro.id} className="rounded-[28px] border border-[#153226] bg-[#04120d] p-5 shadow-[0_10px_30px_-24px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-[28px] bg-[#0e2a20] text-[#C7D2FE] text-xl font-semibold">
                  {pro.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold text-slate-100">{pro.name}</p>
                    {pro.verified && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        Verified
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400">{pro.profession}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#061811] px-2.5 py-1 border border-[#153226] text-slate-300">
                      <Star className="h-3.5 w-3.5 text-amber-500" />
                      {Number(pro.rating ?? 5).toFixed(1)} ({pro.reviews} jobs)
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#061811] px-2.5 py-1 border border-[#153226] text-slate-300">
                      <MapPin className="h-3.5 w-3.5 text-slate-500" />
                      {pro.distance}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1 text-sm text-slate-400">
                  <p>{pro.availability}</p>
                  <p className="font-semibold text-slate-100">{pro.price ? `Starting from ₹${pro.price}` : 'Price on request'}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => onBook(pro.category)}
                    className="inline-flex items-center justify-center rounded-full border border-[#10b981] bg-[#04120d] px-4 py-2 text-sm font-semibold text-[#10b981] transition hover:bg-[#0a1f17]"
                  >
                    Book Now
                  </button>
                  <button
                    type="button"
                    onClick={() => onViewProfile(pro)}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#10b981] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#34d399]"
                  >
                    View Profile
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

const WorkerProfileModal = ({ pro, onClose, onBook }) => {
  if (!pro) return null;

  const verificationMeta = {
    Approved: { label: 'Verified Professional', tone: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
    Pending: { label: 'Verification Pending', tone: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
    'Under Review': { label: 'Under Review', tone: 'text-sky-400 border-sky-500/30 bg-sky-500/10' },
    Rejected: { label: 'Not Verified', tone: 'text-rose-400 border-rose-500/30 bg-rose-500/10' },
    Expired: { label: 'Not Verified', tone: 'text-rose-400 border-rose-500/30 bg-rose-500/10' },
  };
  const verification = verificationMeta[pro.verificationStatus] || verificationMeta.Pending;
  const dayLabels = { Mon: 'Mon', Tue: 'Tue', Wed: 'Wed', Thu: 'Thu', Fri: 'Fri', Sat: 'Sat', Sun: 'Sun' };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-[32px] border border-[#153226] bg-[#061811] p-6 shadow-[0_20px_80px_-40px_rgba(0,0,0,0.8)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[28px] bg-[#0e2a20] text-[#C7D2FE] text-xl font-semibold">
              {pro.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-xl font-semibold text-slate-100">{pro.name}</h3>
              <p className="text-sm text-slate-400">{(pro.skills || [pro.profession]).slice(0, 3).join(' • ')}</p>
              <span className={`mt-2 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${verification.tone}`}>
                <BadgeCheck className="h-3.5 w-3.5" />
                {verification.label}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#153226] bg-[#04120d] text-slate-300 transition hover:bg-[#0a1f17]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-[24px] border border-[#153226] bg-[#04120d] p-3">
            <Star className="h-4 w-4 text-amber-500" />
            <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Rating</p>
            <p className="text-sm font-bold text-slate-100">{Number(pro.rating ?? 5).toFixed(1)}</p>
          </div>
          <div className="rounded-[24px] border border-[#153226] bg-[#04120d] p-3">
            <ClipboardList className="h-4 w-4 text-indigo-400" />
            <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Jobs Done</p>
            <p className="text-sm font-bold text-slate-100">{pro.reviews ?? 0}</p>
          </div>
          <div className="rounded-[24px] border border-[#153226] bg-[#04120d] p-3">
            <Clock3 className="h-4 w-4 text-emerald-400" />
            <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Hours</p>
            <p className="text-sm font-bold text-slate-100">{pro.workingHours?.start || '09:00'}–{pro.workingHours?.end || '18:00'}</p>
          </div>
          <div className="rounded-[24px] border border-[#153226] bg-[#04120d] p-3">
            <MapPin className="h-4 w-4 text-sky-400" />
            <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Area</p>
            <p className="truncate text-sm font-bold text-slate-100">{pro.distance.replace('Serves ', '') || '—'}</p>
          </div>
        </div>

        {(pro.description || pro.experience) && (
          <div className="mt-5 rounded-[24px] border border-[#153226] bg-[#04120d] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">About</p>
            {pro.experience && <p className="mt-2 text-sm font-semibold text-slate-200">Experience: {pro.experience}</p>}
            <p className="mt-1 text-sm leading-6 text-slate-400">{pro.description || 'This professional has not added a bio yet.'}</p>
          </div>
        )}

        <div className="mt-5 space-y-3 rounded-[24px] border border-[#153226] bg-[#04120d] p-4 text-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Skills</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(pro.skills || []).length ? (
                pro.skills.map((skill) => (
                  <span key={skill} className="rounded-full border border-[#153226] bg-[#061811] px-3 py-1 text-xs font-medium text-slate-200">
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-500">—</span>
              )}
            </div>
          </div>

          {(pro.availableDays || []).length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Available Days</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.keys(dayLabels).map((day) => {
                  const active = pro.availableDays.includes(day);
                  return (
                    <span
                      key={day}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        active ? 'border-[#10b981] bg-[#0a1f17] text-[#10b981]' : 'border-[#153226] bg-[#061811] text-slate-600'
                      }`}
                    >
                      {day}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="rounded-[20px] bg-[#061811] px-3 py-2.5 border border-[#153226]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Starting Price</p>
              <p className="text-sm font-semibold text-slate-100">{pro.price ? `₹${pro.price}` : 'On request'}</p>
            </div>
            <div className="rounded-[20px] bg-[#061811] px-3 py-2.5 border border-[#153226]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Emergency Service</p>
              <p className={`text-sm font-semibold ${pro.emergencyService ? 'text-emerald-400' : 'text-slate-400'}`}>
                {pro.emergencyService ? 'Available' : 'No'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              onBook(pro.category);
              onClose();
            }}
            className="inline-flex flex-1 items-center justify-center rounded-full bg-[#10b981] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#34d399]"
          >
            Book Now
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex flex-1 items-center justify-center rounded-full border border-[#153226] bg-[#04120d] px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-[#0a1f17]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const RecentServices = ({ services, onViewAll }) => {
  if (!services?.length) {
    return (
      <section id="recent-services" className="rounded-[32px] border border-[#153226] bg-[#061811] p-6 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.6)]">
        <p className="text-sm uppercase tracking-[0.28em] text-[#10b981]">Recent Services</p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-100">No service history yet.</h2>
        <p className="mt-2 text-sm text-slate-400">Professionals will appear here once you complete your first job.</p>
        <button
          type="button"
          onClick={onViewAll}
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#10b981] bg-[#04120d] px-4 py-3 text-sm font-semibold text-[#10b981] transition hover:bg-[#0a1f17]"
        >
          Report Your First Problem
        </button>
      </section>
    );
  }

  return (
    <section id="recent-services" className="rounded-[32px] border border-[#153226] bg-[#061811] p-6 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.6)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-[#10b981]">Recent Services</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-100">Latest requests</h2>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="text-sm font-semibold text-[#10b981] transition hover:text-[#34d399]"
        >
          View All Requests →
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {services.map((service) => (
          <div key={service._id} className="flex flex-col gap-3 rounded-[28px] border border-[#153226] bg-[#04120d] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-100">{service.title}</p>
              <p className="text-sm text-slate-400">{new Date(service.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            </div>
            <div className="text-sm font-semibold text-slate-100">
              ₹{estimateTicketAmount(service)}
            </div>
            <div className="rounded-full bg-[#061811] px-3 py-1 text-xs font-semibold text-slate-300 border border-[#153226]">
              {service.status}
            </div>
            <div className="flex items-center gap-1 text-sm text-amber-400">
              <Star className="h-4 w-4" />
              <span>{service.status === 'Completed' ? '5.0' : '—'}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const ActivityOverview = ({ stats, spendingHistory }) => {
  return (
    <section id="activity" className="rounded-[32px] border border-[#153226] bg-[#061811] p-6 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.6)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-[#10b981]">Your Activity</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-100">Spending & service summary</h2>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-[28px] border border-[#153226] bg-[#04120d] p-5">
          <p className="text-sm text-slate-400">Services Completed</p>
          <p className="mt-3 text-3xl font-semibold text-slate-100">{stats.completed}</p>
        </div>
        <div className="rounded-[28px] border border-[#153226] bg-[#04120d] p-5">
          <p className="text-sm text-slate-400">Active Requests</p>
          <p className="mt-3 text-3xl font-semibold text-slate-100">{stats.activeRequests}</p>
        </div>
        <div className="rounded-[28px] border border-[#153226] bg-[#04120d] p-5">
          <p className="text-sm text-slate-400">Total Spent</p>
          <p className="mt-3 text-3xl font-semibold text-slate-100">₹{stats.totalSpent}</p>
        </div>
        <div className="rounded-[28px] border border-[#153226] bg-[#04120d] p-5">
          <p className="text-sm text-slate-400">Average Rating Given</p>
          <p className="mt-3 text-3xl font-semibold text-slate-100">{stats.rating} <span className="text-amber-500">★</span></p>
        </div>
      </div>

      <div className="mt-6 rounded-[28px] border border-[#153226] bg-[#04120d] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-100">This Month</p>
            <p className="text-sm text-slate-400">Monthly spending overview</p>
          </div>
          <p className="text-sm font-semibold text-[#10b981]">₹{spendingHistory[spendingHistory.length - 1].value}</p>
        </div>
        <div className="space-y-3">
          {spendingHistory.map((item) => (
            <div key={item.label} className="flex items-center gap-4 text-sm text-slate-300">
              <span className="w-20 font-semibold text-slate-100">{item.label}</span>
              <div className="h-2.5 flex-1 rounded-full bg-[#0a1f17]">
                <div className="h-2.5 rounded-full bg-[#10b981]" style={{ width: `${Math.min((item.value / 6000) * 100, 100)}%` }} />
              </div>
              <span className="w-20 text-right font-semibold text-slate-100">₹{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const SavedLocation = ({ location }) => {
  return (
    <section id="location" className="rounded-[32px] border border-[#153226] bg-[#061811] p-6 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.6)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-[#10b981]">Service Location</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-100">Default address</h2>
        </div>
      </div>

      <div className="mt-6 rounded-[28px] border border-[#153226] bg-[#04120d] p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0a1f17] text-[#10b981]">
            <Home className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-100">Home</p>
            <p className="text-sm text-slate-400">{location}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" className="inline-flex items-center justify-center rounded-full border border-[#10b981] bg-[#04120d] px-4 py-2 text-sm font-semibold text-[#10b981] transition hover:bg-[#0a1f17]">
            Change
          </button>
          <button type="button" className="inline-flex items-center justify-center rounded-full border border-[#153226] bg-[#061811] px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-[#0a1f17]">
            Manage Addresses
          </button>
        </div>

        <button type="button" className="mt-5 inline-flex items-center gap-2 rounded-full text-sm font-semibold text-[#10b981] transition hover:text-[#34d399]">
          <Plus className="h-4 w-4" />
          Add another location
        </button>
      </div>
    </section>
  );
};

const OffersCard = () => {
  return (
    <section className="rounded-[32px] border border-[#153226] bg-[#04120d] text-white p-6 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.6)]">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[#0a1f17] text-[#34d399]">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-[#34d399]">Offers For You</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-100">Get 20% OFF your next service</h2>
          <p className="mt-2 text-sm text-slate-400">Use code:</p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#061811] px-4 py-3 text-sm font-semibold text-slate-100 ring-1 ring-[#10b98120]">
            FIX20
          </div>
          <p className="mt-3 text-sm text-slate-500">Valid until Aug 31</p>
        </div>
      </div>
      <Link to="/tickets/new" className="mt-6 inline-flex items-center justify-center rounded-full bg-[#10b981] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#34d399]">
        View Offer
      </Link>
    </section>
  );
};

const NotificationPreview = ({ notifications }) => {
  return (
    <section id="notifications" className="rounded-[32px] border border-[#153226] bg-[#061811] p-6 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.6)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-[#10b981]">Recent Notifications</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-100">Updates from your requests</h2>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`rounded-[28px] border px-4 py-4 ${notification.unread ? 'border-[#10b981] bg-[#0a1f17]' : 'border-[#153226] bg-[#04120d]'}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[#0a1f17] text-[#10b981]">
                  <Bell className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="font-semibold text-slate-100">{notification.title}</p>
                  <p className="text-sm text-slate-400">{notification.time}</p>
                </div>
              </div>
              {notification.unread && <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]" />}
            </div>
          </div>
        ))}
      </div>

      <a href="#notifications" className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#10b981] px-4 py-3 text-sm font-semibold text-[#10b981] transition hover:bg-[#0a1f17]">
        View All →
      </a>
    </section>
  );
};

const DashboardSkeleton = () => {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-40 rounded-[32px] bg-[#0a1f17]" />
      <div className="grid gap-6 xl:grid-cols-[280px,1fr]">
        <div className="space-y-4">
          <div className="h-64 rounded-[32px] bg-[#0a1f17]" />
        </div>
        <div className="space-y-4">
          <div className="h-48 rounded-[32px] bg-[#0a1f17]" />
          <div className="h-48 rounded-[32px] bg-[#0a1f17]" />
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[0.85fr,0.7fr]">
        <div className="h-80 rounded-[32px] bg-[#0a1f17]" />
        <div className="space-y-4">
          <div className="h-48 rounded-[32px] bg-[#0a1f17]" />
          <div className="h-48 rounded-[32px] bg-[#0a1f17]" />
        </div>
      </div>
    </div>
  );
};

const ErrorState = ({ onRetry }) => {
  return (
    <div className="rounded-[32px] border border-rose-600 bg-[#061811] px-8 py-12 text-center text-slate-100">
      <p className="text-sm uppercase tracking-[0.28em] text-rose-400">Something went wrong</p>
      <h2 className="mt-4 text-3xl font-semibold text-white">We couldn't load your dashboard.</h2>
      <p className="mt-3 max-w-xl mx-auto text-sm text-slate-400">Please refresh the page or try again in a moment. Your recent requests will still be available once the connection recovers.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-8 inline-flex items-center justify-center rounded-full bg-[#10b981] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#34d399]"
      >
        Try Again
      </button>
    </div>
  );
};

const MobileBottomNav = ({ items }) => {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#153226] bg-[#04120d] px-4 py-3 shadow-[0_-10px_30px_-22px_rgba(0,0,0,0.7)] xl:hidden">
      <div className="mx-auto flex max-w-3xl items-center justify-between">
        {items.map((item) => {
          const Icon = item.icon;
          const isReport = item.name === 'Report';
          return (
            <a
              key={item.name}
              href={item.to}
              className={`inline-flex flex-col items-center gap-1 rounded-2xl px-3 py-2 text-xs transition ${
                isReport ? 'bg-[#0a1f17] text-[#10b981] shadow-[0_10px_30px_-24px_rgba(105, 236, 191,0.45)]' : 'text-slate-400 hover:text-[#10b981]'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.name}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
};


export default ClientDashboard;
