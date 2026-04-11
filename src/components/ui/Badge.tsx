import { type ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'subtle' | 'outline';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

const variantClasses = {
  subtle: 'bg-white/5 border-white/15 text-white/70',
  outline: 'border-[var(--color-border-strong)] text-[var(--color-text-faint)]',
};

const sizeClasses = {
  sm: 'px-2.5 py-0.5 text-[10px] tracking-[0.2em]',
  md: 'px-3 py-1 text-[11px] tracking-[0.2em]',
};

export function Badge({ children, variant = 'subtle', size = 'md', dot = false, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border font-medium uppercase ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
      {dot && <span className="h-2 w-2 rounded-full bg-current opacity-60" />}
      {children}
    </span>
  );
}
