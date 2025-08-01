"use client";
import React, { useMemo, useState } from "react";
import ResizableTableHeader from "./ResizableTableHeader";

export interface ColumnDef {
  key: string;
  label: string;
  width: number;
  minWidth?: number;
  /**
   * Provide to override default comparison. Should return primitive comparable value.
   */
  sortAccessor?: (row: any) => string | number;
}

interface DataTableProps<T> {
  columns: ColumnDef[];
  data: T[];
  rowKey: (item: T, index: number) => string | number;
  rowRenderer: (
    item: T,
    columnWidths: Record<string, number>,
    index: number,
  ) => React.ReactNode;
  /** Optional class such as h-full */
  heightClass?: string;
}

export default function DataTable<T>({
  columns,
  data,
  rowKey,
  rowRenderer,
  heightClass = "h-full",
}: DataTableProps<T>) {
  const initialWidths = Object.fromEntries(
    columns.map((c) => [c.key, c.width]),
  ) as Record<string, number>;
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    initialWidths,
  );

  const [sortConfig, setSortConfig] = useState<{
    key: string;
    dir: "asc" | "desc";
  } | null>(null);

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;
    const col = columns.find((c) => c.key === sortConfig.key);
    if (!col) return data;
    const accessor = col.sortAccessor ?? ((row: any) => (row as any)[col.key]);
    const sorted = [...data].sort((a, b) => {
      const vA = accessor(a);
      const vB = accessor(b);
      // numeric check
      if (typeof vA === "number" && typeof vB === "number") {
        return vA - vB;
      }
      return String(vA).localeCompare(String(vB), undefined, {
        sensitivity: "base",
      });
    });
    if (sortConfig.dir === "desc") sorted.reverse();
    return sorted;
  }, [data, sortConfig, columns]);

  const handleResize = (key: string) => (w: number) => {
    setColumnWidths((prev) => ({ ...prev, [key]: w }));
  };

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev && prev.key === key) {
        return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      return { key, dir: "asc" };
    });
  };

  return (
    <div className={`overflow-hidden bg-white shadow-md rounded-lg ${heightClass}`}>
      <div className="w-full h-full overflow-auto">
        <table className="table-fixed border-collapse w-full text-black">
          <colgroup>
            {columns.map((c) => (
              <col key={c.key} style={{ width: `${columnWidths[c.key]}px` }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {columns.map((c, idx) => (
                <ResizableTableHeader
                  key={c.key}
                  initialWidth={columnWidths[c.key]}
                  minWidth={c.minWidth ?? 80}
                  onResize={handleResize(c.key)}
                  isLastColumn={idx === columns.length - 1}
                  onSort={() => handleSort(c.key)}
                  sortDir={sortConfig?.key === c.key ? sortConfig.dir : undefined}
                >
                  {c.label}
                </ResizableTableHeader>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedData.map((item, idx) => {
              const element = rowRenderer(item, columnWidths, idx) as React.ReactElement;
              return React.cloneElement(element, { key: rowKey(item, idx) });
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
