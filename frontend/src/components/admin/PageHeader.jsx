import React from 'react';

const PageHeader = ({ title, description, actions, className = '' }) => (
  <div className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${className}`}>
    <div>
      <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{title}</h1>
      {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
  </div>
);

export default PageHeader;
