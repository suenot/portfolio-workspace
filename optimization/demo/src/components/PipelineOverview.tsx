"use client";

const pipelineStages = [
  { label: "Лог-ретёрны", icon: "📊", color: "from-blue-500 to-indigo-500" },
  { label: "Ковариация & Корреляция", icon: "🔢", color: "from-violet-500 to-purple-500" },
  { label: "Дендрограмма", icon: "🌲", color: "from-purple-500 to-pink-500" },
  { label: "Кластеры & Силуэт", icon: "🎯", color: "from-pink-500 to-rose-500" },
  { label: "Квазидиагонализация", icon: "⚡", color: "from-amber-500 to-orange-500" },
  { label: "HRP Веса", icon: "⚖️", color: "from-emerald-500 to-teal-500" },
  { label: "LONG / SHORT", icon: "📈", color: "from-teal-500 to-cyan-500" },
  { label: "CVaR Коррекция", icon: "🛡️", color: "from-cyan-500 to-blue-500" },
];

export default function PipelineOverview() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(var(--accent-rgb),0.06),transparent_60%)]" />
      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <div className="text-center mb-16 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[hsl(var(--accent)/0.08)] border border-[hsl(var(--accent)/0.2)] mb-6">
            <span className="text-xs font-black text-[hsl(var(--accent-darker))] uppercase tracking-[0.2em]">
              Pipeline
            </span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black pb-2 bg-gradient-to-b from-[hsl(var(--foreground))] to-[hsl(var(--foreground)/0.6)] bg-clip-text text-transparent tracking-tighter leading-[1.1]">
            Обзор алгоритма
          </h2>
        </div>

        {/* Pipeline flow */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {pipelineStages.map((stage, i) => (
            <div
              key={i}
              className="animate-fade-up group relative"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <div className="relative glass p-6 rounded-2xl text-center transition-all duration-500 hover:border-[hsl(var(--accent)/0.4)] hover:-translate-y-2 hover:shadow-2xl">
                {/* Number */}
                <div className="absolute -top-3 -right-2 w-7 h-7 rounded-full bg-[hsl(var(--accent))] text-white text-xs font-black flex items-center justify-center shadow-lg">
                  {i + 1}
                </div>
                {/* Icon */}
                <div className="text-3xl mb-3 group-hover:scale-125 transition-transform duration-500">
                  {stage.icon}
                </div>
                {/* Label */}
                <p className="text-sm font-bold text-[hsl(var(--foreground))] leading-tight">
                  {stage.label}
                </p>
                {/* Gradient bar */}
                <div className={`mt-3 h-1 w-full rounded-full bg-gradient-to-r ${stage.color} opacity-30 group-hover:opacity-80 transition-opacity duration-500`} />
              </div>
              {/* Arrow (between cards) */}
              {i < pipelineStages.length - 1 && i % 4 !== 3 && (
                <div className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground)/0.3)] text-xl z-20">
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
