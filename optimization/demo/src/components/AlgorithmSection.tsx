"use client";

import StepCard from "./StepCard";
import type { Section } from "@/data/algorithm";

export default function AlgorithmSection({ section, index }: { section: Section; index: number }) {
  return (
    <section id={section.id} className="relative py-24 overflow-hidden">
      {/* Radial gradient bg */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className={`absolute inset-0 bg-gradient-to-br ${section.color} opacity-30`} />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(rgba(var(--accent-rgb), 1) 1px, transparent 1px), linear-gradient(90deg, rgba(var(--accent-rgb), 1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />
      </div>

      <div className="max-w-5xl mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="text-center mb-16 animate-fade-up" style={{ animationDelay: `${index * 0.1}s` }}>
          {section.badge && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[hsl(var(--accent)/0.08)] border border-[hsl(var(--accent)/0.2)] mb-6">
              <span className="h-2 w-2 rounded-full bg-[hsl(var(--accent))] animate-pulse" />
              <span className="text-xs font-black text-[hsl(var(--accent-darker))] uppercase tracking-[0.2em]">
                {section.badge}
              </span>
            </div>
          )}
          <h2 className="text-4xl md:text-6xl font-black pb-2 bg-gradient-to-b from-[hsl(var(--foreground))] to-[hsl(var(--foreground)/0.6)] bg-clip-text text-transparent tracking-tighter leading-[1.1]">
            <span className="text-[hsl(var(--accent-darker))] mr-3">{section.roman}.</span>
            {section.title}
          </h2>
          <div className="h-1.5 w-24 bg-[hsl(var(--accent)/0.3)] mx-auto rounded-full blur-[1px] mt-6" />
        </div>

        {/* Steps */}
        <div className="space-y-6">
          {section.steps.map((step, i) => (
            <StepCard key={step.id} step={step} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
