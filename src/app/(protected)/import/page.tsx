"use client";
import { useState } from "react";
import * as XLSX from "xlsx";

export default function Import() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const choose = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const buffer = await f.arrayBuffer();
      const book = XLSX.read(buffer, { type: "array", raw: false });
      
      // Find first sheet that has rows
      let targetSheet = book.SheetNames[0];
      for (const sheetName of book.SheetNames) {
        const sheet = book.Sheets[sheetName];
        if (sheet && XLSX.utils.sheet_to_json(sheet).length > 0) {
          targetSheet = sheetName;
          break;
        }
      }
      
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(book.Sheets[targetSheet], { defval: "", raw: false });
      // Trim keys and values
      const cleaned = rawRows.map((r) => {
        const rowObj: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(r)) {
          const key = k.trim();
          if (key) {
            rowObj[key] = typeof v === "string" ? v.trim() : v;
          }
        }
        return rowObj;
      }).filter((r) => Object.values(r).some((v) => v !== "" && v !== null && v !== undefined));

      setRows(cleaned);
      setMessage("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to read Excel file";
      setMessage(`Error reading file: ${msg}`);
    }
  };

  const submit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const x = await res.json();
      setMessage(
        res.ok
          ? `Import successful: ${x.processed} records processed · ${x.created} new · ${x.updated} updated`
          : x.error || "Import failed"
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Import failed";
      setMessage(`Import error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--heading)]">Import candidate data</h1>
      <p className="mt-2 text-sm font-medium text-[var(--muted)]">
        Upload CSV, XLS, or XLSX. Columns are flexibly mapped and all extra details/attributes are preserved.
      </p>
      <div className="panel mt-7 max-w-3xl p-7 shadow-sm">
        <input type="file" accept=".csv,.xls,.xlsx" onChange={choose} />
        {rows.length > 0 && (
          <>
            <p className="mt-5 text-sm font-semibold text-emerald-600 dark:text-emerald-300">
              Ready to import {rows.length} rows. Detected columns: {Object.keys(rows[0]).join(", ")}
            </p>
            <div className="mt-5 max-h-64 overflow-auto border border-[var(--line)] rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--line)] bg-[var(--table-border)]/20">
                    {Object.keys(rows[0]).slice(0, 6).map((col) => (
                      <th key={col} className="p-2 text-left font-bold text-[var(--heading)]">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i} className="border-b border-[var(--line)]">
                      {Object.keys(rows[0]).slice(0, 6).map((col) => (
                        <td key={col} className="p-2 text-[var(--text)] max-w-[200px] truncate">
                          {String(r[col] ?? "—")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button disabled={loading} onClick={submit} className="btn btn-primary mt-6 disabled:opacity-60">
              {loading ? "Importing candidates..." : "Validate & import"}
            </button>
          </>
        )}
        {message && <p className="mt-5 text-sm font-bold text-[var(--btn-primary-bg)]">{message}</p>}
      </div>
    </div>
  );
}

