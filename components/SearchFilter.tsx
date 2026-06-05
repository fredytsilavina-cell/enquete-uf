"use client";

import { useState, useRef, useEffect } from "react";

interface SearchFilterProps {
  onSearch: (query: string) => void;
  onFilterChange: (filters: { form?: string; dateRange?: string }) => void;
  placeholder?: string;
}

const formOptions = [
  { value: "", label: "Tous les formulaires" },
  { value: "genre_inclusion", label: "Genre & Inclusion" },
  { value: "vie_etudiants", label: "Vie des Étudiants" },
];

const dateOptions = [
  { value: "", label: "Toutes les dates" },
  { value: "today", label: "Aujourd'hui" },
  { value: "week", label: "Cette semaine" },
  { value: "month", label: "Ce mois" },
  { value: "3months", label: "3 derniers mois" },
];

export function SearchFilter({ onSearch, onFilterChange, placeholder }: SearchFilterProps) {
  const [query, setQuery] = useState("");
  const [selectedForm, setSelectedForm] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (formRef.current && !formRef.current.contains(e.target as Node)) setFormOpen(false);
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) setDateOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSearch = (value: string) => {
    setQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearch(value), 350);
  };

  const handleFormSelect = (value: string) => {
    setSelectedForm(value);
    setFormOpen(false);
    onFilterChange({ form: value, dateRange: selectedDate });
  };

  const handleDateSelect = (value: string) => {
    setSelectedDate(value);
    setDateOpen(false);
    onFilterChange({ form: selectedForm, dateRange: value });
  };

  const clearAll = () => {
    setQuery("");
    setSelectedForm("");
    setSelectedDate("");
    onSearch("");
    onFilterChange({ form: "", dateRange: "" });
  };

  const hasFilters = query || selectedForm || selectedDate;

  return (
    <div className="sf-root">
      {/* Search bar */}
      <div className="sf-search-wrap">
        <span className="sf-search-icon">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </span>
        <input
          className="sf-input"
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={placeholder || "Rechercher…"}
        />
        {query && (
          <button className="sf-clear-btn" onClick={() => handleSearch("")} title="Effacer">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {/* Filters row */}
      <div className="sf-filters-row">
        {/* Form filter */}
        <div className="sf-dropdown-wrap" ref={formRef}>
          <button
            className={`sf-filter-btn ${selectedForm ? "sf-filter-btn--active" : ""}`}
            onClick={() => { setFormOpen(!formOpen); setDateOpen(false); }}
          >
            <span className="sf-filter-dot" style={{ background: selectedForm === "genre_inclusion" ? "#15803d" : selectedForm === "vie_etudiants" ? "#7c3aed" : "#c8d4df" }} />
            <span>{formOptions.find(o => o.value === selectedForm)?.label || "Formulaire"}</span>
            <svg className={`sf-chevron ${formOpen ? "sf-chevron--open" : ""}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          {formOpen && (
            <div className="sf-dropdown">
              {formOptions.map(opt => (
                <button
                  key={opt.value}
                  className={`sf-dropdown-item ${selectedForm === opt.value ? "sf-dropdown-item--active" : ""}`}
                  onClick={() => handleFormSelect(opt.value)}
                >
                  {opt.value && (
                    <span className="sf-dropdown-dot" style={{ background: opt.value === "genre_inclusion" ? "#15803d" : "#7c3aed" }} />
                  )}
                  {opt.label}
                  {selectedForm === opt.value && (
                    <svg style={{ marginLeft: "auto" }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date filter */}
        <div className="sf-dropdown-wrap" ref={dateRef}>
          <button
            className={`sf-filter-btn ${selectedDate ? "sf-filter-btn--active" : ""}`}
            onClick={() => { setDateOpen(!dateOpen); setFormOpen(false); }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>{dateOptions.find(o => o.value === selectedDate)?.label || "Dates"}</span>
            <svg className={`sf-chevron ${dateOpen ? "sf-chevron--open" : ""}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          {dateOpen && (
            <div className="sf-dropdown">
              {dateOptions.map(opt => (
                <button
                  key={opt.value}
                  className={`sf-dropdown-item ${selectedDate === opt.value ? "sf-dropdown-item--active" : ""}`}
                  onClick={() => handleDateSelect(opt.value)}
                >
                  {opt.label}
                  {selectedDate === opt.value && (
                    <svg style={{ marginLeft: "auto" }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Clear all */}
        {hasFilters && (
          <button className="sf-reset-btn" onClick={clearAll}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            Réinitialiser
          </button>
        )}
      </div>

      <style>{`
        .sf-root { display: flex; flex-direction: column; gap: 10px; }

        /* Search */
        .sf-search-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .sf-search-icon {
          position: absolute;
          left: 14px;
          color: #9bb3c8;
          pointer-events: none;
          display: flex;
          align-items: center;
        }
        .sf-input {
          width: 100%;
          height: 42px;
          padding: 0 40px 0 42px;
          border: 1.5px solid #e2e8ef;
          border-radius: 13px;
          font-size: 13.5px;
          color: #0d1b2a;
          background: #f8fafc;
          outline: none;
          transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
          font-family: inherit;
        }
        .sf-input::placeholder { color: #9bb3c8; }
        .sf-input:focus {
          border-color: #c9a84c;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(201,168,76,0.1);
        }
        .sf-clear-btn {
          position: absolute;
          right: 12px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: none;
          background: #e2e8ef;
          color: #5a7a96;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s;
        }
        .sf-clear-btn:hover { background: #c8d4df; }

        /* Filters row */
        .sf-filters-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        /* Dropdown wrapper */
        .sf-dropdown-wrap { position: relative; }

        /* Filter button */
        .sf-filter-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          height: 36px;
          padding: 0 13px;
          border-radius: 10px;
          border: 1.5px solid #e2e8ef;
          background: #fff;
          color: #3d5166;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.18s;
          white-space: nowrap;
          font-family: inherit;
        }
        .sf-filter-btn:hover {
          border-color: #c9a84c;
          background: rgba(201,168,76,0.06);
          color: #0d1b2a;
        }
        .sf-filter-btn--active {
          border-color: #c9a84c;
          background: rgba(201,168,76,0.1);
          color: #0d1b2a;
          font-weight: 600;
        }
        .sf-filter-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .sf-chevron {
          transition: transform 0.18s;
          color: #9bb3c8;
        }
        .sf-chevron--open { transform: rotate(180deg); }

        /* Dropdown */
        .sf-dropdown {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          min-width: 200px;
          background: #fff;
          border: 1px solid #e2e8ef;
          border-radius: 14px;
          box-shadow: 0 12px 36px rgba(13,27,42,0.12);
          padding: 6px;
          z-index: 100;
          animation: sfDrop 0.15s ease;
        }
        @keyframes sfDrop {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .sf-dropdown-item {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 9px 12px;
          border-radius: 9px;
          border: none;
          background: none;
          font-size: 13px;
          color: #3d5166;
          cursor: pointer;
          transition: background 0.14s, color 0.14s;
          text-align: left;
          font-family: inherit;
        }
        .sf-dropdown-item:hover { background: #f4f7fa; color: #0d1b2a; }
        .sf-dropdown-item--active { color: #0d1b2a; font-weight: 600; }
        .sf-dropdown-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        /* Reset */
        .sf-reset-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          height: 36px;
          padding: 0 12px;
          border-radius: 10px;
          border: 1.5px solid #fecaca;
          background: #fff5f5;
          color: #dc2626;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.18s;
          font-family: inherit;
        }
        .sf-reset-btn:hover { background: #fee2e2; border-color: #dc2626; }

        @media (max-width: 480px) {
          .sf-filters-row { gap: 6px; }
          .sf-filter-btn { font-size: 12px; padding: 0 10px; height: 34px; }
          .sf-input { height: 40px; font-size: 13px; }
        }
      `}</style>
    </div>
  );
}
