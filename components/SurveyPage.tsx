"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import FormCard from "./FormCard";
import { useFingerprint } from "./FingerprintProvider";
import { supabase } from "@/lib/supabaseClient";
import {
  IconArrowRight, IconCheck, IconDiploma, IconDiplomaSmall, IconShield,
  IconStar, IconPhone, IconVolunteer, IconDoc,
} from "./icons";

type Status = "available" | "submitted";

function appendQuery(url: string, params: Record<string, string>) {
  try {
    const parsed = new URL(url);
    Object.entries(params).forEach(([key, value]) => parsed.searchParams.set(key, value));
    return parsed.toString();
  } catch {
    return url;
  }
}

/* ── Animated counter ── */
function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        let start = 0;
        const step = target / 40;
        const timer = setInterval(() => {
          start = Math.min(start + step, target);
          setValue(Math.round(start));
          if (start >= target) clearInterval(timer);
        }, 30);
        obs.disconnect();
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);
  return <div ref={ref} className="animate-countUp">{value}{suffix}</div>;
}

/* ── Scroll-reveal hook ── */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.08 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

export default function SurveyPage() {
  const fp = useFingerprint();
  const [s1, setS1] = useState<Status>("available");
  const [s2, setS2] = useState<Status>("available");
  const [allDone, setAllDone] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copiedFp, setCopiedFp] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; form: 1 | 2 | "all" }>({ visible: false, form: 1 });
  const [formUrls, setFormUrls] = useState({ url1: "", url2: "" });
  const [configLoaded, setConfigLoaded] = useState(false);

  const u1 = formUrls.url1
    ? appendQuery(formUrls.url1, fp ? { device_fp: fp, form: "genre_inclusion" } : {})
    : "";
  const u2 = formUrls.url2
    ? appendQuery(formUrls.url2, fp ? { device_fp: fp, form: "vie_etudiants" } : {})
    : "";
  const disabled1 = !formUrls.url1;
  const disabled2 = !formUrls.url2;

  useEffect(() => {
    const loadConfig = async () => {
      const { data: rows, error } = await supabase
        .from("config")
        .select("id,value")
        .in('id', ['url1','url2']);

      if (error && error.code !== "PGRST116") {
        console.error(error.message);
      }

      if (Array.isArray(rows)) {
        const nextUrl1 = rows.find((row: any) => row.id === 'url1')?.value;
        const nextUrl2 = rows.find((row: any) => row.id === 'url2')?.value;
        setFormUrls({
          url1: nextUrl1 ?? "",
          url2: nextUrl2 ?? "",
        });
      }

      setConfigLoaded(true);
    };

    loadConfig();
  }, []);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function showToast(form: 1 | 2 | "all") {
    setToast({ visible: true, form });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 6000);
  }

  function handleOpenF1() {
    if (disabled1 || s1 === "submitted") return;
    setS1("submitted");
    if (s2 === "submitted") { setAllDone(true); showToast("all"); }
    else showToast(1);
  }

  function handleOpenF2() {
    if (disabled2 || s2 === "submitted") return;
    setS2("submitted");
    if (s1 === "submitted") { setAllDone(true); showToast("all"); }
    else showToast(2);
  }

  const sc1 = s1 === "submitted" ? "done" : "active";
  const sc2 = s2 === "submitted" ? "done" : "active";
  const sc3 = allDone ? "done" : "pending";
  const doneCount = [s1, s2].filter(s => s === "submitted").length;

  const aboutReveal = useScrollReveal();
  const formsReveal = useScrollReveal();
  const tilesReveal = useScrollReveal();

  return (
    <div className="min-h-screen" style={{ background: "#f5f7fb", fontFamily: "var(--font-sans)" }}>

      {/* ══════════════ NAV ══════════════ */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "#fff",
        borderBottom: "1px solid #e8ecf2",
        boxShadow: navScrolled ? "0 2px 20px rgba(13,27,42,0.10)" : "none",
        transition: "box-shadow 0.3s ease",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <span style={{ color: "#c9a84c", display: "flex", alignItems: "center" }}>
              <IconDiplomaSmall size={22} />
            </span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0d1b2a", fontFamily: "var(--font-serif)", whiteSpace: "nowrap" }}>
                Univ. Fianarantsoa
              </div>
              <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.12em", color: "#7a9ab8" }}>
                Recherche
              </div>
            </div>
          </div>

          {/* Desktop nav links */}
          <div className="nav-links-desktop" style={{ display: "flex", alignItems: "center", gap: 28 }}>
            {[
              { label: "Accueil", href: "#" },
              { label: "Formulaires", href: "#forms" },
            ].map((item) => (
              <a key={item.label} href={item.href} style={{
                fontSize: 13, fontWeight: 600,
                color: item.label === "Formulaires" ? "#a8863e" : "#0d1b2a",
                textDecoration: "none",
                paddingBottom: 2,
                borderBottom: item.label === "Formulaires" ? "2px solid #c9a84c" : "2px solid transparent",
                transition: "color 0.2s, border-color 0.2s",
              }}>{item.label}</a>
            ))}
          </div>

          {/* Right side: pill + CTA */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {doneCount > 0 && (
              <div style={{
                fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 99,
                background: "var(--success-bg)", color: "var(--success)",
                border: "1px solid var(--success-border)",
                animation: "scaleIn 0.4s cubic-bezier(.22,.68,0,1.2) both",
                whiteSpace: "nowrap",
              }}>
                {doneCount}/2 soumis
              </div>
            )}
            <a href="/admin/login" className="nav-cta-btn" style={{
              fontSize: 12, fontWeight: 600,
              padding: "8px 16px", borderRadius: 99,
              border: "1.5px solid transparent",
              color: "#fff", background: "#0d1b2a",
              textDecoration: "none", whiteSpace: "nowrap",
              transition: "background 0.2s, color 0.2s",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = "#0f2746"; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = "#0d1b2a"; }}
            >
              Connexion
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </a>
            <a href="#forms" className="nav-cta-btn" style={{
              fontSize: 12, fontWeight: 600,
              padding: "8px 16px", borderRadius: 99,
              border: "1.5px solid #0d1b2a",
              color: "#0d1b2a", background: "transparent",
              textDecoration: "none", whiteSpace: "nowrap",
              transition: "background 0.2s, color 0.2s",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = "#0d1b2a"; (e.target as HTMLElement).style.color = "#fff"; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = "transparent"; (e.target as HTMLElement).style.color = "#0d1b2a"; }}
            >
              Participer
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </a>

            {/* Hamburger (mobile only) */}
            <button
              className="hamburger-btn"
              onClick={() => setMobileMenuOpen(o => !o)}
              aria-label="Menu"
              style={{
                display: "none",
                background: "none", border: "none", cursor: "pointer",
                padding: "6px", borderRadius: 8, color: "#0d1b2a",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {mobileMenuOpen
                  ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                  : <><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/></>
                }
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="mobile-menu" style={{
            background: "#fff", borderTop: "1px solid #e8ecf2",
            padding: "12px 20px 16px",
            display: "flex", flexDirection: "column", gap: 4,
          }}>
            {[{ label: "Accueil", href: "#" }, { label: "Formulaires", href: "#forms" }].map(item => (
              <a key={item.label} href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  fontSize: 15, fontWeight: 600, padding: "10px 12px", borderRadius: 10,
                  color: item.label === "Formulaires" ? "#a8863e" : "#0d1b2a",
                  textDecoration: "none", display: "block",
                  background: item.label === "Formulaires" ? "#fdf6e3" : "transparent",
                }}
              >{item.label}</a>
            ))}
          </div>
        )}
      </nav>

      {/* ══════════════ HERO ══════════════ */}
      <section style={{
        background: "linear-gradient(120deg, #cce8ff 0%, #ddf0fb 25%, #f5e8ff 60%, #fde8d0 100%)",
        overflow: "hidden",
      }}>
        <div className="hero-inner" style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px" }}>

          {/* LEFT */}
          <div className="hero-text animate-fadeUp" style={{ paddingTop: 48, paddingBottom: 48 }}>

            {/* Badges */}
            <div className="hero-badges" style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "#fff", borderRadius: 14, padding: "10px 14px",
                boxShadow: "0 4px 20px rgba(13,27,42,0.10)", border: "1.5px solid #f0e8d0",
              }}>
                <div style={{ color: "#a8863e" }}><IconDoc size={18} /></div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#0d1b2a", lineHeight: 1, fontFamily: "var(--font-serif)" }}>2</div>
                  <div style={{ fontSize: 10, color: "#7a9ab8", marginTop: 2, fontWeight: 500 }}>Formulaires</div>
                </div>
              </div>

              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "#fff", borderRadius: 14, padding: "10px 14px",
                boxShadow: "0 4px 20px rgba(13,27,42,0.10)", border: "1.5px solid #d4eddf",
              }}>
                <div style={{ color: "#2d6a4f" }}><IconShield size={18} /></div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#0d1b2a", lineHeight: 1, fontFamily: "var(--font-serif)" }}>100%</div>
                  <div style={{ fontSize: 10, color: "#7a9ab8", marginTop: 2, fontWeight: 500 }}>Anonymat</div>
                </div>
              </div>

              {fp && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: "#fff", borderRadius: 14, padding: "10px 14px",
                  boxShadow: "0 4px 20px rgba(13,27,42,0.10)", border: "1.5px solid #e8d5a3",
                  minWidth: 0, flex: "1 1 auto",
                }}>
                  <span className="animate-pulse-dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "#c9a84c", flexShrink: 0 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.14em", color: "#7a9ab8", marginBottom: 2, fontWeight: 600 }}>Appareil lié</div>
                    <div style={{ fontFamily: "monospace", fontSize: 11, letterSpacing: "0.08em", color: "#0d1b2a", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fp}</div>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(fp);
                      setCopiedFp(true);
                      setTimeout(() => setCopiedFp(false), 2000);
                    }}
                    style={{
                      fontSize: 10, fontWeight: 700, padding: "5px 11px", borderRadius: 7,
                      background: copiedFp ? "var(--success-bg)" : "#fdf6e3",
                      border: copiedFp ? "1px solid var(--success-border)" : "1px solid #e8d5a3",
                      color: copiedFp ? "var(--success)" : "#a8863e",
                      cursor: "pointer", whiteSpace: "nowrap",
                      transition: "all 0.25s", flexShrink: 0,
                    }}
                  >
                    {copiedFp ? "✓ Copié" : "Copier"}
                  </button>
                </div>
              )}
            </div>

            <h1 className="hero-title" style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400, lineHeight: 1.1,
              color: "#0d1b2a", margin: "0 0 16px 0",
              letterSpacing: "-0.01em",
            }}>
              La meilleure enquête{" "}
              <span style={{ color: "#a8863e", fontStyle: "italic" }}>étudiante</span>{" "}
              pour tous !
            </h1>

            <p style={{ fontSize: 15, lineHeight: 1.75, color: "#3d5166", maxWidth: 420, margin: "0 0 28px 0", fontWeight: 400 }}>
              Participez à notre étude sur le genre, l'inclusion et la vie des étudiants
              à l'Université de Fianarantsoa. Deux formulaires, anonymat total.
            </p>

            {/* Progress bar */}
            <div style={{ marginBottom: 28, maxWidth: 360 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#3d5166" }}>Progression</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: doneCount === 2 ? "var(--success)" : "#a8863e" }}>{doneCount}/2 formulaires</span>
              </div>
              <div style={{ height: 7, borderRadius: 99, background: "rgba(13,27,42,0.1)", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 99,
                  width: `${(doneCount / 2) * 100}%`,
                  background: doneCount === 2 ? "var(--success)" : "linear-gradient(90deg, var(--gold), var(--gold2))",
                  transition: "width 0.8s cubic-bezier(.22,.68,0,1.2)",
                }} />
              </div>
            </div>

            <a href="#forms" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              fontSize: 14, fontWeight: 600, letterSpacing: "0.03em",
              padding: "14px 28px", borderRadius: 99,
              background: "rgba(13,27,42,0.88)", color: "#fff",
              textDecoration: "none",
              boxShadow: "0 4px 20px rgba(13,27,42,0.25)",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 30px rgba(13,27,42,0.35)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(13,27,42,0.25)"; }}
            >
              Commencer les formulaires
              <IconArrowRight size={16} />
            </a>
          </div>

          {/* RIGHT: image */}
          <div className="hero-image-wrap">
            <div style={{ position: "absolute", bottom: 0, left: "5%", width: "95%", height: "100%" }}>
              <Image
                src="/form1.webp"
                alt="Étudiants université"
                fill
                style={{ objectFit: "cover", objectPosition: "center top", borderRadius: "20px 20px 0 0" }}
                sizes="(max-width: 640px) 100vw, 560px"
                priority
              />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(13,27,42,0.10) 0%, transparent 55%)", borderRadius: "20px 20px 0 0" }} />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ STATS BAR ══════════════ */}
      <section style={{
        background: "linear-gradient(135deg, #eef6ff 0%, #f0f7ff 50%, #e8f2fb 100%)",
        borderTop: "1px solid #d0e4f5",
        borderBottom: "1px solid #d0e4f5",
        padding: "22px 20px",
      }}>
        <div className="stats-bar" style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "center", gap: 40, flexWrap: "wrap" }}>
          {[
            { label: "Formulaires", value: 2, suffix: "", icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
              </svg>
            )},
            { label: "Anonymat garanti", value: 100, suffix: "%", icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            )},
            { label: "Minutes estimées", value: 10, suffix: "min", icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            )},
          ].map((stat) => (
            <div key={stat.label} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: "#fff",
                border: "1px solid #c8ddf0",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#3a6ea5",
                boxShadow: "0 2px 8px rgba(58,110,165,0.10)",
                flexShrink: 0,
              }}>
                {stat.icon}
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#1a3a5c", fontFamily: "var(--font-serif)", lineHeight: 1 }}>
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </div>
                <div style={{ fontSize: 10, color: "#5a7fa0", marginTop: 3, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase" }}>
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════ ABOUT ══════════════ */}
      <section style={{ background: "#fff", padding: "56px 20px" }}>
        <div
          ref={aboutReveal.ref}
          className="about-inner"
          style={{
            maxWidth: 1100, margin: "0 auto",
            opacity: aboutReveal.visible ? 1 : 0,
            transform: aboutReveal.visible ? "none" : "translateY(24px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
        >
          <div className="about-image-wrap">
            <Image
              src="/form2.webp"
              alt="Étudiant à l'université"
              fill
              style={{ objectFit: "cover", objectPosition: "center top" }}
              sizes="(max-width: 640px) 100vw, 480px"
            />
            <div style={{ position: "absolute", bottom: 0, left: 0, background: "#fff", padding: "14px 20px", borderTop: "3px solid #c9a84c" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#a8863e", fontFamily: "var(--font-serif)" }}>~10 min</div>
              <div style={{ fontSize: 12, color: "#3d5166", marginTop: 2, fontWeight: 500 }}>Durée estimée</div>
            </div>
          </div>

          <div className="about-text">
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--gold-bg)", border: "1px solid var(--gold-border)", borderRadius: 99, padding: "5px 14px", marginBottom: 16 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--gold)", display: "inline-block" }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--gold-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>À propos</span>
            </div>

            <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 400, color: "#0d1b2a", lineHeight: 1.15, margin: "0 0 14px 0", letterSpacing: "-0.01em" }}>
              Participez, contribuez & faites avancer la recherche.
            </h2>
            <p style={{ fontSize: 14, color: "#3d5166", lineHeight: 1.75, marginBottom: 28, maxWidth: 480 }}>
              Votre participation aide à mieux comprendre les conditions de vie et d'inclusion
              au sein de l'université, pour un campus plus équitable pour tous.
            </p>

            {[
              { icon: <IconShield size={18} />, title: "Anonymat total garanti", desc: "Aucune donnée nominative n'est collectée. Un identifiant technique anonyme relie vos deux formulaires." },
              { icon: <IconVolunteer size={18} />, title: "Participation entièrement libre", desc: "Vous pouvez interrompre à tout moment. Votre contribution reste précieuse même partielle." },
            ].map((item, i) => (
              <div key={item.title} style={{
                display: "flex", gap: 14, marginBottom: 20,
                opacity: aboutReveal.visible ? 1 : 0,
                transform: aboutReveal.visible ? "none" : "translateX(-16px)",
                transition: `opacity 0.6s ease ${0.2 + i * 0.12}s, transform 0.6s ease ${0.2 + i * 0.12}s`,
              }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, background: "#eef4fa", display: "flex", alignItems: "center", justifyContent: "center", color: "#4a7fa8" }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#0d1b2a", marginBottom: 4 }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: "#3d5166", lineHeight: 1.6 }}>{item.desc}</div>
                </div>
              </div>
            ))}

            <a href="#forms" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              fontSize: 13, fontWeight: 600, letterSpacing: "0.04em",
              padding: "12px 24px", borderRadius: 99,
              background: "rgba(13,27,42,0.06)", color: "#0d1b2a",
              textDecoration: "none", border: "1.5px solid rgba(13,27,42,0.16)",
              transition: "background 0.2s, border-color 0.2s",
            }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(13,27,42,0.12)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(13,27,42,0.06)"}
            >
              Accéder aux formulaires
              <IconArrowRight size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════ MAIN ══════════════ */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 20px" }}>

        {/* All done banner */}
        {allDone && (
          <div className="animate-scaleIn" style={{
            display: "flex", alignItems: "center", gap: 14,
            borderRadius: 16, border: "1.5px solid var(--success-border)",
            padding: "16px 20px", marginBottom: 28,
            background: "linear-gradient(135deg, #e8f4ee, #f4faf7)",
            boxShadow: "0 4px 24px rgba(45,106,79,0.12)",
          }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, background: "var(--success)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <IconCheck size={18} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--success)", fontFamily: "var(--font-serif)" }}>Merci pour votre participation !</div>
              <div style={{ fontSize: 12, color: "#3d7a5f", lineHeight: 1.6, marginTop: 2 }}>Vos deux formulaires ont bien été soumis de façon anonyme.</div>
            </div>
          </div>
        )}

        {/* Progress stepper */}
        <div className="animate-fadeUp stepper" style={{
          display: "flex", alignItems: "center",
          background: "#fff", borderRadius: 16,
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-sm)",
          padding: "16px 20px", marginBottom: 40,
          overflowX: "auto",
          gap: 0,
        }}>
          {[
            { state: sc1, label: "Genre & Inclusion", sub: "Formulaire 1" },
            { state: sc2, label: "Vie des Étudiants", sub: "Formulaire 2" },
            { state: sc3, label: "Participation complète", sub: "Terminé" },
          ].map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, transition: "all 0.5s",
                  ...(s.state === "done"
                    ? { background: "var(--success)", color: "#fff" }
                    : s.state === "active"
                    ? { background: "linear-gradient(135deg, var(--gold), var(--gold2))", color: "var(--navy)" }
                    : { background: "var(--border)", color: "var(--ink3)" }),
                }}>
                  {s.state === "done" ? <IconCheck size={12} /> : i + 1}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="stepper-label" style={{ fontSize: 11, fontWeight: 600, color: s.state === "pending" ? "var(--ink3)" : s.state === "done" ? "var(--success)" : "var(--navy)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.label}</div>
                  <div style={{ fontSize: 9, color: "var(--ink3)" }}>{s.sub}</div>
                </div>
              </div>
              {i < 2 && (
                <div style={{ flex: 1, margin: "0 8px", height: 2, borderRadius: 99, minWidth: 12, background: s.state === "done" ? "var(--success)" : "var(--border)", transition: "background 0.7s" }} />
              )}
            </div>
          ))}
        </div>

        {/* Section heading */}
        <div
          ref={formsReveal.ref}
          style={{
            textAlign: "center", marginBottom: 28,
            opacity: formsReveal.visible ? 1 : 0,
            transform: formsReveal.visible ? "none" : "translateY(16px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}
        >
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 32, fontWeight: 400, color: "#0d1b2a", margin: "0 0 6px 0", letterSpacing: "-0.01em" }}>Les deux formulaires</h2>
          <p style={{ fontSize: 13, color: "#7a9ab8", margin: 0 }}>Remplissez-les sur le même appareil pour assurer la liaison anonyme</p>
        </div>

        {/* Cards */}
        <div id="forms" className="cards-grid animate-fadeUp" style={{ marginBottom: 40 }}>
          <FormCard
            number={1}
            title="Genre & Inclusion"
            description="Ce formulaire porte sur les perceptions et expériences liées au genre, à l'égalité et à l'inclusion au sein de l'université."
            topics={["Égalité de genre", "Inclusion", "Perceptions", "Campus"]}
            imageSrc="/form1.webp"
            imageAlt="Groupe d'étudiants"
            url={u1}
            status={s1}
            disabled={disabled1}
            disabledLabel={configLoaded ? "Lien en cours de configuration" : "Chargement..."}
            onOpen={handleOpenF1}
          />
          <FormCard
            number={2}
            title="Vie des Étudiants"
            description="Ce formulaire explore les conditions de vie, le bien-être et les expériences quotidiennes des étudiants à l'université."
            topics={["Bien-être", "Logement", "Vie sociale", "Parcours"]}
            imageSrc="/form2.webp"
            imageAlt="Bibliothèque universitaire"
            url={u2}
            status={s2}
            disabled={disabled2}
            disabledLabel={configLoaded ? "Lien en cours de configuration" : "Chargement..."}
            onOpen={handleOpenF2}
          />
        </div>

        {/* Divider */}
        <div className="hr-ornament" style={{ margin: "36px 0", color: "var(--ink3)" }}>
          <IconStar size={10} />
        </div>

        {/* Info tiles */}
        <div
          ref={tilesReveal.ref}
          className="tiles-grid"
        >
          {[
            { icon: <IconShield size={18} />, title: "Données protégées", body: "Aucune donnée nominative n'est enregistrée. Liaison par empreinte technique uniquement.", color: "#a8863e", bg: "#fdf6e3", delay: 0 },
            { icon: <IconPhone size={18} />, title: "Même appareil requis", body: "Utilisez le même téléphone ou ordinateur pour assurer la correspondance des formulaires.", color: "#4a7fa8", bg: "#eef4fa", delay: 0.1 },
            { icon: <IconVolunteer size={18} />, title: "Participation volontaire", body: "Votre participation est entièrement libre. Vous pouvez interrompre à tout moment.", color: "#2d6a4f", bg: "#e8f4ee", delay: 0.2 },
          ].map((tile) => (
            <div
              key={tile.title}
              className="card-hover"
              style={{
                borderRadius: 16, padding: "20px",
                background: "#fff", border: "1.5px solid var(--border)",
                boxShadow: "var(--shadow-sm)",
                opacity: tilesReveal.visible ? 1 : 0,
                transform: tilesReveal.visible ? "none" : "translateY(20px)",
                transition: `opacity 0.6s ease ${tile.delay}s, transform 0.6s ease ${tile.delay}s, box-shadow 0.3s ease`,
              }}
            >
              <div style={{ width: 42, height: 42, borderRadius: 11, background: tile.bg, color: tile.color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                {tile.icon}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0d1b2a", marginBottom: 6 }}>{tile.title}</div>
              <p style={{ fontSize: 12, color: "#3d5166", lineHeight: 1.65, margin: 0 }}>{tile.body}</p>
            </div>
          ))}
        </div>
      </main>

      {/* ══════════════ FOOTER ══════════════ */}
      <footer style={{ marginTop: 48, borderTop: "1px solid #d0e4f5", background: "linear-gradient(135deg, #eef6ff 0%, #f0f7ff 100%)", padding: "32px 20px", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ color: "#c9a84c" }}><IconDiploma size={22} /></span>
          <span style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--font-serif)", letterSpacing: "0.03em", color: "#1a2e44" }}>
            Université de Fianarantsoa
          </span>
        </div>
        <p style={{ fontSize: 11, color: "#5a7fa0", margin: 0, letterSpacing: "0.03em" }}>
          Enquête confidentielle · Traitement éthique des données de recherche
        </p>
      </footer>

      {/* ══════════════ RESPONSIVE STYLES ══════════════ */}
      <style>{`
        /* ── Desktop layout ── */
        .hero-inner { display:flex; align-items:center; min-height:540px; gap:48px; }
        .hero-text { flex:0 0 50%; }
        .hero-title { font-size:52px; }
        .hero-image-wrap { flex:0 0 50%; position:relative; height:480px; align-self:stretch; }
        .about-inner { display:flex; align-items:center; gap:56px; }
        .about-image-wrap { flex:0 0 42%; position:relative; height:420px; border-radius:20px; overflow:hidden; }
        .about-text { flex:1; }
        .about-text h2 { font-size:38px; }
        .cards-grid { display:grid; grid-template-columns:1fr 1fr; gap:28px; }
        .tiles-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; }
        .nav-links-desktop { display:flex; }
        .hamburger-btn { display:none !important; }
        .nav-cta-btn { display:inline-flex; }

        /* ── Tablet ── */
        @media (max-width:960px) {
          .hero-title { font-size:40px; }
          .hero-inner { min-height:440px; gap:28px; }
          .about-text h2 { font-size:30px; }
          .about-inner { gap:32px; }
          .about-image-wrap { height:340px; flex:0 0 40%; }
          .tiles-grid { grid-template-columns:1fr 1fr; }
          .stats-bar { gap:28px; }
        }

        /* ── Mobile ── */
        @media (max-width:640px) {
          /* Nav */
          .nav-links-desktop { display:none !important; }
          .hamburger-btn { display:flex !important; }
          .nav-cta-btn { display:none !important; }

          /* Hero */
          .hero-inner {
            flex-direction:column;
            min-height:unset;
            padding-top:28px;
            padding-bottom:0;
            gap:0;
          }
          .hero-text {
            flex:unset;
            width:100%;
            padding-top:0 !important;
            padding-bottom:28px !important;
          }
          .hero-title { font-size:28px !important; }
          .hero-image-wrap {
            flex:unset;
            width:calc(100% + 40px);
            margin-left:-20px;
            height:200px !important;
            align-self:unset;
          }
          .hero-badges { gap:8px; }

          /* About */
          .about-inner { flex-direction:column; gap:0; }
          .about-image-wrap {
            width:100%;
            flex:unset;
            height:220px;
            margin-bottom:28px;
            border-radius:16px;
          }
          .about-text { width:100%; }
          .about-text h2 { font-size:24px !important; }

          /* Cards */
          .cards-grid { grid-template-columns:1fr; gap:20px; }

          /* Tiles */
          .tiles-grid { grid-template-columns:1fr; gap:14px; }

          /* Stepper */
          .stepper-label { font-size:9px !important; }

          /* Stats */
          .stats-bar { gap:20px; justify-content:flex-start; }
        }

        /* ── Very small (360px) ── */
        @media (max-width:380px) {
          .hero-title { font-size:24px !important; }
          .hero-image-wrap { height:160px !important; }
        }
      `}</style>

      {/* ══════════════ TOAST ══════════════ */}
      <div style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: `translateX(-50%) translateY(${toast.visible ? "0" : "20px"})`,
        opacity: toast.visible ? 1 : 0,
        pointerEvents: toast.visible ? "auto" : "none",
        transition: "opacity 0.4s cubic-bezier(.22,.68,0,1.2), transform 0.4s cubic-bezier(.22,.68,0,1.2)",
        zIndex: 9999,
        minWidth: 300,
        maxWidth: "calc(100vw - 32px)",
        width: "max-content",
      }}>
        <div style={{
          background: toast.form === "all" ? "linear-gradient(135deg, #1a3d2b 0%, #2d6a4f 100%)" : "linear-gradient(135deg, #0d1b2a 0%, #1a2e44 100%)",
          borderRadius: 18,
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          boxShadow: toast.form === "all"
            ? "0 12px 48px rgba(45,106,79,0.45), 0 4px 16px rgba(45,106,79,0.25)"
            : "0 12px 48px rgba(13,27,42,0.45), 0 4px 16px rgba(13,27,42,0.25)",
          border: toast.form === "all" ? "1px solid rgba(183,221,200,0.3)" : "1px solid rgba(201,168,76,0.3)",
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
            background: toast.form === "all" ? "rgba(255,255,255,0.15)" : "rgba(201,168,76,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {toast.form === "all" ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#b7ddc8" }}>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#c9a84c" }}>
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            )}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "var(--font-serif)", marginBottom: 3, letterSpacing: "-0.01em" }}>
              {toast.form === "all" ? "Merci pour votre participation !" : `Formulaire ${toast.form} enregistré !`}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.72)", lineHeight: 1.5 }}>
              {toast.form === "all"
                ? "Vos deux réponses ont été soumises anonymement."
                : "Merci ! Pensez à remplir le deuxième formulaire."}
            </div>
          </div>
          <button
            onClick={() => setToast(t => ({ ...t, visible: false }))}
            style={{
              flexShrink: 0, marginLeft: "auto",
              background: "rgba(255,255,255,0.12)",
              border: "none", borderRadius: 8,
              width: 28, height: 28,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "rgba(255,255,255,0.7)",
              fontSize: 18, lineHeight: 1,
              transition: "background 0.2s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.22)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
          >
            ×
          </button>
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, borderRadius: "0 0 18px 18px", overflow: "hidden" }}>
          <div style={{
            height: "100%",
            background: toast.form === "all" ? "rgba(183,221,200,0.6)" : "rgba(201,168,76,0.6)",
            animation: toast.visible ? "toastProgress 5s linear forwards" : "none",
          }} />
        </div>
      </div>

      <style>{`
        @keyframes toastProgress {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
}
