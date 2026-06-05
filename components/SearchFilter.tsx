"use client";

import React, { useState } from "react";

interface SearchFilterProps {
  onSearch: (query: string) => void;
  onFilterChange: (filters: { form?: string; dateRange?: string }) => void;
  placeholder?: string;
}

export function SearchFilter({
  onSearch,
  onFilterChange,
  placeholder = "Rechercher...",
}: SearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedForm, setSelectedForm] = useState<string>("");
  const [dateRange, setDateRange] = useState<string>("");
  const [category, setCategory] = useState<string>("");

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch(value);
  };

  const handleFormFilter = (form: string) => {
    setSelectedForm(form);
    onFilterChange({ form: form || undefined, dateRange });
  };

  const handleDateFilter = (range: string) => {
    setDateRange(range);
    onFilterChange({ form: selectedForm || undefined, dateRange: range || undefined });
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full rounded-xl border border-border bg-white px-4 py-3 pl-12 text-sm font-medium text-navy shadow-sm transition focus:border-gold focus:ring-2 focus:ring-gold/20 focus:outline-none"
        />
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 text-ink3"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setSelectedForm(''); handleFormFilter(''); }}
            className={`rounded-full px-3 py-1 text-sm ${selectedForm === '' ? 'bg-navy text-white' : 'bg-white border border-border text-navy'}`}
          >Tous</button>
          <button
            onClick={() => { setSelectedForm('genre_inclusion'); handleFormFilter('genre_inclusion'); }}
            className={`rounded-full px-3 py-1 text-sm ${selectedForm === 'genre_inclusion' ? 'bg-green-600 text-white' : 'bg-white border border-border text-navy'}`}
          >Genre & Inclusion</button>
          <button
            onClick={() => { setSelectedForm('vie_etudiants'); handleFormFilter('vie_etudiants'); }}
            className={`rounded-full px-3 py-1 text-sm ${selectedForm === 'vie_etudiants' ? 'bg-purple-600 text-white' : 'bg-white border border-border text-navy'}`}
          >Vie des Étudiants</button>
        </div>

        <select
          value={dateRange}
          onChange={(e) => handleDateFilter(e.target.value)}
          className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-navy shadow-sm transition focus:border-gold focus:ring-2 focus:ring-gold/20 focus:outline-none"
        >
          <option value="">Toutes les dates</option>
          <option value="today">Aujourd'hui</option>
          <option value="week">Cette semaine</option>
          <option value="month">Ce mois</option>
        </select>
      </div>
    </div>
  );
}
