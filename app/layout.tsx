import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Enquête Étudiante — Université de Fianarantsoa",
  description:
    "Participez à notre étude sur le genre, l'inclusion et la vie des étudiants à l'Université de Fianarantsoa. Deux formulaires anonymes, environ 10 minutes.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://enquete-uf.vercel.app"
  ),
  openGraph: {
    type: "website",
    locale: "fr_FR",
    title: "Enquête Étudiante — Université de Fianarantsoa",
    description:
      "Participez à notre étude sur le genre, l'inclusion et la vie des étudiants. Anonymat total garanti.",
    images: [
      {
        url: "/form2.jpg",
        width: 1200,
        height: 630,
        alt: "Étudiants à la bibliothèque — Université de Fianarantsoa",
      },
    ],
    siteName: "Enquête UF",
  },
  twitter: {
    card: "summary_large_image",
    title: "Enquête Étudiante — Université de Fianarantsoa",
    description:
      "Participez à notre étude sur le genre, l'inclusion et la vie des étudiants. Anonymat total garanti.",
    images: ["/form2.jpg"],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: { url: "/apple-touch-icon.png", type: "image/png" },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Favicon navigateur */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="alternate icon" href="/favicon.ico" />
        {/* Apple Touch Icon (iOS home screen) */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-cream font-dm-sans antialiased">
        {children}
      </body>
    </html>
  );
}
