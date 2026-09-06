"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, ExternalLink, ChevronLeft, ChevronRight, UserPlus, Trash2, AlertTriangle, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Candidate, Recommendation } from "@/lib/types";
import { recommendationColor, score, getCandidateDomain, deduplicateCandidates } from "@/lib/utils";
import { AddStudentModal } from "@/components/add-student-modal";
import { exportCandidatesToExcel } from "@/lib/export-excel";

const tabs: [Recommendation | "ALL", string][] = [
  ["ALL", "All"],
  ["SELECTED", "Selected"],
  ["GOOD", "Good"],
  ["BORDERLINE", "Borderline"],
  ["REJECTED", "Rejected"],
  ["PENDING", "Pending"],
];

const getRollNoOrId = (c: Candidate) => {
  if (c.roll_number && c.roll_number.trim()) return c.roll_number.trim();
  if (c.student_id && c.student_id.trim()) return c.student_id.trim();

  const raw = c.additional_data || {};
  const match = Object.entries(raw).find(([k, v]) => {
    const norm = k.toLowerCase().replace(/[^a-z0-9]/g, " ").trim();
    return (
      (norm.includes("roll") ||
        norm.includes("student id") ||
        norm.includes("studentid") ||
        norm.includes("registration") ||
        norm.includes("reg no") ||
        norm.includes("usn") ||
        norm.includes("urn") ||
        norm.includes("prn")) &&
      v !== null &&
      v !== undefined &&
      String(v).trim() !== ""
    );
  });

  if (match) return String(match[1]).trim();
  if (c.email && c.email.trim()) return c.email.trim();
  return "No Roll No";
};

export function CandidateTable() {
  const [items, setItems] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Recommendation | "ALL">("ALL");
  const [branch, setBranch] = useState("");
  const [section, setSection] = useState("");
  const [domain, setDomain] = useState("");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingCandidate, setDeletingCandidate] = useState<Candidate | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState("");

  const [isClearAllOpen, setIsClearAllOpen] = useState(false);
  const [clearAllPassword, setClearAllPassword] = useState("");
  const [clearAllError, setClearAllError] = useState("");
  const [isClearingAll, setIsClearingAll] = useState(false);

  const supabase = useMemo(createClient, []);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("candidates")
      .select("*, candidate_links(link_type,url)")
      .order("rank", { ascending: true, nullsFirst: false })
      .order("final_score", { ascending: false, nullsFirst: false })
      .limit(1000);

    if (tab !== "ALL") q = q.eq("recommendation", tab);
    if (branch) q = q.eq("branch", branch);
    if (section) q = q.eq("section", section);
    if (search)
      q = q.or(
        `name.ilike.%${search}%,email.ilike.%${search}%,roll_number.ilike.%${search}%,student_id.ilike.%${search}%`
      );

    const { data } = await q;
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

    let unique = deduplicateCandidates(sorted);
    if (domain) {
      unique = unique.filter((x) => getCandidateDomain(x).toLowerCase() === domain.toLowerCase());
    }

    setItems(unique);
    setLoading(false);
  };

  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [search, tab, branch, section, domain]);

  useEffect(() => {
    const channel = supabase
      .channel("candidate-table-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "candidates" }, () => loadRef.current())
      .on("postgres_changes", { event: "*", schema: "public", table: "evaluations" }, () => loadRef.current())
      .on("postgres_changes", { event: "*", schema: "public", table: "candidate_links" }, () => loadRef.current())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleDelete = async () => {
    if (!deletingCandidate) return;
    if (!deletePassword.trim()) {
      setDeleteError("Admin password is required to delete a student.");
      return;
    }
    setIsDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/candidates?id=${deletingCandidate.id}&password=${encodeURIComponent(deletePassword.trim())}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete student");

      setMessage(`Successfully deleted ${deletingCandidate.name}`);
      setDeletingCandidate(null);
      setDeletePassword("");
      load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Deletion failed";
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearAll = async () => {
    if (!clearAllPassword.trim()) {
      setClearAllError("Admin password is required to clear all students.");
      return;
    }
    setIsClearingAll(true);
    setClearAllError("");
    try {
      const res = await fetch(`/api/candidates?all=true&password=${encodeURIComponent(clearAllPassword.trim())}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to clear candidates");

      setMessage("All candidates have been successfully deleted.");
      setIsClearAllOpen(false);
      setClearAllPassword("");
      load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Clear all failed";
      setClearAllError(msg);
    } finally {
      setIsClearingAll(false);
    }
  };

  const options = (key: "branch" | "section" | "domain") => {
    if (key === "domain") {
      return [...new Set(items.map((x) => getCandidateDomain(x)).filter((v) => v && v !== "—"))];
    }
    return [...new Set(items.map((x) => x[key]).filter(Boolean))] as string[];
  };

  const count = (r: string) =>
    r === "ALL" ? items.length : items.filter((x) => x.recommendation === r).length;

  return (
    <div>
      {/* Page Header with Add & Import Actions */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-bold text-[var(--heading)]">Candidates</h1>
          <p className="mt-1 text-sm font-medium text-[var(--muted)]">
            Review, compare, and evaluate applications. Showing {items.length} unique candidates.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsClearAllOpen(true)}
            className="btn text-xs text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 flex items-center gap-1.5 font-bold"
            title="Delete all candidates from database"
          >
            <Trash2 size={15} />
            Clear All Candidates
          </button>
          <button
            onClick={() => exportCandidatesToExcel(items)}
            className="btn btn-ghost border border-[var(--line)] flex items-center gap-2 text-sm text-[var(--heading)] hover:bg-[var(--btn-ghost-bg)]"
            title="Export all candidates with marks and attributes into one Excel file"
          >
            <Download size={16} />
            Export Excel
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn btn-primary flex items-center gap-2 text-sm border-none shadow-sm"
          >
            <UserPlus size={16} />
            Add Student
          </button>
          <Link href="/import" className="btn btn-ghost border border-[var(--line)] text-center text-sm">
            Import candidates
          </Link>
        </div>
      </div>

      {message && (
        <div className="mt-4 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 flex justify-between items-center">
          <span>{message}</span>
          <button onClick={() => setMessage("")} className="text-xs text-[var(--muted)] hover:text-[var(--heading)]">
            Dismiss
          </button>
        </div>
      )}

      {/* Recommendation Tabs */}
      <div className="mt-7 flex gap-2 overflow-x-auto border-b border-[var(--line)]">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${
              tab === id
                ? "border-[var(--btn-primary-bg)] text-[var(--btn-primary-bg)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--heading)]"
            }`}
          >
            {label} <span className="ml-1 text-xs">{count(id)}</span>
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="panel mt-5 p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_repeat(3,160px)]">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none z-10" size={17} />
            <input
              suppressHydrationWarning
              style={{ paddingLeft: "2.75rem" }}
              className="w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, roll no..."
            />
          </div>
          {(
            [
              ["branch", "All branches"],
              ["section", "All sections"],
              ["domain", "All domains"],
            ] as const
          ).map(([key, label]) => (
            <select
              key={key}
              value={{ branch, section, domain }[key]}
              onChange={(e) =>
                ({ branch: setBranch, section: setSection, domain: setDomain }[key])(
                  e.target.value
                )
              }
            >
              <option value="">{label}</option>
              {options(key).map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          ))}
        </div>
      </div>

      {/* Candidate Table */}
      <div className="panel mt-5 overflow-x-auto shadow-sm">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Candidate</th>
              <th>Branch / section</th>
              <th>Domain</th>
              <th>Final score</th>
              <th>Recommendation</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[var(--muted)] font-medium">
                  Loading candidates…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[var(--muted)] font-medium">
                  No candidates match these filters.
                </td>
              </tr>
            ) : (
              items.map((c, index) => (
                <tr key={c.id}>
                  <td className="font-bold text-[var(--btn-primary-bg)]">#{c.rank ?? (index + 1)}</td>
                  <td>
                    <div className="font-bold text-[var(--heading)]">{c.name}</div>
                    <div className="text-xs font-semibold text-[var(--muted)]">
                      {getRollNoOrId(c)}
                    </div>
                  </td>
                  <td className="text-[var(--text)]">
                    {c.branch || "—"}
                    <span className="text-[var(--muted)]"> {c.section && `· ${c.section}`}</span>
                  </td>
                  <td className="text-[var(--text)] font-medium">{getCandidateDomain(c)}</td>
                  <td className="font-bold text-[var(--heading)]">{score(c.final_score)}</td>
                  <td>
                    <span className={`badge ${recommendationColor[c.recommendation]}`}>
                      {c.recommendation}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Link className="btn btn-ghost text-xs" href={`/candidates/${c.id}`}>
                        View
                      </Link>
                      <Link className="btn btn-primary text-xs" href={`/evaluation/${c.id}`}>
                        Evaluate
                      </Link>
                      {c.candidate_links?.find((l) => l.link_type === "linkedin") && (
                        <a
                          className="p-2 text-[var(--btn-primary-bg)] hover:opacity-80"
                          href={c.candidate_links.find((l) => l.link_type === "linkedin")?.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink size={16} />
                        </a>
                      )}
                      <button
                        onClick={() => setDeletingCandidate(c)}
                        title="Delete Student"
                        className="rounded-lg p-2 text-rose-500 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between p-4 text-sm font-medium text-[var(--muted)]">
          <span>Showing {items.length} unique matching candidates</span>
          <div className="flex gap-2">
            <button className="btn btn-ghost p-2">
              <ChevronLeft size={16} />
            </button>
            <button className="btn btn-ghost p-2">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Add Student Modal */}
      <AddStudentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setMessage("New student added successfully!");
          load();
        }}
      />

      {/* Delete Confirmation Modal */}
      {deletingCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="panel w-full max-w-md p-6 shadow-2xl border border-[var(--line)]">
            <div className="flex items-center gap-3 text-rose-500 mb-3">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-bold text-[var(--heading)]">Delete Candidate</h3>
            </div>
            <p className="text-sm text-[var(--text)]">
              Are you sure you want to delete student <strong className="text-[var(--heading)]">{deletingCandidate.name}</strong>?
              This action cannot be undone.
            </p>

            {deleteError && (
              <div className="mt-3 rounded-lg bg-rose-500/10 p-3 text-xs font-semibold text-rose-700 dark:text-rose-300 border border-rose-500/20">
                {deleteError}
              </div>
            )}

            <div className="mt-4">
              <label className="block text-xs font-bold text-rose-500">
                Enter Admin Password to Confirm <span className="text-rose-500">*</span>
              </label>
              <input
                suppressHydrationWarning
                className="mt-1 w-full text-sm font-mono border-rose-500/40"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter admin password"
                required
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                disabled={isDeleting}
                onClick={() => {
                  setDeletingCandidate(null);
                  setDeletePassword("");
                  setDeleteError("");
                }}
                className="btn btn-ghost text-xs text-[var(--muted)] hover:text-[var(--heading)]"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting || !deletePassword.trim()}
                onClick={handleDelete}
                className="btn text-xs bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-60 font-bold"
              >
                {isDeleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Candidates Confirmation Modal */}
      {isClearAllOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="panel w-full max-w-md p-6 shadow-2xl border border-[var(--line)]">
            <div className="flex items-center gap-3 text-rose-500 mb-3">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-bold text-[var(--heading)]">Clear All Candidates</h3>
            </div>
            <p className="text-sm text-[var(--text)]">
              Are you sure you want to delete <strong className="text-rose-500 font-bold">ALL candidate details</strong>?
              This will wipe out all candidate records, scores, and evaluations. This action cannot be undone.
            </p>

            {clearAllError && (
              <div className="mt-3 rounded-lg bg-rose-500/10 p-3 text-xs font-semibold text-rose-700 dark:text-rose-300 border border-rose-500/20">
                {clearAllError}
              </div>
            )}

            <div className="mt-4">
              <label className="block text-xs font-bold text-rose-500">
                Enter Admin Password to Confirm <span className="text-rose-500">*</span>
              </label>
              <input
                suppressHydrationWarning
                className="mt-1 w-full text-sm font-mono border-rose-500/40"
                type="password"
                value={clearAllPassword}
                onChange={(e) => setClearAllPassword(e.target.value)}
                placeholder="Enter admin password"
                required
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                disabled={isClearingAll}
                onClick={() => {
                  setIsClearAllOpen(false);
                  setClearAllPassword("");
                  setClearAllError("");
                }}
                className="btn btn-ghost text-xs text-[var(--muted)] hover:text-[var(--heading)]"
              >
                Cancel
              </button>
              <button
                disabled={isClearingAll || !clearAllPassword.trim()}
                onClick={handleClearAll}
                className="btn text-xs bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-60 font-bold"
              >
                {isClearingAll ? "Clearing All..." : "Delete All Candidates"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

