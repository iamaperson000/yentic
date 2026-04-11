import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

const inputBase =
  'w-full rounded-lg border bg-[var(--color-bg-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40 focus:border-[var(--color-accent)] disabled:opacity-50 disabled:cursor-not-allowed';

const borderDefault = 'border-[var(--color-border-medium)]';
const borderError = 'border-red-500/60 focus:ring-red-500/40 focus:border-red-500/60';

export const Input = forwardRef<HTMLInputElement, InputProps>(({ error, className = '', ...props }, ref) => {
  return (
    <div className="space-y-1">
      <input ref={ref} className={`${inputBase} ${error ? borderError : borderDefault} ${className}`} {...props} />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
});
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ error, className = '', ...props }, ref) => {
  return (
    <div className="space-y-1">
      <textarea ref={ref} className={`${inputBase} ${error ? borderError : borderDefault} ${className}`} {...props} />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
});
Textarea.displayName = 'Textarea';
