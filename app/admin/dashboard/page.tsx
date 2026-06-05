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
      padding: "28px 32px", boxShadow: "0 2px 16px rgba(13,27,42,0.05)", ...style,
    }}>
      {children}
    </div>
  );
}

// Badge "temps réel connecté"
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedForm, setSelectedForm] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState<"" | "genre_inclusion" | "vie_etudiants">("");
  const [realtimeLive, setRealtimeLive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  // Garde les filtres actifs accessibles dans le callback realtime sans stale closure
  const filtersRef = useRef({ form: "", dateRange: "", search: "", page: 1 });

  // ── Chargement stats ───────────────────────────────────────────────────
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

  // ── Chargement soumissions paginées ───────────────────────────────────
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

  // ── Refresh complet (stats + table) ───────────────────────────────────
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

  // ── Supabase Realtime ──────────────────────────────────────────────────
  useEffect(() => {
    // Nettoyage canal existant
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
        () => {
          // Nouvelle soumission, modification ou suppression → refresh immédiat
          refreshAll();
        }
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

  // ── Init ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { router.replace("/admin/login"); return; }
      await refreshAll();
      setLoading(false);
    };
    init();
  }, [router, refreshAll]);

  // Synchronise filtersRef à chaque changement de filtre
  useEffect(() => {
    filtersRef.current = { form: selectedForm, dateRange, search: searchQuery, page };
  }, [selectedForm, dateRange, searchQuery, page]);

  // ── Handlers ──────────────────────────────────────────────────────────
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
          {value === "genre_inclusion" ? "Genre & Inclusion" : "Vie des Étudiants"}
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
        // Build a readable preview from the first few meaningful payload fields
        let preview = "—";
        if (value && typeof value === "object") {
          const SKIP = new Set([
            "formhub/uuid","meta/instanceID","meta/rootUuid","_attachments",
            "_geolocation","_tags","_notes","_validation_status","_status",
            "__version__","_xform_id_string","_uuid","instanceID","device_fp",
            "start","end","_id",
          ]);
          const entries = Object.entries(value)
            .filter(([k]) => !SKIP.has(k))
            .slice(0, 3)
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
    padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600,
    border: "none", cursor: "pointer", transition: "all 0.18s",
    background: active ? (activeColor || "#0d1b2a") : "#fff",
    color: active ? "#fff" : "#7a9ab8",
    boxShadow: active ? "0 4px 12px rgba(13,27,42,0.15)" : "0 1px 4px rgba(13,27,42,0.06)",
    outline: active ? "none" : "1px solid #e8edf2",
  });

  return (
    <main>
      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#c9a84c", margin: "0 0 8px" }}>
              Tableau de bord
            </p>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: "#0d1b2a", margin: 0, lineHeight: 1.1 }}>
              Suivi des réponses
            </h1>
            <p style={{ marginTop: 8, fontSize: 14, color: "#7a9ab8", margin: "8px 0 0" }}>
              Vue d'ensemble et statistiques des formulaires KoboToolbox
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <RealtimeBadge live={realtimeLive} />
            {lastUpdate && (
              <span style={{ fontSize: 11, color: "#b0bec5" }}>
                Mis à jour à {lastUpdate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        <StatsCard label="Total reçu" value={stats.total} subtitle="soumissions enregistrées" color="navy" />
        <StatsCard label="Genre & Inclusion" value={stats.form1} subtitle="formulaire 1" color="green" />
        <StatsCard label="Vie des Étudiants" value={stats.form2} subtitle="formulaire 2" color="purple" />
        <StatsCard label="Aujourd'hui" value={stats.today} subtitle="nouvelles réponses" color="orange" />
      </div>

      {/* Charts */}
      <SectionCard style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "#0d1b2a", margin: "0 0 4px" }}>Évolution des soumissions</h2>
            <p style={{ fontSize: 13, color: "#7a9ab8", margin: 0 }}>Tendance sur les 30 derniers jours</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => handleFormFilter("")} style={filterBtnStyle(activeFilter === "")}>Tous</button>
            <button onClick={() => handleFormFilter("genre_inclusion")} style={filterBtnStyle(activeFilter === "genre_inclusion", "#15803d")}>Genre & Inclusion</button>
            <button onClick={() => handleFormFilter("vie_etudiants")} style={filterBtnStyle(activeFilter === "vie_etudiants", "#7c3aed")}>Vie des Étudiants</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.6fr", gap: 20 }}>
          <Chart
            data={trendData}
            type="line"
            title=""
            colors={["#0d1b2a", "#15803d", "#7c3aed"]}
            dataKeys={activeFilter ? (activeFilter === "genre_inclusion" ? ["form1"] : ["form2"]) : ["total", "form1", "form2"]}
          />
          <Chart
            data={[
              { name: "Genre & Inclusion", value: stats.form1 },
              { name: "Vie des Étudiants", value: stats.form2 },
            ]}
            type="pie"
            title=""
            height={260}
          />
        </div>
      </SectionCard>

      {/* Table */}
      <SectionCard>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 14 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "#0d1b2a", margin: "0 0 4px" }}>Dernières soumissions</h2>
            <p style={{ fontSize: 13, color: "#7a9ab8", margin: 0 }}>
              {totalCount > 0 ? `${totalCount} entrée${totalCount > 1 ? "s" : ""} au total` : "Aucune donnée disponible"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={exportCSV} style={{ padding: "8px 14px", borderRadius: 12, fontSize: 12, fontWeight: 600, border: "1px solid #e8edf2", background: "#f8fafc", color: "#3d5166", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              CSV
            </button>
            <button onClick={exportXLSX} style={{ padding: "8px 14px", borderRadius: 12, fontSize: 12, fontWeight: 600, border: "1px solid rgba(201,168,76,0.4)", background: "rgba(201,168,76,0.08)", color: "#a8863e", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Excel (2 feuilles)
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <SearchFilter
            onSearch={handleSearch}
            onFilterChange={handleFilterChange}
            placeholder="Rechercher dans les données…"
          />
        </div>

        <ModernTable
          columns={columns}
          data={submissions}
          loading={loading}
          sortBy={sortBy}
          onSort={handleSort}
        />

        <div style={{ marginTop: 18, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
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
        @media (max-width: 900px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </main>
  );
}
