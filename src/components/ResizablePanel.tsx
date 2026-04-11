'use client';

import { type ReactNode, useCallback, useRef, useState } from 'react';

interface ResizablePanelProps {
  left: ReactNode;
  right: ReactNode;
  defaultLeftWidth?: number;
  minLeftWidth?: number;
  maxLeftWidth?: number;
  minRightWidth?: number;
}

export function ResizablePanel({
  left,
  right,
  defaultLeftWidth = 250,
  minLeftWidth = 160,
  maxLeftWidth = 400,
  minRightWidth = 200,
}: ResizablePanelProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(() => {
    setDragging(true);

    function handleMouseMove(e: MouseEvent) {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newLeft = e.clientX - rect.left;
      const clamped = Math.min(
        Math.max(newLeft, minLeftWidth),
        Math.min(maxLeftWidth, rect.width - minRightWidth)
      );
      setLeftWidth(clamped);
    }

    function handleMouseUp() {
      setDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [minLeftWidth, maxLeftWidth, minRightWidth]);

  return (
    <div ref={containerRef} className="relative flex h-full w-full" style={{ cursor: dragging ? 'col-resize' : undefined }}>
      <div className="flex-shrink-0 overflow-hidden" style={{ width: leftWidth }}>
        {left}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        onMouseDown={handleMouseDown}
        className={`group relative z-10 flex w-1 flex-shrink-0 cursor-col-resize items-center justify-center transition-colors hover:bg-[var(--color-accent)]/20 ${dragging ? 'bg-[var(--color-accent)]/30' : 'bg-[var(--color-border-subtle)]'}`}
      >
        <div className="absolute flex flex-col gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="h-0.5 w-0.5 rounded-full bg-[var(--color-text-muted)]" />
          <span className="h-0.5 w-0.5 rounded-full bg-[var(--color-text-muted)]" />
          <span className="h-0.5 w-0.5 rounded-full bg-[var(--color-text-muted)]" />
        </div>
      </div>
      <div className="min-w-0 flex-1 overflow-hidden">
        {right}
      </div>
    </div>
  );
}
