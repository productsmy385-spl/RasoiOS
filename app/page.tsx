import Link from "next/link";
import { ShieldCheck, Utensils, Printer, Lock, Server, Cpu } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#1A1715] text-[#F3F4F6] flex flex-col justify-between p-6 md:p-12">
      {/* Header Navigation */}
      <header className="max-w-7xl w-full mx-auto flex items-center justify-between py-4 border-b border-[#38322E]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#D97706] flex items-center justify-center text-white shadow-lg shadow-[#D97706]/30">
            <Utensils className="w-6 h-6" />
          </div>
          <span className="font-display text-2xl font-bold tracking-wide text-[#FBF9F5]">
            RASOI<span className="text-[#D97706]">OS</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs uppercase tracking-widest px-3 py-1.5 rounded-full bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30 font-mono">
            ● Foundation Active
          </span>
          <Link
            href="/sign-in"
            className="px-5 py-2.5 rounded-lg bg-[#D97706] hover:bg-[#B45309] text-white font-medium text-sm transition shadow-lg shadow-[#D97706]/20"
          >
            Staff Portal
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl w-full mx-auto py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#24201D] border border-[#38322E] text-xs font-mono text-[#D97706]">
            <ShieldCheck className="w-4 h-4 text-[#10B981]" />
            Strict Multi-Tenant Security & License Architecture
          </div>

          <h1 className="font-display text-4xl md:text-6xl font-extrabold tracking-tight leading-tight text-[#FBF9F5]">
            Enterprise Operating System for Modern Restaurants.
          </h1>

          <p className="text-lg text-gray-400 max-w-2xl leading-relaxed">
            Built for multi-tenant isolation, real-time kitchen workflow, thermal cloud print queue, POS payment management, and custom restaurant branding.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-4">
            <Link
              href="/r/demo"
              className="px-6 py-3.5 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white font-semibold text-base transition shadow-xl shadow-[#D97706]/25"
            >
              Explore Public Menu
            </Link>
            <Link
              href="/dashboard"
              className="px-6 py-3.5 rounded-xl bg-[#24201D] hover:bg-[#38322E] border border-[#38322E] text-[#FBF9F5] font-semibold text-base transition"
            >
              Management Console
            </Link>
          </div>
        </div>

        {/* Technical Architecture Cards */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-panel glass-panel-hover p-6 rounded-2xl space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-[#D97706]/10 text-[#D97706]">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-[#FBF9F5]">Server-Side Context Isolation</h3>
            </div>
            <p className="text-sm text-gray-400">
              Client tenantId parameters are never trusted. Auth context is derived from clerk session JWT and mapped in PostgreSQL.
            </p>
          </div>

          <div className="glass-panel glass-panel-hover p-6 rounded-2xl space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-[#10B981]/10 text-[#10B981]">
                <Printer className="w-5 h-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-[#FBF9F5]">Cloud ESC/POS Print Queue</h3>
            </div>
            <p className="text-sm text-gray-400">
              Local thermal print agent polls cloud jobs over secure TLS, delivering KOTs directly to USB/LAN printers.
            </p>
          </div>

          <div className="glass-panel glass-panel-hover p-6 rounded-2xl space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-[#D97706]/10 text-[#D97706]">
                <Server className="w-5 h-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-[#FBF9F5]">Strict RBAC & Audit Logging</h3>
            </div>
            <p className="text-sm text-gray-400">
              6 distinct roles (`SUPER_ADMIN`, `TENANT_ADMIN`, `MANAGER`, `CASHIER`, `KITCHEN`, `WAITER`) with append-only audit trail.
            </p>
          </div>
        </div>
      </section>

      {/* Footer System Status */}
      <footer className="max-w-7xl w-full mx-auto pt-8 border-t border-[#38322E] flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[#D97706]" />
          <span>RASOIOS Platform Architecture — SLICE 01 FOUNDATION</span>
        </div>
        <div>
          <span>Next.js App Router • Prisma PostgreSQL • Clerk Email OTP • Railway</span>
        </div>
      </footer>
    </main>
  );
}
