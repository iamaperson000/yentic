import { type ReactNode } from 'react';

interface SectionHeaderProps {
  label: string;
  heading: string;
  description?: ReactNode;
  variant?: 'dark' | 'light';
  className?: string;
}

export function SectionHeader({ label, heading, description, variant = 'dark', className = '' }: SectionHeaderProps) {
  const isDark = variant === 'dark';

  return (
    <div className={`max-w-[760px] ${className}`}>
      <p className={`inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] ${isDark ? 'text-[var(--color-text-faint)]' : 'text-[var(--color-light-muted)]'}`}>
        <span className={`h-2 w-2 rounded-full ${isDark ? 'bg-[var(--color-text-muted)]' : 'bg-[var(--color-light-muted)]'}`} />
        {label}
      </p>
      <h2 className={`mt-4 text-title ${isDark ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-light-text-heading)]'}`}>
        {heading}
      </h2>
      {description && (
        <p className={`mt-4 max-w-[68ch] text-body-prose ${isDark ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-light-text-body)]'}`}>
          {description}
        </p>
      )}
    </div>
  );
}
