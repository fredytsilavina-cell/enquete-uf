"use client";

import React from "react";

interface StatsCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: "blue" | "green" | "purple" | "orange";
  trend?: { value: number; isUp: boolean };
}

const colorMap = {
  blue: "from-blue-50 to-blue-100/50 border-blue-200 text-blue-600",
  green: "from-green-50 to-green-100/50 border-green-200 text-green-600",
  purple: "from-purple-50 to-purple-100/50 border-purple-200 text-purple-600",
  orange: "from-orange-50 to-orange-100/50 border-orange-200 text-orange-600",
};

export function StatsCard({
  label,
  value,
  subtitle,
  icon,
  color = "blue",
  trend,
}: StatsCardProps) {
  return (
    <div
      className={`rounded-2xl border p-6 backdrop-blur-sm transition-all hover:shadow-lg hover:scale-[1.02] bg-white/60 ${colorMap[color]}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-navy uppercase tracking-wider">{label}</p>
          <div className="mt-2 flex items-center gap-3">
            <p className="text-3xl font-extrabold text-navy">{value}</p>
            {trend && (
              <div className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm font-semibold ${trend.isUp ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {trend.isUp ? '↑' : '↓'} {trend.value}%
              </div>
            )}
          </div>
          {subtitle && <p className="mt-1 text-xs text-ink2">{subtitle}</p>}
        </div>
        {icon ? (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/30 text-2xl text-navy shadow-sm">{icon}</div>
        ) : (
          <div className="h-12 w-12" />
        )}
      </div>
    </div>
  );
}
