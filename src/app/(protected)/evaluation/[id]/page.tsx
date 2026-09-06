"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Candidate, Evaluation, Recommendation } from "@/lib/types";
import { recommendationColor, score } from "@/lib/utils";
import { ExternalLink, Link as LinkIcon, FileText, Trash2, AlertTriangle } from "lucide-react";

const fields = [
  ["technical_score", "Technical Knowledge"],
  ["public_speaking_score", "Public Speaking"],
  ["projects_score", "Projects"],
  ["overall_score", "Overall"],
] as const;

export default function EvaluationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const sb = useMemo(createClient, []);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [ev, setEv] = useState<Partial<Evaluation>>({});
  const [recommendation, setRecommendation] = useState<Recommendation>("PENDING");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const loadCandidate = async () => {
    const { data } = await sb
      .from("candidates")
      .select("*,candidate_links(*),evaluations(*)")
      .eq("id", id)
      .single();
    if (!data) return router.replace("/candidates");
    const c = data as Candidate;
    setCandidate(c);
    const e = c.evaluations?.[0] ?? {};
    setEv(e);
    setRecommendation(c.recommendation);
  };

  useEffect(() => {
    loadCandidate();
    const channel = sb
      .channel(`evaluation-realtime-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "candidates", filter: `id=eq.${id}` },
        loadCandidate
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "evaluations", filter: `candidate_id=eq.${id}` },
        loadCandidate
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "candidate_links", filter: `candidate_id=eq.${id}` },
        loadCandidate
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [id, router, sb]);

  const final = fields.reduce((sum, [key]) => {
    const val = ev[key];
    return sum + (val !== null && val !== undefined && String(val).trim() !== "" ? Number(val) : 0);
  }, 0) / 4;

  const save = async () => {
    for (const [key] of fields) {
      const val = ev[key];
      if (val === null || val === undefined || String(val).trim() === "") continue;
      const value = Number(val);
      if (!Number.isFinite(value) || value < 0 || value > 10) {
        setNotice("Each score must be between 0.00 and 10.00.");
        return;
      }
    }
    setSaving(true);
    setNotice("");

    try {
      const res = await fetch("/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_id: id,
          technical_score: ev.technical_score,
          public_speaking_score: ev.public_speaking_score,
          projects_score: ev.projects_score,
          overall_score: ev.overall_score,
          general_remarks: ev.general_remarks,
          technical_remarks: ev.technical_remarks,
          interview_remarks: ev.interview_remarks,
          recommendation,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save evaluation");
      }

      setNotice("Evaluation saved successfully. Ranking and score are recalculating.");
      loadCandidate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred";
      setNotice(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCandidate = async () => {
    if (!deletePassword.trim()) {
      setDeleteError("Admin password is required to delete a student.");
      return;
    }
    setIsDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/candidates?id=${id}&password=${encodeURIComponent(deletePassword.trim())}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete student");

      router.replace("/candidates");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete student";
      setDeleteError(msg);
      setIsDeleting(false);
    }
  };

  if (!candidate) return <p className="p-6 font-medium text-[var(--muted)]">Loading candidate…</p>;

  // Extract custom/additional attributes from Excel sheet stored in additional_data
  const rawData = candidate.additional_data || {};
  const allAttributes = Object.entries(rawData).filter(
    ([_, val]) => val !== null && val !== undefined && String(val).trim() !== ""
  );

  // Helper to extract value from additional_data if candidate standard column is empty
  const getValue = (primary: string | null, keys: string[]) => {
    if (primary && primary.trim()) return primary.trim();
    const match = Object.entries(rawData).find(([k]) => {
      const norm = k.toLowerCase().replace(/[^a-z0-9]/g, " ").trim();
      return keys.some(
        (target) => norm === target || norm.includes(target)
      );
    });
    return match ? String(match[1] ?? "").trim() : "Not provided";
  };

  const profileDetails = [
    ["Name", candidate.name],
    ["Student ID", getValue(candidate.student_id, ["student id", "studentid", "registration id", "usn", "urn", "prn"])],
    ["Roll number", getValue(candidate.roll_number, ["roll number", "roll no", "roll"])],
    ["Email", getValue(candidate.email, ["email", "email address", "mail"])],
    ["Contact number", getValue(candidate.phone, ["phone", "mobile", "contact"])],
    ["Branch", getValue(candidate.branch, ["branch", "department", "dept", "course"])],
    ["Section", getValue(candidate.section, ["section", "sec"])],
    ["Year / Sem", getValue(candidate.year, ["year", "academic year", "semester", "sem"])],
    ["Domain", getValue(candidate.domain, ["domain", "preferred domain", "applied domain"])],
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <button className="text-sm font-semibold text-[var(--btn-primary-bg)] hover:underline" onClick={() => router.back()}>
          ← Back to candidates
        </button>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="btn btn-ghost text-xs text-rose-500 hover:bg-rose-500/10 flex items-center gap-1.5 border border-rose-500/20"
        >
          <Trash2 size={15} />
          Delete Candidate
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-[var(--heading)]">{candidate.name}</h1>
          <p className="mt-2 font-medium text-[var(--muted)]">
            {[candidate.roll_number, candidate.student_id, candidate.branch, candidate.section, candidate.domain]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <span className={`badge ${recommendationColor[candidate.recommendation]}`}>
          {candidate.recommendation}
        </span>
      </div>

      <div className="mt-7 grid gap-5 lg:grid-cols-[.95fr_1.05fr]">
        {/* Candidate Profile Panel */}
        <section className="panel p-6 space-y-6 shadow-md">
          <div>
            <h2 className="font-extrabold text-xl border-b border-[var(--line)] pb-3 text-[var(--heading)] tracking-tight">
              Candidate profile
            </h2>
            <dl className="mt-4 grid grid-cols-2 gap-5 text-sm">
              {profileDetails.map(([k, v]) => (
                <div key={k} className="p-2 rounded-lg bg-[var(--btn-ghost-bg)]/40 border border-[var(--line)]/50">
                  <dt className="font-bold text-xs uppercase tracking-wider text-[var(--muted)]">{k}</dt>
                  <dd className={`mt-1 break-all text-sm font-extrabold ${v === "Not provided" ? "text-[var(--muted)] font-medium italic" : "text-[var(--heading)]"}`}>
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Links Section */}
          {candidate.candidate_links && candidate.candidate_links.length > 0 && (
            <div>
              <h3 className="font-extrabold text-xs text-[var(--muted)] uppercase tracking-wider mb-3">
                Candidate Links & Documents
              </h3>
              <div className="flex flex-wrap gap-2">
                {candidate.candidate_links.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost text-xs inline-flex items-center gap-1.5 border border-[var(--line)] text-[var(--btn-primary-bg)] font-bold hover:opacity-80"
                  >
                    <ExternalLink size={13} />
                    <span className="capitalize">{link.link_type}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* All Excel Attributes Section */}
          {allAttributes.length > 0 && (
            <div className="border-t border-[var(--line)] pt-4">
              <h3 className="font-bold text-sm text-[var(--heading)] flex items-center gap-2 mb-3">
                <FileText size={16} className="text-[var(--btn-primary-bg)]" />
                All Excel Sheet Attributes ({allAttributes.length})
              </h3>
              <div className="max-h-96 overflow-y-auto pr-1 space-y-2 text-xs">
                {allAttributes.map(([key, val]) => (
                  <div key={key} className="p-3 rounded-xl border border-[var(--line)] bg-[var(--btn-ghost-bg)] shadow-sm">
                    <span className="font-bold text-[11px] uppercase tracking-wider text-[var(--muted)] block mb-1">{key}</span>
                    <span className="text-[var(--heading)] font-extrabold text-sm block whitespace-pre-wrap break-words">
                      {String(val)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Evaluation Panel */}
        <section className="panel p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-4">
            <h2 className="font-bold text-lg text-[var(--heading)]">Evaluation</h2>
            <div className="text-right">
              <p className="text-xs text-[var(--muted)] font-semibold">CALCULATED SCORE</p>
              <p className="text-2xl font-black text-[var(--btn-primary-bg)]">
                {final.toFixed(2)} <span className="text-sm font-semibold text-[var(--muted)]">/ 10</span>
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {fields.map(([key, label]) => (
              <label key={key} className="text-sm font-semibold text-[var(--heading)]">
                {label}
                <span className="float-right text-xs font-medium text-[var(--muted)]">/ 10.00</span>
                <input
                  className="mt-2"
                  type="number"
                  min="0"
                  max="10"
                  step="any"
                  value={ev[key] ?? ""}
                  onChange={(e) =>
                    setEv({
                      ...ev,
                      [key]: e.target.value === "" ? null : e.target.value,
                    })
                  }
                />
              </label>
            ))}
          </div>
          <label className="mt-5 block text-sm font-semibold text-[var(--heading)]">
            Recommendation
            <select
              className="mt-2"
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value as Recommendation)}
            >
              {(["PENDING", "SELECTED", "GOOD", "BORDERLINE", "REJECTED"] as Recommendation[]).map(
                (x) => (
                  <option key={x}>{x}</option>
                )
              )}
            </select>
          </label>
          {(
            [
              ["general_remarks", "General remarks"],
              ["technical_remarks", "Technical remarks"],
              ["interview_remarks", "Interview remarks"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="mt-5 block text-sm font-semibold text-[var(--heading)]">
              {label}
              <textarea
                className="mt-2 min-h-20"
                value={ev[key] ?? ""}
                onChange={(e) => setEv({ ...ev, [key]: e.target.value })}
              />
            </label>
          ))}
          {notice && (
            <p
              className={`mt-5 rounded-lg p-3 text-sm font-medium ${
                notice.includes("success")
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20"
              }`}
            >
              {notice}
            </p>
          )}
          <button
            disabled={saving}
            onClick={save}
            className="btn btn-primary mt-6 w-full disabled:opacity-60"
          >
            {saving ? "Saving evaluation…" : "Save evaluation"}
          </button>
        </section>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="panel w-full max-w-md p-6 shadow-2xl border border-[var(--line)]">
            <div className="flex items-center gap-3 text-rose-500 mb-3">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-bold text-[var(--heading)]">Delete Candidate</h3>
            </div>
            <p className="text-sm text-[var(--text)]">
              Are you sure you want to delete <strong className="text-[var(--heading)]">{candidate.name}</strong>? This action cannot be undone.
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
                  setShowDeleteModal(false);
                  setDeletePassword("");
                  setDeleteError("");
                }}
                className="btn btn-ghost text-xs text-[var(--muted)] hover:text-[var(--heading)]"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting || !deletePassword.trim()}
                onClick={handleDeleteCandidate}
                className="btn text-xs bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-60 font-bold"
              >
                {isDeleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


