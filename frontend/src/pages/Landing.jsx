import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Shield, HardHat, Zap, ChevronRight, Activity, MapPin, Star, Sparkles } from 'lucide-react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';

const Landing = () => {
  const [matchStep, setMatchStep] = useState(0);

  // Animated dispatch simulation in the hero illustration
  useEffect(() => {
    const interval = setInterval(() => {
      setMatchStep((prev) => (prev + 1) % 5);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen neon-bg text-slate-100 flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <Hero />

      {/* Features Grid Section */}
      <section className="bg-slate-950/60 border-t border-slate-900/60 py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center space-y-4 max-w-xl mx-auto mb-16">
            <h2 className="text-3xl font-semibold tracking-tight text-white">How FixMate Dispatch Works</h2>
            <p className="text-sm text-slate-400">
              A comprehensive tech solution matching home services dispatches with zero delay.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-card rounded-xl p-6 border border-slate-800 relative hover:border-slate-700/60 transition">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 mb-5">
                <Wrench className="h-5 w-5 text-indigo-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Category Skill Dispatch</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Tickets are categorized into plumbing, electrical, carpentry, or masonry to filter qualified candidate technicians immediately.
              </p>
            </div>

            <div className="glass-card rounded-xl p-6 border border-slate-800 relative hover:border-slate-700/60 transition">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 mb-5">
                <MapPin className="h-5 w-5 text-cyan-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Pincode Routing</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Matches worker profiles that list your specific pincode/city service areas, cutting down travel time and delay dispatches.
              </p>
            </div>

            <div className="glass-card rounded-xl p-6 border border-slate-800 relative hover:border-slate-700/60 transition">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 mb-5">
                <Star className="h-5 w-5 text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Load Balanced Routing</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Sorts matches by the worker's current active job count and rating, preventing single technician burnout and maintaining premium quality.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 text-center text-xs text-slate-500">
        <p>© 2026 FixMate Dispatch Platform. Created with MERN and Tailwind CSS v4.</p>
      </footer>
    </div>
  );
};

export default Landing;
