import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save, UserPlus, User, Briefcase, CalendarClock, ShieldCheck, ClipboardCheck, Upload, X, Check } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader';
import Button from '../../components/admin/Button';
import { Input, Select, Textarea } from '../../components/admin/Input';
import { createWorker } from '../../services/admin';
import { getErrorMessage } from '../../services/admin';
import { useToast } from '../../context/ToastContext';
import { SERVICE_OPTIONS, AVAILABLE_DAYS, OVERALL_VERIFICATION_META } from '../../utils/constants';

const STEPS = [
  { id: 1, label: 'Basic Information', icon: User },
  { id: 2, label: 'Professional Info', icon: Briefcase },
  { id: 3, label: 'Availability', icon: CalendarClock },
  { id: 4, label: 'Verification', icon: ShieldCheck },
  { id: 5, label: 'Review', icon: ClipboardCheck },
];

const DRAFT_KEY = 'fixmate.worker-draft';

const initialForm = {
  name: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  profilePhoto: null,
  skills: [],
  experience: '',
  rate: '',
  serviceAreas: '',
  description: '',
  availableDays: [],
  startHour: '09:00',
  endHour: '18:00',
  emergencyService: false,
  maxJobsPerDay: '',
  identityDoc: null,
  addressProof: null,
  drivingLicense: null,
  certificates: null,
};

const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
const phoneRegex = /^\d{10}$/;

const loadDraft = () => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return { ...initialForm, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return initialForm;
};

const WorkerNew = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(loadDraft);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const saveDraft = () => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...form, profilePhoto: null, identityDoc: null, addressProof: null, drivingLicense: null, certificates: null }));
      toast.success('Draft saved locally');
    } catch {
      toast.error('Could not save draft');
    }
  };

  const validateStep = (current) => {
    const next = {};
    if (current === 1) {
      if (!form.name.trim()) next.name = 'Full name is required';
      if (!form.email.trim()) next.email = 'Email is required';
      else if (!emailRegex.test(form.email)) next.email = 'Enter a valid email address';
      if (!form.phone.trim()) next.phone = 'Phone is required';
      else if (!phoneRegex.test(form.phone)) next.phone = 'Enter a valid 10-digit phone number';
    }
    if (current === 2) {
      if (form.skills.length === 0) next.skills = 'Select at least one service/skill';
      if (!form.serviceAreas.trim()) next.serviceAreas = 'Service areas are required';
      if (form.rate && Number(form.rate) <= 0) next.rate = 'Rate must be greater than 0';
    }
    if (current === 3) {
      if (form.availableDays.length === 0) next.availableDays = 'Select at least one available day';
      if (form.maxJobsPerDay && Number(form.maxJobsPerDay) < 1) next.maxJobsPerDay = 'Minimum 1 job per day';
      if (form.startHour >= form.endHour) next.hours = 'Start time must be before end time';
    }
    if (current === 4) {
      if (!form.identityDoc) next.identityDoc = 'Identity document is required';
      if (!form.addressProof) next.addressProof = 'Address proof is required';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) {
      toast.error('Please fix the highlighted fields');
      return;
    }
    setStep((s) => Math.min(5, s + 1));
  };

  const goBack = () => {
    setErrors({});
    setStep((s) => Math.max(1, s - 1));
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: undefined,
        skills: form.skills,
        serviceArea: form.serviceAreas.trim(),
        rating: 5.0,
        isAvailable: true,
        jobsCompleted: 0,
        experience: form.experience,
        rate: form.rate ? Number(form.rate) : 0,
        description: form.description,
        availableDays: form.availableDays,
        startHour: form.startHour,
        endHour: form.endHour,
        emergencyService: form.emergencyService,
        maxJobsPerDay: form.maxJobsPerDay ? Number(form.maxJobsPerDay) : 0,
        address: { street: '', city: '', state: '', pincode: form.serviceAreas.trim().split(',')[0].trim() },
      };
      const worker = await createWorker(payload);
      localStorage.removeItem(DRAFT_KEY);
      toast.success('Worker created successfully');
      navigate(`/admin/workers/${worker._id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  const toggleSkill = (skill) =>
    set('skills', form.skills.includes(skill) ? form.skills.filter((s) => s !== skill) : [...form.skills, skill]);

  const toggleDay = (day) =>
    set('availableDays', form.availableDays.includes(day) ? form.availableDays.filter((d) => d !== day) : [...form.availableDays, day]);

  const FileUpload = ({ label, value, onChange, error, required }) => (
    <div className={`rounded-xl border border-dashed p-4 transition ${error ? 'border-rose-500/50 bg-rose-500/5' : 'border-slate-700 bg-slate-950/30 hover:border-slate-600'}`}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label} {required && <span className="text-rose-400">*</span>}
      </p>
      {value ? (
        <div className="flex items-center gap-2 text-sm text-slate-200">
          <Check className="h-4 w-4 text-emerald-400" />
          <span className="truncate">{value.name}</span>
          <button onClick={() => onChange(null)} className="ml-auto rounded-md p-1 text-slate-500 hover:text-rose-400" aria-label="Remove file">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-500 transition hover:text-slate-300">
          <Upload className="h-4 w-4" />
          <span>Upload file (PDF / image)</span>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={(e) => onChange(e.target.files?.[0] || null)}
          />
        </label>
      )}
      {error && <p className="mt-1 text-xs font-medium text-rose-400">{error}</p>}
      <p className="mt-1.5 text-[10px] text-slate-600">
        Uploads require a file-upload endpoint on the backend. File is staged locally only.
      </p>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Add Worker"
        description="Create a new service professional account."
        actions={
          <Link to="/admin/workers">
            <Button variant="secondary" icon={<ArrowLeft className="h-4 w-4" />}>Back to Workers</Button>
          </Link>
        }
      />

      {/* Stepper */}
      <ol className="flex flex-wrap items-center gap-2">
        {STEPS.map((s, i) => {
          const active = s.id === step;
          const done = s.id < step;
          return (
            <li key={s.id} className="flex items-center gap-2">
              <button
                onClick={() => done && setStep(s.id)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  active ? 'border-indigo-500/50 bg-indigo-600 text-white' : done ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 bg-slate-900 text-slate-400'
                } ${done ? 'cursor-pointer' : 'cursor-default'}`}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : <s.icon className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{s.id}</span>
              </button>
              {i < STEPS.length - 1 && <span className="h-px w-4 bg-slate-700" />}
            </li>
          );
        })}
      </ol>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
              <User className="h-4 w-4 text-indigo-400" /> Basic Information
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Full Name" value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} placeholder="e.g. Rahul Kumar" />
              <Input label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} error={errors.email} placeholder="worker@fixmate.in" />
              <Input label="Phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} error={errors.phone} placeholder="10-digit mobile number" />
              <Input label="Date of Birth" type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
            </div>
            <FileUpload label="Profile Photo" value={form.profilePhoto} onChange={(v) => set('profilePhoto', v)} />
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
              <Briefcase className="h-4 w-4 text-indigo-400" /> Professional Information
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Skills / Services {errors.skills && <span className="ml-1 font-medium text-rose-400">{errors.skills}</span>}
              </p>
              <div className="flex flex-wrap gap-2">
                {SERVICE_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => toggleSkill(s.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      form.skills.includes(s.value)
                        ? 'border-indigo-500/50 bg-indigo-600 text-white'
                        : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select label="Experience" value={form.experience} onChange={(e) => set('experience', e.target.value)}>
                <option value="">Select experience</option>
                <option value="1">0–1 year</option>
                <option value="3">1–3 years</option>
                <option value="5">3–5 years</option>
                <option value="10">5–10 years</option>
                <option value="10+">10+ years</option>
              </Select>
              <Input label="Hourly / Visit Rate (₹)" type="number" min="0" value={form.rate} onChange={(e) => set('rate', e.target.value)} error={errors.rate} placeholder="e.g. 499" />
            </div>
            <Input label="Service Areas" value={form.serviceAreas} onChange={(e) => set('serviceAreas', e.target.value)} error={errors.serviceAreas} placeholder="Pincodes or city names, comma separated" />
            <Textarea label="Description" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Short bio describing the worker's experience and expertise" />
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
              <CalendarClock className="h-4 w-4 text-indigo-400" /> Availability
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Available Days {errors.availableDays && <span className="ml-1 font-medium text-rose-400">{errors.availableDays}</span>}
              </p>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_DAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      form.availableDays.includes(day)
                        ? 'border-indigo-500/50 bg-indigo-600 text-white'
                        : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Input label="Start Time" type="time" value={form.startHour} onChange={(e) => set('startHour', e.target.value)} />
              <Input label="End Time" type="time" value={form.endHour} onChange={(e) => set('endHour', e.target.value)} />
              <Input label="Max Jobs / Day" type="number" min="1" value={form.maxJobsPerDay} onChange={(e) => set('maxJobsPerDay', e.target.value)} error={errors.maxJobsPerDay} placeholder="e.g. 4" />
            </div>
            {errors.hours && <p className="text-xs font-medium text-rose-400">{errors.hours}</p>}
            <label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/30 p-4 text-sm font-medium text-slate-200">
              <input
                type="checkbox"
                checked={form.emergencyService}
                onChange={(e) => set('emergencyService', e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-950 accent-indigo-600"
              />
              Offer 24/7 emergency service
            </label>
          </div>
        )}

        {/* Step 4 */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
              <ShieldCheck className="h-4 w-4 text-indigo-400" /> Verification Documents
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FileUpload label="Identity Document" required value={form.identityDoc} onChange={(v) => set('identityDoc', v)} error={errors.identityDoc} />
              <FileUpload label="Address Proof" required value={form.addressProof} onChange={(v) => set('addressProof', v)} error={errors.addressProof} />
              <FileUpload label="Driving License" value={form.drivingLicense} onChange={(v) => set('drivingLicense', v)} />
              <FileUpload label="Certificates" value={form.certificates} onChange={(v) => set('certificates', v)} />
            </div>
          </div>
        )}

        {/* Step 5 */}
        {step === 5 && (
          <div className="space-y-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
              <ClipboardCheck className="h-4 w-4 text-indigo-400" /> Review & Submit
            </div>
            <ReviewSection title="Basic Information">
              <ReviewRow label="Full Name" value={form.name} />
              <ReviewRow label="Email" value={form.email} />
              <ReviewRow label="Phone" value={form.phone} />
              <ReviewRow label="Date of Birth" value={form.dateOfBirth || '—'} />
            </ReviewSection>
            <ReviewSection title="Professional Information">
              <ReviewRow label="Skills" value={form.skills.length ? form.skills.join(', ') : '—'} />
              <ReviewRow label="Experience" value={form.experience ? `${form.experience} years` : '—'} />
              <ReviewRow label="Rate" value={form.rate ? `₹${form.rate}` : '—'} />
              <ReviewRow label="Service Areas" value={form.serviceAreas} />
              <ReviewRow label="Description" value={form.description || '—'} />
            </ReviewSection>
            <ReviewSection title="Availability">
              <ReviewRow label="Available Days" value={form.availableDays.length ? form.availableDays.join(', ') : '—'} />
              <ReviewRow label="Working Hours" value={`${form.startHour} – ${form.endHour}`} />
              <ReviewRow label="Emergency Service" value={form.emergencyService ? 'Yes' : 'No'} />
              <ReviewRow label="Max Jobs / Day" value={form.maxJobsPerDay || '—'} />
            </ReviewSection>
            <ReviewSection title="Verification">
              <ReviewRow label="Identity Document" value={form.identityDoc ? form.identityDoc.name : 'Missing'} />
              <ReviewRow label="Address Proof" value={form.addressProof ? form.addressProof.name : 'Missing'} />
              <ReviewRow label="Driving License" value={form.drivingLicense ? form.drivingLicense.name : 'Not provided'} />
              <ReviewRow label="Certificates" value={form.certificates ? form.certificates.name : 'Not provided'} />
              <div className="mt-2 flex items-center gap-2">
                <StatusBadge status="Pending Review" meta={OVERALL_VERIFICATION_META} />
                <span className="text-xs text-slate-500">Documents will be reviewed by admin</span>
              </div>
            </ReviewSection>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" onClick={goBack} disabled={step === 1}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={saveDraft}>
            <Save className="h-4 w-4" /> Save Draft
          </Button>
          {step < 5 ? (
            <Button onClick={goNext}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={submit} loading={submitting}>
              <UserPlus className="h-4 w-4" /> Create Worker
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const ReviewSection = ({ title, children }) => (
  <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-indigo-300">{title}</p>
    <div className="space-y-2">{children}</div>
  </div>
);

const ReviewRow = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 text-sm">
    <span className="shrink-0 text-slate-500">{label}</span>
    <span className="min-w-0 text-right font-medium text-slate-200">{value}</span>
  </div>
);

export default WorkerNew;
