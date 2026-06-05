"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { StatsCard } from "@/components/StatsCard";
import { Chart } from "@/components/Chart";
import { SearchFilter } from "@/components/SearchFilter";
import { ModernTable } from "@/components/ModernTable";
import { ModernButton } from "@/components/ModernButton";

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

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({ total: 0, form1: 0, form2: 0, today: 0 });
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedForm, setSelectedForm] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/admin/login");
        return;
      }
      // Récupérer stats et tendances depuis l'API serveur
      try {
        const statsRes = await fetch('/api/stats');
        const statsJson = await statsRes.json();
        if (statsJson.stats) setStats(statsJson.stats);
        if (statsJson.trends) setTrendData(statsJson.trends.slice(-30));
      } catch (e) {
        console.error('Erreur fetch stats:', e);
      }

      // Récupérer la première page de soumissions
      await fetchPage(1, { form: selectedForm, dateRange, search: searchQuery });
      setLoading(false);
    };

    init();
  }, [router]);

  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchPage = async (
    pageNumber: number,
    options: { form?: string; dateRange?: string; search?: string } = {}
  ) => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(pageNumber), pageSize: '50' });
    if (options.form) qs.set('form', options.form);
    if (options.search) qs.set('search', options.search);
    if (options.dateRange) qs.set('dateRange', options.dateRange);

    const res = await fetch(`/api/submissions?${qs.toString()}`);
    const json = await res.json();
    setSubmissions(json.data || []);
    setFilteredSubmissions(json.data || []);
    setTotalCount(json.count || 0);
    setPage(pageNumber);
    setLoading(false);
  };

  const applyFilters = (data: Submission[], query: string, form: string) => {
    let filtered = data;

    if (form) {
      filtered = filtered.filter(s => s.form === form);
    }

    if (query) {
      filtered = filtered.filter(s =>
        JSON.stringify(s.payload).toLowerCase().includes(query.toLowerCase()) ||
        s.id.toLowerCase().includes(query.toLowerCase())
      );
    }

    if (sortBy === "date-asc") {
      filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortBy === "form") {
      filtered.sort((a, b) => (a.form || "").localeCompare(b.form || ""));
    } else {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    setFilteredSubmissions(filtered.slice(0, 50));
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    fetchPage(1, { form: selectedForm, dateRange, search: query });
  };

  const handleFilterChange = (filters: { form?: string; dateRange?: string }) => {
    setSelectedForm(filters.form || "");
    setDateRange(filters.dateRange || "");
    fetchPage(1, { form: filters.form, dateRange: filters.dateRange, search: searchQuery });
  };

  const handleSort = (key: string) => {
    const nextSort = key === "created_at" ? (sortBy === "date-asc" ? "date-desc" : "date-asc") : "form";
    setSortBy(nextSort);
    fetchPage(1, { form: selectedForm, dateRange, search: searchQuery });
  };

  const exportCSV = () => {
    const qs = new URLSearchParams({ format: 'csv' });
    if (selectedForm) qs.set('form', selectedForm);
    if (dateRange) qs.set('dateRange', dateRange);
    if (searchQuery) qs.set('search', searchQuery);
    window.open(`/api/submissions?${qs.toString()}`);
  };

  const exportXLSX = () => {
    const qs = new URLSearchParams({ format: 'xlsx' });
    if (selectedForm) qs.set('form', selectedForm);
    if (dateRange) qs.set('dateRange', dateRange);
    if (searchQuery) qs.set('search', searchQuery);
    window.open(`/api/submissions?${qs.toString()}`);
  };

  const refreshSubmissions = () => {
    fetchPage(1, { form: selectedForm, dateRange, search: searchQuery });
  };

  const columns = [
    {
      key: "id",
      label: "ID",
      width: "120px",
      render: (value: string) => (
        <span className="font-mono text-xs font-semibold text-ink3">{value.substring(0, 8)}</span>
      ),
    },
    {
      key: "form",
      label: "Formulaire",
      render: (value: string) => (
        <span
          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
            value === "genre_inclusion"
              ? "bg-green-100 text-green-700"
              : "bg-purple-100 text-purple-700"
          }`}
        >
          {value === "genre_inclusion" ? "Genre & Inclusion" : "Vie des Étudiants"}
        </span>
      ),
    },
    {
      key: "created_at",
      label: "Date",
      render: (value: string) => new Date(value).toLocaleDateString("fr-FR"),
    },
    {
      key: "created_at",
      label: "Heure",
      render: (value: string) => new Date(value).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    },
    {
      key: "payload",
      label: "Aperçu",
      render: (value: any) => (
        <span className="text-xs text-ink3 truncate max-w-xs">
          {JSON.stringify(value).substring(0, 100)}...
        </span>
      ),
    },
    {
      key: "id",
      label: "Statut",
      render: () => <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Actif</span>,
    },
  ];

  return (
    <main className="space-y-8">
      <header>
        <p className="text-sm uppercase tracking-[0.18em] text-gold-muted">TABLEAU DE BORD</p>
        <h1 className="mt-2 text-4xl font-bold text-navy">Suivi des réponses</h1>
        <p className="mt-3 text-base text-ink2">Vue d'ensemble et statistiques des formulaires KoboToolbox</p>

        <div className="mt-4 inline-flex items-center rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 shadow-sm">
          {stats.total > 0 ? `Données disponibles : ${stats.total}` : 'Aucune donnée détectée pour le moment'}
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Total reçu"
          value={stats.total}
          subtitle="soumissions"
          color="blue"
        />
        <StatsCard
          label="Formulaire 1"
          value={stats.form1}
          subtitle="genre inclusion"
          color="green"
        />
        <StatsCard
          label="Formulaire 2"
          value={stats.form2}
          subtitle="vie des étudiants"
          color="purple"
        />
        <StatsCard
          label="Aujourd'hui"
          value={stats.today}
          subtitle="dernier jour"
          color="orange"
        />
      </div>

      {/* Graphiques */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setSelectedForm(''); fetchPage(1); }}
            className={`rounded-full px-4 py-2 text-sm ${selectedForm === '' ? 'bg-navy text-white' : 'bg-white border border-border text-navy'}`}
          >Tous</button>
          <button
            onClick={() => { setSelectedForm('genre_inclusion'); fetchPage(1); }}
            className={`rounded-full px-4 py-2 text-sm ${selectedForm === 'genre_inclusion' ? 'bg-green-600 text-white' : 'bg-white border border-border text-navy'}`}
          >Genre & Inclusion</button>
          <button
            onClick={() => { setSelectedForm('vie_etudiants'); fetchPage(1); }}
            className={`rounded-full px-4 py-2 text-sm ${selectedForm === 'vie_etudiants' ? 'bg-purple-600 text-white' : 'bg-white border border-border text-navy'}`}
          >Vie des Étudiants</button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Chart
            data={trendData}
            type="line"
            title={selectedForm ? (selectedForm === 'genre_inclusion' ? 'Tendance - Genre & Inclusion' : 'Tendance - Vie des Étudiants') : 'Tendance des soumissions'}
            colors={["#0d1b2a", "#2d6a4f", "#9d4edd"]}
            dataKeys={selectedForm ? (selectedForm === 'genre_inclusion' ? ['form1'] : ['form2']) : ['total','form1','form2']}
          />
          <Chart
            data={[
              { name: "Genre & Inclusion", value: stats.form1 },
              { name: "Vie des Étudiants", value: stats.form2 },
            ]}
            type="pie"
            title={selectedForm ? 'Répartition (filtrée)' : 'Répartition des formulaires'}
            height={300}
          />
        </div>
      </div>

      {/* Search & Filter */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-navy mb-4">Recherche et Filtres</h2>
        <SearchFilter
          onSearch={handleSearch}
          onFilterChange={handleFilterChange}
          placeholder="Rechercher dans les données..."
        />
      </div>

      {/* Data Table */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-navy">Dernières soumissions</h2>
          <p className="text-sm text-ink2 mt-1">Affichage des 50 dernières entrées</p>
        </div>
        <ModernTable
          columns={columns}
          data={filteredSubmissions}
          loading={loading}
          sortBy={sortBy}
          onSort={handleSort}
        />
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ModernButton variant="secondary" size="sm" onClick={exportCSV}>Exporter CSV</ModernButton>
            <ModernButton variant="secondary" size="sm" onClick={exportXLSX}>Exporter Excel</ModernButton>
          </div>
          <div className="flex items-center gap-3">
            <ModernButton
              variant="secondary"
              size="sm"
              onClick={() => fetchPage(Math.max(1, page - 1))}
              disabled={page <= 1}
            >
              Précédent
            </ModernButton>
            <span className="text-sm text-ink2">Page {page} / {Math.max(1, Math.ceil(totalCount / 50))}</span>
            <ModernButton
              variant="secondary"
              size="sm"
              onClick={() => fetchPage(page + 1)}
              disabled={page * 50 >= totalCount}
            >
              Suivant
            </ModernButton>
          </div>
        </div>
      </div>
    </main>
  );
}
