import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// POST: Add a new student/candidate
export async function POST(request: Request) {
  try {
    const jar = await cookies();
    const auth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => jar.getAll(), setAll: () => {} } }
    );

    const { data: { user } } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

    const body = await request.json();
    const { name, student_id, roll_number, email, phone, branch, section, year, domain, additional_data, adminPassword } = body;

    const { data: profile } = await auth
      .from("profiles")
      .select("role,is_active")
      .eq("id", user.id)
      .single();

    const isAuthorizedRole = profile?.is_active && (["ADMIN", "COORDINATOR"].includes(profile.role) || user.email?.toLowerCase() === "binaryclub@gmail.com");
    const hasValidAdminPass = adminPassword && ["50060010", "pass-50060010"].includes(String(adminPassword).trim());

    if (!hasValidAdminPass && !isAuthorizedRole) {
      return NextResponse.json({ error: "Only admins or coordinators can add students, or correct admin password is required." }, { status: 403 });
    }

    if (!hasValidAdminPass) {
      return NextResponse.json(
        { error: "Incorrect admin password." },
        { status: 401 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Student name is required." }, { status: 400 });
    }

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const cleanRoll = roll_number ? String(roll_number).trim() : null;
    const cleanId = student_id ? String(student_id).trim() : null;
    const cleanEmail = email ? String(email).trim() : null;

    // Check duplicate roll number
    if (cleanRoll) {
      const { data: existingRoll } = await db
        .from("candidates")
        .select("id, name")
        .eq("roll_number", cleanRoll)
        .maybeSingle();

      if (existingRoll) {
        return NextResponse.json(
          { error: `Candidate with Roll Number '${cleanRoll}' already exists (${existingRoll.name}). Duplicate roll numbers are not allowed.` },
          { status: 400 }
        );
      }
    }

    // Check duplicate student ID
    if (cleanId) {
      const { data: existingId } = await db
        .from("candidates")
        .select("id, name")
        .eq("student_id", cleanId)
        .maybeSingle();

      if (existingId) {
        return NextResponse.json(
          { error: `Candidate with Student ID '${cleanId}' already exists (${existingId.name}). Duplicate IDs are not allowed.` },
          { status: 400 }
        );
      }
    }

    // Check duplicate email
    if (cleanEmail) {
      const { data: existingEmail } = await db
        .from("candidates")
        .select("id, name")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (existingEmail) {
        return NextResponse.json(
          { error: `Candidate with Email '${cleanEmail}' already exists (${existingEmail.name}). Duplicate emails are not allowed.` },
          { status: 400 }
        );
      }
    }

    const payload = {
      name: name.trim(),
      student_id: cleanId,
      roll_number: cleanRoll,
      email: cleanEmail,
      phone: phone ? String(phone).trim() : null,
      branch: branch ? String(branch).trim() : null,
      section: section ? String(section).trim() : null,
      year: year ? String(year).trim() : null,
      domain: domain ? String(domain).trim() : null,
      additional_data: additional_data || {
        "Full Name": name.trim(),
        "Roll Number": cleanRoll || "",
        "Student ID": cleanId || "",
        "Email": cleanEmail || "",
        "Branch": branch || "",
        "Section": section || "",
        "Domain": domain || "",
      },
    };

    const { data, error } = await db.from("candidates").insert(payload).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, candidate: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create student";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE: Delete a student/candidate by ID
export async function DELETE(request: Request) {
  try {
    const jar = await cookies();
    const auth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => jar.getAll(), setAll: () => {} } }
    );

    const { data: { user } } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    // Check password from search params or body
    let password = searchParams.get("password");
    if (!password) {
      try {
        const body = await request.clone().json();
        password = body?.password;
      } catch {
        // ignore JSON parse error if body is empty
      }
    }

    const { data: profile } = await auth
      .from("profiles")
      .select("role,is_active")
      .eq("id", user.id)
      .single();

    const isAuthorizedRole = profile?.is_active && (["ADMIN", "COORDINATOR"].includes(profile.role) || user.email?.toLowerCase() === "binaryclub@gmail.com");
    const hasValidAdminPass = password && ["50060010", "pass-50060010"].includes(password.trim());

    if (!hasValidAdminPass && !isAuthorizedRole) {
      return NextResponse.json({ error: "Only admin users can delete students, or correct admin password is required." }, { status: 403 });
    }

    if (!hasValidAdminPass) {
      return NextResponse.json(
        { error: "Incorrect admin password." },
        { status: 401 }
      );
    }

    const deleteAll = searchParams.get("all") === "true" || searchParams.get("deleteAll") === "true";

    if (!id && !deleteAll) {
      return NextResponse.json({ error: "Candidate ID or all=true parameter is required." }, { status: 400 });
    }

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    if (deleteAll) {
      const { error } = await db.from("candidates").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, deletedAll: true });
    } else {
      const { error } = await db.from("candidates").delete().eq("id", id!);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, deletedId: id });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete student";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
