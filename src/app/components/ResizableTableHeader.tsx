"use client";

import { useState, useRef, useEffect } from 'react';

interface ResizableTableHeaderProps {
  children: React.ReactNode;
  initialWidth: number;
  minWidth: number;
  onResize: (width: number) => void;
  isLastColumn?: boolean;
  // sorting
  onSort?: () => void;
  sortDir?: 'asc' | 'desc';
}

export default function ResizableTableHeader({
  children,
  initialWidth,
  minWidth,
  onResize,
  isLastColumn = false,
  onSort,
  sortDir,
}: ResizableTableHeaderProps) {
  const [width, setWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const headerRef = useRef<HTMLTableCellElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = Math.max(minWidth, startWidth + (e.clientX - startX));
      setWidth(newWidth);
      onResize(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
    };

    if (isResizing) {
      document.body.style.cursor = 'col-resize';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
  }, [isResizing, startX, startWidth, minWidth, onResize]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    setStartX(e.clientX);
    setStartWidth(width);
    // prevent triggering sort when starting resize
    e.stopPropagation();
  };

  const arrow = sortDir === 'asc' ? '▲' : sortDir === 'desc' ? '▼' : '⇅';
  const arrowClass = sortDir ? 'text-blue-300' : 'text-slate-400 group-hover:text-white';

  return (
    <th
      ref={headerRef}
      className={`sticky top-0 z-30 border-r border-slate-700 bg-slate-950 px-4 py-3 text-left text-sm font-semibold tracking-wide text-white ${isResizing ? 'bg-slate-900' : ''}`}
      aria-label={typeof children === 'string' ? children : undefined}
      onClick={onSort}
    >
      <div
        className="group flex items-center justify-between w-full select-none"
      >
        <span>{children}</span>
        {/* Arrow icon */}
        <span className={`ml-1 text-base transition-colors ${arrowClass}`}>
          {arrow}
        </span>
      </div>
      {!isLastColumn && (
        <div
          className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-primary active:bg-primary group"
          onMouseDown={handleMouseDown}
        >
          <div className="absolute right-0 top-0 h-full w-1 bg-slate-700 group-hover:bg-blue-400 group-active:bg-blue-400" />
        </div>
      )}
    </th>
  );
}
