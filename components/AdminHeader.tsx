"use client";

import { useState } from "react";
import Link from "next/link";
import { IconArrowRight } from "./icons";

const links: { label: string; href: string }[] = [
  { label: 'Dashboard', href: '/admin/dashboard' },
  { label: 'Données', href: '/admin/data' },
  { label: 'Paramètres', href: '/admin/settings' },
];

export default function AdminHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="admin-header sticky top-0 z-40 w-full backdrop-blur-md bg-white/95 border-b border-border shadow-sm">
      <div className="admin-header-inner">
        <Link href="/admin/dashboard" className="admin-brand">
          <div className="admin-brand-mark" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7l8-4 8 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" />
              <path d="M8 9.5v5.5" />
              <path d="M12 8.5v6" />
              <path d="M16 9.5v5.5" />
            </svg>
          </div>
          <div>
            <div className="admin-brand-title">UF Admin</div>
            <div className="admin-brand-subtitle">KoboToolbox</div>
          </div>
        </Link>

        <button
          type="button"
          className="admin-burger"
          onClick={() => setMenuOpen((current) => !current)}
          aria-label="Ouvir le menu admin"
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`admin-nav ${menuOpen ? "open" : ""}`}>
          {links.map((item) => (
            <Link key={item.href} href={item.href} className="admin-nav-link" onClick={() => setMenuOpen(false)}>
              {item.label}
              <IconArrowRight size={14} />
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
