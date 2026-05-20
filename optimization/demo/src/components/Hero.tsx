"use client";

export default function Hero() {
  return (
    <div className="relative min-h-[85vh] w-full flex items-center justify-center overflow-hidden">
      {/* Floating shapes (desktop) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
        <div className="absolute left-[-5%] top-[20%] animate-float" style={{ animationDelay: "0s" }}>
          <div className="w-[500px] h-[120px] rounded-full bg-gradient-to-r from-[hsl(var(--accent)/0.12)] to-transparent border border-white/[0.06]" />
        </div>
        <div className="absolute right-[0%] top-[70%] animate-float" style={{ animationDelay: "2s" }}>
          <div className="w-[400px] h-[100px] rounded-full bg-gradient-to-r from-[hsl(var(--accent)/0.1)] to-transparent border border-white/[0.06]" />
        </div>
        <div className="absolute left-[60%] top-[10%] animate-float" style={{ animationDelay: "4s" }}>
          <div className="w-[300px] h-[80px] rounded-full bg-gradient-to-r from-emerald-500/10 to-transparent border border-white/[0.04]" />
        </div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto text-center px-4">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[hsl(var(--accent)/0.05)] border border-[hsl(var(--accent)/0.1)] mb-8 md:mb-12 animate-fade-up">
          <span className="h-2 w-2 rounded-full bg-[hsl(var(--accent))] animate-pulse" />
          <span className="text-xs md:text-sm font-medium text-[hsl(var(--accent-darker))] uppercase tracking-[0.2em]">
            Portfolio Optimization
          </span>
        </div>

        {/* Title */}
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-black mb-8 tracking-tighter leading-[1.1] animate-fade-up" style={{ animationDelay: "0.1s" }}>
          <span className="bg-clip-text text-transparent bg-gradient-to-b from-[hsl(var(--foreground))] to-[hsl(var(--foreground)/0.7)]">
            HRP Algorithm
          </span>
          <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(var(--accent))] via-[hsl(var(--foreground)/0.9)] to-[hsl(var(--accent)/0.8)]">
            + CVaR Risk
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg md:text-xl text-[hsl(var(--muted-foreground))] mb-12 leading-relaxed font-light tracking-wide max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: "0.2s" }}>
          Интерактивная документация алгоритма оптимизации портфеля — Hierarchical Risk Parity с коррекцией через CVaR и поправкой Халла–Уайта
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up" style={{ animationDelay: "0.3s" }}>
          <a href="#hrp" className="w-full sm:w-auto bg-[hsl(var(--accent))] text-white px-10 py-4 rounded-2xl shadow-xl hover:bg-[hsl(var(--accent)/0.9)] transition-all duration-500 hover:shadow-[rgba(var(--accent-rgb),0.4)] font-bold text-lg hover:-translate-y-1">
            Смотреть алгоритм
          </a>
          <a href="#cvar" className="w-full sm:w-auto bg-[hsl(var(--card)/0.5)] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] px-10 py-4 rounded-2xl shadow-xl hover:bg-[hsl(var(--muted))] transition-all duration-500 font-bold text-lg hover:-translate-y-1">
            CVaR коррекция
          </a>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute inset-0 z-[5] bg-gradient-to-t from-[hsl(var(--background))] via-transparent to-transparent pointer-events-none" />
    </div>
  );
}
