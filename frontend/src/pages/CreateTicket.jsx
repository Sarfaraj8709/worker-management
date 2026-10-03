import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { ClipboardList, ArrowLeft, Image, MapPin, AlertCircle, CheckCircle, Sparkles, Droplet, Zap, DoorOpen, Snowflake, PaintBucket, Monitor, Paintbrush, Home, Plus } from 'lucide-react';

const categoryQuestions = {
  Plumbing: {
    prompt: 'Where is the leakage?',
    options: ['Bathroom', 'Kitchen', 'Bedroom', 'Outside', 'Roof'],
  },
  Electrical: {
    prompt: 'Where is the issue happening?',
    options: ['Living room', 'Bedroom', 'Kitchen', 'Switchboard', 'Other'],
  },
  'Door & Carpenter': {
    prompt: 'What needs repair?',
    options: ['Door', 'Window', 'Furniture', 'Cabinet', 'Other'],
  },
  'AC & Cooling': {
    prompt: 'What is the AC problem?',
    options: ['Not cooling', 'No power', 'Strange noise', 'Leakage', 'Other'],
  },
  Cleaning: {
    prompt: 'Which area needs cleaning?',
    options: ['Home', 'Sofa & upholstery', 'Kitchen', 'Balcony', 'Other'],
  },
  'Appliance Repair': {
    prompt: 'Which appliance is affected?',
    options: ['Refrigerator', 'Washing machine', 'Microwave', 'TV/Monitor', 'Other'],
  },
  Painting: {
    prompt: 'What needs painting?',
    options: ['Wall', 'Ceiling', 'Fence', 'Exterior', 'Other'],
  },
  Other: {
    prompt: 'Describe the issue in a few words',
    options: [],
  },
};

const CATEGORY_OPTIONS = [
  { id: 'Plumbing', label: 'Plumbing', icon: Droplet },
  { id: 'Electrical', label: 'Electrical', icon: Zap },
  { id: 'Door & Carpenter', label: 'Door & Carpenter', icon: DoorOpen },
  { id: 'AC & Cooling', label: 'AC & Cooling', icon: Snowflake },
  { id: 'Cleaning', label: 'Cleaning', icon: PaintBucket },
  { id: 'Appliance Repair', label: 'Appliance Repair', icon: Monitor },
  { id: 'Painting', label: 'Painting', icon: Paintbrush },
  { id: 'Other', label: 'Other', icon: Home },
];

const getDefaultCategoryOption = (category) => {
  const data = categoryQuestions[category];
  return data?.options?.[0] || '';
};

const severityLabel = (level) => {
  switch (level) {
    case 'Low':
      return 'Can wait';
    case 'Medium':
      return 'Regular repair';
    case 'High':
      return 'Same day';
    case 'Emergency':
      return 'Needs immediate attention';
    default:
      return 'Choose urgency';
  }
};

const CategoryQuestion = ({ category, value, onChange }) => {
  const question = categoryQuestions[category] || categoryQuestions.Other;
  if (!question.options.length) {
    return (
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-2">{question.prompt}</label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="block w-full rounded-2xl border border-slate-700 bg-slate-900/90 py-3 px-4 text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm transition"
          placeholder="e.g. Home internet not working"
        />
      </div>
    );
  }

  return (
    <div>
      <p className="block text-xs font-semibold text-slate-300 mb-3">{question.prompt}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {question.options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-2xl border px-3 py-3 text-left text-sm transition ${value === option ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-neon-indigo' : 'border-slate-800 bg-slate-900 hover:border-slate-700 hover:bg-slate-900/95 text-slate-300'}`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
};

const CreateTicket = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [formData, setFormData] = useState({
    title: '',
    category: 'Plumbing',
    subCategory: getDefaultCategoryOption('Plumbing'),
    description: '',
    severity: 'Medium',
    preferredDay: 'Tomorrow',
    preferredTime: '10:00 AM',
    address: user?.address?.street ? `${user.address.street}, ${user.address.city || ''}, ${user.address.state || ''}`.trim() : '',
    pincode: user?.address?.pincode || '',
    mediaFiles: [],
  });
  const [services, setServices] = useState([]);
  const [serviceLoadError, setServiceLoadError] = useState('');

  const [mediaPreviews, setMediaPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submissionState, setSubmissionState] = useState(null); // 'queued'
  const [createdTicket, setCreatedTicket] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const loadServices = async () => {
    try {
      const response = await axios.get('/tickets/services');
      if (response.data.success && response.data.services.length > 0) {
        setServices(response.data.services);
        setFormData((prev) => ({
          ...prev,
          category: response.data.services[0]?.name || prev.category,
        }));
      }
    } catch (err) {
      setServiceLoadError('Unable to load service categories. Using default list.');
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const searchTitle = searchParams.get('title') || searchParams.get('search');

    setFormData((prev) => ({
      ...prev,
      category: categoryParam || prev.category,
      subCategory: categoryParam ? getDefaultCategoryOption(categoryParam) : prev.subCategory,
      title: searchTitle || prev.title,
    }));
  }, [searchParams]);

  const handleMediaChange = (e) => {
    const files = Array.from(e.target.files || []).slice(0, 5);
    const previews = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      type: file.type,
    }));

    setFormData((prev) => ({ ...prev, mediaFiles: files }));
    setMediaPreviews(previews);
  };

  const clearMediaPreview = (index) => {
    setMediaPreviews((prev) => prev.filter((_, idx) => idx !== index));
    setFormData((prev) => ({
      ...prev,
      mediaFiles: prev.mediaFiles.filter((_, idx) => idx !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSubmissionState(null);
    setCreatedTicket(null);

    const { title, category, subCategory, description, severity, address, pincode, preferredDay, preferredTime, mediaFiles } = formData;

    if (!title || !address || !pincode) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }
 
    const data = new FormData();
    data.append('title', title);
    data.append('category', category);
    data.append('subCategory', subCategory);
    data.append('description', description || title);
    data.append('severity', severity);
    data.append('address', address);
    data.append('pincode', pincode);
    data.append('preferredDay', preferredDay);
    data.append('preferredTime', preferredTime);
    if (mediaFiles.length > 0) {
      data.append('image', mediaFiles[0]);
    }

    try {
      const res = await axios.post('/tickets/create', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data.success) {
        setCreatedTicket(res.data.ticket);
        setSubmissionState('queued');
        setLoading(false);

        setTimeout(() => {
          navigate('/dashboard');
        }, 5000);
      } else {
        setError(res.data.message || 'Unable to create your request at the moment. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to file ticket. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto max-w-2xl w-full px-4 py-8">
        <Link
          to="/dashboard"
          className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 transition mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Link>

        {submissionState === 'queued' && (
          <div className="mb-6 p-6 rounded-2xl glass-card border border-indigo-500/30 animate-pulse text-center">
            <div className="space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-100">Request Submitted</h3>
              <p className="text-sm text-slate-400">
                Your service request has been saved and is now waiting for an eligible worker to accept it.
              </p>
              <p className="text-xs text-indigo-400">
                You can head back to the dashboard to track progress and worker assignment.
              </p>
              <p className="text-[10px] text-slate-500 pt-2">Redirecting you to dashboard...</p>
            </div>
          </div>
        )}

        <div className="glass-card rounded-2xl p-6 md:p-8 border border-slate-800">
          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.24em] font-semibold text-cyan-400">
              <ClipboardList className="h-4 w-4" />
              <span>Smart Problem Reporting</span>
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">What&apos;s wrong?</h1>
              <p className="mt-2 text-sm text-slate-400 max-w-2xl">Select a service category and answer a few smart questions to get the best worker faster.</p>
            </div>
          </div>

          {serviceLoadError && (
            <div className="mb-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 p-3 text-sm text-amber-200">
              {serviceLoadError}
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-3xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-rose-300" />
                <span>{error}</span>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/85 p-4">
              <p className="text-sm font-semibold text-slate-100 mb-4">What problem are you facing?</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {CATEGORY_OPTIONS.map((category) => {
                  const Icon = category.icon;
                  const active = formData.category === category.id;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setFormData((prev) => ({
                        ...prev,
                        category: category.id,
                        subCategory: getDefaultCategoryOption(category.id),
                      }))}
                      className={`rounded-3xl border p-4 text-left transition ${active ? 'border-indigo-500 bg-indigo-500/10 shadow-neon-indigo' : 'border-slate-800 bg-slate-950/80 hover:border-slate-700 hover:bg-slate-900'}`}
                    >
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${active ? 'bg-indigo-500/10' : 'bg-slate-900'} text-slate-100`}>
                        <Icon className="h-5 w-5 text-indigo-300" />
                      </div>
                      <p className={`mt-4 text-sm font-semibold ${active ? 'text-white' : 'text-slate-200'}`}>{category.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Short summary</label>
                  <input
                    type="text"
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleInputChange}
                    className="block w-full rounded-2xl border border-slate-700 bg-slate-950/90 py-3 px-4 text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm transition"
                    placeholder="e.g. Water leakage from kitchen sink"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Tell us more</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="block w-full rounded-3xl border border-slate-700 bg-slate-950/90 py-3 px-4 text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm transition resize-none"
                    placeholder="Add any extra details that will help the worker assess the problem."
                  />
                </div>
              </div>
 
              <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-5">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Problem details</p>
                    <p className="mt-1 text-sm text-slate-400">This helps us route the right technician for the job.</p>
                  </div>
                  <span className="rounded-full bg-slate-950/80 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">{formData.category}</span>
                </div>

                <CategoryQuestion
                  category={formData.category}
                  value={formData.subCategory}
                  onChange={(value) => setFormData((prev) => ({ ...prev, subCategory: value }))}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-5">
                  <label className="block text-xs font-semibold text-slate-300 mb-2">How severe?</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Low', 'Medium', 'High', 'Emergency'].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, severity: option }))}
                        className={`rounded-2xl border px-3 py-3 text-sm transition ${formData.severity === option ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-neon-indigo' : 'border-slate-800 bg-slate-900 hover:border-slate-700 hover:bg-slate-900/95 text-slate-300'}`}
                      >
                        <p className="font-semibold">{option}</p>
                        <p className="text-xs text-slate-500 mt-1">{severityLabel(option)}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-5">
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Preferred time</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Tomorrow', 'Today', 'This Week'].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, preferredDay: option }))}
                        className={`rounded-2xl border px-3 py-3 text-sm transition ${formData.preferredDay === option ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-neon-indigo' : 'border-slate-800 bg-slate-900 hover:border-slate-700 hover:bg-slate-900/95 text-slate-300'}`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {['10:00 AM', '12:00 PM', '02:00 PM', '04:00 PM'].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, preferredTime: option }))}
                        className={`rounded-2xl border px-3 py-3 text-sm transition ${formData.preferredTime === option ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-neon-indigo' : 'border-slate-800 bg-slate-900 hover:border-slate-700 hover:bg-slate-900/95 text-slate-300'}`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-5">
                <label className="block text-xs font-semibold text-slate-300 mb-2">Add media</label>
                <p className="text-sm text-slate-400 mb-4">Upload photos or short videos to help the worker understand the problem faster.</p>
                <label className="group flex h-24 items-center justify-center rounded-3xl border border-dashed border-slate-700 bg-slate-950/90 text-slate-400 hover:border-slate-500 hover:text-slate-200 transition cursor-pointer">
                  <div className="flex flex-col items-center text-center">
                    <Plus className="h-5 w-5 mb-2 text-indigo-400" />
                    <span className="text-sm font-medium">Add photos/videos</span>
                    <span className="text-xs text-slate-500">Up to 5 files</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleMediaChange}
                    className="hidden"
                  />
                </label>

                {mediaPreviews.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {mediaPreviews.map((item, index) => (
                      <div key={item.url} className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/90">
                        {item.type.startsWith('video/') ? (
                          <video src={item.url} className="h-32 w-full object-cover" controls />
                        ) : (
                          <img src={item.url} alt={`preview-${index}`} className="h-32 w-full object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={() => clearMediaPreview(index)}
                          className="absolute right-2 top-2 rounded-full bg-slate-950/80 p-1 text-slate-300 hover:text-white hover:bg-slate-900 transition"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-5">
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Service Address</label>
                  <input
                    type="text"
                    name="address"
                    required
                    value={formData.address}
                    onChange={handleInputChange}
                    className="block w-full rounded-2xl border border-slate-700 bg-slate-950/90 py-3 px-4 text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm transition"
                    placeholder="e.g. 102 Shanti Niwas, MG Road"
                  />
                </div>
                <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-5">
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Pincode</label>
                  <input
                    type="text"
                    name="pincode"
                    required
                    value={formData.pincode}
                    onChange={handleInputChange}
                    className="block w-full rounded-2xl border border-slate-700 bg-slate-950/90 py-3 px-4 text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm transition"
                    placeholder="400001"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading || submissionState === 'queued'}
                  className="group relative flex w-full justify-center rounded-3xl bg-indigo-600 px-5 py-4 text-sm font-semibold text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4.5 w-4.5" />
                      <span>Find Workers</span>
                    </div>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateTicket;
