"use client";

import React from "react";

interface TableColumn {
  key: string;
  label: string;
  width?: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface ModernTableProps {
  columns: TableColumn[];
  data: any[];
  loading?: boolean;
  sortBy?: string;
  onSort?: (key: string) => void;
}

export function ModernTable({
  columns,
  data,
  loading = false,
  sortBy,
  onSort,
}: ModernTableProps) {
  return (
    <div className="rounded-2xl border border-border bg-white shadow-sm">
      <div className="max-h-[60vh] overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-gradient-to-r from-gray-50 to-gray-100">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="sticky top-0 z-10 px-6 py-4 text-left font-semibold text-navy whitespace-nowrap cursor-pointer hover:bg-gray-100 transition bg-white/95 backdrop-blur"
                  onClick={() => onSort?.(col.key)}
                >
                  <div className="flex items-center gap-2">
                    {col.label}
                    {sortBy === col.key && (
                      <svg
                        className="w-4 h-4 text-gold"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zm0 6a1 1 0 000 2h11a1 1 0 100-2H3zm0 6a1 1 0 000 2h11a1 1 0 100-2H3z" />
                      </svg>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-ink3">
                  Chargement des données...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-ink3">
                  Aucune donnée disponible
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className="border-b border-border hover:bg-gray-50/50 transition"
                >
                  {columns.map((col) => (
                    <td
                      key={`${rowIdx}-${col.key}`}
                      className="px-6 py-4 text-ink2"
                      style={{ width: col.width }}
                    >
                      {col.render
                        ? col.render(row[col.key], row)
                        : String(row[col.key] || "-")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
