"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { SearchFilter } from "@/components/SearchFilter";
import { displayKoboValue } from "@/lib/koboDecoder";

interface Submission {
  id: string;
  created_at: string;
  form: string;
  payload: any;
}

type SyncStatus = "idle" | "syncing" | "success" | "error";

// ── Utilitaires ────────────────────────────────────────────────────────────

const HIDDEN_KEYS = new Set([
  "formhub/uuid", "meta/instanceID", "meta/rootUuid",
  "_attachments", "_geolocation", "_tags", "_notes",
  "_validation_status", "_status", "__version__",
  "_xform_id_string", "_uuid", "instanceID",
]);

const PRIORITY_KEYS = ["_id", "_submission_time", "start", "end", "device_fp"];

function decodeValue(value: any, fieldChoices?: Record<string, string>): string {
  return displayKoboValue(value, fieldChoices);
}

function choicesFor(
  form: string,
  key: string,
  maps: { map1: Record<string, Record<string, string>>; map2: Record<string, Record<string, string>> }
): Record<string, string> | undefined {
  const f = String(form || "").toLowerCase();
  const map = f.includes("genre") ? maps.map1 : maps.map2;
  return map[key];
}

/**
 * Retourne le libellé d'une clé Kobo.
 * Priorité : 1) questionMap (libellé réel depuis le schéma Kobo), 2) cas spéciaux, 3) humanisation heuristique.
 */
function humanizeKey(key: string, questionMap?: Record<string, string>): string {
  // 1. Libellé réel depuis le schéma KoboToolbox
  if (questionMap?.[key]) return questionMap[key];

  // 2. Cas spéciaux statiques
  if (key === "_id") return "ID Kobo";
  if (key === "_submission_time") return "Date soumission";
  if (key === "start") return "Début";
  if (key === "end") return "Fin";
  if (key === "device_fp") return "Appareil";

  // 3. Humanisation heuristique (underscores → espaces)
  return key
    .replace(/^_+/, "")
    .replace(/_+$/, "")
    .replace(/_+/g, " ")
    .trim();
}

function collectKeys(submissions: Submission[]): string[] {
  const seen = new Set<string>();
  for (const s of submissions) {
    for (const k of Object.keys(s.payload || {})) {
      if (!HIDDEN_KEYS.has(k)) seen.add(k);
    }
  }
  const priority = PRIORITY_KEYS.filter(k => seen.has(k));
  const rest = [...seen].filter(k => !PRIORITY_KEYS.includes(k)).sort();
  return [...priority, ...rest];
}

// ── Composant principal ────────────────────────────────────────────────────

export default function AdminDataPage() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedForm, setSelectedForm] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "genre_inclusion" | "vie_etudiants">("all");
  const [detailRow, setDetailRow] = useState<Submission | null>(null);
  const [userRole, setUserRole] = useState<"admin" | "form1_only" | null>(null);
  const [formLabels, setFormLabels] = useState<{ form1: string; form2: string }>({ form1: "Genre & Inclusion", form2: "Vie estudiantine" });
  // Cartes dynamiques code → label pour les valeurs de réponse
  const [choiceMaps, setChoiceMaps] = useState<{
    map1: Record<string, Record<string, string>>;
    map2: Record<string, Record<string, string>>;
  }>({ map1: {}, map2: {} });
  // Cartes dynamiques autoname → libellé pour les en-têtes de colonnes
  const [questionMaps, setQuestionMaps] = useState<{
    map1: Record<string, string>;
    map2: Record<string, string>;
  }>({ map1: {}, map2: {} });
  const [availableForms, setAvailableForms] = useState<Set<string>>(new Set());
  const PAGE_SIZE = 20;

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { router.replace("/admin/login"); return; }

      const userId = data.session.user.id;
      const { data: roleRow } = await supabase
        .from("user_roles").select("role").eq("user_id", userId).maybeSingle();
      const role = (roleRow as any)?.role || "admin";
      setUserRole(role as "admin" | "form1_only");

      // Charger config : titres + cartes choix + cartes libellés questions
      const { data: configRows } = await supabase
        .from("config").select("id, value")
        .in("id", [
          "title1", "title2",
          "kobo_choice_map1", "kobo_choice_map2",
          "kobo_question_map1", "kobo_question_map2",
        ]);
      const cfgMap = Object.fromEntries((configRows || []).map((r: any) => [r.id, r.value]));

      setFormLabels({
        form1: cfgMap["title1"] || "Genre & Inclusion",
        form2: cfgMap["title2"] || "Vie estudiantine",
      });
      try {
        setChoiceMaps({
          map1: cfgMap["kobo_choice_map1"] ? JSON.parse(cfgMap["kobo_choice_map1"]) : {},
          map2: cfgMap["kobo_choice_map2"] ? JSON.parse(cfgMap["kobo_choice_map2"]) : {},
        });
      } catch { /* ignore, fallback aux heuristiques */ }
      try {
        setQuestionMaps({
          map1: cfgMap["kobo_question_map1"] ? JSON.parse(cfgMap["kobo_question_map1"]) : {},
          map2: cfgMap["kobo_question_map2"] ? JSON.parse(cfgMap["kobo_question_map2"]) : {},
        });
      } catch { /* ignore */ }

      const initialForm = role === "form1_only" ? "genre_inclusion" : "";
      if (initialForm) setSelectedForm(initialForm);
      await loadSubmissions({ page: 1, form: initialForm });
      setLoading(false);
    };
    init();
  }, [router]);

  // questionMap actif selon l'onglet sélectionné (fusionné pour "Toutes")
  const activeQuestionMap = useMemo(() => {
    if (activeTab === "genre_inclusion") return questionMaps.map1;
    if (activeTab === "vie_etudiants") return questionMaps.map2;
    // "all" : fusionner les deux cartes (map1 prioritaire en cas de conflit)
    return { ...questionMaps.map2, ...questionMaps.map1 };
  }, [activeTab, questionMaps]);

  async function loadSubmissions(options: {
    page: number; form?: string; dateRange?: string; search?: string;
  }) {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(options.page), pageSize: String(PAGE_SIZE) });
    if (options.form) qs.set("form", options.form);
    if (options.dateRange) qs.set("dateRange", options.dateRange);
    if (options.search) qs.set("search", options.search);
    try {
      const res = await fetch(`/api/submissions?${qs.toString()}`);
      const json = await res.json();
      const data: Submission[] = json.data || [];
      setSubmissions(data);
      setTotalCount(json.count || 0);
      setCurrentPage(options.page);
      setError(null);
      const forms = new Set<string>();
      for (const s of data) {
        const f = String(s.form || "").toLowerCase();
        if (f.includes("genre")) forms.add("genre_inclusion");
        if (f.includes("vie") || f.includes("etudiant")) forms.add("vie_etudiants");
      }
      setAvailableForms(forms);
    } catch {
      setError("Impossible de charger les données.");
    } finally {
      setLoading(false);
    }
  }

  async function syncFromKobo() {
    setSyncStatus("syncing");
    setSyncMessage(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Non authentifié");
      const res = await fetch("/api/admin/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur serveur");
      setSyncStatus("success");
      const deleted = json.deleted ?? 0;
      const detail = json.form1 !== undefined
        ? ` (Formulaire 1: ${json.form1}, Formulaire 2: ${json.form2}${deleted > 0 ? `, 🗑 ${deleted} supprimée${deleted > 1 ? "s" : ""}` : ""})`
        : "";
      setSyncMessage(
        (json.count === 0 && deleted === 0)
          ? "Sync terminée — aucune soumission. Vérifiez les URLs data et le token dans Paramètres."
          : (json.message || "Synchronisation réussie") + detail
      );

      // Recharger les cartes depuis Supabase après sync
      const { data: configRows } = await supabase
        .from("config").select("id, value")
        .in("id", ["kobo_choice_map1", "kobo_choice_map2", "kobo_question_map1", "kobo_question_map2"]);
      const cfgMap = Object.fromEntries((configRows || []).map((r: any) => [r.id, r.value]));
      try {
        setChoiceMaps({
          map1: cfgMap["kobo_choice_map1"] ? JSON.parse(cfgMap["kobo_choice_map1"]) : {},
          map2: cfgMap["kobo_choice_map2"] ? JSON.parse(cfgMap["kobo_choice_map2"]) : {},
        });
      } catch { /* ignore */ }
      try {
        setQuestionMaps({
          map1: cfgMap["kobo_question_map1"] ? JSON.parse(cfgMap["kobo_question_map1"]) : {},
          map2: cfgMap["kobo_question_map2"] ? JSON.parse(cfgMap["kobo_question_map2"]) : {},
        });
      } catch { /* ignore */ }

      await loadSubmissions({ page: 1, form: selectedForm, dateRange, search: searchQuery });
      setTimeout(() => { setSyncStatus("idle"); setSyncMessage(null); }, 5000);
    } catch (e: any) {
      setSyncStatus("error");
      setSyncMessage(e.message || "Erreur de synchronisation");
      setTimeout(() => { setSyncStatus("idle"); setSyncMessage(null); }, 5000);
    }
  }

  function downloadExcel() {
    const qs = new URLSearchParams({ format: "xlsx" });
    if (selectedForm) qs.set("form", selectedForm);
    if (dateRange) qs.set("dateRange", dateRange);
    if (searchQuery) qs.set("search", searchQuery);
    window.open(`/api/submissions?${qs.toString()}`);
  }

  const displayedSubmissions = useMemo(() => {
    if (activeTab === "all") return submissions;
    return submissions.filter(s => String(s.form).includes(
      activeTab === "genre_inclusion" ? "genre" : "vie"
    ));
  }, [submissions, activeTab]);

  const dynamicKeys = useMemo(() => collectKeys(displayedSubmissions), [displayedSubmissions]);

  const form1Count = submissions.filter(s => String(s.form).includes("genre")).length;
  const form2Count = submissions.filter(s => String(s.form).includes("vie")).length;

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  function changePage(p: number) {
    loadSubmissions({ page: p, form: selectedForm, dateRange, search: searchQuery });
  }

  function handleSearch(q: string) {
    setSearchQuery(q);
    loadSubmissions({ page: 1, form: selectedForm, dateRange, search: q });
  }

  function handleFilterChange(f: { form?: string; dateRange?: string }) {
    const effectiveForm = userRole === "form1_only" ? "genre_inclusion" : (f.form || "");
    setSelectedForm(effectiveForm);
    setDateRange(f.dateRange || "");
    loadSubmissions({ page: 1, form: effectiveForm, dateRange: f.dateRange, search: searchQuery });
  }

  // ── Rendu ────────────────────────────────────────────────────────────────
  return (
    <main className="dp-main">
      {/* Header */}
      <div className="dp-header">
        <div>
          <p className="dp-eyebrow">Données</p>
          <h1 className="dp-title">Réponses KoboToolbox</h1>
          <p className="dp-subtitle">Consultez, filtrez et exportez toutes les données collectées</p>
        </div>
        <div className="dp-actions">
          <button onClick={syncFromKobo} disabled={syncStatus === "syncing"}
            className={`dp-btn dp-btn-sync dp-btn-sync--${syncStatus}`}>
            {syncStatus === "syncing" ? <><span className="dp-spinner" /> Synchronisation…</>
              : syncStatus === "success" ? <>✓ Synchronisé</>
              : syncStatus === "error" ? <>✕ Erreur sync</>
              : <><SyncIcon /> Sync KoboToolbox</>}
          </button>
          <button onClick={() => loadSubmissions({ page: currentPage, form: selectedForm, dateRange, search: searchQuery })}
            disabled={loading} className="dp-btn dp-btn-ghost">
            <RefreshIcon /> <span className="dp-btn-label">Rafraîchir</span>
          </button>
          <button onClick={downloadExcel} disabled={totalCount === 0} className="dp-btn dp-btn-gold">
            <DownloadIcon /> <span className="dp-btn-label">Excel</span>
          </button>
        </div>
      </div>

      {/* Bannière sync */}
      {syncMessage && (
        <div className={`dp-banner dp-banner--${syncStatus}`}>{syncMessage}</div>
      )}

      {/* Stat cards */}
      <div className="dp-cards">
        {[
          { label: "Total reçu", value: totalCount, sub: "toutes soumissions", color: "#0d1b2a", bg: "#f8fafc" },
          { label: "Formulaire 1", value: form1Count, sub: formLabels.form1, color: "#15803d", bg: "#f0fdf4" },
          ...(userRole === "admin" ? [{ label: "Formulaire 2", value: form2Count, sub: formLabels.form2, color: "#7c3aed", bg: "#faf5ff" }] : []),
        ].map(c => (
          <div key={c.label} className="dp-card" style={{ background: c.bg }}>
            <div>
              <p className="dp-card-label">{c.label}</p>
              <p className="dp-card-value" style={{ color: c.color }}>{c.value}</p>
              <p className="dp-card-sub">{c.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tableau */}
      <div className="dp-table-card">
        {/* Onglets */}
        <div className="dp-tabs">
          {((): { key: "all" | "genre_inclusion" | "vie_etudiants"; label: string }[] => {
            const hasGenre = availableForms.has("genre_inclusion");
            const hasVie   = availableForms.has("vie_etudiants") && userRole === "admin";
            const tabs: { key: "all" | "genre_inclusion" | "vie_etudiants"; label: string }[] = [];
            if (hasGenre && hasVie) tabs.push({ key: "all", label: "Toutes" });
            if (hasGenre) tabs.push({ key: "genre_inclusion", label: formLabels.form1 });
            if (hasVie)   tabs.push({ key: "vie_etudiants",   label: formLabels.form2 });
            if (tabs.length === 0) tabs.push({ key: "all", label: "Toutes" });
            return tabs;
          })().map(tab => (
            <button key={tab.key}
              className={`dp-tab ${activeTab === tab.key ? "dp-tab--active" : ""}`}
              onClick={() => setActiveTab(tab.key)}>
              {tab.label}
            </button>
          ))}
          <div className="dp-tab-count">
            {displayedSubmissions.length} affiché{displayedSubmissions.length > 1 ? "s" : ""}
          </div>
        </div>

        {/* Recherche */}
        <div className="dp-search-wrap">
          {userRole !== null && (
            <SearchFilter
              onSearch={handleSearch}
              onFilterChange={handleFilterChange}
              placeholder="Rechercher dans les réponses…"
              allowedForms={userRole === "form1_only" ? ["genre_inclusion"] : undefined}
              formLabels={formLabels}
            />
          )}
        </div>

        {/* Tableau dynamique */}
        <div className="dp-table-scroll">
          {loading ? (
            <div className="dp-loading">
              <span className="dp-spinner dp-spinner--dark" />
              Chargement des données…
            </div>
          ) : displayedSubmissions.length === 0 ? (
            <div className="dp-empty">
              Aucune donnée — utilisez « Sync KoboToolbox » pour importer les réponses.
            </div>
          ) : (
            <table className="dp-table">
              <thead>
                <tr>
                  <th className="dp-th dp-th-form">Formulaire</th>
                  <th className="dp-th dp-th-date">Date soumission</th>
                  {dynamicKeys
                    .filter(k => !["_id", "_submission_time"].includes(k))
                    .map(k => (
                      <th key={k} className="dp-th" title={k}>
                        {humanizeKey(k, activeQuestionMap)}
                      </th>
                    ))}
                  <th className="dp-th dp-th-action"></th>
                </tr>
              </thead>
              <tbody>
                {displayedSubmissions.map((row, i) => (
                  <tr key={row.id} className={`dp-tr ${i % 2 === 0 ? "dp-tr--even" : ""}`}>
                    <td className="dp-td">
                      <FormBadge form={row.form} labels={formLabels} />
                    </td>
                    <td className="dp-td dp-td-date">
                      {row.created_at
                        ? new Date(row.created_at).toLocaleString("fr-FR", {
                            day: "2-digit", month: "2-digit", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    {dynamicKeys
                      .filter(k => !["_id", "_submission_time"].includes(k))
                      .map(k => (
                        <td key={k} className="dp-td">
                          <span className="dp-cell-value">
                            {decodeValue(row.payload[k], choicesFor(row.form, k, choiceMaps))}
                          </span>
                        </td>
                      ))}
                    <td className="dp-td dp-td-action">
                      <button className="dp-detail-btn" onClick={() => setDetailRow(row)}
                        title="Voir tous les champs">
                        ···
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="dp-pagination">
          <p className="dp-pag-info">
            {totalCount === 0 ? "Aucun résultat"
              : `Page ${currentPage} / ${Math.max(1, totalPages)} — ${totalCount} soumission${totalCount > 1 ? "s" : ""} au total`}
          </p>
          <div className="dp-pag-btns">
            <button onClick={() => changePage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1} className="dp-page-btn">← Précédent</button>
            <span className="dp-page-num">{currentPage}</span>
            <button onClick={() => changePage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages} className="dp-page-btn">Suivant →</button>
          </div>
        </div>

        {error && <div className="dp-error">{error}</div>}
      </div>

      {/* Modal détail */}
      {detailRow && (
        <DetailModal
          row={detailRow}
          onClose={() => setDetailRow(null)}
          labels={formLabels}
          choiceMaps={choiceMaps}
          questionMaps={questionMaps}
        />
      )}

      <style>{STYLES}</style>
    </main>
  );
}

// ── Sous-composants ────────────────────────────────────────────────────────

function FormBadge({ form, labels }: { form: string; labels?: { form1: string; form2: string } }) {
  const isGenre = String(form).includes("genre");
  const lbl1 = labels?.form1 || "Genre & Inclusion";
  const lbl2 = labels?.form2 || "Vie estudiantine";
  const label = isGenre ? lbl1
    : String(form).includes("vie") ? lbl2
    : form || "—";
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
      background: isGenre ? "#dcfce7" : "#ede9fe",
      color: isGenre ? "#15803d" : "#7c3aed",
    }}>{label}</span>
  );
}

function DetailModal({ row, onClose, labels, choiceMaps, questionMaps }: {
  row: Submission;
  onClose: () => void;
  labels?: { form1: string; form2: string };
  choiceMaps?: { map1: Record<string, Record<string, string>>; map2: Record<string, Record<string, string>> };
  questionMaps?: { map1: Record<string, string>; map2: Record<string, string> };
}) {
  const entries = Object.entries(row.payload || {})
    .filter(([k]) => !["formhub/uuid", "meta/instanceID", "meta/rootUuid",
      "_attachments", "_geolocation", "_tags", "_notes", "_validation_status"].includes(k));

  // Carte de libellés de questions pour ce formulaire
  const f = String(row.form || "").toLowerCase();
  const qMap = f.includes("genre") ? questionMaps?.map1 : questionMaps?.map2;

  return (
    <div className="dp-modal-overlay" onClick={onClose}>
      <div className="dp-modal" onClick={e => e.stopPropagation()}>
        <div className="dp-modal-head">
          <div>
            <FormBadge form={row.form} labels={labels} />
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#7a9ab8" }}>
              {row.created_at ? new Date(row.created_at).toLocaleString("fr-FR") : ""}
            </p>
          </div>
          <button className="dp-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="dp-modal-body">
          {entries.map(([k, v]) => (
            <div key={k} className="dp-modal-row">
              <span className="dp-modal-key">{humanizeKey(k, qMap)}</span>
              <span className="dp-modal-val">{displayKoboValue(v, choiceMaps && choicesFor(row.form, k, choiceMaps))}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SyncIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
}
function RefreshIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3"/></svg>;
}
function DownloadIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
}

// ── Styles ─────────────────────────────────────────────────────────────────
const STYLES = `
  .dp-main { padding: 24px 0; display: flex; flex-direction: column; gap: 20px; }

  /* Header */
  .dp-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
  .dp-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: #c9a84c; margin: 0 0 6px; }
  .dp-title { font-size: clamp(20px,3vw,26px); font-weight: 700; color: #0d1b2a; margin: 0 0 4px; }
  .dp-subtitle { font-size: 13px; color: #7a9ab8; margin: 0; }

  /* Buttons */
  .dp-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .dp-btn { display:inline-flex; align-items:center; gap:7px; padding:9px 15px; border-radius:12px; font-size:13px; font-weight:600; border:none; cursor:pointer; transition:all .18s; white-space:nowrap; font-family:inherit; }
  .dp-btn:disabled { opacity:.5; cursor:not-allowed; }
  .dp-btn-sync { background:linear-gradient(135deg,#0d1b2a,#1a3352); color:#fff; box-shadow:0 3px 10px rgba(13,27,42,.2); }
  .dp-btn-sync:hover:not(:disabled) { box-shadow:0 5px 16px rgba(13,27,42,.3); transform:translateY(-1px); }
  .dp-btn-sync--success { background:linear-gradient(135deg,#15803d,#16a34a) !important; }
  .dp-btn-sync--error { background:linear-gradient(135deg,#dc2626,#b91c1c) !important; }
  .dp-btn-ghost { background:#fff; color:#3d5166; border:1px solid #e2e8ef; }
  .dp-btn-ghost:hover:not(:disabled) { background:#f4f7fa; }
  .dp-btn-gold { background:rgba(201,168,76,.1); color:#a8863e; border:1px solid rgba(201,168,76,.35); }
  .dp-btn-gold:hover:not(:disabled) { background:rgba(201,168,76,.18); }
  .dp-spinner { display:inline-block; width:13px; height:13px; border:2px solid rgba(255,255,255,.3); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; }
  .dp-spinner--dark { border-color:rgba(13,27,42,.15); border-top-color:#0d1b2a; }
  @keyframes spin { to { transform:rotate(360deg); } }

  /* Banner */
  .dp-banner { padding:10px 14px; border-radius:11px; font-size:13px; font-weight:500; }
  .dp-banner--success { background:#dcfce7; color:#15803d; border:1px solid #bbf7d0; }
  .dp-banner--error { background:#fee2e2; color:#dc2626; border:1px solid #fecaca; }
  .dp-banner--syncing { background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; }

  /* Stat cards */
  .dp-cards { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
  .dp-card { border:1px solid #e2e8ef; border-radius:16px; padding:16px 20px; box-shadow:0 1px 4px rgba(13,27,42,.04); }
  .dp-card-label { font-size:11px; font-weight:600; color:#7a9ab8; text-transform:uppercase; letter-spacing:.08em; margin:0 0 4px; }
  .dp-card-value { font-size:32px; font-weight:800; margin:0 0 2px; line-height:1; }
  .dp-card-sub { font-size:11px; color:#9bb3c8; margin:0; }

  /* Table card */
  .dp-table-card { background:#fff; border:1px solid #e2e8ef; border-radius:20px; padding:20px; box-shadow:0 3px 14px rgba(13,27,42,.06); display:flex; flex-direction:column; gap:14px; }

  /* Tabs */
  .dp-tabs { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
  .dp-tab { padding:7px 16px; border-radius:20px; font-size:12.5px; font-weight:600; border:1px solid #e2e8ef; background:#f8fafc; color:#7a9ab8; cursor:pointer; transition:all .15s; font-family:inherit; }
  .dp-tab--active { background:#0d1b2a; color:#fff; border-color:#0d1b2a; }
  .dp-tab-count { margin-left:auto; font-size:12px; color:#9bb3c8; }

  /* Table */
  .dp-table-scroll { overflow-x:auto; border-radius:12px; border:1px solid #e8edf2; }
  .dp-table { width:100%; border-collapse:collapse; font-size:13px; }

  .dp-th { padding:11px 14px; text-align:left; font-size:11px; font-weight:700; color:#fff; background:#1e3a5f; white-space:normal; word-break:break-word; border-right:1px solid rgba(255,255,255,.08); position:sticky; top:0; z-index:1; max-width:200px; min-width:120px; line-height:1.35; }
  .dp-th:first-child { border-radius:12px 0 0 0; }
  .dp-th:last-child { border-right:none; border-radius:0 12px 0 0; }
  .dp-th-form { min-width:140px; }
  .dp-th-date { min-width:150px; }
  .dp-th-action { width:40px; }

  .dp-tr { transition:background .1s; }
  .dp-tr--even { background:#f7fafd; }
  .dp-tr:hover { background:#eef4fb !important; }

  .dp-td { padding:10px 14px; border-bottom:1px solid #edf1f6; vertical-align:top; border-right:1px solid #f0f4f8; }
  .dp-td:last-child { border-right:none; }
  .dp-td-date { font-size:12px; color:#3d5166; white-space:nowrap; }
  .dp-td-action { text-align:center; }

  .dp-cell-value { display:block; max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:normal; word-break:break-word; line-height:1.4; color:#1a2b3c; }

  .dp-detail-btn { background:none; border:1px solid #e2e8ef; border-radius:6px; padding:2px 8px; font-size:15px; color:#7a9ab8; cursor:pointer; letter-spacing:.1em; transition:all .15s; }
  .dp-detail-btn:hover { background:#f0f5fb; color:#0d1b2a; }

  /* Loading / Empty */
  .dp-loading { display:flex; align-items:center; gap:10px; padding:40px; color:#7a9ab8; font-size:14px; justify-content:center; }
  .dp-empty { padding:48px; text-align:center; color:#9bb3c8; font-size:14px; }

  /* Pagination */
  .dp-pagination { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; padding-top:4px; }
  .dp-pag-info { font-size:12.5px; color:#7a9ab8; margin:0; }
  .dp-pag-btns { display:flex; align-items:center; gap:6px; }
  .dp-page-btn { padding:7px 14px; border-radius:9px; font-size:12.5px; font-weight:500; border:1px solid #e2e8ef; background:#fff; color:#3d5166; cursor:pointer; transition:all .15s; font-family:inherit; }
  .dp-page-btn:hover:not(:disabled) { background:#f4f7fa; }
  .dp-page-btn:disabled { color:#c8d4df; cursor:not-allowed; }
  .dp-page-num { font-size:12.5px; color:#7a9ab8; padding:0 6px; }

  .dp-error { padding:10px 14px; background:#fee2e2; border-radius:10px; font-size:13px; color:#dc2626; border:1px solid #fecaca; }

  /* Modal */
  .dp-modal-overlay { position:fixed; inset:0; background:rgba(13,27,42,.45); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(2px); }
  .dp-modal { background:#fff; border-radius:20px; width:100%; max-width:560px; max-height:80vh; display:flex; flex-direction:column; box-shadow:0 20px 60px rgba(13,27,42,.25); overflow:hidden; }
  .dp-modal-head { display:flex; align-items:flex-start; justify-content:space-between; padding:20px 24px 16px; border-bottom:1px solid #f0f4f8; }
  .dp-modal-close { background:none; border:none; font-size:16px; color:#7a9ab8; cursor:pointer; padding:4px 8px; border-radius:6px; }
  .dp-modal-close:hover { background:#f4f7fa; color:#0d1b2a; }
  .dp-modal-body { overflow-y:auto; padding:12px 24px 24px; display:flex; flex-direction:column; gap:2px; }
  .dp-modal-row { display:grid; grid-template-columns:1fr 1.2fr; gap:12px; padding:8px 0; border-bottom:1px solid #f4f7fa; }
  .dp-modal-row:last-child { border-bottom:none; }
  .dp-modal-key { font-size:12px; font-weight:600; color:#7a9ab8; }
  .dp-modal-val { font-size:13px; color:#1a2b3c; word-break:break-word; }

  /* Responsive */
  @media (max-width:680px) {
    .dp-header { flex-direction:column; align-items:flex-start; }
    .dp-cards { grid-template-columns:1fr; gap:8px; }
    .dp-btn-label { display:none; }
    .dp-btn { padding:9px 12px; }
  }
`;
