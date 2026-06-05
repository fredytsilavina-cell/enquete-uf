"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const navItems = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
  {
    href: "/admin/data",
    label: "Données",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
      </svg>
    ),
  },
  {
    href: "/admin/settings",
    label: "Paramètres",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
];

export default function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(!!data.session);
      setLoading(false);
    };
    checkAuth();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  if (loading || !isAuthenticated) return null;

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + "/");

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="sb-aside"
        style={{ width: isCollapsed ? 68 : 216 }}
      >
        {/* Toggle button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Développer" : "Réduire"}
          className="sb-toggle"
          style={{ right: isCollapsed ? "auto" : 10, left: isCollapsed ? "50%" : "auto", transform: isCollapsed ? "translateX(-50%)" : "none" } as any}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            {isCollapsed ? (
              <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>
            ) : (
              <><polyline points="15 18 9 12 15 6"/></>
            )}
          </svg>
        </button>

        {/* Nav items */}
        <nav className="sb-nav" style={{ padding: isCollapsed ? "60px 8px 16px" : "60px 10px 16px" }}>
          {!isCollapsed && (
            <p className="sb-nav-label">Navigation</p>
          )}
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                className={`sb-link ${active ? "sb-link--active" : ""}`}
                style={{
                  justifyContent: isCollapsed ? "center" : "flex-start",
                  padding: isCollapsed ? "10px" : "10px 11px",
                  gap: isCollapsed ? 0 : 10,
                }}
              >
                <span className="sb-link-icon" style={{ color: active ? "#c9a84c" : "currentColor" }}>
                  {item.icon}
                </span>
                {!isCollapsed && <span className="sb-link-text">{item.label}</span>}
                {active && !isCollapsed && (
                  <span className="sb-active-dot" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sb-footer" style={{ padding: isCollapsed ? "14px 8px" : "14px 10px" }}>
          <button
            onClick={() => setShowConfirm(true)}
            title="Déconnexion"
            className="sb-signout"
            style={{
              justifyContent: isCollapsed ? "center" : "flex-start",
              padding: isCollapsed ? "9px" : "9px 11px",
              gap: isCollapsed ? 0 : 9,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {!isCollapsed && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="sb-mobile-nav">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sb-mobile-link ${active ? "sb-mobile-link--active" : ""}`}
            >
              <span className="sb-mobile-icon">{item.icon}</span>
              <span className="sb-mobile-label">{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setShowConfirm(true)}
          className="sb-mobile-link"
        >
          <span className="sb-mobile-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </span>
          <span className="sb-mobile-label">Sortir</span>
        </button>
      </nav>

      {/* Confirm dialog */}
      {showConfirm && (
        <div
          onClick={() => setShowConfirm(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(13,27,42,0.45)", backdropFilter: "blur(4px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 22, padding: "28px 24px", maxWidth: 340, width: "90%",
              boxShadow: "0 24px 64px rgba(13,27,42,0.2)",
            }}
          >
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0d1b2a", margin: "0 0 8px" }}>Se déconnecter ?</h3>
            <p style={{ fontSize: 13.5, color: "#7a9ab8", margin: "0 0 22px", lineHeight: 1.6 }}>Vous serez redirigé vers la page de connexion.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{ flex: 1, padding: "10px", borderRadius: 11, border: "1px solid #e2e8ef", background: "#f8fafc", fontSize: 13, fontWeight: 600, color: "#3d5166", cursor: "pointer" }}
              >
                Annuler
              </button>
              <button
                onClick={() => { setShowConfirm(false); handleSignOut(); }}
                style={{ flex: 1, padding: "10px", borderRadius: 11, border: "none", background: "#dc2626", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* Desktop sidebar */
        .sb-aside {
          min-height: calc(100vh - 65px);
          background: #fff;
          border-right: 1px solid #e8edf2;
          display: flex;
          flex-direction: column;
          transition: width 0.22s cubic-bezier(0.4,0,0.2,1);
          flex-shrink: 0;
          position: sticky;
          top: 65px;
          height: calc(100vh - 65px);
          overflow-y: auto;
          overflow-x: hidden;
        }
        .sb-toggle {
          position: absolute;
          top: 14px;
          right: 10px;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          border: 1px solid #e8edf2;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #7a9ab8;
          transition: all 0.18s;
          z-index: 10;
        }
        .sb-toggle:hover { background: rgba(201,168,76,0.08); color: #c9a84c; }

        .sb-nav {
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex: 1;
        }
        .sb-nav-label {
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #c8d4df;
          padding: 0 8px;
          margin: 0 0 6px;
        }
        .sb-link {
          display: flex;
          align-items: center;
          border-radius: 10px;
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          color: #7a9ab8;
          border: 1px solid transparent;
          transition: all 0.15s ease;
          position: relative;
        }
        .sb-link:hover { background: rgba(201,168,76,0.07); color: #0d1b2a; }
        .sb-link--active {
          background: rgba(201,168,76,0.1);
          color: #0d1b2a;
          font-weight: 600;
          border-color: rgba(201,168,76,0.2);
        }
        .sb-link-icon { flex-shrink: 0; display: flex; }
        .sb-link-text { white-space: nowrap; overflow: hidden; flex: 1; }
        .sb-active-dot {
          margin-left: auto;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #c9a84c;
          flex-shrink: 0;
        }

        .sb-footer { border-top: 1px solid #f0f4f8; }
        .sb-signout {
          width: 100%;
          display: flex;
          align-items: center;
          border-radius: 10px;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          color: #7a9ab8;
          transition: all 0.15s;
          font-family: inherit;
        }
        .sb-signout:hover { background: #fee2e2; color: #dc2626; }

        /* Mobile bottom nav — hidden on desktop */
        .sb-mobile-nav { display: none; }

        @media (max-width: 720px) {
          .sb-aside { display: none; }
          .sb-mobile-nav {
            display: flex;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 50;
            background: rgba(255,255,255,0.96);
            backdrop-filter: blur(16px);
            border-top: 1px solid #e8edf2;
            padding: 8px 12px;
            padding-bottom: calc(8px + env(safe-area-inset-bottom));
            gap: 4px;
            justify-content: space-around;
          }
          .sb-mobile-link {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            padding: 8px 12px 6px;
            border-radius: 12px;
            border: none;
            background: none;
            color: #9bb3c8;
            text-decoration: none;
            font-size: 10px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s;
            font-family: inherit;
            flex: 1;
            max-width: 80px;
          }
          .sb-mobile-link:hover, .sb-mobile-link--active {
            color: #0d1b2a;
            background: rgba(201,168,76,0.1);
          }
          .sb-mobile-link--active { color: #c9a84c; }
          .sb-mobile-icon { display: flex; align-items: center; justify-content: center; }
          .sb-mobile-label { white-space: nowrap; }

          /* Push content up above bottom nav */
          .admin-shell-content { padding-bottom: calc(80px + env(safe-area-inset-bottom)) !important; }
        }

        @media (max-width: 360px) {
          .sb-mobile-nav { padding: 6px 4px; }
          .sb-mobile-link { padding: 7px 6px 5px; font-size: 9px; }
        }
      `}</style>
    </>
  );
}
