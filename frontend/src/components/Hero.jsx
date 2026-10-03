import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, ChevronRight, HardHat, Activity } from 'lucide-react';

const Hero = () => {
  const [matchStep, setMatchStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMatchStep((prev) => (prev + 1) % 5);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative flex-1 flex items-center justify-center py-20 lg:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Glow rings in the background */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

      <div className="mx-auto max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">

        {/* Hero Left Content */}
        <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
          <div className="inline-flex items-center space-x-2 bg-emerald-400/[0.06] border border-emerald-300/20 px-3.5 py-1.5 rounded-full text-xs text-[#69ECBF] font-mono tracking-wide hover:bg-emerald-400/10 transition">
            <Zap className="h-3.5 w-3.5" />
            <span>Smart Pincode Dispatch Active</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white leading-[1.08]">
            Instant Facility Repairs,{' '}
            <span className="bg-gradient-to-r from-[#69ECBF] via-emerald-300 to-teal-400 bg-clip-text text-transparent">
              Auto-Dispatched
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
            Report domestic and facility issues like electrical faults, plumbing leaks, or carpentry issues. Our smart engine matches and dispatches the highest-rated technician near you instantly.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
            <Link
              to="/register?role=user"
              className="btn-neon inline-flex items-center justify-center space-x-2 bg-[#69ECBF] hover:bg-[#8FF0D1] text-[#010907] font-bold text-sm px-6 py-3.5 rounded-xl shadow-lg shadow-emerald-500/25 cursor-pointer"
            >
              <span>Request Dispatch (Client)</span>
              <ChevronRight className="h-4.5 w-4.5" />
            </Link>
            <Link
              to="/register?role=worker"
              className="btn-neon inline-flex items-center justify-center space-x-2 border border-slate-700/70 bg-white/[0.03] hover:bg-slate-800/60 text-slate-200 hover:text-white font-semibold text-sm px-6 py-3.5 rounded-xl transition cursor-pointer"
            >
              <HardHat className="h-4.5 w-4.5 text-amber-500" />
              <span>Join as Technician</span>
            </Link>
          </div>

          {/* Stat Counters */}
          <div className="pt-8 border-t border-slate-800/80 grid grid-cols-3 gap-4 max-w-md mx-auto lg:mx-0 text-left">
            <div>
              <p className="text-2xl font-black text-white font-mono flex items-center">
                15<span className="text-xs text-cyan-400 ml-0.5">MIN</span>
              </p>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-1">Avg Allocation</p>
            </div>
            <div>
              <p className="text-2xl font-black text-white font-mono flex items-center">
                99.4<span className="text-xs text-emerald-400 ml-0.5">%</span>
              </p>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-1">Success Rate</p>
            </div>
            <div>
              <p className="text-2xl font-black text-white font-mono flex items-center">
                4.8<span className="text-xs text-amber-400 ml-0.5">★</span>
              </p>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-1">Worker Rating</p>
            </div>
          </div>
        </div>

        {/* Hero Right Visuals (Interactive Dispatch Simulator) */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-full max-w-sm glass-card rounded-2xl border border-slate-800/85 p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 h-1.5 w-24 bg-gradient-to-r from-cyan-400 to-indigo-500"></div>

            {/* Title & Status Indicator */}
            <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-cyan-400 animate-pulse" />
                <span className="text-xs font-bold font-mono text-slate-300">Live Dispatch Node</span>
              </div>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
            </div>

            {/* Simulation Screen */}
            <div className="space-y-4 font-mono text-[11px]">
              <div className="bg-slate-950 rounded-xl p-3 border border-slate-850">
                <span className="text-slate-500">Node:</span> <span className="text-indigo-400">client_port_active</span>
                <div className="mt-1 flex items-center space-x-2">
                  <span className="text-slate-500">Status:</span>
                  <span className="text-emerald-400 font-semibold animate-pulse">Scanning Requests</span>
                </div>
              </div>

              {/* Simulation Pipeline States */}
              <div className="space-y-2">
                {/* Step 1: Ticket Filed */}
                <div className={`p-3 rounded-lg border transition duration-300 ${
                  matchStep >= 1 ? 'border-indigo-500/20 bg-indigo-500/5' : 'border-transparent text-slate-600'
                }`}>
                  <div className="flex justify-between font-bold">
                    <span>1. Ticket Submitted</span>
                    {matchStep >= 1 && <span className="text-indigo-400">OK</span>}
                  </div>
                  {matchStep >= 1 && (
                    <div className="text-[10px] text-slate-400 mt-1">
                      Category: <strong className="text-slate-300">Electrical</strong> | Area: <strong className="text-slate-300">400001</strong>
                    </div>
                  )}
                </div>

                {/* Step 2: Auto Match */}
                <div className={`p-3 rounded-lg border transition duration-300 ${
                  matchStep >= 2 ? 'border-cyan-500/20 bg-cyan-500/5' : 'border-transparent text-slate-600'
                }`}>
                  <div className="flex justify-between font-bold">
                    <span>2. Querying Database</span>
                    {matchStep >= 2 && <span className="text-cyan-400">MATCHED</span>}
                  </div>
                  {matchStep >= 2 && (
                    <div className="text-[10px] text-slate-400 mt-1">
                      Found worker: <strong className="text-slate-300">Ramesh Kumar</strong> (Rating: 4.8★)
                    </div>
                  )}
                </div>

                {/* Step 3: Worker Assigned */}
                <div className={`p-3 rounded-lg border transition duration-300 ${
                  matchStep >= 3 ? 'border-amber-500/20 bg-amber-500/5' : 'border-transparent text-slate-600'
                }`}>
                  <div className="flex justify-between font-bold">
                    <span>3. Allocating Technician</span>
                    {matchStep >= 3 && <span className="text-amber-400">DISPATCHED</span>}
                  </div>
                  {matchStep >= 3 && (
                    <div className="text-[10px] text-slate-400 mt-1">
                      Ticket status update: <strong className="text-slate-300">Assigned</strong>
                    </div>
                  )}
                </div>

                {/* Step 4: Resolution */}
                <div className={`p-3 rounded-lg border transition duration-300 ${
                  matchStep >= 4 ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-transparent text-slate-600'
                }`}>
                  <div className="flex justify-between font-bold">
                    <span>4. Closing Log</span>
                    {matchStep >= 4 && <span className="text-emerald-400">RESOLVED</span>}
                  </div>
                  {matchStep >= 4 && (
                    <div className="text-[10px] text-slate-400 mt-1">
                      Switch replaced. Job completed.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Floating Neon Button in illustration */}
            <div className="mt-6 flex justify-center">
              <div className="text-[10px] bg-slate-900 border border-slate-800 text-slate-500 rounded-full px-3 py-1 font-mono">
                Cycle restarts in 3s...
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default Hero;
