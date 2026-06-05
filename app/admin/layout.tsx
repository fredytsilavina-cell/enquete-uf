import type { ReactNode } from "react";
import AdminShell from "@/components/AdminShell";

export const metadata = {
  title: "Admin — Enquête Étudiante UF",
  description: "Espace administration pour la gestion des liens KoboToolbox et des données.",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
