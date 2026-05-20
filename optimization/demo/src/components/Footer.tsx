export default function Footer() {
  return (
    <footer className="py-12 border-t border-[hsl(var(--border))]">
      <div className="max-w-5xl mx-auto px-4 text-center">
        <p className="text-[hsl(var(--muted-foreground))] text-sm font-light">
          HRP Portfolio Optimization Algorithm Demo
        </p>
        <p className="text-[hsl(var(--muted-foreground)/0.5)] text-xs mt-2">
          Hierarchical Risk Parity · CVaR · Hull–White
        </p>
      </div>
    </footer>
  );
}
