"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function isValidUrl(value: string) {
  try {
    const parsed = new URL(value);
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [url1, setUrl1] = useState("");
  const [url2, setUrl2] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [adminName, setAdminName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ title: string; action: () => void } | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/admin/login");
        return;
      }

      setEmail(data.session.user.email || "");

      const { data: configRows, error } = await supabase
        .from("config")
        .select("id,value")
        .in('id', ['url1','url2']);

      if (!error && Array.isArray(configRows)) {
        const nextUrl1 = configRows.find((row: any) => row.id === 'url1')?.value;
        const nextUrl2 = configRows.find((row: any) => row.id === 'url2')?.value;
        setUrl1(nextUrl1 ?? "");
        setUrl2(nextUrl2 ?? "");
      }

      setLoading(false);
    };

    init();
  }, [router]);

  function showConfirmDialog(title: string, action: () => void) {
    setConfirmAction({ title, action });
    setShowConfirm(true);
  }

  async function handleSaveUrls() {
    setMessage(null);

    if (!url1.trim() || !url2.trim()) {
      setMessage({ type: "error", text: "Les deux URLs sont requises" });
      return;
    }

    if (!isValidUrl(url1)) {
      setMessage({ type: "error", text: "L'URL du formulaire 1 est invalide" });
      return;
    }

    if (!isValidUrl(url2)) {
      setMessage({ type: "error", text: "L'URL du formulaire 2 est invalide" });
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("config").upsert([
      { id: 'url1', value: url1 },
      { id: 'url2', value: url2 },
    ], { onConflict: "id" });

    setSaving(false);

    if (error) {
      setMessage({ type: "error", text: `Erreur: ${error.message}` });
    } else {
      setMessage({ type: "success", text: "URLs enregistrees avec succes" });
    }
  }

  async function handleChangePassword() {
    setMessage(null);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setMessage({ type: "error", text: "Tous les champs sont requis" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Les mots de passe ne correspondent pas" });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "Le mot de passe doit avoir au moins 6 caracteres" });
      return;
    }

    setSaving(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: oldPassword,
    });

    if (signInError) {
      setMessage({ type: "error", text: "Ancien mot de passe incorrect" });
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    setSaving(false);

    if (updateError) {
      setMessage({ type: "error", text: `Erreur: ${updateError.message}` });
    } else {
      setMessage({ type: "success", text: "Mot de passe change avec succes" });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  if (loading) {
    return <main className="p-8"><p className="text-ink3">Chargement...</p></main>;
  }

  return (
    <main className="space-y-8">
      <header>
        <p className="text-sm uppercase tracking-[0.18em] text-gold-muted">Parametres</p>
        <h1 className="mt-2 text-3xl font-semibold text-navy">Configuration et compte</h1>
        <p className="mt-3 text-sm text-ink2">Gerez les URLs des formulaires, votre mot de passe et vos informations</p>
      </header>

      {/* Messages */}
      {message && (
        <div className={`rounded-lg px-4 py-3 text-sm ${
          message.type === "success"
            ? "bg-success-bg border border-success-border text-success"
            : "bg-red-100 border border-red-300 text-red-700"
        }`}>
          {message.text}
        </div>
      )}

      {/* Configuration des URLs */}
      <div className="rounded-[28px] border border-border bg-white p-8 shadow-lg shadow-slate-200/70">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-navy">Configuration des formulaires</h2>
          <p className="mt-2 text-sm text-ink2">Configurez les URLs KoboToolbox pour les deux formulaires</p>
        </div>

        <form className="space-y-6" onSubmit={(e) => { 
          e.preventDefault(); 
          showConfirmDialog("Enregistrer les URLs ?", handleSaveUrls);
        }}>
          <div>
            <label className="block text-sm font-medium text-ink2">URL du formulaire 1 (Genre & Inclusion)</label>
            <input
              type="url"
              value={url1}
              onChange={(e) => setUrl1(e.target.value)}
              placeholder="https://ee.kobotoolbox.org/x/..."
              className="mt-3 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink2">URL du formulaire 2 (Vie des etudiants)</label>
            <input
              type="url"
              value={url2}
              onChange={(e) => setUrl2(e.target.value)}
              placeholder="https://ee.kobotoolbox.org/x/..."
              className="mt-3 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl bg-gold px-6 py-3 text-sm font-semibold text-navy transition hover:brightness-110 disabled:opacity-60"
          >
            {saving ? "Enregistrement..." : "Enregistrer les URLs"}
          </button>
        </form>
      </div>

      {/* Account Info */}
      <div className="rounded-[28px] border border-border bg-white p-8 shadow-lg shadow-slate-200/70">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-navy">Informations du compte</h2>
          <p className="mt-2 text-sm text-ink2">Details de votre compte administrateur</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-ink2">Email</label>
            <input
              type="email"
              value={email}
              disabled
              className="mt-3 w-full rounded-2xl border border-border bg-gray-100 px-4 py-3 text-sm text-ink3 cursor-not-allowed"
            />
            <p className="mt-2 text-xs text-ink3">L'email ne peut pas etre change</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink2">Nom de l'administrateur</label>
            <input
              type="text"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="Ex: Jean Dupont"
              className="mt-3 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
            />
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="rounded-[28px] border border-border bg-white p-8 shadow-lg shadow-slate-200/70">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-navy">Changer le mot de passe</h2>
          <p className="mt-2 text-sm text-ink2">Mettez a jour votre mot de passe de securite</p>
        </div>

        <form className="space-y-6" onSubmit={(e) => { 
          e.preventDefault(); 
          showConfirmDialog("Changer le mot de passe ?", handleChangePassword);
        }}>
          <div>
            <label className="block text-sm font-medium text-ink2">Ancien mot de passe</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="••••••••••••"
              className="mt-3 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink2">Nouveau mot de passe</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••••••"
              className="mt-3 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink2">Confirmer le mot de passe</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              className="mt-3 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl bg-gold px-6 py-3 text-sm font-semibold text-navy transition hover:brightness-110 disabled:opacity-60"
          >
            {saving ? "Mise a jour..." : "Changer le mot de passe"}
          </button>
        </form>
      </div>

      {/* Logout */}
      <div className="rounded-[28px] border border-red-200 bg-red-50 p-8 shadow-lg shadow-slate-200/70">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-red-700">Deconnexion</h2>
          <p className="mt-2 text-sm text-red-600">Terminez votre session de travail</p>
        </div>

        <button
          onClick={() => showConfirmDialog("Se deconnecter ?", handleSignOut)}
          className="rounded-2xl bg-red-500 px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Se deconnecter
        </button>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-[20px] bg-white p-8 shadow-2xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-navy mb-4">{confirmAction.title}</h3>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-navy hover:bg-cream"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  confirmAction.action();
                  setShowConfirm(false);
                }}
                className="flex-1 rounded-lg bg-gold px-4 py-2 text-sm font-medium text-navy hover:brightness-110"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
