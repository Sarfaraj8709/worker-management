import React from 'react';

const Tabs = ({ tabs = [], active, onChange, className = '' }) => (
  <div className={`flex flex-wrap gap-1 rounded-xl border border-slate-800 bg-slate-900/50 p-1 ${className}`} role="tablist">
    {tabs.map((tab) => {
      const id = typeof tab === 'string' ? tab : tab.id;
      const label = typeof tab === 'string' ? tab : tab.label;
      const activeTab = active === id;
      return (
        <button
          key={id}
          role="tab"
          aria-selected={activeTab}
          onClick={() => onChange(id)}
          className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
            activeTab ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          {label}
        </button>
      );
    })}
  </div>
);

export default Tabs;
