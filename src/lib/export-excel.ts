import * as XLSX from "xlsx";
import type { Candidate, Evaluation } from "@/lib/types";
import { getCandidateDomain } from "@/lib/utils";

export function exportCandidatesToExcel(candidates: Candidate[], filenamePrefix = "Binary_Club_Recruitment_Data") {
  if (!candidates || candidates.length === 0) {
    alert("No candidates available to export.");
    return;
  }

  // 1. Collect all distinct custom key names from candidate additional_data across all rows
  const customKeySet = new Set<string>();
  for (const c of candidates) {
    const raw = c.additional_data || {};
    for (const key of Object.keys(raw)) {
      if (key && key.trim()) {
        customKeySet.add(key.trim());
      }
    }
  }
  const customKeys = Array.from(customKeySet);

  // 2. Build flat objects for SheetJS json_to_sheet
  const exportRows = candidates.map((c, index) => {
    const ev = (c.evaluations?.[0] || {}) as Partial<Evaluation>;
    const raw = c.additional_data || {};

    // Standard core fields
    const row: Record<string, unknown> = {
      "Rank": c.rank ? `#${c.rank}` : `#${index + 1}`,
      "Candidate Name": c.name || "—",
      "Roll Number": c.roll_number || raw["Roll No."] || raw["Roll Number"] || raw["Roll"] || "—",
      "Student ID": c.student_id || raw["Student ID"] || raw["Registration ID"] || "—",
      "Email": c.email || raw["Email"] || raw["Email Address"] || "—",
      "Phone / Contact": c.phone || raw["Mobile No"] || raw["Contact"] || "—",
      "Branch / Dept": c.branch || raw["Branch"] || raw["Department"] || "—",
      "Section": c.section || raw["Section"] || "—",
      "Year / Semester": c.year || raw["Year"] || "—",
      "Domain / Track": getCandidateDomain(c),

      // Evaluation Marks & Scores
      "Technical Knowledge Score (/10)": ev.technical_score ?? "Not evaluated",
      "Public Speaking Score (/10)": ev.public_speaking_score ?? "Not evaluated",
      "Projects Score (/10)": ev.projects_score ?? "Not evaluated",
      "Overall Score (/10)": ev.overall_score ?? "Not evaluated",
      "Calculated Final Score (/10)": c.final_score != null ? Number(c.final_score).toFixed(2) : "Not evaluated",
      "Recommendation": c.recommendation || "PENDING",

      // Evaluation Remarks
      "General Remarks": ev.general_remarks || "—",
      "Technical Remarks": ev.technical_remarks || "—",
      "Interview Remarks": ev.interview_remarks || "—",

      // Document Links
      "Candidate Links": c.candidate_links && c.candidate_links.length > 0
        ? c.candidate_links.map((l) => `${l.link_type}: ${l.url}`).join(" | ")
        : "—",
    };

    // Append all dynamic original Excel sheet attributes
    for (const key of customKeys) {
      if (!(key in row)) {
        row[`[Excel] ${key}`] = raw[key] !== undefined && raw[key] !== null && String(raw[key]).trim() !== ""
          ? String(raw[key]).trim()
          : "—";
      }
    }

    return row;
  });

  // 3. Generate Workbook & Trigger Download
  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Candidates Evaluation Data");

  // Auto-fit column widths
  const colWidths = Object.keys(exportRows[0] || {}).map((key) => {
    const maxLen = Math.max(
      key.length,
      ...exportRows.map((r) => String(r[key] ?? "").length)
    );
    return { wch: Math.min(Math.max(maxLen + 2, 12), 50) };
  });
  worksheet["!cols"] = colWidths;

  const dateStr = new Date().toISOString().split("T")[0];
  XLSX.writeFile(workbook, `${filenamePrefix}_${dateStr}.xlsx`);
}
