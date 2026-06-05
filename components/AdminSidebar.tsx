"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { 
  IconDashboard, 
  IconListCheck, 
  IconSettings, 
  IconLogout, 
  IconMenu, 
  IconChevronLeft 
} from "./icons";

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

  if (loading || !isAuthenticated) {
    return null;
  }

  const isActive = (href: string) => pathname === href;

  return (
    <aside className={`admin-sidebar ${isCollapsed ? "admin-sidebar-collapsed" : ""}`}>
      {/* Hamburger Menu Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="admin-sidebar-menu-toggle"
        aria-label="Toggle sidebar"
      >
        {isCollapsed ? (
          <IconMenu size={24} />
        ) : (
          <IconChevronLeft size={24} />
        )}
      </button>

      <div className="admin-sidebar-top">
        <div className="admin-sidebar-header">
          <span className="admin-sidebar-badge">Admin UF</span>
          {!isCollapsed && <h2 className="admin-sidebar-title">Tableau de bord</h2>}
        </div>

        <nav className="admin-sidebar-nav">
          <Link
            href="/admin/dashboard"
            className={`admin-sidebar-link ${isActive("/admin/dashboard") ? "admin-sidebar-link-active" : ""}`}
            title="Dashboard"
          >
            <span className="admin-sidebar-link-icon">
              <IconDashboard size={20} />
            </span>
            {!isCollapsed && <span className="admin-sidebar-link-text">Dashboard</span>}
          </Link>
          <Link
            href="/admin/data"
            className={`admin-sidebar-link ${isActive("/admin/data") ? "admin-sidebar-link-active" : ""}`}
            title="Donnees"
          >
            <span className="admin-sidebar-link-icon">
              <IconListCheck size={20} />
            </span>
            {!isCollapsed && <span className="admin-sidebar-link-text">Donnees</span>}
          </Link>
          <Link
            href="/admin/settings"
            className={`admin-sidebar-link ${isActive("/admin/settings") ? "admin-sidebar-link-active" : ""}`}
            title="Parametres"
          >
            <span className="admin-sidebar-link-icon">
              <IconSettings size={20} />
            </span>
            {!isCollapsed && <span className="admin-sidebar-link-text">Parametres</span>}
          </Link>
        </nav>
      </div>

      <div className="admin-sidebar-footer">
        <button
          onClick={() => setShowConfirm(true)}
          className="admin-sidebar-signout"
          title="Deconnexion"
        >
          <span className="admin-sidebar-link-icon">
            <IconLogout size={20} />
          </span>
          {!isCollapsed && <span className="admin-sidebar-link-text">Deconnexion</span>}
        </button>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-[20px] bg-white p-8 shadow-2xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-navy mb-4">Se deconnecter ?</h3>
            <p className="text-sm text-ink2 mb-6">Vous serez redige vers la page de connexion.</p>
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
                  handleSignOut();
                }}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:brightness-110"
              >
                Deconnexion
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
