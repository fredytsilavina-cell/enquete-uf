"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { IconArrowRight, IconLock, IconShield } from "@/components/icons";

const LOGIN_FAILURES_KEY = "uf-admin-login-failures";
const MAX_LOGIN_ATTEMPTS = 4;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000;

function getLoginAttempts(): number[] {
  if (typeof window === "undefined") return [];
  const value = window.localStorage.getItem(LOGIN_FAILURES_KEY);
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => typeof item === "number");
    }
  } catch {
    // ignore invalid data
  }

  return [];
}

function saveLoginAttempts(attempts: number[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LOGIN_FAILURES_KEY, JSON.stringify(attempts));
  }
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

  useEffect(() => {
    const attempts = getLoginAttempts();
    const now = Date.now();
    const recent = attempts.filter((ts) => now - ts < LOCKOUT_WINDOW_MS);
    saveLoginAttempts(recent);
    setFailedCount(recent.length);

    if (recent.length >= MAX_LOGIN_ATTEMPTS) {
      const lockTime = recent[recent.length - 1] + LOCKOUT_DURATION_MS;
      setLockUntil(lockTime);
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/admin/dashboard");
      } else {
        setLoading(false);
      }
    });
  }, [router]);

  useEffect(() => {
    if (!lockUntil) {
      setRemainingSeconds(0);
      return;
    }

    const interval = window.setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((lockUntil - now) / 1000));
      setRemainingSeconds(remaining);
      if (remaining <= 0) {
        setLockUntil(null);
        setFailedCount(0);
        saveLoginAttempts([]);
        window.clearInterval(interval);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [lockUntil]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (lockUntil && Date.now() < lockUntil) {
      setError(
        `Trop de tentatives. Veuillez réessayer dans ${remainingSeconds} seconde(s).`
      );
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      const attempts = getLoginAttempts();
      const now = Date.now();
      const recent = [...attempts.filter((ts) => now - ts < LOCKOUT_WINDOW_MS), now];
      saveLoginAttempts(recent);
      setFailedCount(recent.length);

      if (recent.length >= MAX_LOGIN_ATTEMPTS) {
        setLockUntil(now + LOCKOUT_DURATION_MS);
      }

      setError(error.message);
      return;
    }

    saveLoginAttempts([]);
    router.push("/admin/dashboard");
  }

  return (
    <main className="login-shell">
      <div className="mx-auto max-w-5xl">
        <div className="login-card">
          <div className="login-panel">
            <div className="login-topbar">
              <span className="login-badge">Administration</span>
              <h1 className="login-title">Connexion sécurisée</h1>
              <p className="login-subtitle">Accédez au tableau de bord pour gérer les liens KoboToolbox et consulter les réponses de manière professionnelle.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-ink2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  placeholder="admin@universite.uf"
                  className="input-surface mt-3 w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink2">Mot de passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="input-surface mt-3 w-full"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? "Connexion..." : "Se connecter"}
              </button>
            </form>

            <div className="login-footer">
              <p className="text-sm text-ink3">Besoin d’aide ? Contactez l’administrateur ou vérifiez vos identifiants Supabase.</p>
            </div>
          </div>

          <aside className="login-panel login-panel-secondary">
            <div className="login-aside-content">
              <h2 className="text-xl font-semibold text-navy">Espace admin UF</h2>
              <p className="mt-4 text-sm leading-7 text-ink2">Cette interface est réservée aux responsables de l'enquête. Toute tentative non autorisée est enregistrée.</p>

              <div className="mt-8 grid gap-4">
                <div className="login-feature">
                  <div className="login-feature-icon"><IconLock size={18} /></div>
                  <div>
                    <div className="font-semibold text-ink2">Sécurité renforcée</div>
                    <p className="text-sm text-ink3">Tentatives de connexion limitées et accès protégé.</p>
                  </div>
                </div>
                <div className="login-feature">
                  <div className="login-feature-icon"><IconShield size={18} /></div>
                  <div>
                    <div className="font-semibold text-ink2">Gestion rapide</div>
                    <p className="text-sm text-ink3">Modifiez rapidement les liens et consultez les réponses.</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
