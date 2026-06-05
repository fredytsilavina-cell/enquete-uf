"use client";

interface Column {
  key: string;
  label: string;
  width?: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface ModernTableProps {
  columns: Column[];
  data: any[];
  loading?: boolean;
  sortBy?: string;
  onSort?: (key: string) => void;
}

export function ModernTable({ columns, data, loading, sortBy, onSort }: ModernTableProps) {
  if (loading) {
    return (
      <div className="mt-skeleton">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="mt-skeleton-row" style={{ animationDelay: `${i * 0.05}s` }}>
            {columns.map((col, j) => (
              <div key={j} className="mt-skeleton-cell">
                <div className="mt-skeleton-bar" style={{ width: j === 0 ? "60%" : j === columns.length - 1 ? "80%" : "70%" }} />
              </div>
            ))}
          </div>
        ))}
        <style>{`
          .mt-skeleton { display: flex; flex-direction: column; gap: 2px; }
          .mt-skeleton-row {
            display: grid;
            grid-template-columns: ${columns.map(c => c.width || "1fr").join(" ")};
            gap: 12px;
            padding: 13px 16px;
            border-radius: 10px;
            animation: mtPulse 1.4s ease-in-out infinite;
          }
          @keyframes mtPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
          .mt-skeleton-cell { display: flex; align-items: center; }
          .mt-skeleton-bar { height: 12px; border-radius: 6px; background: #e8eef4; }
        `}</style>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="mt-empty">
        <div className="mt-empty-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c8d4df" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
          </svg>
        </div>
        <p className="mt-empty-text">Aucune donnée à afficher</p>
        <p className="mt-empty-sub">Synchronisez depuis KoboToolbox pour importer des soumissions</p>
        <style>{`.mt-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:56px 24px;gap:10px}.mt-empty-icon{width:56px;height:56px;border-radius:16px;background:#f4f7fa;display:flex;align-items:center;justify-content:center}.mt-empty-text{font-size:14px;font-weight:600;color:#3d5166;margin:0}.mt-empty-sub{font-size:12.5px;color:#9bb3c8;margin:0;text-align:center}`}</style>
      </div>
    );
  }

  return (
    <div className="mt-wrap">
      <div className="mt-scroll-area">
        <table className="mt-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`mt-th ${onSort ? "mt-th--sortable" : ""}`}
                  style={col.width ? { width: col.width, minWidth: col.width } : {}}
                  onClick={() => onSort && onSort(col.key)}
                >
                  <span className="mt-th-inner">
                    {col.label}
                    {onSort && (
                      <svg className="mt-sort-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={row.id || i} className="mt-tr">
                {columns.map((col) => (
                  <td key={col.key} className="mt-td">
                    {col.render ? col.render(row[col.key], row) : row[col.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        .mt-wrap { width: 100%; overflow: hidden; }
        .mt-scroll-area {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
          scrollbar-color: #e2e8ef transparent;
          min-height: 360px;
          max-height: 520px;
          overflow-y: auto;
        }
        .mt-scroll-area::-webkit-scrollbar { height: 5px; width: 5px; }
        .mt-scroll-area::-webkit-scrollbar-track { background: transparent; }
        .mt-scroll-area::-webkit-scrollbar-thumb { background: #dde4eb; border-radius: 99px; }

        .mt-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          min-width: 560px;
        }

        .mt-th {
          padding: 10px 14px;
          text-align: left;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #7a9ab8;
          background: #f4f7fa;
          border-bottom: 1px solid #e8eef4;
          white-space: nowrap;
          position: sticky;
          top: 0;
          z-index: 2;
        }
        .mt-th:first-child { border-radius: 10px 0 0 0; }
        .mt-th:last-child { border-radius: 0 10px 0 0; }
        .mt-th--sortable { cursor: pointer; user-select: none; }
        .mt-th--sortable:hover { background: #edf0f5; color: #3d5166; }
        .mt-th-inner { display: flex; align-items: center; gap: 5px; }
        .mt-sort-icon { color: #c8d4df; flex-shrink: 0; }

        .mt-tr {
          transition: background 0.12s;
        }
        .mt-tr:hover td { background: #f8fafb; }

        .mt-td {
          padding: 11px 14px;
          font-size: 13px;
          color: #3d5166;
          border-bottom: 1px solid #f0f4f8;
          vertical-align: middle;
          white-space: nowrap;
        }
        .mt-tr:last-child .mt-td { border-bottom: none; }

        @media (max-width: 640px) {
          .mt-scroll-area { min-height: 280px; max-height: 400px; }
          .mt-td, .mt-th { padding: 10px 11px; font-size: 12px; }
        }
      `}</style>
    </div>
  );
}
