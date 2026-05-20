"use client";

import Math from "./Math";
import type { Step } from "@/data/algorithm";

export default function StepCard({ step, index }: { step: Step; index: number }) {
  return (
    <div
      className="step-card animate-fade-up group relative"
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      {/* Glow */}
      <div className="absolute inset-0 rounded-3xl bg-[hsl(var(--accent)/0.05)] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div
        className={`relative glass p-8 rounded-3xl transition-all duration-500 hover:border-[hsl(var(--accent)/0.4)] hover:shadow-2xl hover:shadow-[rgba(var(--accent-rgb),0.05)] ${
          step.highlight
            ? "border-amber-500/30 bg-amber-500/5"
            : ""
        }`}
      >
        {/* Step number */}
        <div className="flex items-start gap-4 mb-6">
          <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent-darker))] font-black text-sm group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
            {step.number}
          </div>
          <h3 className="text-xl font-bold text-[hsl(var(--foreground))] tracking-tight group-hover:text-[hsl(var(--accent-darker))] transition-colors duration-500 pt-1">
            {step.title}
          </h3>
        </div>

        {/* Description */}
        <p className="text-[hsl(var(--muted-foreground))] leading-relaxed text-base font-light mb-6">
          {step.description}
        </p>

        {/* Formulas */}
        {step.formulas.length > 0 && (
          <div className="space-y-4">
            {step.formulas.map((f, i) => (
              <div
                key={i}
                className="rounded-2xl bg-[hsl(var(--background))] border border-[hsl(var(--border))] px-6 py-4 overflow-x-auto"
              >
                <Math tex={f.tex} display />
                {f.label && (
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2 text-center italic">
                    {f.label}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Notes */}
        {step.notes && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-200/80 text-sm font-medium">
            {step.notes}
          </div>
        )}

        {/* Corner accent */}
        <div className="absolute bottom-4 right-4 h-10 w-10 border-b-2 border-r-2 border-[hsl(var(--accent)/0.15)] rounded-br-2xl group-hover:border-[hsl(var(--accent)/0.4)] transition-colors duration-500" />
      </div>
    </div>
  );
}
