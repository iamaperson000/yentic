import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

const inputBase =
  'w-full rounded-lg border bg-[var(--y-panel)] px-3 py-2 text-sm text-[var(--y-fg)] placeholder:text-[var(--y-muted)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--y-brand)]/40 focus:border-[var(--y-brand)] disabled:opacity-50 disabled:cursor-not-allowed';

const borderDefault = 'border-[var(--y-line)]';
const borderError = 'border-[var(--y-kw)] focus:ring-[var(--y-kw)]/40 focus:border-[var(--y-kw)]';

export const Input = forwardRef<HTMLInputElement, InputProps>(({ error, className = '', ...props }, ref) => {
  return (
    <div className="space-y-1">
      <input ref={ref} className={`${inputBase} ${error ? borderError : borderDefault} ${className}`} {...props} />
      {error && <p className="text-xs" style={{ color: 'var(--y-kw)' }}>{error}</p>}
    </div>
  );
});
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ error, className = '', ...props }, ref) => {
  return (
    <div className="space-y-1">
      <textarea ref={ref} className={`${inputBase} ${error ? borderError : borderDefault} ${className}`} {...props} />
      {error && <p className="text-xs" style={{ color: 'var(--y-kw)' }}>{error}</p>}
    </div>
  );
});
Textarea.displayName = 'Textarea';
