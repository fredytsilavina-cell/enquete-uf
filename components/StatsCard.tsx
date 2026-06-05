"use client";

import React from "react";

interface StatsCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: "blue" | "green" | "purple" | "orange" | "navy";
  trend?: { value: number; isUp: boolean };
}

const palette: Record<string, { accent: string; iconBg: string; iconColor: string }> = {
  blue:   { accent: "#1d4ed8", iconBg: "#eff6ff", iconColor: "#1d4ed8" },
  green:  { accent: "#15803d", iconBg: "#f0fdf4", iconColor: "#15803d" },
  purple: { accent: "#7c3aed", iconBg: "#faf5ff", iconColor: "#7c3aed" },
  orange: { accent: "#b45309", iconBg: "#fff7ed", iconColor: "#b45309" },
  navy:   { accent: "#0d1b2a", iconBg: "#f0f4f8", iconColor: "#3d5166" },
};

const defaultIcons: Record<string, React.ReactNode> = {
  navy: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  green: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  purple: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
      <path d="M6 12v5c3 3 9 3 12 0v-5"/>
    </svg>
  ),
  orange: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  blue: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
};

const TrendUp = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15"/>
  </svg>
);
const TrendDown = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

export function StatsCard({ label, value, subtitle, icon, color = "blue", trend }: StatsCardProps) {
  const p = palette[color];
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e8edf2",
        borderRadius: 16,
        padding: "18px 20px",
        boxShadow: "0 1px 6px rgba(13,27,42,0.04)",
        transition: "box-shadow 0.18s ease, transform 0.18s ease",
        cursor: "default",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 20px rgba(13,27,42,0.09)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 6px rgba(13,27,42,0.04)";
      }}
    >
      {/* Header: label + icon */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <p style={{
          fontSize: 11, fontWeight: 700, color: "#9bb3c8",
          textTransform: "uppercase", letterSpacing: "0.11em", margin: 0,
        }}>
          {label}
        </p>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: p.iconBg, color: p.iconColor,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          {icon || defaultIcons[color]}
        </div>
      </div>

      {/* Value */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{
          fontSize: 32, fontWeight: 800, color: "#0d1b2a",
          lineHeight: 1, fontVariantNumeric: "tabular-nums",
        }}>
          {value}
        </span>
        {trend && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 3,
            fontSize: 11.5, fontWeight: 600,
            color: trend.isUp ? "#15803d" : "#dc2626",
            background: trend.isUp ? "#f0fdf4" : "#fef2f2",
            padding: "2px 7px", borderRadius: 20,
          }}>
            {trend.isUp ? <TrendUp /> : <TrendDown />}
            {trend.value}%
          </span>
        )}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p style={{ fontSize: 12, color: "#9bb3c8", margin: "5px 0 0", fontWeight: 500 }}>
          {subtitle}
        </p>
      )}

      {/* Subtle left accent line */}
      <div style={{
        position: "absolute", left: 0, top: "20%", bottom: "20%",
        width: 3, borderRadius: "0 3px 3px 0",
        background: p.accent, opacity: 0.7,
      }} />
    </div>
  );
}
