"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { StatsCard } from "@/components/StatsCard";
import { Chart } from "@/components/Chart";
import { SearchFilter } from "@/components/SearchFilter";
import { ModernTable } from "@/components/ModernTable";
import { displayKoboValue } from "@/lib/koboDecoder";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface Submission {
  id: string;
  created_at: string;
  form: string;
  payload: any;
}

interface Stats {
  total: number;
  form1: number;
  form2: number;
  today: number;
}

interface TrendData {
  date: string;
  total: number;
  form1: number;
  form2: number;
}

function SectionCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #e8edf2", borderRadius: 24,
      padding: "20px 16px", boxShadow: "0 2px 16px rgba(13,27,42,0.05)", ...style,
    }}
    className="section-card"
    >
      {children}
    </div>
  );
}

function RealtimeBadge({ live }: { live: boolean }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 7,
      padding: "7px 14px", borderRadius: 20,
      background: live ? "#f0fdf4" : "#fafafa",
      border: `1px solid ${live ? "#bbf7d0" : "#e2e8ef"}`,
      fontSize: 12, fontWeight: 600,
      color: live ? "#15803d" : "#94a3b8",
      transition: "all 0.3s",
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%",
        background: live ? "#22c55e" : "#cbd5e1",
        animation: live ? "pulse 2s infinite" : "none",
      }} />
      {live ? "Temps réel actif" : "Connexion…"}
    </div>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({ total: 0, form1: 0, form2: 0, today: 0 });
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<"admin" | "form1_only">("admin");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedForm, setSelectedForm] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState<"" | "genre_inclusion" | "vie_etudiants">("");
  const [realtimeLive, setRealtimeLive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [formLabels, setFormLabels] = useState<{ form1: string; form2: string }>({ form1: "Genre & Inclusion", form2: "Vie des Étudiants" });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const filtersRef = useRef({ form: "", dateRange: "", search: "", page: 1 });

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats");
      const json = await res.json();
      if (json.stats) setStats(json.stats);
      if (json.trends) setTrendData(json.trends.slice(-30));
    } catch (e) {
      console.error("Erreur fetch stats:", e);
    }
  }, []);

  const fetchPage = useCallback(async (
    pageNumber: number,
    options: { form?: string; dateRange?: string; search?: string } = {}
  ) => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(pageNumber), pageSize: "50" });
    if (options.form) qs.set("form", options.form);
    if (options.search) qs.set("search", options.search);
    if (options.dateRange) qs.set("dateRange", options.dateRange);

    try {
      const res = await fetch(`/api/submissions?${qs.toString()}`);
      const json = await res.json();
      setSubmissions(json.data || []);
      setTotalCount(json.count || 0);
      setPage(pageNumber);
    } catch (e) {
      console.error("Erreur fetch submissions:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLastUpdate(new Date());
    await Promise.all([
      loadStats(),
      fetchPage(filtersRef.current.page, {
        form: filtersRef.current.form,
        dateRange: filtersRef.current.dateRange,
        search: filtersRef.current.search,
      }),
    ]);
  }, [loadStats, fetchPage]);

  useEffect(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel("submissions-realtime", {
        config: { broadcast: { self: false } },
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "submissions" },
        () => { refreshAll(); }
      )
      .subscribe((status) => {
        setRealtimeLive(status === "SUBSCRIBED");
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      setRealtimeLive(false);
    };
  }, [refreshAll]);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { router.replace("/admin/login"); return; }
      const userId = data.session.user.id;
      const { data: roleRow } = await supabase
        .from("user_roles").select("role").eq("user_id", userId).maybeSingle();
      setUserRole(((roleRow as any)?.role || "admin") as "admin" | "form1_only");

      const { data: configRows } = await supabase
        .from("config").select("id, value").in("id", ["title1", "title2"]);
      const cfgMap = Object.fromEntries((configRows || []).map((r: any) => [r.id, r.value]));
      setFormLabels({
        form1: cfgMap["title1"] || "Genre & Inclusion",
        form2: cfgMap["title2"] || "Vie des Étudiants",
      });

      await refreshAll();
      setLoading(false);
    };
    init();
  }, [router, refreshAll]);

  useEffect(() => {
    filtersRef.current = { form: selectedForm, dateRange, search: searchQuery, page };
  }, [selectedForm, dateRange, searchQuery, page]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    filtersRef.current.search = query;
    fetchPage(1, { form: selectedForm, dateRange, search: query });
  };

  const handleFilterChange = (filters: { form?: string; dateRange?: string }) => {
    setSelectedForm(filters.form || "");
    setDateRange(filters.dateRange || "");
    filtersRef.current.form = filters.form || "";
    filtersRef.current.dateRange = filters.dateRange || "";
    fetchPage(1, { form: filters.form, dateRange: filters.dateRange, search: searchQuery });
  };

  const handleSort = (key: string) => {
    setSortBy(prev => key === "created_at" ? (prev === "date-asc" ? "date-desc" : "date-asc") : "form");
  };

  const handleFormFilter = (form: "" | "genre_inclusion" | "vie_etudiants") => {
    setActiveFilter(form);
    setSelectedForm(form);
    filtersRef.current.form = form;
    fetchPage(1, { form, dateRange, search: searchQuery });
  };

  const exportCSV = () => {
    const qs = new URLSearchParams({ format: "csv" });
    if (selectedForm) qs.set("form", selectedForm);
    window.open(`/api/submissions?${qs.toString()}`);
  };

  const exportXLSX = () => {
    const qs = new URLSearchParams({ format: "xlsx" });
    if (selectedForm) qs.set("form", selectedForm);
    window.open(`/api/submissions?${qs.toString()}`);
  };

  const columns = [
    {
      key: "id", label: "ID", width: "110px",
      render: (value: string) => (
        <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 600, color: "#7a9ab8", background: "#f1f5f9", padding: "2px 8px", borderRadius: 6 }}>
          {value.substring(0, 8)}
        </span>
      ),
    },
    {
      key: "form", label: "Formulaire",
      render: (value: string) => (
        <span style={{
          display: "inline-block", padding: "3px 10px", borderRadius: 20,
          fontSize: 11, fontWeight: 600,
          background: value === "genre_inclusion" ? "#dcfce7" : "#ede9fe",
          color: value === "genre_inclusion" ? "#15803d" : "#7c3aed",
        }}>
          {value === "genre_inclusion" ? formLabels.form1 : formLabels.form2}
        </span>
      ),
    },
    {
      key: "created_at_date", label: "Date",
      render: (_: string, row: Submission) =>
        row.created_at ? new Date(row.created_at).toLocaleDateString("fr-FR") : "—",
    },
    {
      key: "created_at_time", label: "Heure",
      render: (_: string, row: Submission) =>
        row.created_at ? new Date(row.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—",
    },
    {
      key: "payload", label: "Aperçu",
      render: (value: any) => {
        let preview = "—";
        if (value && typeof value === "object") {
          const entries = Object.entries(value)
            .filter(([k]) => {
              if (k.startsWith("_")) return false;
              if (/^group_[a-z0-9]+(_count)?$/i.test(k)) return false;
              const SKIP = new Set([
                "formhub/uuid","meta/instanceID","meta/rootUuid","_attachments",
                "_geolocation","_tags","_notes","_validation_status","_status",
                "__version__","_xform_id_string","_uuid","instanceID","device_fp",
                "start","end","submitted_by","_submitted_by",
              ]);
              return !SKIP.has(k);
            })
            .filter(([, v]) => {
              // Exclure les valeurs JSON brutes (objets/tableaux d'objets)
              if (typeof v === "object" && v !== null) return false;
              const s = String(v ?? "").trim();
              return s !== "" && s !== "—";
            })
            .slice(0, 4)
            .map(([, v]) => displayKoboValue(v))
            .filter(Boolean);
          if (entries.length > 0) preview = entries.join(" · ");
        }
        return (
          <span
            style={{ fontSize: 12, color: "#3d5166", display: "block", maxWidth: 260,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            title={preview}
          >
            {preview}
          </span>
        );
      },
    },
    {
      key: "status", label: "Statut",
      render: () => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "#dcfce7", color: "#15803d" }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e" }} />
          Actif
        </span>
      ),
    },
  ];

  const filterBtnStyle = (active: boolean, activeColor?: string): React.CSSProperties => ({
    padding: "7px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
    border: "none", cursor: "pointer", transition: "all 0.18s",
    background: active ? (activeColor || "#0d1b2a") : "#fff",
    color: active ? "#fff" : "#7a9ab8",
    boxShadow: active ? "0 4px 12px rgba(13,27,42,0.15)" : "0 1px 4px rgba(13,27,42,0.06)",
    outline: active ? "none" : "1px solid #e8edf2",
    whiteSpace: "nowrap",
  });

  return (
    <main style={{ padding: "0 0 40px" }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div className="dashboard-header">
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#c9a84c", margin: "0 0 8px" }}>
              Tableau de bord
            </p>
            <h1 className="dashboard-title">
              Suivi des réponses
            </h1>
            <p style={{ marginTop: 8, fontSize: 14, color: "#7a9ab8", margin: "8px 0 0" }}>
              Vue d'ensemble et statistiques des formulaires KoboToolbox
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, marginTop: 8 }}>
            <RealtimeBadge live={realtimeLive} />
            {lastUpdate && (
              <span style={{ fontSize: 11, color: "#b0bec5" }}>
                Mis à jour à {lastUpdate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards — responsive grid */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <StatsCard label="Total reçu" value={stats.total} subtitle="soumissions enregistrées" color="navy" />
        <StatsCard label={formLabels.form1} value={stats.form1} subtitle="formulaire 1" color="green" />
        {userRole === "admin" && <StatsCard label={formLabels.form2} value={stats.form2} subtitle="formulaire 2" color="purple" />}
        <StatsCard label="Aujourd'hui" value={stats.today} subtitle="nouvelles réponses" color="orange" />
      </div>

      {/* Charts */}
      <SectionCard style={{ marginBottom: 20 }}>
        <div className="chart-header">
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0d1b2a", margin: "0 0 4px" }}>Évolution des soumissions</h2>
            <p style={{ fontSize: 13, color: "#7a9ab8", margin: 0 }}>Tendance sur les 30 derniers jours</p>
          </div>
          <div className="filter-btn-group">
            <button onClick={() => handleFormFilter("")} style={filterBtnStyle(activeFilter === "")}>Tous</button>
            <button onClick={() => handleFormFilter("genre_inclusion")} style={filterBtnStyle(activeFilter === "genre_inclusion", "#15803d")}>{formLabels.form1}</button>
            {userRole === "admin" && <button onClick={() => handleFormFilter("vie_etudiants")} style={filterBtnStyle(activeFilter === "vie_etudiants", "#7c3aed")}>{formLabels.form2}</button>}
          </div>
        </div>

        {/* Charts: stacked on mobile, side-by-side on desktop */}
        <div className="chart-grid">
          <Chart
            data={trendData}
            type="line"
            title=""
            colors={["#0d1b2a", "#15803d", "#7c3aed"]}
            dataKeys={activeFilter ? (activeFilter === "genre_inclusion" ? ["form1"] : ["form2"]) : (userRole === "form1_only" ? ["total", "form1"] : ["total", "form1", "form2"])}
          />
          <Chart
            data={[
              { name: formLabels.form1, value: stats.form1 },
              ...(userRole === "admin" ? [{ name: formLabels.form2, value: stats.form2 }] : []),
            ]}
            type="pie"
            title=""
            height={220}
          />
        </div>
      </SectionCard>

      {/* Table */}
      <SectionCard>
        <div className="table-header">
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0d1b2a", margin: "0 0 4px" }}>Dernières soumissions</h2>
            <p style={{ fontSize: 13, color: "#7a9ab8", margin: 0 }}>
              {totalCount > 0 ? `${totalCount} entrée${totalCount > 1 ? "s" : ""} au total` : "Aucune donnée disponible"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button onClick={exportCSV} style={{ padding: "8px 12px", borderRadius: 12, fontSize: 12, fontWeight: 600, border: "1px solid #e8edf2", background: "#f8fafc", color: "#3d5166", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              CSV
            </button>
            <button onClick={exportXLSX} style={{ padding: "8px 12px", borderRadius: 12, fontSize: 12, fontWeight: 600, border: "1px solid rgba(201,168,76,0.4)", background: "rgba(201,168,76,0.08)", color: "#a8863e", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Excel
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <SearchFilter
            onSearch={handleSearch}
            onFilterChange={handleFilterChange}
            placeholder="Rechercher dans les données…"
            formLabels={formLabels}
          />
        </div>

        <ModernTable
          columns={columns}
          data={submissions}
          loading={loading}
          sortBy={sortBy}
          onSort={handleSort}
        />

        <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <p style={{ fontSize: 13, color: "#7a9ab8", margin: 0 }}>
            {totalCount === 0 ? "Aucun résultat" : `Page ${page} / ${Math.max(1, Math.ceil(totalCount / 50))}`}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => { const p = Math.max(1, page - 1); fetchPage(p, { form: selectedForm, dateRange, search: searchQuery }); }}
              disabled={page <= 1}
              style={{ padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 500, border: "1px solid #e8edf2", background: page <= 1 ? "#f8fafc" : "#fff", color: page <= 1 ? "#c8d4df" : "#3d5166", cursor: page <= 1 ? "not-allowed" : "pointer" }}
            >
              ← Précédent
            </button>
            <button
              onClick={() => { const p = page + 1; fetchPage(p, { form: selectedForm, dateRange, search: searchQuery }); }}
              disabled={page * 50 >= totalCount}
              style={{ padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 500, border: "1px solid #e8edf2", background: page * 50 >= totalCount ? "#f8fafc" : "#fff", color: page * 50 >= totalCount ? "#c8d4df" : "#3d5166", cursor: page * 50 >= totalCount ? "not-allowed" : "pointer" }}
            >
              Suivant →
            </button>
          </div>
        </div>
      </SectionCard>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

        /* Dashboard header */
        .dashboard-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        .dashboard-title {
          font-size: 26px;
          font-weight: 800;
          color: #0d1b2a;
          margin: 0;
          line-height: 1.1;
        }

        /* Stats grid: 4 cols → 2 cols on tablet → 2 cols on mobile */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        /* Chart area: side-by-side on desktop */
        .chart-grid {
          display: grid;
          grid-template-columns: 1.4fr 0.6fr;
          gap: 16px;
          align-items: center;
        }
        .chart-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 10px;
        }
        .filter-btn-group {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .section-card {
          padding: 20px 16px !important;
        }

        /* Table header */
        .table-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 12px;
        }

        /* ── Tablet (≤ 900px) ── */
        @media (max-width: 900px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px; }
          .chart-grid { grid-template-columns: 1fr !important; }
          .dashboard-title { font-size: 22px !important; }
        }

        /* ── Mobile (≤ 600px) ── */
        @media (max-width: 600px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px; }
          .chart-grid { grid-template-columns: 1fr !important; }
          .dashboard-title { font-size: 20px !important; }
          .section-card { padding: 14px 12px !important; border-radius: 16px !important; }
          .chart-header { flex-direction: column; align-items: flex-start; }
          .filter-btn-group { width: 100%; }
          .table-header { flex-direction: column; }
          .dashboard-header { flex-direction: column; }
        }

        /* ── Very small (≤ 380px) ── */
        @media (max-width: 380px) {
          .stats-grid { grid-template-columns: 1fr 1fr !important; gap: 6px; }
          .filter-btn-group button { font-size: 11px !important; padding: 6px 8px !important; }
        }
      `}</style>
    </main>
  );
}
