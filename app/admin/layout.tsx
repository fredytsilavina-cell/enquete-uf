import type { ReactNode } from "react";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";

export const metadata = {
  title: "Admin — Enquête Étudiante UF",
  description: "Espace administration pour la gestion des liens KoboToolbox et des données.",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
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
