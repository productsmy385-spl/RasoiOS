export function Footer() {
  return (
    <footer className="border-t border-[#38322E] bg-[#24201D] px-6 py-4 text-xs text-gray-400 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
      <div className="flex items-center gap-2 font-mono">
        <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
        <span>RASOIOS Platform v1.0.0 — Operational</span>
      </div>
      <div className="flex items-center gap-4 text-gray-500 font-mono">
        <span>Tenant Context Protected</span>
        <span>•</span>
        <span>PostgreSQL Persistent</span>
      </div>
    </footer>
  );
}
