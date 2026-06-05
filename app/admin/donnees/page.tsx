"use client";
import { useState, useEffect } from "react";
import * as XLSX from "xlsx";

interface DataEntry {
  [key: string]: any;
}

function IconDownload() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

function IconRefresh() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36M20.49 15a9 9 0 0 1-14.85 3.36"/>
    </svg>
  );
}

export default function DonneesPage() {
  const [formId, setFormId] = useState("acxnH2zHKWi5z9y5VHD7p");
  const [data, setData] = useState<DataEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadData() {
    if (!formId.trim()) {
      setError("ID du formulaire requis");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/kobo/data?formId=${encodeURIComponent(formId)}`);
      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des données");
      }
      const result = await response.json();
      setData(result.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  function exportToExcel() {
    if (data.length === 0) {
      alert("Aucune donnée à exporter");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Données");
    
    const fileName = `enquete-${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }

  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <div style={{ padding: "40px 40px", maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0d1b2a", fontFamily: "var(--font-serif)", marginBottom: 8 }}>
          Données des enquêtes
        </h1>
        <p style={{ fontSize: 14, color: "#7a9ab8", lineHeight: 1.6 }}>
          Consultez et exportez les réponses aux formulaires KoboToolbox en Excel.
        </p>
      </div>

      {/* Form ID input */}
      <div style={{
        background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8ef",
        padding: "20px", marginBottom: 24, boxShadow: "0 2px 8px rgba(13,27,42,0.04)",
      }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#3d5166", display: "block", marginBottom: 8 }}>
          ID du formulaire KoboToolbox
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            type="text"
            value={formId}
            onChange={e => setFormId(e.target.value)}
            placeholder="ex: acxnH2zHKWi5z9y5VHD7p"
            style={{
              flex: 1, padding: "10px 14px", borderRadius: 10,
              border: "1.5px solid #e2e8ef", fontSize: 13, outline: "none",
              fontFamily: "var(--font-sans)", transition: "border-color 0.2s",
              boxSizing: "border-box", color: "#0d1b2a",
            }}
            onFocus={e => (e.currentTarget.style.borderColor = "#c9a84c")}
            onBlur={e => (e.currentTarget.style.borderColor = "#e2e8ef")}
            onKeyDown={e => e.key === "Enter" && loadData()}
          />
          <button
            onClick={loadData}
            disabled={loading}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 18px", borderRadius: 10, flexShrink: 0,
              background: "linear-gradient(135deg, #0d1b2a 0%, #1a2e44 100%)",
              color: "#fff", border: "none", fontSize: 13, fontWeight: 600,
              cursor: loading ? "wait" : "pointer",
              fontFamily: "var(--font-sans)", transition: "all 0.3s",
            }}
          >
            <IconRefresh /> {loading ? "Chargement…" : "Charger"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: "#fff0f0", border: "1px solid #ffc5c5",
          borderRadius: 10, padding: "12px 16px",
          fontSize: 13, color: "#c0392b", marginBottom: 16,
        }}>
          ❌ {error}
        </div>
      )}

      {/* Export button */}
      {data.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={exportToExcel}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "12px 20px", borderRadius: 10,
              background: "linear-gradient(135deg, #2d6a4f 0%, #1a3d2b 100%)",
              color: "#fff", border: "none", fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "var(--font-sans)", transition: "all 0.3s",
            }}
          >
            <IconDownload /> Exporter {data.length} réponses en Excel
          </button>
        </div>
      )}

      {/* Data table */}
      {data.length > 0 ? (
        <div style={{
          background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8ef",
          overflow: "hidden", boxShadow: "0 4px 16px rgba(13,27,42,0.06)",
        }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{
              width: "100%", borderCollapse: "collapse", fontSize: 13,
            }}>
              <thead>
                <tr style={{ background: "#f5f7fb", borderBottom: "1px solid #e2e8ef" }}>
                  {columns.map(col => (
                    <th key={col} style={{
                      padding: "12px 16px", textAlign: "left", fontWeight: 600,
                      color: "#0d1b2a", borderRight: "1px solid #e2e8ef", whiteSpace: "nowrap",
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: idx < data.length - 1 ? "1px solid #e2e8ef" : "none" }}>
                    {columns.map(col => (
                      <td key={`${idx}-${col}`} style={{
                        padding: "12px 16px", color: "#3d5166",
                        borderRight: "1px solid #e2e8ef", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {row[col] ? String(row[col]).substring(0, 100) : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "12px 16px", borderTop: "1px solid #e2e8ef", background: "#f5f7fb", fontSize: 12, color: "#7a9ab8" }}>
            Total: {data.length} réponses
          </div>
        </div>
      ) : !loading && !error && (
        <div style={{
          background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8ef",
          padding: "60px 40px", textAlign: "center", color: "#7a9ab8",
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: "0 auto 16px", opacity: 0.5 }}>
            <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/><line x1="15" y1="9" x2="15" y2="21"/>
          </svg>
          <div style={{ fontSize: 14 }}>Aucune donnée</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Entrez un ID de formulaire et cliquez sur "Charger"</div>
        </div>
      )}
    </div>
  );
}
