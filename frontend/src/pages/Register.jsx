import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Wrench, User, Mail, Phone, Lock, MapPin, AlertCircle, Sparkles } from 'lucide-react';

const Register = () => {
  const { register, error, loading } = useAuth();

  const [role, setRole] = useState('user'); // 'user' or 'worker'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    skills: [],
    serviceArea: '',
  });

  const [formError, setFormError] = useState('');
  const [registered, setRegistered] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSkillChange = (skill) => {
    setFormData((prev) => {
      const skills = prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill];
      return { ...prev, skills };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const { name, email, password, phone, street, city, state, pincode, skills, serviceArea } = formData;

    if (!name || !email || !password || !phone || !pincode) {
      setFormError('Please fill in all core fields');
      return;
    }

    if (role === 'worker') {
      if (skills.length === 0) {
        setFormError('Please select at least one skill');
        return;
      }
      if (!serviceArea) {
        setFormError('Please enter a service area pincode');
        return;
      }
    }

    const payload = {
      name,
      email,
      password,
      phone,
      role,
      address: {
        street,
        city,
        state,
        pincode,
      },
      skills: role === 'worker' ? skills : undefined,
      serviceArea: role === 'worker' ? serviceArea : undefined,
    };

    const res = await register(payload);
    if (res.success) {
      setRegistered(true);
    }
  };

  const skillOptions = ['Electrical', 'Plumbing', 'Carpentry', 'General Repairs', 'Masonry'];

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8 gradient-bg">
      <div className="w-full max-w-lg space-y-8 glass-card p-8 rounded-2xl border border-slate-800">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
            <Wrench className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-white">Create Account</h2>
          <p className="mt-2 text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-indigo-400 hover:text-indigo-300 transition duration-150">
              Sign In
            </Link>
          </p>
        </div>

        {/* Errors */}
        {(error || formError) && !registered && (
          <div className="flex items-center space-x-2 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{formError || error}</span>
          </div>
        )}

        {/* Verification notice */}
        {registered ? (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-300 space-y-3">
            <p>
              Registration successful! We sent a verification link to your email
              address. Please open it within 24 hours to activate your account.
            </p>
            <Link
              to="/login"
              className="inline-block rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-500 transition"
            >
              Go to Sign In
            </Link>
          </div>
        ) : (
        <>
        {/* Role Selector Tabs */}
        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
          <button
            type="button"
            onClick={() => setRole('user')}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition cursor-pointer ${
              role === 'user' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            I need repairs (Client)
          </button>
          <button
            type="button"
            onClick={() => setRole('worker')}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition cursor-pointer ${
              role === 'worker' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            I want to work (Worker)
          </button>
        </div>

        {/* Registration Form */}
        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          {/* Core Info */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <User className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="block w-full rounded-xl border border-slate-700 bg-slate-950/50 py-2.5 pl-9 pr-3 text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm transition"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="block w-full rounded-xl border border-slate-700 bg-slate-950/50 py-2.5 pl-9 pr-3 text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm transition"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Phone className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="block w-full rounded-xl border border-slate-700 bg-slate-950/50 py-2.5 pl-9 pr-3 text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm transition"
                  placeholder="9876543210"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="block w-full rounded-xl border border-slate-700 bg-slate-950/50 py-2.5 pl-9 pr-3 text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm transition"
                  placeholder="Min 6 chars"
                />
              </div>
            </div>
          </div>

          {/* Address Info */}
          <div className="border-t border-slate-800/80 pt-4 space-y-4">
            <h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Personal Address</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Street Address</label>
                <input
                  name="street"
                  type="text"
                  value={formData.street}
                  onChange={handleInputChange}
                  className="block w-full rounded-xl border border-slate-700 bg-slate-950/50 py-2.5 px-3 text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm transition"
                  placeholder="123 Street Name, Area"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">City</label>
                <input
                  name="city"
                  type="text"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="block w-full rounded-xl border border-slate-700 bg-slate-950/50 py-2.5 px-3 text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm transition"
                  placeholder="Mumbai"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">State</label>
                  <input
                    name="state"
                    type="text"
                    value={formData.state}
                    onChange={handleInputChange}
                    className="block w-full rounded-xl border border-slate-700 bg-slate-950/50 py-2.5 px-3 text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm transition"
                    placeholder="MH"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Pincode*</label>
                  <input
                    name="pincode"
                    type="text"
                    required
                    value={formData.pincode}
                    onChange={handleInputChange}
                    className="block w-full rounded-xl border border-slate-700 bg-slate-950/50 py-2.5 px-3 text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm transition"
                    placeholder="400001"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Worker Specific Info */}
          {role === 'worker' && (
            <div className="border-t border-slate-800/80 pt-4 space-y-4">
              <div className="flex items-center space-x-1.5 text-xs font-semibold tracking-wider text-amber-400 uppercase">
                <Sparkles className="h-4 w-4" />
                <span>Professional Details</span>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Primary Skill Domains (Select all that apply)</label>
                <div className="flex flex-wrap gap-2">
                  {skillOptions.map((skill) => {
                    const isSelected = formData.skills.includes(skill);
                    return (
                      <button
                        type="button"
                        key={skill}
                        onClick={() => handleSkillChange(skill)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                        }`}
                      >
                        {skill}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Dispatch Service Area (Pincode)*</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <MapPin className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    name="serviceArea"
                    type="text"
                    required
                    value={formData.serviceArea}
                    onChange={handleInputChange}
                    className="block w-full rounded-xl border border-slate-700 bg-slate-950/50 py-2.5 pl-9 pr-3 text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm transition"
                    placeholder="e.g. 400001"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">This pincode will be matched against issue locations for auto-assignment.</p>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-xl bg-[#69ECBF] px-4 py-3.5 text-sm font-semibold text-[#010907] hover:bg-[#8FF0D1] focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:ring-offset-2 focus:ring-offset-[#010907] transition shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                'Create Account'
              )}
            </button>
          </div>
        </form>
        </>
        )}
      </div>
    </div>
  );
};

export default Register;
