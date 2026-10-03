import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader';
import Button from '../../components/admin/Button';
import { StatusBadge } from '../../components/admin/Badge';
import { Input, Select } from '../../components/admin/Input';
import Toggle from '../../components/admin/Toggle';
import Modal, { ConfirmDialog } from '../../components/admin/Modal';
import { PageSkeleton } from '../../components/admin/Skeleton';
import EmptyState from '../../components/admin/EmptyState';
import ErrorState from '../../components/admin/ErrorState';
import EndpointRequired from '../../components/admin/EndpointRequired';
import { getCoupons, createCoupon, updateCoupon, deleteCoupon, isMissingEndpoint, getErrorMessage } from '../../services/admin';
import useAsync from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import { formatDate, formatINR } from '../../utils/format';

const emptyForm = { code: '', type: 'percent', value: 20, minOrder: 500, maxDiscount: 200, validFrom: '', validTo: '', usageLimit: 1000, isActive: true };

const Promotions = () => {
  const { toast } = useToast();
  const state = useAsync(getCoupons);
  const { data: coupons, loading, error, reload } = state;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      code: c.code,
      type: c.type,
      value: c.value,
      minOrder: c.minOrder,
      maxDiscount: c.maxDiscount,
      validFrom: c.validFrom ? String(c.validFrom).slice(0, 10) : '',
      validTo: c.validTo ? String(c.validTo).slice(0, 10) : '',
      usageLimit: c.usageLimit,
      isActive: c.isActive !== false,
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.code.trim()) {
      toast.error('Coupon code is required');
      return;
    }
    try {
      const payload = { ...form, code: form.code.trim().toUpperCase() };
      if (editing) await updateCoupon(editing._id, payload);
      else await createCoupon(payload);
      toast.success(editing ? 'Coupon updated' : 'Coupon created');
      setOpen(false);
      await reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader title="Promotions" description="Create and manage discount coupons." actions={<Button onClick={openAdd} icon={<Plus className="h-4 w-4" />}>Create coupon</Button>} />
      {error ? (
        isMissingEndpoint(error) ? <EndpointRequired error={error} /> : <ErrorState message={getErrorMessage(error)} onRetry={reload} />
      ) : !coupons?.length ? (
        <EmptyState icon={Tag} title="No coupons" description="Create a coupon such as WELCOME20 to start promotions." action={<Button onClick={openAdd}>Create coupon</Button>} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {coupons.map((c) => (
            <div key={c._id} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
              <div className="flex items-start justify-between">
                <p className="font-mono text-lg font-bold text-white">{c.code}</p>
                <StatusBadge status={c.isActive ? 'Active' : 'Inactive'} meta={{ Active: { tone: 'success', label: 'Active' }, Inactive: { tone: 'neutral', label: 'Inactive' } }} />
              </div>
              <p className="mt-2 text-2xl font-bold text-indigo-300">{c.type === 'percent' ? `${c.value}% OFF` : `${formatINR(c.value)} OFF`}</p>
              <p className="mt-2 text-xs text-slate-500">Min order {formatINR(c.minOrder)} • Max discount {formatINR(c.maxDiscount)}</p>
              <p className="text-xs text-slate-500">Valid {formatDate(c.validFrom)} – {formatDate(c.validTo)}</p>
              <p className="mt-1 text-xs text-slate-400">Used {c.usageCount || 0} / {c.usageLimit || '∞'}</p>
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /> Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => updateCoupon(c._id, { isActive: !c.isActive }).then(() => { toast.success(c.isActive ? 'Disabled' : 'Enabled'); reload(); })}>{c.isActive ? 'Disable' : 'Enable'}</Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(c)}><Trash2 className="h-4 w-4 text-rose-400" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit coupon' : 'Create coupon'}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="WELCOME20" />
          <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="percent">Percent</option>
            <option value="flat">Flat</option>
          </Select>
          <Input label="Value" type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
          <Input label="Min order" type="number" value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: Number(e.target.value) })} />
          <Input label="Max discount" type="number" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: Number(e.target.value) })} />
          <Input label="Usage limit" type="number" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: Number(e.target.value) })} />
          <Input label="Valid from" type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} />
          <Input label="Valid to" type="date" value={form.validTo} onChange={(e) => setForm({ ...form, validTo: e.target.value })} />
        </div>
        <div className="mt-4">
          <Toggle label="Active" checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}>{editing ? 'Save' : 'Create'}</Button>
        </div>
      </Modal>
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete coupon"
        danger
        confirmLabel="Delete"
        message={`Delete ${confirmDelete?.code}?`}
        onConfirm={async () => {
          try {
            await deleteCoupon(confirmDelete._id);
            toast.success('Coupon deleted');
            setConfirmDelete(null);
            await reload();
          } catch (err) {
            toast.error(getErrorMessage(err));
          }
        }}
      />
    </div>
  );
};

export default Promotions;
