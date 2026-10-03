import React from 'react';
import { initials } from '../../utils/format';

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
};

const Avatar = ({ name = '', src, size = 'md', className = '' }) => {
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  if (src) {
    return <img src={src} alt={name} className={`${sizeClass} shrink-0 rounded-full border border-slate-700 object-cover ${className}`} />;
  }
  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 font-bold text-slate-200 ${className}`}
    >
      {initials(name)}
    </div>
  );
};

export default Avatar;
