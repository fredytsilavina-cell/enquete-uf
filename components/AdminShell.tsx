"use client";

import { usePathname } from "next/navigation";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";
import type { ReactNode } from "react";

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login" || pathname === "/admin/login/";

  // Login page: render children only, no header/sidebar, no scroll
  if (isLoginPage) {
    return (
      <>
        <style>{`
          html, body {
            overflow: hidden !important;
            height: 100% !important;
            margin: 0;
            padding: 0;
          }
        `}</style>
        {children}
      </>
    );
  }

  return (
    <div className="admin-shell">
      <AdminHeader />
      <div className="admin-shell-wrapper">
        <AdminSidebar />
        <div className="admin-shell-content">{children}</div>
      </div>
    </div>
  );
}
