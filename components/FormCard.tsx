"use client";
import { useState } from "react";
import Image from "next/image";
import { IconCheck, IconExternalLink } from "./icons";

interface FormCardProps {
  number: 1 | 2;
  title: string;
  description: string;
  topics: string[];
  imageSrc: string;
  imageAlt: string;
  url: string;
  status: "available" | "submitted";
  onOpen: () => void;
}

export default function FormCard({
  number, title, description, topics,
  imageSrc, imageAlt, url, status, onOpen,
}: FormCardProps) {
  const isDone = status === "submitted";
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="group relative flex flex-col rounded-3xl overflow-hidden bg-white"
      onMouseEnter={() => !isDone && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        boxShadow: isDone
          ? "0 4px 20px rgba(45,106,79,0.10)"
          : hovered
            ? "0 20px 60px rgba(13,27,42,0.18), 0 4px 16px rgba(13,27,42,0.10)"
            : "0 8px 32px rgba(13,27,42,0.12), 0 2px 8px rgba(13,27,42,0.06)",
        border: isDone
          ? "1.5px solid var(--success-border)"
          : "1.5px solid var(--gold-border)",
        transform: !isDone && hovered ? "translateY(-6px)" : "translateY(0)",
        transition: "transform 0.32s cubic-bezier(.22,.68,0,1.2), box-shadow 0.32s ease",
        opacity: isDone ? 0.88 : 1,
      }}
    >
      {/* ── Image section ── */}
      <div className="relative overflow-hidden" style={{ height: 220 }}>
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          className="object-cover"
          style={{
            transform: !isDone && hovered ? "scale(1.06)" : "scale(1)",
            transition: "transform 0.7s cubic-bezier(.22,.68,0,1.2)",
            filter: isDone ? "grayscale(18%) brightness(0.92)" : "none",
          }}
          sizes="(max-width: 768px) 100vw, 50vw"
          priority={number === 1}
        />

        {/* Gradient overlay */}
        <div style={{
          position: "absolute", inset: 0,
          background: isDone
            ? "linear-gradient(to top, rgba(18,60,38,0.70) 0%, rgba(18,60,38,0.15) 60%)"
            : "linear-gradient(to top, rgba(13,27,42,0.65) 0%, rgba(13,27,42,0.05) 60%)",
        }} />

        {/* Number badge — hidden when done */}
        {!isDone && (
          <div style={{
            position: "absolute", top: 14, left: 14,
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, var(--gold) 0%, var(--gold2) 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--navy)", fontWeight: 700, fontSize: 15,
            boxShadow: "0 4px 16px rgba(201,168,76,0.4)",
            fontFamily: "var(--font-serif)",
          }}>
            {number}
          </div>
        )}

        {/* Status pill */}
        <div style={{
          position: "absolute", top: 14, right: 14,
          display: "flex", alignItems: "center", gap: 6,
          background: isDone ? "rgba(45,106,79,0.92)" : "rgba(255,255,255,0.15)",
          border: isDone ? "none" : "1px solid rgba(255,255,255,0.3)",
          color: "#fff",
          borderRadius: 99, padding: "5px 13px",
          fontSize: 11, fontWeight: 600, letterSpacing: "0.04em",
          backdropFilter: "blur(10px)",
          boxShadow: isDone ? "0 2px 12px rgba(45,106,79,0.4)" : "none",
        }}>
          {isDone ? (
            <>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Soumis
            </>
          ) : "Disponible"}
        </div>

        {/* Title on image — available state */}
        {!isDone && (
          <div style={{ position: "absolute", bottom: 14, left: 18, right: 18 }}>
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 400, color: "#fff", lineHeight: 1.2, margin: 0, letterSpacing: "-0.01em" }}>
              {title}
            </h2>
          </div>
        )}

        {/* Done overlay on image */}
        {isDone && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 10,
          }}>
            {/* Large check circle */}
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "var(--success)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 0 8px rgba(45,106,79,0.25), 0 4px 20px rgba(45,106,79,0.5)",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", textAlign: "center", letterSpacing: "0.01em" }}>
                Formulaire soumis
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", textAlign: "center", marginTop: 3 }}>
                Merci pour votre contribution
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "22px 22px 20px" }}>

        <h2 style={{
          fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 400,
          color: isDone ? "var(--success)" : "#0d1b2a",
          lineHeight: 1.25, marginBottom: 10, marginTop: 0, letterSpacing: "-0.01em",
        }}>
          {title}
        </h2>

        <p style={{ fontSize: 13, lineHeight: 1.75, color: "#3d5166", marginBottom: 18, flex: 1 }}>
          {description}
        </p>

        {/* Topics */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 20 }}>
          {topics.map((t) => (
            <span key={t} style={{
              fontSize: 11, fontWeight: 600, letterSpacing: "0.02em",
              padding: "4px 12px", borderRadius: 99, whiteSpace: "nowrap",
              background: isDone ? "var(--success-bg)" : "var(--gold-bg)",
              color: isDone ? "var(--success)" : "var(--gold-muted)",
              border: `1px solid ${isDone ? "var(--success-border)" : "var(--gold-border)"}`,
            }}>
              {t}
            </span>
          ))}
        </div>

        {/* CTA */}
        {isDone ? (
          /* ── Submitted state: locked, not clickable ── */
          <div style={{
            width: "100%", borderRadius: 14, overflow: "hidden",
            border: "1px solid var(--success-border)",
          }}>
            {/* Top row: success message */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "13px 18px",
              background: "linear-gradient(135deg, #e8f4ee 0%, #f0faf5 100%)",
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                background: "var(--success)", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--success)", letterSpacing: "0.01em" }}>
                  Réponses enregistrées
                </div>
                <div style={{ fontSize: 11, color: "#4a9070", marginTop: 1 }}>
                  Ce formulaire est verrouillé
                </div>
              </div>
              {/* Lock icon */}
              <div style={{ marginLeft: "auto", color: "var(--success)", opacity: 0.6 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
            </div>
          </div>
        ) : (
          /* ── Available state: clickable gold button ── */
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onOpen}
            className="btn-gold"
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              fontSize: 13, fontWeight: 600, padding: "14px 16px", borderRadius: 12,
              textDecoration: "none", letterSpacing: "0.02em",
            }}
          >
            <IconExternalLink size={14} />
            Remplir le formulaire {number}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 2 }}>
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}
