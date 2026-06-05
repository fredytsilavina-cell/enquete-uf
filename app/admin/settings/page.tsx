"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function isValidUrl(value: string) {
  try {
    const parsed = new URL(value);
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && Boolean(parsed.hostname);
  } catch { return false; }
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#3d5166", marginBottom: 8 }}>
        {label}
      </label>
      {children}
      {hint && <p style={{ fontSize: 12, color: "#7a9ab8", margin: "6px 0 0" }}>{hint}</p>}
    </div>
  );
}

function InputStyle({
  type = "text", value, onChange, placeholder, disabled = false,
}: { type?: string; value: string; onChange?: (v: string) => void; placeholder?: string; disabled?: boolean }) {
  return (
    <input
      type={type} value={value} disabled={disabled}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%", padding: "11px 14px", borderRadius: 12,
        border: "1px solid #e2e8ef",
        background: disabled ? "#f8fafc" : "#fff",
        color: disabled ? "#7a9ab8" : "#0d1b2a",
        fontSize: 14, outline: "none", boxSizing: "border-box",
        cursor: disabled ? "not-allowed" : "text",
        transition: "border 0.18s, box-shadow 0.18s",
      }}
      onFocus={(e) => { if (!disabled) { e.target.style.borderColor = "#c9a84c"; e.target.style.boxShadow = "0 0 0 3px rgba(201,168,76,0.12)"; } }}
      onBlur={(e) => { e.target.style.borderColor = "#e2e8ef"; e.target.style.boxShadow = "none"; }}
    />
  );
}

function SettingsSection({ icon, title, subtitle, accent = "#0d1b2a", children }: {
  icon: React.ReactNode; title: string; subtitle: string; accent?: string; children: React.ReactNode;
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e8edf2", borderRadius: 24, overflow: "hidden", boxShadow: "0 2px 12px rgba(13,27,42,0.05)" }}>
      <div style={{ padding: "22px 28px", borderBottom: "1px solid #f0f4f8", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: 14, flexShrink: 0, background: accent + "14", color: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </div>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0d1b2a", margin: 0 }}>{title}</h2>
          <p style={{ fontSize: 13, color: "#7a9ab8", margin: "2px 0 0" }}>{subtitle}</p>
        </div>
      </div>
      <div style={{ padding: "24px 28px" }}>{children}</div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  // Noms des formulaires (affichés sur la page publique)
  const [title1, setTitle1] = useState("");
  const [title2, setTitle2] = useState("");
  // URLs formulaires publics (enketo)
  const [url1, setUrl1] = useState("");
  const [url2, setUrl2] = useState("");
  // URLs data KoboToolbox (kf.kobotoolbox.org)
  const [urlData1, setUrlData1] = useState("");
  const [urlData2, setUrlData2] = useState("");
  // Token API KoboToolbox
  const [koboToken, setKoboToken] = useState("");
  const [showToken, setShowToken] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ title: string; desc?: string; action: () => void; danger?: boolean } | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { router.replace("/admin/login"); return; }
      setEmail(data.session.user.email || "");

      const { data: configRows, error } = await supabase
        .from("config").select("id,value")
        .in("id", ["url1", "url2", "url_data1", "url_data2", "kobo_token", "title1", "title2"]);

      if (!error && Array.isArray(configRows)) {
        setUrl1(configRows.find((r: any) => r.id === "url1")?.value ?? "");
        setUrl2(configRows.find((r: any) => r.id === "url2")?.value ?? "");
        setUrlData1(configRows.find((r: any) => r.id === "url_data1")?.value ?? "");
        setUrlData2(configRows.find((r: any) => r.id === "url_data2")?.value ?? "");
        setKoboToken(configRows.find((r: any) => r.id === "kobo_token")?.value ?? "");
        setTitle1(configRows.find((r: any) => r.id === "title1")?.value ?? "Genre & Inclusion");
        setTitle2(configRows.find((r: any) => r.id === "title2")?.value ?? "Vie des Etudiants");
      }
      setLoading(false);
    };
    init();
  }, [router]);

  function showConfirmDialog(title: string, action: () => void, desc?: string, danger?: boolean) {
    setConfirmAction({ title, action, desc, danger });
    setShowConfirm(true);
  }

  function flashMessage(type: "success" | "error", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  }

  async function handleSaveFormUrls() {
    if (url1.trim() && !isValidUrl(url1)) { flashMessage("error", "L'URL du formulaire 1 est invalide"); return; }
    if (url2.trim() && !isValidUrl(url2)) { flashMessage("error", "L'URL du formulaire 2 est invalide"); return; }

    setSaving("urls");
    // Toujours upsert url1 et url2, même vides — c'est ce qui désactive la carte côté public
    const rows: any[] = [
      { id: "title1", value: title1.trim() || "Genre & Inclusion" },
      { id: "title2", value: title2.trim() || "Vie des Etudiants" },
      { id: "url1", value: url1.trim() },
      { id: "url2", value: url2.trim() },
    ];
    const { error } = await supabase.from("config").upsert(rows, { onConflict: "id" });
    setSaving(null);
    if (error) flashMessage("error", `Erreur : ${error.message}`);
    else {
      const cleared = (!url1.trim() ? "formulaire 1 " : "") + (!url2.trim() ? "formulaire 2" : "");
      if (cleared.trim())
        flashMessage("success", `Lien(s) supprimé(s) pour ${cleared.trim()} — carte(s) désactivée(s) immédiatement`);
      else
        flashMessage("success", "URLs des formulaires enregistrées — la page publique est mise à jour");
    }
  }

  async function handleSaveDataConfig() {
    if (urlData1 && !isValidUrl(urlData1)) { flashMessage("error", "L'URL data 1 est invalide"); return; }
    if (urlData2 && !isValidUrl(urlData2)) { flashMessage("error", "L'URL data 2 est invalide"); return; }

    setSaving("data");
    const rows: any[] = [];
    if (urlData1) rows.push({ id: "url_data1", value: urlData1 });
    if (urlData2) rows.push({ id: "url_data2", value: urlData2 });
    if (koboToken) rows.push({ id: "kobo_token", value: koboToken });

    if (rows.length === 0) { setSaving(null); flashMessage("error", "Aucune valeur à enregistrer"); return; }

    const { error } = await supabase.from("config").upsert(rows, { onConflict: "id" });
    setSaving(null);
    if (error) flashMessage("error", `Erreur : ${error.message}`);
    else flashMessage("success", "Configuration de synchronisation enregistrée");
  }

  async function handleChangePassword() {
    if (!oldPassword || !newPassword || !confirmPassword) { flashMessage("error", "Tous les champs sont requis"); return; }
    if (newPassword !== confirmPassword) { flashMessage("error", "Les mots de passe ne correspondent pas"); return; }
    if (newPassword.length < 6) { flashMessage("error", "Le mot de passe doit avoir au moins 6 caractères"); return; }

    setSaving("password");
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: oldPassword });
    if (signInError) { flashMessage("error", "Ancien mot de passe incorrect"); setSaving(null); return; }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(null);
    if (updateError) flashMessage("error", `Erreur : ${updateError.message}`);
    else {
      flashMessage("success", "Mot de passe changé avec succès");
      setOldPassword(""); setNewPassword(""); setConfirmPassword("");
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  if (loading) {
    return (
      <main style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#7a9ab8", fontSize: 14 }}>
          <div style={{ width: 18, height: 18, border: "2px solid #e2e8ef", borderTopColor: "#c9a84c", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
          Chargement…
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    );
  }

  const PrimaryBtn = ({ label, loadingLabel, loadingKey, onClick, danger = false }: {
    label: string; loadingLabel: string; loadingKey: string; onClick: () => void; danger?: boolean;
  }) => (
    <button
      onClick={onClick} disabled={saving === loadingKey}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "11px 22px", borderRadius: 12, fontSize: 13, fontWeight: 700, border: "none",
        cursor: saving === loadingKey ? "not-allowed" : "pointer",
        background: danger ? "#dc2626" : "linear-gradient(135deg, #0d1b2a, #1a3352)",
        color: "#fff", opacity: saving === loadingKey ? 0.65 : 1,
        boxShadow: danger ? "0 4px 12px rgba(220,38,38,0.25)" : "0 4px 14px rgba(13,27,42,0.2)",
        transition: "all 0.18s",
      }}
    >
      {saving === loadingKey ? (
        <>
          <span style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
          {loadingLabel}
        </>
      ) : label}
    </button>
  );

  return (
    <main>
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#c9a84c", margin: "0 0 8px" }}>
          Paramètres
        </p>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: "#0d1b2a", margin: 0 }}>Configuration et compte</h1>
        <p style={{ marginTop: 8, fontSize: 14, color: "#7a9ab8" }}>
          Gérez les URLs des formulaires, la synchronisation KoboToolbox et votre mot de passe
        </p>
      </div>

      {message && (
        <div style={{
          marginBottom: 24, padding: "12px 16px", borderRadius: 14, fontSize: 13, fontWeight: 600,
          background: message.type === "success" ? "#f0fdf4" : "#fef2f2",
          border: `1px solid ${message.type === "success" ? "#bbf7d0" : "#fecaca"}`,
          color: message.type === "success" ? "#15803d" : "#dc2626",
        }}>
          {message.text}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ── Section 1 : URLs formulaires publics ── */}
        <SettingsSection
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>}
          title="Liens des formulaires (page publique)"
          subtitle="Ces URLs apparaissent sur la page publique — modifiez-les ici pour les changer partout"
          accent="#0d1b2a"
        >
          <div style={{ marginBottom: 14, padding: "10px 14px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, fontSize: 12.5, color: "#0369a1" }}>
            <svg style={{display:"inline",verticalAlign:"middle",marginRight:6}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>Ces liens sont affichés sur la page publique. Quand vous les modifiez ici, ils changent automatiquement pour les étudiants.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Field label="Nom du formulaire 1" hint="Ce nom s'affiche sur la page publique et dans les exports">
              <InputStyle value={title1} onChange={setTitle1} placeholder="Ex : Genre & Inclusion" />
            </Field>
            <Field label="Lien formulaire 1" hint="Ex : https://ee.kobotoolbox.org/x/zHy4iTMt">
              <InputStyle type="url" value={url1} onChange={setUrl1} placeholder="https://ee.kobotoolbox.org/x/…" />
            </Field>
            <Field label="Nom du formulaire 2" hint="Ce nom s'affiche sur la page publique et dans les exports">
              <InputStyle value={title2} onChange={setTitle2} placeholder="Ex : Vie des Etudiants" />
            </Field>
            <Field label="Lien formulaire 2" hint="Ex : https://ee.kobotoolbox.org/x/FO24PkpW">
              <InputStyle type="url" value={url2} onChange={setUrl2} placeholder="https://ee.kobotoolbox.org/x/…" />
            </Field>
            <div>
              <PrimaryBtn label="Enregistrer les liens" loadingLabel="Enregistrement…" loadingKey="urls"
                onClick={() => showConfirmDialog("Enregistrer les liens ?", handleSaveFormUrls, "Les nouveaux liens seront immédiatement visibles sur la page publique.")}
              />
            </div>
          </div>
        </SettingsSection>

        {/* ── Section 2 : Config synchronisation ── */}
        <SettingsSection
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>}
          title="Synchronisation KoboToolbox"
          subtitle="URLs de données et token d'API pour importer les réponses"
          accent="#c9a84c"
        >
          <div style={{ marginBottom: 14, padding: "10px 14px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, fontSize: 12.5, color: "#92400e" }}>
            <svg style={{display:"inline",verticalAlign:"middle",marginRight:6}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>Copiez l'URL depuis KoboToolbox : <strong>kf.kobotoolbox.org → votre formulaire → Données → copier l'URL de la page</strong>
            <br/>Ex : <code style={{ fontSize: 11, background: "#fef3c7", padding: "1px 5px", borderRadius: 4 }}>https://kf.kobotoolbox.org/#/forms/aniqawdF43XcJApbgErFuF/data/table</code>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Field label={`URL data — ${title1 || "Formulaire 1"}`} hint="URL de la page de données KoboToolbox (kf.kobotoolbox.org)">
              <InputStyle type="url" value={urlData1} onChange={setUrlData1} placeholder="https://kf.kobotoolbox.org/#/forms/…/data/table" />
            </Field>
            <Field label={`URL data — ${title2 || "Formulaire 2"}`} hint="URL de la page de données KoboToolbox (kf.kobotoolbox.org)">
              <InputStyle type="url" value={urlData2} onChange={setUrlData2} placeholder="https://kf.kobotoolbox.org/#/forms/…/data/table" />
            </Field>
            <Field label="Token API KoboToolbox" hint="Obtenir depuis : kf.kobotoolbox.org → Profil → Clé API (token)">
              <div style={{ position: "relative" }}>
                <InputStyle type={showToken ? "text" : "password"} value={koboToken} onChange={setKoboToken} placeholder="Token de votre compte KoboToolbox" />
                <button
                  type="button" onClick={() => setShowToken(!showToken)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#7a9ab8", fontSize: 12 }}
                >
                  {showToken ? "Masquer" : "Afficher"}
                </button>
              </div>
            </Field>
            <div>
              <PrimaryBtn label="Enregistrer la config sync" loadingLabel="Enregistrement…" loadingKey="data"
                onClick={() => showConfirmDialog("Enregistrer la configuration ?", handleSaveDataConfig, "Ces paramètres seront utilisés lors de la prochaine synchronisation.")}
              />
            </div>
          </div>
        </SettingsSection>

        {/* ── Section 3 : Compte ── */}
        <SettingsSection
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
          title="Informations du compte"
          subtitle="Détails de votre compte administrateur"
          accent="#1d4ed8"
        >
          <Field label="Email" hint="L'adresse email ne peut pas être modifiée">
            <InputStyle type="email" value={email} disabled />
          </Field>
        </SettingsSection>

        {/* ── Section 4 : Mot de passe ── */}
        <SettingsSection
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
          title="Changer le mot de passe"
          subtitle="Mettez à jour votre mot de passe de sécurité"
          accent="#7c3aed"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Field label="Ancien mot de passe">
              <InputStyle type="password" value={oldPassword} onChange={setOldPassword} placeholder="••••••••••••" />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Nouveau mot de passe">
                <InputStyle type="password" value={newPassword} onChange={setNewPassword} placeholder="••••••••••••" />
              </Field>
              <Field label="Confirmer">
                <InputStyle type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="••••••••••••" />
              </Field>
            </div>
            {newPassword.length > 0 && (
              <div>
                <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                  {[1, 2, 3, 4].map((i) => {
                    const strength = newPassword.length >= 12 ? 4 : newPassword.length >= 8 ? 3 : newPassword.length >= 6 ? 2 : 1;
                    const colors = ["#dc2626", "#f97316", "#eab308", "#22c55e"];
                    return <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= strength ? colors[strength - 1] : "#e2e8ef", transition: "background 0.2s" }} />;
                  })}
                </div>
                <p style={{ fontSize: 11, color: "#7a9ab8", margin: 0 }}>
                  {newPassword.length < 6 ? "Trop court" : newPassword.length < 8 ? "Acceptable" : newPassword.length < 12 ? "Bon" : "Excellent"}
                </p>
              </div>
            )}
            <div>
              <PrimaryBtn label="Mettre à jour le mot de passe" loadingLabel="Mise à jour…" loadingKey="password"
                onClick={() => showConfirmDialog("Changer le mot de passe ?", handleChangePassword, "Vous devrez utiliser le nouveau mot de passe à la prochaine connexion.")}
              />
            </div>
          </div>
        </SettingsSection>

        {/* ── Danger zone ── */}
        <div style={{ background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 24, padding: "22px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 14, background: "#fee2e2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#dc2626", margin: 0 }}>Déconnexion</h3>
              <p style={{ fontSize: 13, color: "#f87171", margin: "2px 0 0" }}>Terminez votre session de travail</p>
            </div>
          </div>
          <button
            onClick={() => showConfirmDialog("Se déconnecter ?", handleSignOut, "Vous serez redirigé vers la page de connexion.", true)}
            style={{ padding: "10px 20px", borderRadius: 12, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", background: "#dc2626", color: "#fff", boxShadow: "0 4px 12px rgba(220,38,38,0.25)" }}
          >
            Se déconnecter
          </button>
        </div>
      </div>

      {/* Confirm dialog */}
      {showConfirm && confirmAction && (
        <div onClick={() => setShowConfirm(false)} style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(13,27,42,0.45)", backdropFilter: "blur(4px)" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 24, padding: "32px 28px", maxWidth: 380, width: "90%", boxShadow: "0 30px 80px rgba(13,27,42,0.2)" }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: confirmAction.danger ? "#fee2e2" : "#f0f4f8", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              {confirmAction.danger
                ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0d1b2a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0d1b2a", margin: "0 0 8px" }}>{confirmAction.title}</h3>
            {confirmAction.desc && <p style={{ fontSize: 14, color: "#7a9ab8", margin: "0 0 24px", lineHeight: 1.6 }}>{confirmAction.desc}</p>}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowConfirm(false)} style={{ flex: 1, padding: "11px", borderRadius: 12, border: "1px solid #e2e8ef", background: "#f8fafc", fontSize: 13, fontWeight: 600, color: "#3d5166", cursor: "pointer" }}>Annuler</button>
              <button onClick={() => { confirmAction.action(); setShowConfirm(false); }} style={{ flex: 1, padding: "11px", borderRadius: 12, border: "none", background: confirmAction.danger ? "#dc2626" : "linear-gradient(135deg, #0d1b2a, #1a3352)", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>Confirmer</button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
