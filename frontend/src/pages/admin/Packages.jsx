import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Package } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader';
import Button from '../../components/admin/Button';
import { StatusBadge } from '../../components/admin/Badge';
import { Input, Select, Textarea } from '../../components/admin/Input';
import Toggle from '../../components/admin/Toggle';
import Modal, { ConfirmDialog } from '../../components/admin/Modal';
import { PageSkeleton } from '../../components/admin/Skeleton';
import EmptyState from '../../components/admin/EmptyState';
import ErrorState from '../../components/admin/ErrorState';
import EndpointRequired from '../../components/admin/EndpointRequired';
import { getPackages, createPackage, updatePackage, deletePackage, isMissingEndpoint, getErrorMessage } from '../../services/admin';
import useAsync from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import { formatINR } from '../../utils/format';

const emptyForm = { name: '', description: '', price: 1499, billingCycle: 'monthly', includedServices: '', discount: 0, isActive: true };

const Packages = () => {
  const { toast } = useToast();
  const state = useAsync(getPackages);
  const { data: packages, loading, error, reload } = state;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({ ...p, includedServices: (p.includedServices || []).join('\n') });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim()) { toast.error('Package name is required'); return; }
    const payload = {
      name: form.name.trim(),
      description: form.description,
      price: Number(form.price),
      billingCycle: form.billingCycle,
      includedServices: String(form.includedServices).split('\n').map((s) => s.trim()).filter(Boolean),
      discount: Number(form.discount) || 0,
      isActive: form.isActive,
    };
    try {
      if (editing) await updatePackage(editing._id, payload);
      else await createPackage(payload);
      toast.success(editing ? 'Package updated' : 'Package created');
      setOpen(false);
      await reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader title="Service packages" description="Subscription plans for recurring home maintenance." actions={<Button onClick={openAdd} icon={<Plus className="h-4 w-4" />}>Add package</Button>} />
      {error ? (
        isMissingEndpoint(error) ? <EndpointRequired error={error} /> : <ErrorState message={getErrorMessage(error)} onRetry={reload} />
      ) : !packages?.length ? (
        <EmptyState icon={Package} title="No packages" description="Create a Home Maintenance plan to get started." action={<Button onClick={openAdd}>Add package</Button>} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {packages.map((p) => (
            <div key={p._id} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-bold text-white">{p.name}</h3>
                <StatusBadge status={p.isActive ? 'Active' : 'Inactive'} meta={{ Active: { tone: 'success', label: 'Active' }, Inactive: { tone: 'neutral', label: 'Inactive' } }} />
              </div>
              <p className="mt-2 text-2xl font-bold text-indigo-300">{formatINR(p.price)} <span className="text-sm font-medium text-slate-500">/ {p.billingCycle}</span></p>
              <p className="mt-2 text-sm text-slate-400">{p.description}</p>
              <ul className="mt-4 space-y-1.5">
                {(p.includedServices || []).map((s) => (
                  <li key={s} className="text-sm text-slate-300">✓ {s}</li>
                ))}
              </ul>
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /> Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(p)}><Trash2 className="h-4 w-4 text-rose-400" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit package' : 'Create package'}>
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Textarea label="Description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Price" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <Select label="Billing cycle" value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </Select>
          </div>
          <Textarea label="Included services (one per line)" rows={4} value={form.includedServices} onChange={(e) => setForm({ ...form, includedServices: e.target.value })} />
          <Input label="Discount %" type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
          <Toggle label="Active" checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}>{editing ? 'Save' : 'Create'}</Button>
        </div>
      </Modal>
      <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete package" danger confirmLabel="Delete" message={`Delete ${confirmDelete?.name}?`} onConfirm={async () => {
        try {
          await deletePackage(confirmDelete._id);
          toast.success('Package deleted');
          setConfirmDelete(null);
          await reload();
        } catch (err) {
          toast.error(getErrorMessage(err));
        }
      }} />
    </div>
  );
};

export default Packages;
