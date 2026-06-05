"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminHeader() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`admin-header sticky top-0 z-40 w-full transition-all duration-300 ${
        scrolled
          ? "bg-white/98 shadow-md shadow-slate-200/60 border-b border-slate-100"
          : "bg-white/95 border-b border-slate-100/80"
      }`}
      style={{ backdropFilter: "blur(20px)" }}
    >
      <div
        className="admin-header-inner mx-auto flex items-center justify-between gap-4 px-6 py-3"
        style={{ maxWidth: "1280px" }}
      >
        {/* Brand */}
        <Link
          href="/admin/dashboard"
          className="admin-brand flex items-center gap-3 no-underline group"
        >
          <div
            className="admin-brand-mark flex items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-105"
            style={{
              width: 40,
              height: 40,
              background: "linear-gradient(145deg, #0d1b2a 0%, #1a3352 100%)",
              boxShadow:
                "0 4px 12px rgba(13,27,42,0.25), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
            aria-hidden="true"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#c9a84c"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 7l8-4 8 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" />
              <path d="M8 9.5v5.5" />
              <path d="M12 8.5v6" />
              <path d="M16 9.5v5.5" />
            </svg>
          </div>
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#0d1b2a",
                letterSpacing: "0.02em",
                lineHeight: 1.2,
              }}
            >
              UF Admin
            </div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: "#7a9ab8",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              KoboToolbox
            </div>
          </div>
        </Link>
      </div>
    </header>
  );
}
