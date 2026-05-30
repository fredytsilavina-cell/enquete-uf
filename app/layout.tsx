import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Enquête Étudiante — Université de Fianarantsoa",
  description: "Enquête de recherche étudiante — Genre, Inclusion et Vie des Étudiants",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-cream font-dm-sans antialiased">{children}</body>
    </html>
  );
}
