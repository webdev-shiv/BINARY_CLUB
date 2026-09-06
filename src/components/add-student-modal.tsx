"use client";
import { useState } from "react";
import { X, UserPlus, AlertCircle } from "lucide-react";

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddStudentModal({ isOpen, onClose, onSuccess }: AddStudentModalProps) {
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [branch, setBranch] = useState("");
  const [section, setSection] = useState("");
  const [year, setYear] = useState("");
  const [domain, setDomain] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Student full name is required.");
      return;
    }

    if (!adminPassword.trim()) {
      setError("Admin password is required to add a student.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          student_id: studentId.trim() || null,
          roll_number: rollNumber.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          branch: branch.trim() || null,
          section: section.trim() || null,
          year: year.trim() || null,
          domain: domain.trim() || null,
          adminPassword: adminPassword.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add student");
      }

      // Reset form
      setName("");
      setStudentId("");
      setRollNumber("");
      setEmail("");
      setPhone("");
      setBranch("");
      setSection("");
      setYear("");
      setDomain("");
      setAdminPassword("");

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="panel w-full max-w-xl p-6 shadow-2xl border border-[var(--line)]">
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-4">
          <div className="flex items-center gap-2 text-[var(--btn-primary-bg)]">
            <UserPlus size={20} />
            <h2 className="text-xl font-bold text-[var(--heading)]">Add New Student</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--muted)] hover:text-[var(--heading)]"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300 border border-rose-500/20">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[var(--heading)]">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                className="mt-1 w-full text-sm"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Bharat Kumar Jain"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--heading)]">Roll Number</label>
              <input
                className="mt-1 w-full text-sm"
                type="text"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                placeholder="e.g. 2105123"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--heading)]">Student / Reg ID</label>
              <input
                className="mt-1 w-full text-sm"
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="e.g. REG-9842"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--heading)]">Email Address</label>
              <input
                className="mt-1 w-full text-sm"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--heading)]">Contact Number</label>
              <input
                className="mt-1 w-full text-sm"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--heading)]">Branch / Dept</label>
              <input
                className="mt-1 w-full text-sm"
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="e.g. CSE"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--heading)]">Section</label>
              <input
                className="mt-1 w-full text-sm"
                type="text"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="e.g. B"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--heading)]">Year / Semester</label>
              <input
                className="mt-1 w-full text-sm"
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="e.g. 3rd Year"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--heading)]">Domain / Track</label>
              <input
                className="mt-1 w-full text-sm"
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="e.g. CSE-AIML, Web Dev, Technical"
              />
            </div>

            <div className="sm:col-span-2 border-t border-[var(--line)] pt-3">
              <label className="block text-xs font-bold text-sky-600 dark:text-sky-400">
                Admin Password <span className="text-rose-500">*</span>
              </label>
              <input
                className="mt-1 w-full text-sm font-mono border-sky-400/50"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter admin password"
                required
              />
              <p className="mt-1 text-[11px] text-[var(--muted)] font-medium">
                Authorization required to save new student records.
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-[var(--line)] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost text-xs text-[var(--muted)] hover:text-[var(--heading)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary text-xs disabled:opacity-60"
            >
              {loading ? "Saving student..." : "Add Student"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
