"use client";

import { useState, useRef, useEffect } from 'react';

interface ResizableTableHeaderProps {
  children: React.ReactNode;
  initialWidth: number;
  minWidth: number;
  onResize: (width: number) => void;
  isLastColumn?: boolean;
}

export default function ResizableTableHeader({
  children,
  initialWidth,
  minWidth,
  onResize,
  isLastColumn = false,
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
  };

  return (
    <th
      ref={headerRef}
      className={`relative px-4 py-2 border-r border-gray-600 ${isResizing ? 'bg-gray-700' : ''}`}
    >
      {children}
      {!isLastColumn && (
        <div
          className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-primary active:bg-primary group"
          onMouseDown={handleMouseDown}
        >
          <div className="absolute right-0 top-0 h-full w-1 bg-gray-600 group-hover:bg-primary group-active:bg-primary" />
        </div>
      )}
    </th>
  );
} 