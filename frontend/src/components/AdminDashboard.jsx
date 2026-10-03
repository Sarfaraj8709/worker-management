import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Shield, Users, Ticket, CheckCircle2, AlertTriangle, Hammer, RefreshCw, Edit2, Trash2, Plus } from 'lucide-react';

const AdminDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [unassigned, setUnassigned] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkerForTicket, setSelectedWorkerForTicket] = useState({});
  
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState({ name: '', description: '', isActive: true });

  // UI state for Add/Edit Worker modal
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null); // null = add new
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    pincode: '',
    password: '',
    skills: '',
    serviceArea: '',
    rating: 4.5,
    isAvailable: true,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [metricsRes, unassignedRes, workersRes, servicesRes] = await Promise.all([
        axios.get('/admin/metrics'),
        axios.get('/admin/unassigned'),
        axios.get('/admin/workers'),
        axios.get('/admin/services'),
      ]);

      if (metricsRes.data.success) setMetrics(metricsRes.data.metrics);
      if (unassignedRes.data.success) setUnassigned(unassignedRes.data.tickets);
      if (workersRes.data.success) setWorkers(workersRes.data.workers);
      if (servicesRes.data.success) setServices(servicesRes.data.services);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleManualAssign = async (ticketId) => {
    const workerId = selectedWorkerForTicket[ticketId];
    if (!workerId) {
      alert('Please select a technician first');
      return;
    }

    try {
      const res = await axios.post(`/admin/tickets/${ticketId}/assign`, { workerId });
      if (res.data.success) {
        alert('Worker assigned successfully!');
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign worker');
    }
  };

  const handleSelectChange = (ticketId, workerId) => {
    setSelectedWorkerForTicket((prev) => ({
      ...prev,
      [ticketId]: workerId,
    }));
  };

  const openAddService = () => {
    setEditingService(null);
    setServiceForm({ name: '', description: '', isActive: true });
    setShowServiceModal(true);
  };

  const openEditService = (service) => {
    setEditingService(service);
    setServiceForm({
      name: service.name || '',
      description: service.description || '',
      isActive: service.isActive !== false,
    });
    setShowServiceModal(true);
  };

  const submitService = async () => {
    const payload = {
      name: serviceForm.name.trim(),
      description: serviceForm.description.trim(),
      isActive: serviceForm.isActive,
    };

    if (!payload.name) {
      alert('A service name is required');
      return;
    }

    try {
      if (editingService) {
        await axios.put(`/admin/services/${editingService._id}`, payload);
        alert('Service updated');
      } else {
        await axios.post('/admin/services', payload);
        alert('Service added');
      }
      setShowServiceModal(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save service');
    }
  };

  const deleteService = async (id) => {
    if (!window.confirm('Delete this service? This will remove it from ticket selection.')) return;
    try {
      await axios.delete(`/admin/services/${id}`);
      alert('Service deleted');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete service');
    }
  };

  // Worker modal helpers
  const openAddWorker = () => {
    setEditingWorker(null);
    setForm({
      name: '',
      email: '',
      phone: '',
      pincode: '',
      password: '',
      skills: '',
      serviceArea: '',
      rating: 4.5,
      isAvailable: true,
    });
    setShowWorkerModal(true);
  };
  const openEditWorker = (w) => {
    setEditingWorker(w);
    setForm({
      name: w.userId?.name || '',
      email: w.userId?.email || '',
      phone: w.userId?.phone || '',
      pincode: w.userId?.address?.pincode || '',
      password: '',
      skills: (w.skills || []).join(','),
      serviceArea: w.serviceArea || '',
      rating: w.rating || 4.5,
      isAvailable: !!w.isAvailable,
    });
    setShowWorkerModal(true);
  };

  const submitWorker = async () => {
    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      password: form.password,
      skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
      serviceArea: form.serviceArea,
      rating: Number(form.rating) || 4.5,
      isAvailable: !!form.isAvailable,
      jobsCompleted: editingWorker ? undefined : 0,
      address: {
        pincode: form.pincode || form.serviceArea,
      },
    };

    try {
      if (editingWorker) {
        // Update existing worker
        await axios.put(`/admin/workers/${editingWorker._id}`, payload);
        alert('Worker updated');
      } else {
        // Create new worker
        await axios.post('/admin/workers', payload);
        alert('Worker created');
      }
      setShowWorkerModal(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save worker');
    }
  };

  const deleteWorker = async (id) => {
    if (!window.confirm('Delete this worker? This cannot be undone')) return;
    try {
      await axios.delete(`/admin/workers/${id}`);
      alert('Worker removed');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete worker');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin header */}
      <div className="flex justify-between items-center bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-indigo-500" />
            <span>Admin Console</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">Supervise dispatch operations, system dispatches, and manually allocate resources.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-850 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer px-3"
            title="Refresh Data"
          >
            <RefreshCw className="h-4.5 w-4.5 mr-2" /> Refresh
          </button>

          <button
            onClick={openAddWorker}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-600 text-white hover:bg-indigo-500 transition cursor-pointer px-3"
            title="Add Worker"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Worker
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card rounded-xl p-5 border border-slate-800/80 flex items-center space-x-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shrink-0">
              <Ticket className="h-6 w-6 text-indigo-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-mono">Total Dispatches</p>
              <p className="text-2xl font-bold text-slate-100 mt-0.5">{metrics.tickets.total}</p>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border border-slate-800/80 flex items-center space-x-4">
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shrink-0">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-mono">Unassigned (Pending)</p>
              <p className="text-2xl font-bold text-amber-400 mt-0.5">{metrics.tickets.pending}</p>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border border-slate-800/80 flex items-center space-x-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-mono">Resolved Issues</p>
              <p className="text-2xl font-bold text-emerald-400 mt-0.5">{metrics.tickets.completed}</p>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border border-slate-800/80 flex items-center space-x-4">
            <div className="h-12 w-12 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20 shrink-0">
              <Users className="h-6 w-6 text-violet-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-mono">Verified Techs</p>
              <p className="text-2xl font-bold text-slate-100 mt-0.5">
                {metrics.workers.total}{' '}
                <span className="text-xs font-normal text-slate-400 font-sans">
                  ({metrics.workers.active} free)
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Unassigned dispatches dispatcher panel */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
          <span>Manual Dispatch Queue (Needs Worker Assignment)</span>
        </h2>

        {unassigned.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center p-12 text-center rounded-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 border border-slate-700/60 mb-4">
              <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            </div>
            <h3 className="text-base font-bold text-slate-200">All dispatches managed</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-sm">
              There are no pending tickets requiring manual technician allocation. The automatic matching engine has successfully placed all jobs.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {unassigned.map((ticket) => {
              // Filter workers that have the same skill matching the ticket's category
              const matchingWorkers = workers.filter((w) =>
                w.skills.includes(ticket.category)
              );

              return (
                <div key={ticket._id} className="glass-card rounded-xl p-5 border border-amber-500/20">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          Pending Dispatch
                        </span>
                        <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                          {ticket.severity}
                        </span>
                        <span className="text-xs font-semibold text-slate-300 font-mono">
                          Pincode: {ticket.location.pincode}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-100">{ticket.title}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2">{ticket.description}</p>
                      <p className="text-[11px] text-slate-500">
                        Client: {ticket.userId.name} • Location: {ticket.location.address}
                      </p>
                    </div>

                    {/* Manual Allocator Widget */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 w-full lg:w-auto">
                      <div className="flex flex-col">
                        <label className="text-[10px] uppercase font-bold text-slate-400 font-mono mb-1">
                          Select Available {ticket.category} Tech
                        </label>
                        <select
                          value={selectedWorkerForTicket[ticket._id] || ''}
                          onChange={(e) => handleSelectChange(ticket._id, e.target.value)}
                          className="bg-slate-950 border border-slate-700 text-slate-300 rounded-xl px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none w-full sm:w-60"
                        >
                          <option value="">-- Choose Technician --</option>
                          {matchingWorkers.map((w) => (
                            <option key={w._id} value={w.userId._id}>
                              {w.userId.name} (Rating: {w.rating} | Area: {w.serviceArea} | {w.isAvailable ? 'Free' : 'Busy'})
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={() => handleManualAssign(ticket._id)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer self-end w-full sm:w-auto"
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Workers Directory */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
          <Hammer className="h-5 w-5 text-indigo-400" />
          <span>Active Technician Registry</span>
        </h2>
        <div className="glass-card rounded-xl border border-slate-800 overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold font-mono uppercase tracking-wider">
                <th className="p-4">Name</th>
                <th className="p-4">Skill Sets</th>
                <th className="p-4">Service Area</th>
                <th className="p-4 text-center">Rating</th>
                <th className="p-4 text-center">Jobs Done</th>
                <th className="p-4 text-center">Availability</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {workers.map((w) => (
                <tr key={w._id} className="hover:bg-slate-900/40">
                  <td className="p-4 font-bold text-slate-200">
                    <div>{w.userId.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">{w.userId.email}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {(w.skills || []).map((s) => (
                        <span key={s} className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px]">
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-slate-300 font-mono">{w.serviceArea}</td>
                  <td className="p-4 text-center font-bold text-amber-400">{w.rating} / 5.0</td>
                  <td className="p-4 text-center text-slate-300 font-mono">{w.jobsCompleted}</td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold text-[10px] ${
                      w.isAvailable
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {w.isAvailable ? 'Available' : 'Busy'}
                    </span>
                  </td>
                  <td className="p-4 text-center space-x-2">
                    <button onClick={() => openEditWorker(w)} className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition mr-2">
                      <Edit2 className="h-4 w-4 mr-2" /> Edit
                    </button>
                    <button onClick={() => deleteWorker(w._id)} className="inline-flex items-center px-3 py-1.5 rounded-lg bg-rose-700/10 border border-rose-700/20 text-rose-400 hover:bg-rose-700/20 transition">
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Service Catalog */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>Service Catalog</span>
          </h2>
          <button
            onClick={openAddService}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-600 text-white hover:bg-cyan-500 transition cursor-pointer px-4"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Service
          </button>
        </div>
        <div className="glass-card rounded-xl border border-slate-800 overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold font-mono uppercase tracking-wider">
                <th className="p-4">Service</th>
                <th className="p-4">Description</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {services.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-6 text-center text-slate-400">
                    No services configured yet. Add one to make it available for tickets.
                  </td>
                </tr>
              ) : (
                services.map((service) => (
                  <tr key={service._id} className="hover:bg-slate-900/40">
                    <td className="p-4 font-semibold text-slate-100">{service.name}</td>
                    <td className="p-4 text-slate-300">{service.description || 'No description provided'}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-[10px] font-semibold ${
                        service.isActive ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {service.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4 text-center space-x-2">
                      <button onClick={() => openEditService(service)} className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition mr-2">
                        <Edit2 className="h-4 w-4 mr-2" /> Edit
                      </button>
                      <button onClick={() => deleteService(service._id)} className="inline-flex items-center px-3 py-1.5 rounded-lg bg-rose-700/10 border border-rose-700/20 text-rose-400 hover:bg-rose-700/20 transition">
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Service Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl bg-slate-950/60 backdrop-blur-md glass-card rounded-xl p-6 border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-4">{editingService ? 'Edit Service' : 'Add Service'}</h3>
            <div className="space-y-4">
              <input
                value={serviceForm.name}
                onChange={(e) => setServiceForm((s) => ({ ...s, name: e.target.value }))}
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white"
                placeholder="Service name"
              />
              <textarea
                value={serviceForm.description}
                onChange={(e) => setServiceForm((s) => ({ ...s, description: e.target.value }))}
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white resize-none"
                rows="4"
                placeholder="Optional service description"
              />
              <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={serviceForm.isActive}
                  onChange={(e) => setServiceForm((s) => ({ ...s, isActive: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950"
                />
                Active service
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowServiceModal(false)} className="px-4 py-2 rounded-xl border border-slate-700 bg-transparent text-slate-300">Cancel</button>
              <button onClick={submitService} className="px-4 py-2 rounded-xl bg-cyan-600 text-white">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Worker Modal */}
      {showWorkerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl bg-slate-950/60 backdrop-blur-md glass-card rounded-xl p-6 border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-4">{editingWorker ? 'Edit Technician' : 'Add Technician'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-white" placeholder="Full name" />
              <input value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-white" placeholder="Email" />
              <input value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-white" placeholder="Phone number" />
              <input value={form.pincode} onChange={(e) => setForm((s) => ({ ...s, pincode: e.target.value }))} className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-white" placeholder="Address pincode" />
              <input value={form.password} type="password" onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-white" placeholder={editingWorker ? 'New password (optional)' : 'Password (optional)'} />
              <input value={form.skills} onChange={(e) => setForm((s) => ({ ...s, skills: e.target.value }))} className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-white md:col-span-2" placeholder="Skills (comma-separated)" />
              <input value={form.serviceArea} onChange={(e) => setForm((s) => ({ ...s, serviceArea: e.target.value }))} className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-white" placeholder="Service area / Pincode" />
              <input value={form.rating} type="number" min="0" max="5" step="0.1" onChange={(e) => setForm((s) => ({ ...s, rating: e.target.value }))} className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-white" placeholder="Rating" />
              <label className="flex items-center gap-2 text-sm text-slate-300"><input checked={form.isAvailable} type="checkbox" onChange={(e) => setForm((s) => ({ ...s, isAvailable: e.target.checked }))} /> Available</label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowWorkerModal(false)} className="px-4 py-2 rounded-xl border border-slate-700 bg-transparent text-slate-300">Cancel</button>
              <button onClick={submitWorker} className="px-4 py-2 rounded-xl bg-indigo-600 text-white">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
