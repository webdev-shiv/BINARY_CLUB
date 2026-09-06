"use client";
import { useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, CheckCircle2, Award, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Candidate } from "@/lib/types";
import { exportCandidatesToExcel } from "@/lib/export-excel";

export default function ExportsPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const supabase = useMemo(createClient, []);

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("candidates")
      .select("*, candidate_links(*), evaluations(*)")
      .order("rank", { ascending: true, nullsFirst: false })
      .order("final_score", { ascending: false, nullsFirst: false })
      .limit(5000);

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

    setCandidates(sorted);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [supabase]);

  const handleExport = () => {
    setDownloading(true);
    try {
      exportCandidatesToExcel(candidates, "Binary_Club_Recruitment_Master_Data");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to export data";
      alert(`Export error: ${msg}`);
    } finally {
      setTimeout(() => setDownloading(false), 600);
    }
  };

  const evaluatedCount = candidates.filter((c) => c.evaluations && c.evaluations.length > 0).length;
  const selectedCount = candidates.filter((c) => c.recommendation === "SELECTED").length;

  const totalAttributes = candidates.reduce((acc, c) => {
    const raw = c.additional_data || {};
    return acc + Object.keys(raw).length;
  }, 0);

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--heading)] tracking-tight">
            Export Recruitment Data
          </h1>
          <p className="mt-1.5 text-sm font-medium text-[var(--muted)] max-w-2xl">
            Download a single, complete Master Excel (.xlsx) file containing candidate profiles, marks, evaluation remarks, document links, and all custom Excel sheet attributes.
          </p>
        </div>
        <button
          disabled={loading || candidates.length === 0 || downloading}
          onClick={handleExport}
          className="btn btn-primary flex items-center gap-2.5 px-6 py-3 text-sm shadow-md disabled:opacity-60"
        >
          <FileSpreadsheet size={18} />
          {downloading ? "Generating Excel..." : "Download Master Excel (.xlsx)"}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="panel p-5 shadow-sm">
          <div className="flex items-center gap-3 text-sky-500 mb-2">
            <Download size={20} />
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              Total Candidates
            </span>
          </div>
          <p className="text-3xl font-extrabold text-[var(--heading)]">{candidates.length}</p>
        </div>

        <div className="panel p-5 shadow-sm">
          <div className="flex items-center gap-3 text-emerald-500 mb-2">
            <CheckCircle2 size={20} />
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              Evaluated Candidates
            </span>
          </div>
          <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {evaluatedCount}
          </p>
        </div>

        <div className="panel p-5 shadow-sm">
          <div className="flex items-center gap-3 text-violet-500 mb-2">
            <Award size={20} />
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              Selected Students
            </span>
          </div>
          <p className="text-3xl font-extrabold text-violet-600 dark:text-violet-400">
            {selectedCount}
          </p>
        </div>

        <div className="panel p-5 shadow-sm">
          <div className="flex items-center gap-3 text-amber-500 mb-2">
            <FileText size={20} />
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              Attributes Included
            </span>
          </div>
          <p className="text-3xl font-extrabold text-[var(--heading)]">
            {candidates.length > 0 ? "All Custom Columns" : 0}
          </p>
        </div>
      </div>

      {/* Export Columns Preview Panel */}
      <div className="panel p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-4">
          <h2 className="font-extrabold text-lg text-[var(--heading)] flex items-center gap-2">
            <FileSpreadsheet size={20} className="text-[var(--btn-primary-bg)]" />
            Excel Export Structure Preview
          </h2>
          <span className="text-xs font-semibold text-[var(--muted)]">
            Single Sheet (.xlsx) format
          </span>
        </div>

        <p className="text-sm font-medium text-[var(--text)]">
          The generated Excel file packages all standard candidate info, evaluation marks, remarks, links, and all custom Excel sheet attributes into one consolidated spreadsheet:
        </p>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 text-xs">
          {[
            "Rank",
            "Candidate Name",
            "Roll Number",
            "Student ID",
            "Email Address",
            "Phone / Contact",
            "Branch / Dept",
            "Section",
            "Year / Semester",
            "Domain / Track",
            "Technical Score (/10)",
            "Public Speaking Score (/10)",
            "Projects Score (/10)",
            "Overall Score (/10)",
            "Calculated Final Score",
            "Recommendation Status",
            "General Remarks",
            "Technical Remarks",
            "Interview Remarks",
            "Candidate Links & Docs",
            "+ All Original Sheet Attributes",
          ].map((col) => (
            <div
              key={col}
              className="p-3 rounded-xl bg-[var(--btn-ghost-bg)] border border-[var(--line)] font-semibold text-[var(--heading)] flex items-center gap-2"
            >
              <i className="h-2 w-2 rounded-full bg-[var(--btn-primary-bg)]" />
              <span>{col}</span>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-[var(--line)] flex justify-end">
          <button
            disabled={loading || candidates.length === 0 || downloading}
            onClick={handleExport}
            className="btn btn-primary flex items-center gap-2 text-sm disabled:opacity-60"
          >
            <Download size={16} />
            {downloading ? "Exporting..." : "Export All Candidates"}
          </button>
        </div>
      </div>
    </div>
  );
}
