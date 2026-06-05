"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ModernButton } from "@/components/ModernButton";
import { ModernTable } from "@/components/ModernTable";
import { SearchFilter } from "@/components/SearchFilter";

interface Submission {
  id: string;
  created_at: string;
  form: string;
  payload: any;
}

export default function AdminDataPage() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "form">("date-desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [showConfirm, setShowConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedForm, setSelectedForm] = useState("");
  const [dateRange, setDateRange] = useState("");
  const itemsPerPage = 20;

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/admin/login");
        return;
      }

      await loadSubmissions({ page: 1, form: selectedForm, dateRange, search: searchQuery });
      setLoading(false);
    };

    init();
  }, [router]);

  async function loadSubmissions(options: {
    page: number;
    form?: string;
    dateRange?: string;
    search?: string;
  }) {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(options.page), pageSize: '100' });
    if (options.form) qs.set('form', options.form);
    if (options.dateRange) qs.set('dateRange', options.dateRange);
    if (options.search) qs.set('search', options.search);

    try {
      const res = await fetch(`/api/submissions?${qs.toString()}`);
      const json = await res.json();
      setSubmissions(json.data || []);
      setCurrentPage(options.page);
      setError(null);
    } catch (e) {
      console.error('Erreur fetch submissions:', e);
      setError('Impossible de charger les donnees.');
    } finally {
      setLoading(false);
    }
  }

  function downloadExcel() {
    const qs = new URLSearchParams({ format: 'xlsx', pageSize: '1000' });
    if (selectedForm) qs.set('form', selectedForm);
    if (dateRange) qs.set('dateRange', dateRange);
    if (searchQuery) qs.set('search', searchQuery);
    window.open(`/api/submissions?${qs.toString()}`);
  }

  const refreshSubmissions = () => {
    loadSubmissions({ page: 1, form: selectedForm, dateRange, search: searchQuery });
  };

  const sortedSubmissions = [...submissions].sort((a, b) => {
    if (sortBy === "date-desc") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === "date-asc") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortBy === "form") return (a.form || "").localeCompare(b.form || "");
    return 0;
  });

  const paginatedSubmissions = sortedSubmissions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(sortedSubmissions.length / itemsPerPage);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    loadSubmissions({ page: 1, form: selectedForm, dateRange, search: query });
  };

  const handleFilterChange = (filters: { form?: string; dateRange?: string }) => {
    const nextForm = filters.form || "";
    const nextDateRange = filters.dateRange || "";
    setSelectedForm(nextForm);
    setDateRange(nextDateRange);
    loadSubmissions({ page: 1, form: nextForm, dateRange: nextDateRange, search: searchQuery });
  };

  const handleSort = (key: string) => {
    const nextSort = key === "created_at" ? (sortBy === "date-asc" ? "date-desc" : "date-asc") : "form";
    setSortBy(nextSort);
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
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
          value === "genre_inclusion"
            ? "bg-green-100 text-green-700"
            : "bg-purple-100 text-purple-700"
        }`}>
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
        <span className="text-xs text-ink3 truncate max-w-xs block" title={JSON.stringify(value)}>
          {typeof value === "object" ? JSON.stringify(value).substring(0, 80) : String(value).substring(0, 80)}
        </span>
      ),
    },
  ];

  return (
    <main className="space-y-8">
      <header>
        <p className="text-sm uppercase tracking-[0.18em] text-gold-muted">Donnees</p>
        <h1 className="mt-2 text-3xl font-semibold text-navy">Toutes les reponses KoboToolbox</h1>
        <p className="mt-3 text-sm text-ink2">Consultez, triez et exportez toutes les donnees collectees</p>

        <div className="mt-4 inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 shadow-sm">
          {submissions.length > 0 ? `Données chargées : ${submissions.length}` : 'Aucune soumission chargée, appuyez sur Rafraichir'}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="rounded-[20px] border border-border bg-white p-6 shadow-sm">
          <p className="text-sm text-ink3 font-medium">Total recu</p>
          <p className="mt-3 text-3xl font-bold text-navy">{submissions.length}</p>
          <p className="mt-2 text-xs text-ink3">soumissions enregistrees</p>
        </div>
        <div className="rounded-[20px] border border-border bg-white p-6 shadow-sm">
          <p className="text-sm text-ink3 font-medium">Formulaire 1</p>
          <p className="mt-3 text-3xl font-bold text-green-600">{submissions.filter(s => s.form === "genre_inclusion").length}</p>
          <p className="mt-2 text-xs text-ink3">genre inclusion</p>
        </div>
        <div className="rounded-[20px] border border-border bg-white p-6 shadow-sm">
          <p className="text-sm text-ink3 font-medium">Formulaire 2</p>
          <p className="mt-3 text-3xl font-bold text-purple-600">{submissions.filter(s => s.form === "vie_etudiants").length}</p>
          <p className="mt-2 text-xs text-ink3">vie des etudiants</p>
        </div>
      </div>

      <div className="rounded-[28px] border border-border bg-white p-8 shadow-lg shadow-slate-200/70">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-navy mb-2">Donnees completes</h2>
            <p className="text-sm text-ink2">Liste de toutes les soumissions avec apercu des donnees</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ModernButton variant="secondary" size="sm" onClick={refreshSubmissions}>
              Rafraichir
            </ModernButton>
            <ModernButton variant="secondary" size="sm" onClick={downloadExcel} disabled={submissions.length === 0}>
              Telecharger Excel
            </ModernButton>
          </div>
        </div>

        <div className="mb-6">
          <SearchFilter
            onSearch={handleSearch}
            onFilterChange={handleFilterChange}
            placeholder="Rechercher dans les soumissions..."
          />
        </div>

        <ModernTable
          columns={columns}
          data={paginatedSubmissions}
          loading={loading}
          sortBy={sortBy}
          onSort={handleSort}
        />

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink3">Affichage {Math.min(submissions.length, itemsPerPage)} sur {submissions.length} soumissions</p>
          <div className="flex items-center gap-2">
            <ModernButton
              variant="secondary"
              size="sm"
              onClick={() => loadSubmissions({ page: Math.max(1, currentPage - 1), form: selectedForm, dateRange, search: searchQuery })}
              disabled={currentPage <= 1}
            >
              ← Precedent
            </ModernButton>
            <span className="text-sm text-ink2">Page {currentPage}</span>
            <ModernButton
              variant="secondary"
              size="sm"
              onClick={() => loadSubmissions({ page: Math.min(totalPages, currentPage + 1), form: selectedForm, dateRange, search: searchQuery })}
              disabled={currentPage >= totalPages}
            >
              Suivant →
            </ModernButton>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>

      {/* Export Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-[20px] bg-white p-8 shadow-2xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-navy mb-4">Telecharger les donnees ?</h3>
            <p className="text-sm text-ink2 mb-6">{submissions.length} soumissions seront exportees en fichier Excel</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-navy hover:bg-cream"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  downloadExcel();
                }}
                className="flex-1 rounded-lg bg-gold px-4 py-2 text-sm font-medium text-navy hover:brightness-110"
              >
                Telecharger
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
