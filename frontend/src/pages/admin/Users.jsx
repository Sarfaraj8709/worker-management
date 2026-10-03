import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users as UsersIcon, Pencil, Trash2, Play, Pause, Eye, ClipboardList, CreditCard, MessageSquareWarning, HardHat, Star, MapPin, Wallet, ShieldCheck, Clock3 } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader';
import SearchInput from '../../components/admin/SearchInput';
import Button from '../../components/admin/Button';
import Avatar from '../../components/admin/Avatar';
import Badge, { StatusBadge } from '../../components/admin/Badge';
import DataTable from '../../components/admin/DataTable';
import Pagination from '../../components/admin/Pagination';
import { PageSkeleton } from '../../components/admin/Skeleton';
import EmptyState from '../../components/admin/EmptyState';
import ErrorState from '../../components/admin/ErrorState';
import EndpointRequired from '../../components/admin/EndpointRequired';
import Modal, { ConfirmDialog } from '../../components/admin/Modal';
import { Select, Input } from '../../components/admin/Input';
import { getUsers, getUserDetails, updateUser, deleteUser, isMissingEndpoint, getErrorMessage } from '../../services/admin';
import useAsync from '../../hooks/useAsync';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import { useToast } from '../../context/ToastContext';
import { formatDate, formatINRCompact } from '../../utils/format';
import RatingStars from '../../components/admin/RatingStars';
import { ROLES } from '../../utils/constants';

const PAGE_SIZE = 10;

const ROLE_META = {
  user: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
  worker: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  admin: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
};

const Users = () => {
  const { toast } = useToast();
  const state = useAsync(getUsers);
  const { data: users, loading, error, reload } = state;

  const [query, setQuery] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebouncedValue(query, 300);

  const [selectedUser, setSelectedUser] = useState(null);
  const [detailTab, setDetailTab] = useState('jobs');
  const [editUser, setEditUser] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [acting, setActing] = useState(false);

  const filtered = useMemo(() => {
    let list = [...(users || [])];
    const term = debouncedQuery.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (u) =>
          u.name?.toLowerCase().includes(term) ||
          u.email?.toLowerCase().includes(term) ||
          u.phone?.toLowerCase().includes(term)
      );
    }
    if (role !== 'all') list = list.filter((u) => u.role === role);
    if (status !== 'all') list = list.filter((u) => (u.status || (u.isActive ? 'active' : 'inactive')) === status);
    list.sort((a, b) => {
      if (sort === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sort === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sort === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      return 0;
    });
    return list;
  }, [users, debouncedQuery, role, status, sort]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  React.useEffect(() => {
    setPage(1);
  }, [debouncedQuery, role, status, sort]);

  const openDetail = async (user) => {
    setSelectedUser(user);
    setDetailTab('jobs');
    try {
      const detail = await getUserDetails(user._id);
      setSelectedUser({ ...user, ...detail });
    } catch (err) {
      if (!isMissingEndpoint(err)) toast.error(getErrorMessage(err));
    }
  };

  const handleStatusToggle = async (user) => {
    setActing(true);
    try {
      const next = (user.status || (user.isActive ? 'active' : 'inactive')) === 'active' ? 'inactive' : 'active';
      const updated = await updateUser(user._id, { status: next });
      setSelectedUser((u) => (u?._id === user._id ? { ...u, ...updated } : u));
      await reload();
      toast.success(`User ${next === 'active' ? 'activated' : 'deactivated'}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActing(false);
    }
  };

  const handleSaveEdit = async () => {
    setActing(true);
    try {
      const updated = await updateUser(editUser._id, {
        name: editUser.name,
        email: editUser.email,
        phone: editUser.phone,
        role: editUser.role,
      });
      setEditUser(null);
      await reload();
      toast.success('User updated successfully');
      setSelectedUser((u) => (u?._id === editUser._id ? { ...u, ...updated } : u));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActing(false);
    }
  };

  const handleDelete = async () => {
    setActing(true);
    try {
      await deleteUser(confirmDelete._id);
      setConfirmDelete(null);
      await reload();
      toast.success('User deleted');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActing(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'User',
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.name} size="sm" />
          <div>
            <p className="font-semibold text-slate-100">{u.name}</p>
            {u.role === 'worker' && u.workerProfile ? (
              <p className="text-[11px] font-medium text-amber-300/90">
                {(u.workerProfile.skills || []).slice(0, 2).join(' • ') || 'Worker'} · {u.workerProfile.serviceArea || '—'}
              </p>
            ) : null}
            <p className="text-xs text-slate-500">#{String(u._id).slice(-6).toUpperCase()}</p>
          </div>
        </div>
      ),
    },
    { key: 'email', header: 'Email', render: (u) => <span className="text-slate-400">{u.email}</span>, mobileHidden: true },
    { key: 'phone', header: 'Phone', render: (u) => <span className="font-mono text-xs text-slate-300">{u.phone}</span>, mobileHidden: true },
    {
      key: 'role',
      header: 'Role',
      render: (u) => (
        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${ROLE_META[u.role] || ROLE_META.user}`}>
          {ROLES.find((r) => r.value === u.role)?.label || u.role}
        </span>
      ),
    },
    { key: 'jobs', header: 'Jobs', render: (u) => <span className="font-mono text-xs">{u.role === 'worker' && u.workerProfile ? u.workerProfile.jobsCompleted ?? 0 : u.jobs ?? u.jobsCompleted ?? '—'}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (u) => (
        <StatusBadge
          status={u.status || (u.isActive ? 'active' : 'inactive')}
          meta={{ active: { label: 'Active', tone: 'success' }, inactive: { label: 'Inactive', tone: 'neutral' }, suspended: { label: 'Suspended', tone: 'danger' } }}
        />
      ),
    },
    { key: 'createdAt', header: 'Joined', render: (u) => <span className="text-xs text-slate-400">{formatDate(u.createdAt)}</span>, mobileHidden: true },
    {
      key: 'actions',
      header: 'Actions',
      render: (u) => (
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => openDetail(u)} title="View user">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditUser({ ...u })} title="Edit user">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleStatusToggle(u)} disabled={acting} title={u.status === 'active' || u.isActive ? 'Deactivate' : 'Activate'}>
            {u.status === 'inactive' || u.isActive === false ? <Play className="h-4 w-4 text-emerald-400" /> : <Pause className="h-4 w-4 text-amber-400" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(u)} title="Delete user" disabled={u.role === 'admin'}>
            <Trash2 className="h-4 w-4 text-rose-400" />
          </Button>
        </div>
      ),
      className: 'text-right',
    },
  ];

  if (loading) return <PageSkeleton table />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage all customers, workers and admins on the platform."
        actions={<Badge dot>Total: {users?.length || 0}</Badge>}
      />

      {error ? (
        isMissingEndpoint(error) ? (
          <EndpointRequired error={error} hint="Implement GET /api/admin/users to power this page." />
        ) : (
          <ErrorState message={getErrorMessage(error)} onRetry={reload} />
        )
      ) : (
        <>
          {/* Filters */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto_auto]">
            <SearchInput value={query} onChange={setQuery} placeholder="Search by name, email or phone..." />
            <Select value={role} onChange={(e) => setRole(e.target.value)} className="md:w-40">
              <option value="all">All Roles</option>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="md:w-40">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </Select>
            <Select value={sort} onChange={(e) => setSort(e.target.value)} className="md:w-44">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name A–Z</option>
            </Select>
          </div>

          <DataTable
            columns={columns}
            rows={paged}
            empty={
              <EmptyState
                icon={UsersIcon}
                title="No users found"
                description={debouncedQuery ? 'Try adjusting your search or filters.' : 'There are no users on the platform yet.'}
              />
            }
          />

          <Pagination page={page} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </>
      )}

      {/* Detail drawer */}
      <Modal open={!!selectedUser} onClose={() => setSelectedUser(null)} title="User details" size="lg">
        {selectedUser && (
          <div className="space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Avatar name={selectedUser.name} size="lg" />
              <div className="flex-1">
                <h4 className="text-lg font-bold text-white">{selectedUser.name}</h4>
                <p className="text-sm text-slate-400">{selectedUser.email}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge>{ROLES.find((r) => r.value === selectedUser.role)?.label || selectedUser.role}</Badge>
                  <StatusBadge
                    status={selectedUser.status || (selectedUser.isActive ? 'active' : 'inactive')}
                    meta={{ active: { label: 'Active', tone: 'success' }, inactive: { label: 'Inactive', tone: 'neutral' }, suspended: { label: 'Suspended', tone: 'danger' } }}
                  />
                  {selectedUser.role === 'worker' && selectedUser.workerProfile && (
                    <StatusBadge
                      status={selectedUser.workerProfile.verification?.status || 'Pending'}
                      meta={WORKER_VERIFICATION_META}
                    />
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setEditUser({ ...selectedUser })}>
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
                <Button variant="danger" size="sm" onClick={() => { setConfirmDelete(selectedUser); setSelectedUser(null); }} disabled={selectedUser.role === 'admin'}>
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Phone</p>
                <p className="mt-1 font-mono text-sm text-slate-200">{selectedUser.phone || '—'}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Joined</p>
                <p className="mt-1 text-sm text-slate-200">{formatDate(selectedUser.createdAt)}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pincode</p>
                <p className="mt-1 font-mono text-sm text-slate-200">{selectedUser.address?.pincode || '—'}</p>
              </div>
            </div>

            <div className="flex gap-1 rounded-xl border border-slate-800 bg-slate-900/50 p-1">
              {[
                { id: 'jobs', label: 'Jobs', icon: ClipboardList },
                ...(selectedUser.role === 'worker'
                  ? [{ id: 'worker', label: 'Worker Profile', icon: HardHat }]
                  : []),
                { id: 'payments', label: 'Payments', icon: CreditCard },
                { id: 'complaints', label: 'Complaints', icon: MessageSquareWarning },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setDetailTab(tab.id)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    detailTab === tab.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="min-h-[120px] rounded-xl border border-slate-800 bg-slate-950/30 p-4 text-sm text-slate-400">
              {detailTab === 'jobs' && <UserJobs user={selectedUser} />}
              {detailTab === 'worker' && <WorkerProfileSection user={selectedUser} />}
              {detailTab === 'payments' && <UserList items={selectedUser.payments} empty="No payment history for this user." />}
              {detailTab === 'complaints' && <UserList items={selectedUser.complaints} empty="No complaints for this user." />}
            </div>
          </div>
        )}
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Edit user" size="md">
        {editUser && (
          <div className="space-y-4">
            <Input label="Full Name" value={editUser.name} onChange={(e) => setEditUser({ ...editUser, name: e.target.value })} />
            <Input label="Email" type="email" value={editUser.email} onChange={(e) => setEditUser({ ...editUser, email: e.target.value })} />
            <Input label="Phone" value={editUser.phone} onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })} />
            <Select label="Role" value={editUser.role} onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </Select>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit} loading={acting}>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete user"
        confirmLabel="Delete"
        danger
        loading={acting}
        message={`Delete the account for ${confirmDelete?.name}? This cannot be undone. Their active jobs will be reset.`}
      />
    </div>
  );
};

const WORKER_VERIFICATION_META = {
  Approved: { label: 'Verified', tone: 'success' },
  Pending: { label: 'Pending', tone: 'warning' },
  'Under Review': { label: 'Under Review', tone: 'info' },
  Rejected: { label: 'Rejected', tone: 'danger' },
  Expired: { label: 'Expired', tone: 'danger' },
};

const WorkerProfileSection = ({ user }) => {
  const wp = user.workerProfile;
  if (!wp) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <HardHat className="h-8 w-8 text-slate-600" />
        <p className="text-sm text-slate-500">This user is registered as a worker but has no worker profile yet.</p>
        <Link to="/admin/workers/new" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
          Create worker profile →
        </Link>
      </div>
    );
  }

  const availability = wp.suspended ? 'suspended' : wp.isAvailable ? 'available' : 'busy';
  const availabilityMeta = {
    available: { label: 'Available', tone: 'success' },
    busy: { label: 'Busy', tone: 'warning' },
    suspended: { label: 'Suspended', tone: 'danger' },
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={availability} meta={availabilityMeta} />
          <StatusBadge status={wp.verification?.status || 'Pending'} meta={WORKER_VERIFICATION_META} />
          <RatingStars rating={wp.rating ?? 5} size="sm" />
        </div>
        <Link
          to={`/admin/workers/${wp._id}`}
          className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
        >
          Open full worker page →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
          <Star className="h-4 w-4 text-amber-400" />
          <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Rating</p>
          <p className="text-sm font-bold text-slate-100">{wp.rating ?? 5}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
          <ClipboardList className="h-4 w-4 text-indigo-400" />
          <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Jobs Done</p>
          <p className="text-sm font-bold text-slate-100">{wp.jobsCompleted ?? 0}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
          <Wallet className="h-4 w-4 text-emerald-400" />
          <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Rate</p>
          <p className="text-sm font-bold text-slate-100">{wp.rate ? formatINRCompact(wp.rate) : '—'}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
          <MapPin className="h-4 w-4 text-sky-400" />
          <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Area</p>
          <p className="text-sm font-bold text-slate-100">{wp.serviceArea || '—'}</p>
        </div>
      </div>

      <div className="space-y-2">
        <p><span className="text-slate-500">Skills:</span> {(wp.skills || []).join(', ') || '—'}</p>
        {wp.experience && <p><span className="text-slate-500">Experience:</span> <span className="text-slate-200">{wp.experience}</span></p>}
        {wp.description && <p><span className="text-slate-500">About:</span> <span className="text-slate-200">{wp.description}</span></p>}
        <p className="flex items-center gap-1.5">
          <Clock3 className="h-3.5 w-3.5 text-slate-500" />
          <span className="text-slate-200">{wp.workingHours?.start || '09:00'} – {wp.workingHours?.end || '18:00'}</span>
          <ShieldCheck className={`ml-2 h-3.5 w-3.5 ${wp.emergencyService ? 'text-emerald-400' : 'text-slate-600'}`} />
          <span className="text-slate-400">{wp.emergencyService ? 'Emergency service enabled' : 'No emergency service'}</span>
        </p>
      </div>
    </div>
  );
};

const UserJobs = ({ user }) => {
  const jobs = (user.jobs && Array.isArray(user.jobs) ? user.jobs : []).slice(0, 5);
  if (jobs.length === 0) {
    return (
      <p className="flex items-center gap-2 py-4 text-sm text-slate-500">
        <ClipboardList className="h-4 w-4" /> No recent jobs for this user.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-slate-800">
      {jobs.map((job) => (
        <li key={job._id} className="flex items-center justify-between gap-3 py-2.5">
          <div>
            <p className="text-sm font-semibold text-slate-200">{job.title}</p>
            <p className="text-xs text-slate-500">{job.category} • {formatDate(job.createdAt)}</p>
          </div>
          <Link to={`/admin/jobs/${job._id}`} className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
            View →
          </Link>
        </li>
      ))}
    </ul>
  );
};

const UserList = ({ items, empty }) => {
  if (!items || items.length === 0) return <p className="py-4 text-sm text-slate-500">{empty}</p>;
  return (
    <ul className="divide-y divide-slate-800">
      {items.slice(0, 8).map((item) => (
        <li key={item._id} className="py-2.5 text-sm text-slate-300">
          {item.title || item.category || item.status || String(item._id).slice(-6)}
          {item.amount != null && <span className="ml-2 text-xs text-slate-500">{item.amount}</span>}
        </li>
      ))}
    </ul>
  );
};

export default Users;
