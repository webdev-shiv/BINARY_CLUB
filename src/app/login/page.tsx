"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function Login() {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Send credentials to auth route for pre-processing / admin seeding
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: usernameOrEmail, password }),
      });
      const data = await res.json();

      const targetEmail = data.email || (usernameOrEmail.includes("@") ? usernameOrEmail : `${usernameOrEmail}@binaryclub.org`);
      const targetPassword = data.password || password;

      // Sign in with Supabase client
      const { error: authErr } = await createClient().auth.signInWithPassword({
        email: targetEmail,
        password: targetPassword,
      });

      if (authErr) {
        setError(authErr.message || "Invalid username/email or password. Please try again.");
      } else {
        router.replace("/dashboard");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign in failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--bg)] md:grid md:grid-cols-2">
      <section className="flex min-h-[42vh] flex-col justify-between bg-[var(--sidebar-bg)] p-8 md:min-h-screen md:p-14 border-r border-[var(--line)]">
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-2xl bg-white border border-slate-200 shadow-lg flex items-center justify-center">
            <img src="/binary-logo.svg" alt="Binary Club Logo" className="h-14 w-14 object-contain" />
          </div>
          <div>
            <div className="text-3xl font-black tracking-[.22em] text-[var(--btn-primary-bg)]">BINARY</div>
            <div className="text-3xl font-black tracking-[.22em] text-[var(--heading)]">CLUB</div>
            <div className="mt-1 text-xs font-bold tracking-[.24em] text-[var(--muted)]">RECRUITMENT</div>
          </div>
        </div>
        <div>
          <p className="max-w-md text-3xl font-bold leading-tight text-[var(--heading)]">
            Build a stronger club, one exceptional candidate at a time.
          </p>
          <p className="mt-4 max-w-sm font-medium text-[var(--muted)]">
            A focused workspace for fair, fast, and collaborative recruitment.
          </p>
        </div>
        <p className="text-xs font-medium text-[var(--muted)]">Secure access for authorized Binary Club members</p>
      </section>

      <section className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="panel w-full max-w-md p-7 shadow-xl">
          <h1 className="text-2xl font-bold text-[var(--heading)]">Welcome back</h1>
          <p className="mt-2 text-sm font-medium text-[var(--muted)]">Sign in to your recruitment workspace.</p>

          <label className="mt-7 block text-sm font-semibold text-[var(--heading)]">
            Username or Email
            <div className="relative mt-2">
              <input
                className="pl-9"
                type="text"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                required
                placeholder="shivamgupta or email@binaryclub.org"
              />
              <User size={16} className="absolute left-3 top-3.5 text-[var(--muted)]" />
            </div>
          </label>

          <label className="mt-5 block text-sm font-semibold text-[var(--heading)]">
            Password
            <div className="relative mt-2">
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-3 text-[var(--muted)] hover:text-[var(--heading)]"
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {error && (
            <p className="mt-4 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300 border border-rose-500/20 font-medium">
              {error}
            </p>
          )}

          <button
            disabled={loading}
            className="btn btn-primary mt-7 flex w-full items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign In"}
            <ArrowRight size={17} />
          </button>
        </form>
      </section>
    </main>
  );
}

