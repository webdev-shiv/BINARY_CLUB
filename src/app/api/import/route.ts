import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const aliases: Record<string, string[]> = {
  name: [
    "name", "full name", "fullname", "student name", "candidate name",
    "applicant name", "first name", "last name", "student s name",
    "candidate s name", "name of student", "student", "candidate", "applicant"
  ],
  student_id: [
    "student id", "studentid", "id", "registration id", "registration no",
    "registration number", "reg id", "reg no", "enrollment id", "enrollment no",
    "enrollment number", "usn", "urn", "prn", "uid", "student id no",
    "student number", "user id", "app id", "application id"
  ],
  roll_number: [
    "roll number", "roll no", "roll", "rollnumber", "roll_no", "roll num",
    "roll code", "class roll no", "rollno", "univ roll no", "university roll no"
  ],
  email: [
    "email", "email address", "e mail", "email id", "e mail id", "mail",
    "student email", "official email", "personal email", "mail id", "emailid"
  ],
  phone: [
    "phone", "mobile", "contact", "phone number", "mobile number",
    "whatsapp number", "contact number", "mobile no", "phone no", "contact no",
    "whatsapp no", "whatsapp", "phone num", "mobile num", "cell", "phoneno", "contactno"
  ],
  branch: [
    "branch", "department", "dept", "course", "stream", "specialization",
    "branch name", "degree", "program", "branch dept", "department name"
  ],
  section: [
    "section", "sec", "class section", "section name"
  ],
  year: [
    "year", "academic year", "current year", "year of study", "semester",
    "sem", "batch", "passout year", "year of passing", "graduating year", "class year"
  ],
  domain: [
    "domain", "preferred domain", "applied domain", "interested domain",
    "domain preference", "role", "field", "track", "stack", "chosen domain", "preference",
    "primary domain", "technology", "tech", "area of interest", "sub domain", "sub-domain",
    "department/domain", "domain / track", "domain/track", "interest", "specialization",
    "skills", "domain name", "choice", "first choice", "domain 1", "opted domain",
    "tech domain", "design domain", "management domain"
  ],
};

const normal = (key: string) =>
  key
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const cleanRowKeys = (row: Record<string, unknown>): Record<string, unknown> => {
  const cleaned: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(row)) {
    const trimmedKey = key.trim();
    if (trimmedKey) {
      cleaned[trimmedKey] = typeof val === "string" ? val.trim() : val;
    }
  }
  return cleaned;
};

const value = (row: Record<string, unknown>, field: string): string | null => {
  const keys = Object.keys(row);
  
  // Pass 1: Exact alias match against normalized column key
  let key = keys.find((column) => aliases[field]?.includes(normal(column)));

  // Pass 2: Substring matching if exact match not found
  if (!key) {
    if (field === "email") key = keys.find((c) => normal(c).includes("email") || normal(c).includes("mail"));
    else if (field === "phone") key = keys.find((c) => normal(c).includes("phone") || normal(c).includes("mobile") || normal(c).includes("contact") || normal(c).includes("whatsapp"));
    else if (field === "roll_number") key = keys.find((c) => normal(c).includes("roll"));
    else if (field === "student_id") key = keys.find((c) => normal(c).includes("registration") || normal(c).includes("enrollment") || normal(c).includes("usn") || normal(c).includes("urn"));
    else if (field === "branch") key = keys.find((c) => normal(c).includes("branch") || normal(c).includes("department") || normal(c).includes("dept") || normal(c).includes("stream"));
    else if (field === "domain") key = keys.find((c) => normal(c).includes("domain") || normal(c).includes("track") || normal(c).includes("role") || normal(c).includes("field") || normal(c).includes("preference") || normal(c).includes("interest") || normal(c).includes("specialization"));
    else if (field === "year") key = keys.find((c) => normal(c).includes("year") || normal(c).includes("batch") || normal(c).includes("sem"));
    else if (field === "section") key = keys.find((c) => normal(c).includes("section"));
    else if (field === "name") key = keys.find((c) => normal(c).includes("name") || normal(c).includes("candidate") || normal(c).includes("student"));
  }

  // Pass 3: Composite first name + last name
  if (field === "name" && !key) {
    const fnameKey = keys.find((c) => normal(c).includes("first name") || normal(c) === "fname");
    const lnameKey = keys.find((c) => normal(c).includes("last name") || normal(c) === "lname");
    if (fnameKey || lnameKey) {
      const fname = fnameKey ? String(row[fnameKey] ?? "").trim() : "";
      const lname = lnameKey ? String(row[lnameKey] ?? "").trim() : "";
      const combined = `${fname} ${lname}`.trim();
      if (combined) return combined;
    }
  }

  const item = key ? String(row[key] ?? "").trim() : "";
  return item || null;
};

const linkType = (column: string) => {
  const key = normal(column);
  if (key.includes("linkedin")) return "linkedin";
  if (key.includes("github")) return "github";
  if (key.includes("portfolio")) return "portfolio";
  if (key.includes("resume") || key.includes("cv") || key.includes("drive")) return "resume";
  if (key.includes("behance")) return "behance";
  if (key.includes("website") || key.includes("site") || key.includes("link")) return "website";
  return null;
};

const normalizeUrl = (raw: unknown): string | null => {
  const str = String(raw ?? "").trim();
  if (!str) return null;
  if (/^https?:\/\//i.test(str)) return str;
  if (/^([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i.test(str)) {
    return `https://${str}`;
  }
  return null;
};

export async function POST(request: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "Server configuration is incomplete." }, { status: 500 });
  const jar = await cookies();
  const auth = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => jar.getAll(), setAll: () => {} } });
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { data: profile } = await auth.from("profiles").select("role,is_active").eq("id", user.id).single();
  const isAuthorized = (profile?.is_active && ["ADMIN", "COORDINATOR"].includes(profile.role)) || user.email?.toLowerCase() === "binaryclub@gmail.com";
  if (!isAuthorized) return NextResponse.json({ error: "You are not authorized to import candidates." }, { status: 403 });

  const { rows } = await request.json();
  if (!Array.isArray(rows) || rows.length > 10000) return NextResponse.json({ error: "Upload must contain between 1 and 10,000 rows." }, { status: 400 });
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY);
  let created = 0, updated = 0, skipped = 0;
  let idx = 0;

  interface ExistingCandidate {
    id: string;
    name: string | null;
    student_id: string | null;
    roll_number: string | null;
    email: string | null;
    phone: string | null;
    branch: string | null;
    section: string | null;
    year: string | null;
    domain: string | null;
    additional_data: Record<string, unknown> | null;
  }

  const batchMap = new Map<string, ExistingCandidate>();

  for (const raw of rows) {
    idx++;
    if (!raw || typeof raw !== "object") { skipped++; continue; }
    const row = cleanRowKeys(raw as Record<string, unknown>);
    
    // Check if row has any non-empty data
    const nonKeys = Object.values(row).filter((v) => v !== null && v !== undefined && String(v).trim() !== "");
    if (nonKeys.length === 0) { skipped++; continue; }

    const student_id = value(row, "student_id");
    const roll_number = value(row, "roll_number");
    const email = value(row, "email");
    
    let name = value(row, "name");
    if (!name) {
      // Fallback name if no name column was detected
      name = roll_number || student_id || email || `Candidate #${idx}`;
    }

    const rollKey = roll_number ? `roll:${roll_number.toLowerCase()}` : null;
    const sidKey = student_id ? `sid:${student_id.toLowerCase()}` : null;
    const emailKey = email ? `email:${email.toLowerCase()}` : null;
    const nameKey = name ? `name:${name.toLowerCase()}` : null;

    let existing: ExistingCandidate | null =
      (rollKey && batchMap.get(rollKey)) ||
      (sidKey && batchMap.get(sidKey)) ||
      (emailKey && batchMap.get(emailKey)) ||
      (nameKey && batchMap.get(nameKey)) ||
      null;

    if (!existing) {
      if (roll_number) existing = (await db.from("candidates").select("*").eq("roll_number", roll_number.trim()).maybeSingle()).data;
      if (!existing && student_id) existing = (await db.from("candidates").select("*").eq("student_id", student_id.trim()).maybeSingle()).data;
      if (!existing && email) existing = (await db.from("candidates").select("*").eq("email", email.trim()).maybeSingle()).data;
      if (!existing && name && name !== `Candidate #${idx}`) existing = (await db.from("candidates").select("*").ilike("name", name.trim()).maybeSingle()).data;
    }

    let candidateId: string;
    if (existing) {
      // Build partial update payload only updating missing fields
      const updatePayload: Record<string, unknown> = {};

      if ((!existing.name || existing.name.startsWith("Candidate #")) && name && !name.startsWith("Candidate #")) {
        updatePayload.name = name;
        existing.name = name;
      }
      if (!existing.roll_number && roll_number) { updatePayload.roll_number = roll_number; existing.roll_number = roll_number; }
      if (!existing.student_id && student_id) { updatePayload.student_id = student_id; existing.student_id = student_id; }
      if (!existing.email && email) { updatePayload.email = email; existing.email = email; }

      const newPhone = value(row, "phone");
      if (!existing.phone && newPhone) { updatePayload.phone = newPhone; existing.phone = newPhone; }

      const newBranch = value(row, "branch");
      if (!existing.branch && newBranch) { updatePayload.branch = newBranch; existing.branch = newBranch; }

      const newSection = value(row, "section");
      if (!existing.section && newSection) { updatePayload.section = newSection; existing.section = newSection; }

      const newYear = value(row, "year");
      if (!existing.year && newYear) { updatePayload.year = newYear; existing.year = newYear; }

      const newDomain = value(row, "domain");
      if ((!existing.domain || existing.domain === "—") && newDomain) { updatePayload.domain = newDomain; existing.domain = newDomain; }

      // Merge additional_data without overwriting existing non-empty values
      const mergedAdditional: Record<string, unknown> = { ...(existing.additional_data || {}) };
      let addedNewAttribute = false;

      for (const [k, v] of Object.entries(row)) {
        if (v !== null && v !== undefined && String(v).trim() !== "") {
          const currentVal = mergedAdditional[k];
          if (currentVal === null || currentVal === undefined || String(currentVal).trim() === "") {
            mergedAdditional[k] = v;
            addedNewAttribute = true;
          }
        }
      }

      if (addedNewAttribute) {
        updatePayload.additional_data = mergedAdditional;
        existing.additional_data = mergedAdditional;
      }

      if (Object.keys(updatePayload).length > 0) {
        const { error } = await db.from("candidates").update(updatePayload).eq("id", existing.id);
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        updated++;
      } else {
        skipped++;
      }
      candidateId = existing.id;
    } else {
      const newPayload = {
        name,
        student_id,
        roll_number,
        email,
        phone: value(row, "phone"),
        branch: value(row, "branch"),
        section: value(row, "section"),
        year: value(row, "year"),
        domain: value(row, "domain"),
        additional_data: row,
      };

      const { data, error } = await db.from("candidates").insert(newPayload).select("*").single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      existing = data as ExistingCandidate;
      candidateId = data.id;
      created++;
    }

    // Cache in batchMap so subsequent rows in the same upload match
    if (existing) {
      if (existing.roll_number) batchMap.set(`roll:${existing.roll_number.toLowerCase()}`, existing);
      if (existing.student_id) batchMap.set(`sid:${existing.student_id.toLowerCase()}`, existing);
      if (existing.email) batchMap.set(`email:${existing.email.toLowerCase()}`, existing);
      if (existing.name) batchMap.set(`name:${existing.name.toLowerCase()}`, existing);
    }

    const links = Object.entries(row).flatMap(([column, rawValue]) => {
      const kind = linkType(column);
      const url = normalizeUrl(rawValue);
      return kind && url ? [{ candidate_id: candidateId, link_type: kind, url }] : [];
    });

    if (links.length) {
      const { error } = await db.from("candidate_links").upsert(links, { onConflict: "candidate_id,link_type" });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ processed: rows.length, created, updated, skipped });
}