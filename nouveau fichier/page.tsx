"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { IconDiplomaSmall } from "@/components/icons";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
    } else {
      router.push("/admin/dashboard");
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0d1b2a 0%, #1a2e44 60%, #243b55 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px", fontFamily: "var(--font-sans)",
    }}>
      <div style={{
        background: "#fff", borderRadius: 24, padding: "48px 40px",
        width: "100%", maxWidth: 420,
        boxShadow: "0 32px 80px rgba(0,0,0,0.3)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
          <span style={{ color: "#c9a84c" }}><IconDiplomaSmall size={26} /></span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0d1b2a", fontFamily: "var(--font-serif)" }}>
              Univ. Fianarantsoa
            </div>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#7a9ab8" }}>
              Espace Admin
            </div>
          </div>
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0d1b2a", fontFamily: "var(--font-serif)", marginBottom: 8 }}>
          Connexion
        </h1>
        <p style={{ fontSize: 13, color: "#7a9ab8", marginBottom: 32 }}>
          Accès réservé aux administrateurs
        </p>

        {/* Email */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#3d5166", display: "block", marginBottom: 6 }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="admin@univ-fianarantsoa.mg"
            style={{
              width: "100%", padding: "12px 16px", borderRadius: 12,
              border: "1.5px solid #e2e8ef", fontSize: 14, outline: "none",
              fontFamily: "var(--font-sans)", transition: "border-color 0.2s",
              boxSizing: "border-box",
            }}
            onFocus={e => (e.target.style.borderColor = "#c9a84c")}
            onBlur={e => (e.target.style.borderColor = "#e2e8ef")}
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#3d5166", display: "block", marginBottom: 6 }}>
            Mot de passe
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="••••••••"
            style={{
              width: "100%", padding: "12px 16px", borderRadius: 12,
              border: "1.5px solid #e2e8ef", fontSize: 14, outline: "none",
              fontFamily: "var(--font-sans)", transition: "border-color 0.2s",
              boxSizing: "border-box",
            }}
            onFocus={e => (e.target.style.borderColor = "#c9a84c")}
            onBlur={e => (e.target.style.borderColor = "#e2e8ef")}
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: "#fff0f0", border: "1px solid #ffc5c5",
            borderRadius: 10, padding: "10px 14px",
            fontSize: 13, color: "#c0392b", marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        {/* Bouton Se connecter */}
        <button
          onClick={handleLogin}
          disabled={loading || !email || !password}
          style={{
            width: "100%", padding: "14px", borderRadius: 12,
            background: loading || !email || !password
              ? "#e2e8ef"
              : "linear-gradient(135deg, #0d1b2a 0%, #1a2e44 100%)",
            color: loading || !email || !password ? "#7a9ab8" : "#fff",
            border: "none", fontSize: 15, fontWeight: 700,
            cursor: loading || !email || !password ? "not-allowed" : "pointer",
            transition: "all 0.2s", letterSpacing: "0.01em",
            fontFamily: "var(--font-sans)",
          }}
        >
          {loading ? "Connexion en cours…" : "Se connecter"}
        </button>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "#b0c4d4" }}>
          <a href="/" style={{ color: "#7a9ab8", textDecoration: "none" }}>
            ← Retour au site
          </a>
        </p>
      </div>
    </div>
  );
}