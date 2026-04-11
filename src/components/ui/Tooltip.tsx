'use client';

import { type ReactNode, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface TooltipProps {
  content: string;
  children: ReactNode;
  side?: 'top' | 'bottom';
  delay?: number;
}

export function Tooltip({ content, children, side = 'top', delay = 300 }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  function handleEnter() { timeoutRef.current = setTimeout(() => setOpen(true), delay); }
  function handleLeave() { if (timeoutRef.current) clearTimeout(timeoutRef.current); setOpen(false); }

  return (
    <div className="relative inline-flex" onMouseEnter={handleEnter} onMouseLeave={handleLeave} onFocus={handleEnter} onBlur={handleLeave}>
      {children}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: side === 'top' ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            role="tooltip"
            className={`absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-[var(--color-bg-surface)] px-2.5 py-1 text-xs text-[var(--color-text-secondary)] shadow-lg border border-[var(--color-border-subtle)] pointer-events-none ${side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
