import type { Candidate, Recommendation } from "./types";

export const recommendationColor: Record<Recommendation, string> = {
  SELECTED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold",
  GOOD: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 font-bold",
  BORDERLINE: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold",
  REJECTED: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-bold",
  PENDING: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30 font-bold",
};

export const score = (value: number | null) =>
  value == null ? "—" : Number(value).toFixed(2);

export function getCandidateDomain(c: Partial<Candidate> & { additional_data?: Record<string, unknown> }): string {
  if (c.domain && c.domain.trim() && c.domain.trim() !== "—") {
    return c.domain.trim();
  }

  const raw = c.additional_data || {};
  if (typeof raw === "object" && raw !== null) {
    const keys = Object.keys(raw);

    // Common domain column name matches
    const domainAliases = [
      "domain", "preferred domain", "applied domain", "interested domain",
      "domain preference", "role", "field", "track", "stack", "chosen domain",
      "preference", "primary domain", "technology", "tech", "area of interest",
      "sub domain", "sub-domain", "department/domain", "domain / track",
      "domain/track", "interest", "specialization", "skills", "domain name",
      "choice", "first choice", "domain 1", "opted domain", "tech domain"
    ];

    // Pass 1: Exact match on normalized column key
    for (const k of keys) {
      const norm = k.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
      if (domainAliases.includes(norm)) {
        const val = raw[k];
        if (val !== null && val !== undefined && String(val).trim() !== "" && String(val).trim() !== "—") {
          return String(val).trim();
        }
      }
    }

    // Pass 2: Substring match
    for (const k of keys) {
      const norm = k.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
      if (
        norm.includes("domain") ||
        norm.includes("track") ||
        norm.includes("role") ||
        norm.includes("field") ||
        norm.includes("preference") ||
        norm.includes("interest") ||
        norm.includes("specialization")
      ) {
        const val = raw[k];
        if (val !== null && val !== undefined && String(val).trim() !== "" && String(val).trim() !== "—") {
          return String(val).trim();
        }
      }
    }
  }

  return "—";
}

export function deduplicateCandidates<T extends Candidate>(candidates: T[]): T[] {
  const seenKeys = new Set<string>();
  const uniqueList: T[] = [];

  for (const c of candidates) {
    const roll = c.roll_number?.trim().toLowerCase();
    const sid = c.student_id?.trim().toLowerCase();
    const email = c.email?.trim().toLowerCase();
    const name = c.name?.trim().toLowerCase();

    let key = "";
    if (roll) key = `roll:${roll}`;
    else if (sid) key = `sid:${sid}`;
    else if (email) key = `email:${email}`;
    else if (name) key = `name:${name}`;
    else key = `id:${c.id}`;

    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueList.push(c);
    }
  }

  return uniqueList;
}


