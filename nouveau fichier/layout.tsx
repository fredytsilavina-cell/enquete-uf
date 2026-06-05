"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { IconDiplomaSmall } from "@/components/icons";

function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}

function IconTable() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/><line x1="15" y1="9" x2="15" y2="21"/>
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    if (pathname === "/admin/login") { setChecking(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/admin/login");
      } else {
        setUserEmail(data.session.user.email ?? "");
        setChecking(false);
      }
    });
  }, [pathname, router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  if (pathname === "/admin/login") return <>{children}</>;

  if (checking) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f7fb" }}>
        <div style={{ fontSize: 14, color: "#7a9ab8" }}>Vérification…</div>
      </div>
    );
  }

  const navItems = [
    { href: "/admin/dashboard", label: "Configuration", icon: <IconSettings /> },
    { href: "/admin/donnees", label: "Données", icon: <IconTable /> },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: "var(--font-sans)" }}>
      {/* Sidebar */}
      <aside style={{
        width: 240, flexShrink: 0,
        background: "linear-gradient(180deg, #0d1b2a 0%, #1a2e44 100%)",
        display: "flex", flexDirection: "column",
        padding: "0",
        position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 40,
      }}>
        {/* Logo */}
        <div style={{ padding: "24px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "#c9a84c" }}><IconDiplomaSmall size={22} /></span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", fontFamily: "var(--font-serif)" }}>
                Admin
              </div>
              <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.12em", color: "#7a9ab8" }}>
                Univ. Fianarantsoa
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: "16px 12px", flex: 1 }}>
          {navItems.map(item => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 12px", borderRadius: 10, marginBottom: 4,
                textDecoration: "none",
                background: active ? "rgba(201,168,76,0.15)" : "transparent",
                color: active ? "#c9a84c" : "rgba(255,255,255,0.65)",
                fontSize: 13, fontWeight: active ? 600 : 400,
                transition: "all 0.2s",
                border: active ? "1px solid rgba(201,168,76,0.3)" : "1px solid transparent",
              }}>
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User + logout */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 11, color: "#7a9ab8", marginBottom: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {userEmail}
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, padding: "8px 12px", cursor: "pointer",
              color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 500,
              width: "100%", transition: "all 0.2s",
              fontFamily: "var(--font-sans)",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
          >
            <IconLogout /> Déconnexion
          </button>
          <Link href="/" style={{ display: "block", marginTop: 8, fontSize: 11, color: "#7a9ab8", textDecoration: "none", textAlign: "center" }}>
            ← Voir le site
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: 240, flex: 1, minHeight: "100vh", background: "#f5f7fb" }}>
        {children}
      </main>
    </div>
  );
}