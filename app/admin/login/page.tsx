"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Eye, EyeOff } from "lucide-react";

/* ─── Rate-limit helpers ─── */
const LOGIN_FAILURES_KEY = "uf-admin-login-failures";
const MAX_LOGIN_ATTEMPTS = 4;
const LOCKOUT_WINDOW_MS  = 15 * 60 * 1000;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000;

function getLoginAttempts(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LOGIN_FAILURES_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "number") : [];
  } catch { return []; }
}
function saveLoginAttempts(a: number[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(LOGIN_FAILURES_KEY, JSON.stringify(a));
}

/* ─── Dot-map canvas ─── */
function DotMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dimRef    = useRef({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      canvas.width  = width;
      canvas.height = height;
      dimRef.current = { width, height };
    });
    ro.observe(canvas.parentElement as Element);

    const routes = [
      { sx: 0.22, sy: 0.28, ex: 0.42, ey: 0.20, delay: 0   },
      { sx: 0.42, sy: 0.20, ex: 0.58, ey: 0.25, delay: 1.8 },
      { sx: 0.10, sy: 0.15, ex: 0.30, ey: 0.55, delay: 0.8 },
      { sx: 0.62, sy: 0.18, ex: 0.45, ey: 0.52, delay: 1.2 },
    ];

    const GOLD   = "#c9a84c";
    const GOLD_A = "rgba(201,168,76,";
    let start = Date.now();
    let raf: number;

    function draw() {
      const { width: W, height: H } = dimRef.current;
      if (!W || !H) { raf = requestAnimationFrame(draw); return; }
      const ctx = canvas!.getContext("2d")!;
      ctx.clearRect(0, 0, W, H);

      // dots
      const gap = 14, r = 1.2;
      for (let x = 0; x < W; x += gap) {
        for (let y = 0; y < H; y += gap) {
          const nx = x / W, ny = y / H;
          const inMap =
            (nx < 0.25 && nx > 0.05 && ny < 0.45 && ny > 0.10) ||
            (nx < 0.25 && nx > 0.15 && ny < 0.80 && ny > 0.45) ||
            (nx < 0.48 && nx > 0.30 && ny < 0.38 && ny > 0.14) ||
            (nx < 0.52 && nx > 0.34 && ny < 0.68 && ny > 0.36) ||
            (nx < 0.74 && nx > 0.48 && ny < 0.52 && ny > 0.10) ||
            (nx < 0.82 && nx > 0.66 && ny < 0.82 && ny > 0.60);
          if (inMap && Math.random() > 0.35) {
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = `${GOLD_A}${(Math.random() * 0.4 + 0.15).toFixed(2)})`;
            ctx.fill();
          }
        }
      }

      // routes
      const t = (Date.now() - start) / 1000;
      if (t > 14) start = Date.now();

      routes.forEach(({ sx, sy, ex, ey, delay }) => {
        const elapsed = t - delay;
        if (elapsed <= 0) return;
        const progress = Math.min(elapsed / 3.5, 1);
        const x1 = sx * W, y1 = sy * H;
        const x2 = x1 + (ex * W - x1) * progress;
        const y2 = y1 + (ey * H - y1) * progress;

        // line
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `${GOLD_A}0.55)`;
        ctx.lineWidth = 1.4;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // origin dot
        ctx.beginPath();
        ctx.arc(x1, y1, 3, 0, Math.PI * 2);
        ctx.fillStyle = GOLD;
        ctx.fill();

        // moving dot + glow
        ctx.beginPath();
        ctx.arc(x2, y2, 5, 0, Math.PI * 2);
        ctx.fillStyle = `${GOLD_A}0.18)`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x2, y2, 3, 0, Math.PI * 2);
        ctx.fillStyle = GOLD;
        ctx.fill();

        if (progress === 1) {
          ctx.beginPath();
          ctx.arc(x2, y2, 3, 0, Math.PI * 2);
          ctx.fillStyle = GOLD;
          ctx.fill();
        }
      });

      raf = requestAnimationFrame(draw);
    }

    draw();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
    </div>
  );
}

/* ─── Main login page ─── */
export default function AdminLoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lockUntil,  setLockUntil]  = useState<number | null>(null);
  const [remaining,  setRemaining]  = useState(0);
  const [mounted,    setMounted]    = useState(false);

  useEffect(() => {
    setMounted(true);
    const attempts = getLoginAttempts();
    const now = Date.now();
    const recent = attempts.filter((ts) => now - ts < LOCKOUT_WINDOW_MS);
    saveLoginAttempts(recent);
    if (recent.length >= MAX_LOGIN_ATTEMPTS) setLockUntil(recent[recent.length - 1] + LOCKOUT_DURATION_MS);

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/admin/dashboard");
      else setLoading(false);
    });
  }, [router]);

  useEffect(() => {
    if (!lockUntil) { setRemaining(0); return; }
    const iv = setInterval(() => {
      const rem = Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));
      setRemaining(rem);
      if (rem <= 0) { setLockUntil(null); saveLoginAttempts([]); clearInterval(iv); }
    }, 1000);
    return () => clearInterval(iv);
  }, [lockUntil]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (lockUntil && Date.now() < lockUntil) {
      setError(`Trop de tentatives. Réessayez dans ${remaining}s.`);
      return;
    }
    setSubmitting(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (authError) {
      const attempts = getLoginAttempts();
      const now = Date.now();
      const recent = [...attempts.filter((ts) => now - ts < LOCKOUT_WINDOW_MS), now];
      saveLoginAttempts(recent);
      if (recent.length >= MAX_LOGIN_ATTEMPTS) setLockUntil(now + LOCKOUT_DURATION_MS);
      setError(authError.message);
      return;
    }
    saveLoginAttempts([]);
    router.push("/admin/dashboard");
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f6f9" }}>
        <div style={{ width: 36, height: 36, border: "3px solid rgba(201,168,76,0.2)", borderTopColor: "#c9a84c", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className={`lp-shell ${mounted ? "lp-shell--in" : ""}`}>
      <div className="lp-card">

        {/* ── Left panel: animated map ── */}
        <div className="lp-map-panel">
          <DotMap />

          {/* overlay gradient */}
          <div className="lp-map-overlay" />

          {/* brand */}
          <div className="lp-map-content">
            <div className={`lp-brand-wrap ${mounted ? "lp-brand-wrap--in" : ""}`}>
              <div className="lp-logo">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 7l8-4 8 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z"/>
                  <path d="M8 9.5v5.5"/><path d="M12 8.5v6"/><path d="M16 9.5v5.5"/>
                </svg>
              </div>
              <h2 className="lp-brand-title">UF Admin</h2>
              <p className="lp-brand-sub">
                Accédez au tableau de bord pour gérer les enquêtes KoboToolbox et consulter les réponses collectées.
              </p>

              <div className="lp-features">
                <div className="lp-feature">
                  <span className="lp-feature-dot" />
                  <span>Sécurité renforcée — tentatives limitées</span>
                </div>
                <div className="lp-feature">
                  <span className="lp-feature-dot" />
                  <span>Données synchronisées en temps réel</span>
                </div>
                <div className="lp-feature">
                  <span className="lp-feature-dot" />
                  <span>Export Excel & filtres avancés</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right panel: form ── */}
        <div className={`lp-form-panel ${mounted ? "lp-form-panel--in" : ""}`}>
          <div className="lp-form-inner">
            <div className="lp-form-header">
              <span className="lp-eyebrow">Administration</span>
              <h1 className="lp-form-title">Connexion</h1>
              <p className="lp-form-sub">Accès réservé aux responsables de l'enquête</p>
            </div>

            <form onSubmit={handleSubmit} className="lp-form">
              {/* Email */}
              <div className="lp-field">
                <label className="lp-label" htmlFor="lp-email">
                  Adresse email <span className="lp-required">*</span>
                </label>
                <div className="lp-input-wrap">
                  <svg className="lp-input-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                  <input
                    id="lp-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="admin@universite.uf"
                    className="lp-input"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="lp-field">
                <label className="lp-label" htmlFor="lp-password">
                  Mot de passe <span className="lp-required">*</span>
                </label>
                <div className="lp-input-wrap">
                  <svg className="lp-input-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <input
                    id="lp-password"
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••••••"
                    className="lp-input lp-input--pwd"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="lp-pwd-toggle"
                    onClick={() => setShowPwd(!showPwd)}
                    tabIndex={-1}
                    aria-label={showPwd ? "Masquer" : "Afficher"}
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="lp-error">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}

              {/* Lockout warning */}
              {!error && lockUntil && (
                <div className="lp-lockout">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  Compte verrouillé — réessayez dans {remaining}s
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || (!!lockUntil && Date.now() < lockUntil)}
                className="lp-submit"
              >
                {submitting ? (
                  <>
                    <span className="lp-spinner" />
                    Connexion en cours…
                  </>
                ) : (
                  <>
                    Se connecter
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </>
                )}
                <span className="lp-submit-shine" />
              </button>
            </form>

            <div className="lp-public-link">
              <a href="/" className="lp-public-btn">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 8 8 12 12 16"/><line x1="16" y1="12" x2="8" y2="12"/>
                </svg>
                Retour à la page publique
              </a>
            </div>

            <p className="lp-footer-note">
              Besoin d'aide ? Contactez l'administrateur système.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        /* ── Shell ── */
        .lp-shell {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          background: radial-gradient(ellipse at 20% 10%, rgba(201,168,76,0.12), transparent 50%),
                      linear-gradient(160deg, #f0f3f8 0%, #f8f6f0 60%, #f4f6f9 100%);
          opacity: 0;
          transition: opacity 0.5s ease;
          overflow: hidden;
        }
        .lp-shell--in { opacity: 1; }

        /* ── Card ── */
        /* Ensure card never overflows viewport */
        .lp-card {
          width: 100%;
          max-width: 900px;
          display: flex;
          border-radius: 28px;
          overflow: hidden;
          box-shadow: 0 32px 80px rgba(13,27,42,0.16), 0 4px 16px rgba(13,27,42,0.08);
          background: #fff;
        }

        /* ── Map panel (left) ── */
        .lp-map-panel {
          display: none;
          width: 45%;
          min-height: 580px;
          position: relative;
          background: linear-gradient(145deg, #0d1b2a 0%, #1a3352 100%);
          flex-shrink: 0;
          overflow: hidden;
        }
        @media (min-width: 768px) { .lp-map-panel { display: block; } }

        .lp-map-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(13,27,42,0.3) 0%, rgba(13,27,42,0.6) 100%);
          pointer-events: none;
          z-index: 1;
        }

        .lp-map-content {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 2;
          padding: 36px 28px;
        }

        .lp-brand-wrap {
          text-align: center;
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.6s ease 0.2s, transform 0.6s ease 0.2s;
        }
        .lp-brand-wrap--in { opacity: 1; transform: translateY(0); }

        .lp-logo {
          width: 56px;
          height: 56px;
          border-radius: 18px;
          background: rgba(201,168,76,0.15);
          border: 1px solid rgba(201,168,76,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 18px;
          box-shadow: 0 4px 20px rgba(201,168,76,0.15);
        }

        .lp-brand-title {
          font-size: 28px;
          font-weight: 800;
          color: #fff;
          margin: 0 0 10px;
          letter-spacing: -0.01em;
        }

        .lp-brand-sub {
          font-size: 13px;
          color: rgba(255,255,255,0.65);
          line-height: 1.7;
          max-width: 240px;
          margin: 0 auto 28px;
        }

        .lp-features {
          display: flex;
          flex-direction: column;
          gap: 10px;
          text-align: left;
          width: 100%;
          max-width: 240px;
          margin: 0 auto;
        }
        .lp-feature {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 12px;
          color: rgba(255,255,255,0.6);
          line-height: 1.5;
        }
        .lp-feature-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #c9a84c;
          flex-shrink: 0;
          margin-top: 5px;
        }

        /* ── Form panel (right) ── */
        .lp-form-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          background: #fff;
          opacity: 0;
          transform: translateX(16px);
          transition: opacity 0.55s ease 0.15s, transform 0.55s ease 0.15s;
        }
        .lp-form-panel--in { opacity: 1; transform: translateX(0); }

        .lp-form-inner {
          padding: 48px 40px;
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        /* ── Form header ── */
        .lp-eyebrow {
          display: inline-block;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #c9a84c;
          margin-bottom: 10px;
        }
        .lp-form-title {
          font-size: 26px;
          font-weight: 800;
          color: #0d1b2a;
          margin: 0 0 6px;
          letter-spacing: -0.01em;
        }
        .lp-form-sub {
          font-size: 13px;
          color: #7a9ab8;
          margin: 0 0 32px;
        }

        /* ── Fields ── */
        .lp-form { display: flex; flex-direction: column; gap: 18px; }

        .lp-field { display: flex; flex-direction: column; gap: 6px; }

        .lp-label {
          font-size: 12.5px;
          font-weight: 600;
          color: #3d5166;
          letter-spacing: 0.01em;
        }
        .lp-required { color: #c9a84c; }

        .lp-input-wrap { position: relative; }

        .lp-input-icon {
          position: absolute;
          left: 13px;
          top: 50%;
          transform: translateY(-50%);
          color: #9bb3c8;
          pointer-events: none;
        }

        .lp-input {
          width: 100%;
          height: 44px;
          padding: 0 14px 0 40px;
          border: 1.5px solid #e2e8ef;
          border-radius: 12px;
          font-size: 13.5px;
          color: #0d1b2a;
          background: #f8fafc;
          outline: none;
          transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
          font-family: inherit;
        }
        .lp-input::placeholder { color: #9bb3c8; }
        .lp-input:focus {
          border-color: #c9a84c;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(201,168,76,0.12);
        }
        .lp-input--pwd { padding-right: 42px; }

        .lp-pwd-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #9bb3c8;
          display: flex;
          align-items: center;
          padding: 4px;
          border-radius: 6px;
          transition: color 0.15s;
        }
        .lp-pwd-toggle:hover { color: #3d5166; }

        /* ── Error / lockout ── */
        .lp-error, .lp-lockout {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 13px;
          border-radius: 10px;
          font-size: 12.5px;
          font-weight: 500;
        }
        .lp-error {
          background: #fee2e2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }
        .lp-lockout {
          background: #fff7ed;
          color: #c2410c;
          border: 1px solid #fed7aa;
        }

        /* ── Submit ── */
        .lp-submit {
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          height: 46px;
          margin-top: 4px;
          border: none;
          border-radius: 13px;
          background: linear-gradient(135deg, #0d1b2a 0%, #1a3352 100%);
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: transform 0.18s, box-shadow 0.18s, filter 0.18s;
          font-family: inherit;
          box-shadow: 0 4px 16px rgba(13,27,42,0.25);
        }
        .lp-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(13,27,42,0.3);
          filter: brightness(1.08);
        }
        .lp-submit:active:not(:disabled) { transform: translateY(0); }
        .lp-submit:disabled { opacity: 0.55; cursor: not-allowed; }

        /* gold shimmer on hover */
        .lp-submit-shine {
          position: absolute;
          top: 0; bottom: 0;
          width: 60px;
          background: linear-gradient(90deg, transparent, rgba(201,168,76,0.25), transparent);
          transform: translateX(-120px);
          filter: blur(6px);
          pointer-events: none;
          transition: none;
        }
        .lp-submit:hover:not(:disabled) .lp-submit-shine {
          transition: transform 0.85s ease;
          transform: translateX(340px);
        }

        .lp-spinner {
          display: inline-block;
          width: 15px;
          height: 15px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: lp-spin 0.7s linear infinite;
        }
        @keyframes lp-spin { to { transform: rotate(360deg); } }

        /* ── Public link ── */
        .lp-public-link {
          margin-top: 16px;
          text-align: center;
        }
        .lp-public-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 12.5px;
          font-weight: 600;
          color: #7a9ab8;
          text-decoration: none;
          padding: 8px 14px;
          border-radius: 10px;
          border: 1px solid #e2e8ef;
          background: #f8fafc;
          transition: all 0.18s;
        }
        .lp-public-btn:hover {
          color: #0d1b2a;
          border-color: #c8d4df;
          background: #f0f4f8;
        }

        /* ── Footer note ── */
        .lp-footer-note {
          margin-top: 20px;
          font-size: 12px;
          color: #9bb3c8;
          text-align: center;
          line-height: 1.6;
        }

        /* ── Responsive ── */
        @media (max-width: 767px) {
          .lp-card { border-radius: 22px; max-width: 420px; }
          .lp-form-inner { padding: 36px 28px; }
          .lp-form-title { font-size: 22px; }
        }
        @media (max-width: 480px) {
          .lp-shell { padding: 12px; }
          .lp-card { border-radius: 18px; }
          .lp-form-inner { padding: 28px 20px; }
          .lp-form-title { font-size: 20px; }
          .lp-input { height: 42px; font-size: 13px; }
          .lp-submit { height: 44px; font-size: 13.5px; }
        }
        @media (max-width: 360px) {
          .lp-form-inner { padding: 20px 14px; }
          .lp-card { border-radius: 14px; }
        }
      `}</style>
    </div>
  );
}
