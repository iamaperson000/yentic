'use client';

import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const DropdownContext = createContext<{ onClose: () => void }>({ onClose: () => {} });

interface DropdownProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

interface DropdownItemProps {
  onSelect: () => void;
  children: ReactNode;
  destructive?: boolean;
  className?: string;
}

export function Dropdown({ open, onClose, children, align = 'right', className = '' }: DropdownProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const items = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
      if (!items?.length) return;
      const currentIndex = Array.from(items).indexOf(document.activeElement as HTMLElement);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        items[currentIndex < items.length - 1 ? currentIndex + 1 : 0].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        items[currentIndex > 0 ? currentIndex - 1 : items.length - 1].focus();
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={menuRef}
          role="menu"
          initial={{ opacity: 0, scale: 0.95, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -4 }}
          transition={{ duration: 0.12 }}
          onKeyDown={handleKeyDown}
          className={`absolute z-50 mt-2 min-w-[180px] overflow-hidden rounded-lg border border-[var(--color-border-medium)] bg-[var(--color-bg-surface)] shadow-xl shadow-black/30 ${align === 'right' ? 'right-0' : 'left-0'} ${className}`}
        >
          <DropdownContext.Provider value={{ onClose }}>
            <div className="py-1">{children}</div>
          </DropdownContext.Provider>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function DropdownItem({ onSelect, children, destructive = false, className = '' }: DropdownItemProps) {
  const { onClose } = useContext(DropdownContext);

  return (
    <button
      role="menuitem"
      tabIndex={-1}
      onClick={() => { onSelect(); onClose(); }}
      className={`flex w-full items-center px-3 py-2 text-sm transition-colors focus:outline-none focus:bg-white/5 hover:bg-white/5 ${destructive ? 'text-red-400 hover:text-red-300' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'} ${className}`}
    >
      {children}
    </button>
  );
}
