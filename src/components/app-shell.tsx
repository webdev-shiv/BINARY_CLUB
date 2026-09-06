"use client";
import { useEffect } from "react";
import Link from "next/link";
import { LayoutDashboard, Users, Upload, Download, LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/theme-toggle";
const links = [
  ["Dashboard", "/dashboard", LayoutDashboard],
  ["Candidates", "/candidates", Users],
  ["Import data", "/import", Upload],
  ["Exports", "/exports", Download],
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/ensure-profile").catch(() => {});
  }, []);

  const logout = async () => {
    await createClient().auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen md:grid md:grid-cols-[250px_1fr]">
      <aside className="border-r border-[var(--line)] bg-[var(--sidebar-bg)] p-5 flex flex-col justify-between transition-colors">
        <div>
          <Link href="/dashboard" className="mb-9 flex items-center gap-3 group">
            <div className="p-1 rounded-xl bg-white border border-slate-200 shadow-md group-hover:scale-105 transition-transform">
              <img src="/binary-logo.svg" alt="Binary Club Logo" className="h-10 w-10 object-contain" />
            </div>
            <div>
              <div className="text-lg font-black tracking-[.18em] text-[var(--btn-primary-bg)]">BINARY</div>
              <div className="text-lg font-black tracking-[.18em] text-[var(--heading)]">CLUB</div>
              <div className="text-[9px] font-bold tracking-[.20em] text-[var(--muted)]">RECRUITMENT</div>
            </div>
          </Link>

          <nav className="space-y-1">
            {links.map(([label, href, Icon]) => (
              <Link
                key={label}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  path === href
                    ? "bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] font-semibold border border-[var(--nav-active-border)]"
                    : "text-[var(--nav-text)] hover:bg-[var(--nav-hover-bg)]"
                }`}
              >
                <Icon size={17} />
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <button
          onClick={logout}
          className="mt-8 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--muted)] hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
        >
          <LogOut size={17} />
          Logout
        </button>
      </aside>

      <main className="flex flex-col min-h-screen bg-[var(--bg)] transition-colors">
        <header className="flex min-h-16 items-center justify-between border-b border-[var(--line)] bg-[var(--header-bg)] px-5 md:px-8 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-1 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center">
              <img src="/binary-logo.svg" alt="Binary Club Recruitment" className="h-6 w-6 object-contain" />
            </div>
            <div>
              <span className="font-extrabold text-[var(--heading)] text-base tracking-tight">Binary Club Recruitment</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
              <i className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              LIVE · SYNCED
            </div>
          </div>
        </header>

        <div className="p-5 md:p-8 flex-1">{children}</div>
      </main>
    </div>
  );
}


