import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Users, ClipboardList, Wrench } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader';
import Button from '../../components/admin/Button';
import { StatusBadge } from '../../components/admin/Badge';
import { Input, Textarea } from '../../components/admin/Input';
import Toggle from '../../components/admin/Toggle';
import Modal, { ConfirmDialog } from '../../components/admin/Modal';
import { PageSkeleton } from '../../components/admin/Skeleton';
import EmptyState from '../../components/admin/EmptyState';
import ErrorState from '../../components/admin/ErrorState';
import EndpointRequired from '../../components/admin/EndpointRequired';
import { getServices, createService, updateService, deleteService, isMissingEndpoint, getErrorMessage } from '../../services/admin';
import useAsync from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import { formatNumber, formatINR } from '../../utils/format';
import { SERVICE_OPTIONS } from '../../utils/constants';

const PRICE_META = {
  Plumbing: 350,
  Electrical: 400,
  Carpentry: 450,
  Painting: 380,
  Cleaning: 300,
  'AC Repair': 600,
  'Appliance Repair': 500,
  'Door & Window': 450,
};

const serviceIcon = (name) => {
  const found = SERVICE_OPTIONS.find((s) => s.value.toLowerCase() === String(name).toLowerCase());
  return found?.icon || '🛠️';
};

const Services = () => {
  const { toast } = useToast();
  const state = useAsync(getServices);
  const { data: services, loading, error, reload } = state;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', isActive: true });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [acting, setActing] = useState(false);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', description: '', isActive: true });
    setModalOpen(true);
  };

  const openEdit = (service) => {
    setEditing(service);
    setForm({ name: service.name, description: service.description || '', isActive: service.isActive !== false });
    setModalOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error('Service name is required');
      return;
    }
    setActing(true);
    try {
      const payload = { name: form.name.trim(), description: form.description.trim(), isActive: form.isActive };
      if (editing) {
        await updateService(editing._id, payload);
        toast.success('Service updated');
      } else {
        await createService(payload);
        toast.success('Service added');
      }
      setModalOpen(false);
      await reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActing(false);
    }
  };

  const toggleActive = async (service) => {
    setActing(true);
    try {
      await updateService(service._id, { isActive: !service.isActive });
      toast.success(service.isActive ? 'Service deactivated' : 'Service activated');
      await reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActing(false);
    }
  };

  const handleDelete = async () => {
    setActing(true);
    try {
      await deleteService(confirmDelete._id);
      setConfirmDelete(null);
      toast.success('Service deleted');
      await reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActing(false);
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Services"
        description="Manage service categories, pricing and availability."
        actions={
          <Button onClick={openAdd} icon={<Plus className="h-4 w-4" />}>
            Add Service
          </Button>
        }
      />

      {error ? (
        isMissingEndpoint(error) ? (
          <EndpointRequired error={error} />
        ) : (
          <ErrorState message={getErrorMessage(error)} onRetry={reload} />
        )
      ) : services && services.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No services configured"
          description="Add a service category to make it available for customer ticket creation."
          action={
            <Button onClick={openAdd} icon={<Plus className="h-4 w-4" />}>
              Add your first service
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <div key={service._id} className="group rounded-2xl border border-slate-800 bg-slate-900/40 p-5 transition hover:border-slate-700">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/60 text-2xl">
                  {serviceIcon(service.name)}
                </div>
                <StatusBadge status={service.isActive ? 'Active' : 'Inactive'} meta={{ Active: { label: 'Active', tone: 'success' }, Inactive: { label: 'Inactive', tone: 'neutral' } }} />
              </div>
              <h3 className="mt-4 text-lg font-bold text-white">{service.name}</h3>
              <p className="mt-1 line-clamp-2 min-h-[2rem] text-sm text-slate-400">{service.description || 'No description provided'}</p>

              <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> {service.workerCount ? formatNumber(service.workerCount) : '—'} workers
                </span>
                <span className="inline-flex items-center gap-1">
                  <ClipboardList className="h-3.5 w-3.5" /> {service.jobCount ? formatNumber(service.jobCount) : '—'} jobs
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-indigo-300">
                {service.price ? formatINR(service.price) : `From ₹${PRICE_META[service.name] || '—'}`}
              </p>

              <div className="mt-4 flex items-center gap-2 border-t border-slate-800 pt-4">
                <Button variant="secondary" size="sm" onClick={() => openEdit(service)}>
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
                <Link to={`/admin/workers?service=${encodeURIComponent(service.name)}`}>
                  <Button variant="ghost" size="sm">
                    <Users className="h-4 w-4" /> Manage Workers
                  </Button>
                </Link>
                <button
                  onClick={() => setConfirmDelete(service)}
                  className="ml-auto rounded-lg p-2 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-400"
                  aria-label="Delete service"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit service' : 'Add service'} size="md">
        <div className="space-y-4">
          <Input label="Service Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Plumbing" />
          <Textarea label="Description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe this service" />
          <Toggle
            label="Active service"
            description="Only active services appear during ticket creation."
            checked={form.isActive}
            onChange={(v) => setForm({ ...form, isActive: v })}
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={submit} loading={acting}>{editing ? 'Save Changes' : 'Add Service'}</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete service"
        confirmLabel="Delete"
        danger
        loading={acting}
        message={`Delete the "${confirmDelete?.name}" service? It will be removed from ticket selection.`}
      />
    </div>
  );
};

export default Services;
