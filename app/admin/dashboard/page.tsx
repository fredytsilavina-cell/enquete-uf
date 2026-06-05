"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

function IconLink() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  );
}

function IconSave() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

interface LinkCardProps {
  number: 1 | 2;
  label: string;
  description: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}

function LinkCard({ number, label, description, value, onChange, onSave, saving, saved }: LinkCardProps) {
  const isEmpty = !value.trim();

  return (
    <div style={{
      background: "#fff", borderRadius: 20,
      border: "1.5px solid #e2e8ef",
      padding: "28px 28px",
      boxShadow: "0 4px 16px rgba(13,27,42,0.06)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: isEmpty ? "#f5f7fb" : "linear-gradient(135deg, #0d1b2a 0%, #1a2e44 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: isEmpty ? "#7a9ab8" : "#c9a84c",
            fontSize: 16, fontWeight: 700,
            fontFamily: "var(--font-serif)",
          }}>
            {number}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0d1b2a" }}>{label}</div>
            <div style={{ fontSize: 12, color: "#7a9ab8", marginTop: 2 }}>{description}</div>
          </div>
        </div>

        {/* Status badge */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "4px 12px", borderRadius: 99, fontSize: 11, fontWeight: 600,
          background: isEmpty ? "#fff8ee" : "#e8f4ee",
          color: isEmpty ? "#a8863e" : "#2d6a4f",
          border: `1px solid ${isEmpty ? "#e8d5a3" : "#b7ddc8"}`,
          whiteSpace: "nowrap",
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: isEmpty ? "#c9a84c" : "#2d6a4f" }} />
          {isEmpty ? "En cours" : "Actif"}
        </div>
      </div>

      {/* Message si vide */}
      {isEmpty && (
        <div style={{
          background: "#fff8ee", border: "1px solid #e8d5a3",
          borderRadius: 10, padding: "10px 14px", marginBottom: 16,
          fontSize: 12, color: "#a8863e", display: "flex", alignItems: "center", gap: 8,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Ce lien n'est pas encore configuré. Le formulaire affichera un message d'attente aux étudiants.
        </div>
      )}

      {/* Input */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#3d5166", display: "block", marginBottom: 6 }}>
          URL KoboToolbox
        </label>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#7a9ab8" }}>
              <IconLink />
            </span>
            <input
              type="url"
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder="https://ee.kobotoolbox.org/x/xxxxxxxx"
              style={{
                width: "100%", padding: "11px 14px 11px 38px", borderRadius: 10,
                border: "1.5px solid #e2e8ef", fontSize: 13, outline: "none",
                fontFamily: "var(--font-sans)", transition: "border-color 0.2s",
                boxSizing: "border-box", color: "#0d1b2a",
              }}
              onFocus={e => (e.target.style.borderColor = "#c9a84c")}
              onBlur={e => (e.target.style.borderColor = "#e2e8ef")}
            />
          </div>
          <button
            onClick={onSave}
            disabled={saving}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "11px 18px", borderRadius: 10, flexShrink: 0,
              background: saved
                ? "linear-gradient(135deg, #2d6a4f 0%, #1a3d2b 100%)"
                : "linear-gradient(135deg, #0d1b2a 0%, #1a2e44 100%)",
              color: "#fff", border: "none", fontSize: 13, fontWeight: 600,
              cursor: saving ? "wait" : "pointer",
              fontFamily: "var(--font-sans)", transition: "all 0.3s",
              whiteSpace: "nowrap",
            }}
          >
            {saved ? <><IconCheck /> Enregistré</> : saving ? "…" : <><IconSave /> Sauvegarder</>}
          </button>
        </div>
      </div>

      {/* Preview */}
      {value.trim() && (
        <div style={{ fontSize: 11, color: "#7a9ab8", background: "#f5f7fb", borderRadius: 8, padding: "8px 12px", wordBreak: "break-all" }}>
          🔗 {value}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [url1, setUrl1] = useState("");
  const [url2, setUrl2] = useState("");
  const [saving1, setSaving1] = useState(false);
  const [saving2, setSaving2] = useState(false);
  const [saved1, setSaved1] = useState(false);
  const [saved2, setSaved2] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("config").select("id, value");
      if (data) {
        setUrl1(data.find(r => r.id === "url1")?.value ?? "");
        setUrl2(data.find(r => r.id === "url2")?.value ?? "");
      }
      setLoading(false);
    }
    load();
  }, []);

  async function save(id: "url1" | "url2", value: string, setSaving: (v: boolean) => void, setSaved: (v: boolean) => void) {
    setSaving(true);
    await supabase.from("config").update({ value, updated_at: new Date().toISOString() }).eq("id", id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) {
    return (
      <div style={{ padding: 40, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ fontSize: 14, color: "#7a9ab8" }}>Chargement…</div>
      </div>
    );
  }

  return (
    <div style={{ padding: "40px 40px", maxWidth: 780 }}>
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0d1b2a", fontFamily: "var(--font-serif)", marginBottom: 8 }}>
          Configuration des formulaires
        </h1>
        <p style={{ fontSize: 14, color: "#7a9ab8", lineHeight: 1.6 }}>
          Gérez les liens KoboToolbox affichés sur la page publique. Si un lien est vide, les étudiants verront un message d'attente.
        </p>
      </div>

      {/* Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <LinkCard
          number={1}
          label="Formulaire 1 — Genre & Inclusion"
          description="Enquête sur le genre, l'inclusion et les conditions d'études"
          value={url1}
          onChange={v => { setUrl1(v); setSaved1(false); }}
          onSave={() => save("url1", url1, setSaving1, setSaved1)}
          saving={saving1}
          saved={saved1}
        />
        <LinkCard
          number={2}
          label="Formulaire 2 — Vie Étudiante"
          description="Enquête sur la vie quotidienne et les activités des étudiants"
          value={url2}
          onChange={v => { setUrl2(v); setSaved2(false); }}
          onSave={() => save("url2", url2, setSaving2, setSaved2)}
          saving={saving2}
          saved={saved2}
        />
      </div>

      {/* Info box */}
      <div style={{
        marginTop: 32, background: "#f0f7ff", border: "1px solid #c5dcf5",
        borderRadius: 14, padding: "16px 20px",
        fontSize: 13, color: "#3d5166", lineHeight: 1.7,
      }}>
        <strong style={{ color: "#0d1b2a" }}>💡 Comment ça marche</strong><br />
        Le site public lit ces liens directement depuis Supabase à chaque chargement de page.
        Toute modification ici est répercutée immédiatement sur le site, sans redéploiement.
      </div>
    </div>
  );
}
