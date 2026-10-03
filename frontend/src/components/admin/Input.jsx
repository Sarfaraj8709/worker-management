import React from 'react';

const baseFieldClass =
  'w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50';

export const Input = React.forwardRef(({ label, hint, error, className = '', ...props }, ref) => (
  <Field label={label} hint={hint} error={error}>
    <input ref={ref} className={`${baseFieldClass} ${className}`} {...props} />
  </Field>
));
Input.displayName = 'Input';

export const Select = React.forwardRef(({ label, hint, error, options = [], children, className = '', ...props }, ref) => (
  <Field label={label} hint={hint} error={error}>
    <select ref={ref} className={`${baseFieldClass} appearance-none ${className}`} {...props}>
      {children}
      {options.map((option) => {
        const value = typeof option === 'string' ? option : option.value;
        const text = typeof option === 'string' ? option : option.label;
        return (
          <option key={value} value={value} className="bg-slate-900">
            {text}
          </option>
        );
      })}
    </select>
  </Field>
));
Select.displayName = 'Select';

export const Textarea = React.forwardRef(({ label, hint, error, className = '', ...props }, ref) => (
  <Field label={label} hint={hint} error={error}>
    <textarea ref={ref} className={`${baseFieldClass} resize-none ${className}`} {...props} />
  </Field>
));
Textarea.displayName = 'Textarea';

const Field = ({ label, hint, error, children }) => (
  <label className="block">
    {label && <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>}
    {children}
    {error && <span className="mt-1 block text-xs font-medium text-rose-400">{error}</span>}
    {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
  </label>
);
