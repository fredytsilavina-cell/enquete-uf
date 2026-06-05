"use client";

import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  loading?: boolean;
}

const variantStyles = {
  primary:
    "bg-gradient-to-r from-navy to-navy2 text-white hover:from-navy2 hover:to-navy3 shadow-md hover:shadow-lg",
  secondary:
    "bg-white border border-border text-navy hover:bg-cream hover:border-gold",
  danger: "bg-red-500 text-white hover:bg-red-600 shadow-md hover:shadow-lg",
  success: "bg-green-500 text-white hover:bg-green-600 shadow-md hover:shadow-lg",
};

const sizeStyles = {
  sm: "px-3 py-2 text-sm font-medium",
  md: "px-4 py-2.5 text-base font-semibold",
  lg: "px-6 py-3 text-lg font-bold",
};

export function ModernButton({
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  children,
  className = "",
  disabled = false,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
        variantStyles[variant]
      } ${sizeStyles[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {icon && !loading && <span>{icon}</span>}
      {children}
    </button>
  );
}
