import React from 'react';

const variants = {
  primary:
    'bg-indigo-600 text-white hover:bg-indigo-500 border border-transparent shadow-sm shadow-indigo-600/20',
  secondary:
    'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700',
  ghost: 'bg-transparent text-slate-300 hover:bg-slate-800 border border-transparent',
  danger:
    'bg-rose-600/15 text-rose-300 hover:bg-rose-600/25 border border-rose-500/30',
  success:
    'bg-emerald-600/15 text-emerald-300 hover:bg-emerald-600/25 border border-emerald-500/30',
};

const sizes = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
};

const Button = React.forwardRef(
  ({ variant = 'primary', size = 'md', loading = false, icon, children, className = '', disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex select-none items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        icon
      )}
      {children}
    </button>
  )
);

Button.displayName = 'Button';

export default Button;
