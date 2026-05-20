"use client";

import { useState, useEffect } from "react";
import { sections } from "@/data/algorithm";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav className={`fixed w-full top-0 z-50 transition-all duration-500 ${scrolled ? "py-3 bg-[hsl(var(--background)/0.7)] backdrop-blur-xl border-b border-[hsl(var(--border))] shadow-soft" : "py-5 bg-transparent"}`}>
      <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
        {/* Brand */}
        <a href="#" className="group flex items-center gap-3 transition-transform hover:scale-105">
          <div className="relative">
            <div className="absolute inset-0 bg-[hsl(var(--accent)/0.2)] rounded-full blur-md group-hover:bg-[hsl(var(--accent)/0.4)] transition-colors" />
            <div className="relative w-9 h-9 rounded-xl bg-[hsl(var(--accent)/0.1)] flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[hsl(var(--accent-darker))]">
                <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/>
                <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/>
                <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>
              </svg>
            </div>
          </div>
          <span className="text-lg font-black tracking-tighter bg-gradient-to-r from-[hsl(var(--foreground))] to-[hsl(var(--foreground)/0.7)] bg-clip-text text-transparent">
            HRP Optimizer
          </span>
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="text-xs font-black uppercase tracking-widest text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--accent))] transition-colors">
              {s.roman}. {s.title.split(" ").slice(0, 2).join(" ")}
            </a>
          ))}
        </div>

        {/* Mobile menu button */}
        <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-xl hover:bg-[hsl(var(--accent)/0.1)] transition-colors text-[hsl(var(--accent-darker))]" aria-label="Menu">
          {mobileOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-[hsl(var(--background)/0.95)] backdrop-blur-3xl border-t border-[hsl(var(--border))] p-6 flex flex-col gap-3 shadow-2xl">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} onClick={() => setMobileOpen(false)} className="w-full text-center py-3 text-lg font-black uppercase tracking-widest border-b border-[hsl(var(--border)/0.5)]">
              {s.roman}. {s.title}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
}
