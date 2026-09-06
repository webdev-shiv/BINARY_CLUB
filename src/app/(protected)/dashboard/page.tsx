"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Candidate } from "@/lib/types";
import { recommendationColor, score, getCandidateDomain, deduplicateCandidates } from "@/lib/utils";

export default function Dashboard() {
  const [data, setData] = useState<Candidate[]>([]);
  const sb = useMemo(createClient, []);

  const load = async () => {
    const { data } = await sb
      .from("candidates")
      .select("id,name,branch,domain,final_score,rank,recommendation,roll_number,student_id,email,additional_data")
      .order("rank", { ascending: true, nullsFirst: false })
      .order("final_score", { ascending: false, nullsFirst: false })
      .limit(1000);
    const raw = (data ?? []) as Candidate[];
    const sorted = [...raw].sort((a, b) => {
      const rA = a.rank ?? Number.MAX_SAFE_INTEGER;
      const rB = b.rank ?? Number.MAX_SAFE_INTEGER;
      if (rA !== rB) return rA - rB;
      const sA = a.final_score ?? -1;
      const sB = b.final_score ?? -1;
      if (sA !== sB) return sB - sA;
      return a.name.localeCompare(b.name);
    });
    setData(deduplicateCandidates(sorted));
  };

  useEffect(() => {
    load();
    const c = sb
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "candidates" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "evaluations" }, load)
      .subscribe();
    return () => {
      sb.removeChannel(c);
    };
  }, [sb]);

  const count = (x: string) =>
    x === "TOTAL" ? data.length : data.filter((c) => c.recommendation === x).length;

  const avg =
    data.filter((c) => c.final_score != null).reduce((a, c) => a + (c.final_score || 0), 0) /
    (data.filter((c) => c.final_score != null).length || 1);

  const statCards: [string, string | number, string][] = [
    ["Total candidates", count("TOTAL"), "text-[var(--heading)]"],
    ["Selected", count("SELECTED"), "text-emerald-600 dark:text-emerald-400"],
    ["Good", count("GOOD"), "text-sky-600 dark:text-sky-400"],
    ["Borderline", count("BORDERLINE"), "text-amber-600 dark:text-amber-400"],
    ["Rejected", count("REJECTED"), "text-rose-600 dark:text-rose-400"],
    ["Average score", score(avg), "text-violet-600 dark:text-violet-400"],
  ];

  return (
    <div>
      <p className="text-sm font-semibold text-[var(--btn-primary-bg)]">Good morning</p>
      <h1 className="mt-1 text-3xl font-bold text-[var(--heading)]">Recruitment at a glance</h1>
      <p className="mt-2 text-sm font-medium text-[var(--muted)]">
        Live results from your shared evaluation workspace. Showing {data.length} unique candidates.
      </p>

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {statCards.map(([label, value, color]) => (
          <div className="panel p-5 shadow-sm" key={String(label)}>
            <p className="text-sm font-semibold text-[var(--muted)]">{label}</p>
            <p className={`mt-2 text-3xl font-extrabold ${color}`}>{value}</p>
          </div>
        ))}
      </section>

      <section className="panel mt-7 overflow-x-auto shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-[var(--line)]">
          <div>
            <h2 className="font-bold text-lg text-[var(--heading)]">Top candidates</h2>
            <p className="mt-1 text-sm font-medium text-[var(--muted)]">Current ranking, updated in real time.</p>
          </div>
          <Link className="btn btn-ghost text-sm" href="/candidates">
            View all
          </Link>
        </div>
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Name</th>
              <th>Branch</th>
              <th>Domain</th>
              <th>Score</th>
              <th>Recommendation</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 10).map((c, index) => (
              <tr key={c.id}>
                <td className="font-bold text-[var(--btn-primary-bg)]">#{c.rank ?? (index + 1)}</td>
                <td>
                  <Link className="font-semibold text-[var(--heading)] hover:underline" href={`/candidates/${c.id}`}>
                    {c.name}
                  </Link>
                </td>
                <td className="text-[var(--text)]">{c.branch || "—"}</td>
                <td className="text-[var(--text)] font-medium">{getCandidateDomain(c)}</td>
                <td className="font-bold text-[var(--heading)]">{score(c.final_score)}</td>
                <td>
                  <span className={`badge ${recommendationColor[c.recommendation]}`}>
                    {c.recommendation}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

