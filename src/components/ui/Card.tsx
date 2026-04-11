import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  variant?: 'dark' | 'light';
  hoverable?: boolean;
  glow?: boolean;
  className?: string;
  as?: 'div' | 'article' | 'section';
}

const baseClasses = 'relative overflow-hidden rounded-xl border transition-all duration-200';

const variantClasses = {
  dark: 'border-[var(--color-border-medium)] bg-[var(--color-bg-elevated)]',
  light: 'border-[var(--color-light-border)] bg-[var(--color-light-bg)]',
};

const hoverDark = 'hover:-translate-y-1 hover:border-[var(--color-border-strong)]';
const hoverLight = 'hover:-translate-y-0.5 hover:bg-[var(--color-light-bg-hover)]';

const glowDark = 'hover:shadow-[0_0_24px_rgba(16,185,129,0.12)]';
const glowLight = 'hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)]';

export function Card({ children, variant = 'dark', hoverable = false, glow = false, className = '', as: Tag = 'div' }: CardProps) {
  const isDark = variant === 'dark';
  const classes = [
    baseClasses,
    variantClasses[variant],
    hoverable ? (isDark ? hoverDark : hoverLight) : '',
    glow ? (isDark ? glowDark : glowLight) : '',
    className,
  ].filter(Boolean).join(' ');

  return <Tag className={classes}>{children}</Tag>;
}
