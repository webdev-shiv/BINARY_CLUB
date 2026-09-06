import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const jar = await cookies();
    const auth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => jar.getAll(), setAll: () => {} } }
    );

    const { data: { user } } = await auth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const body = await request.json();
    const {
      candidate_id,
      technical_score,
      public_speaking_score,
      projects_score,
      overall_score,
      general_remarks,
      technical_remarks,
      interview_remarks,
      recommendation,
    } = body;

    if (!candidate_id) {
      return NextResponse.json({ error: "Candidate ID is required." }, { status: 400 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Check existing evaluation for candidate to preserve version and update cleanly
    const { data: existingEv } = await db
      .from("evaluations")
      .select("id, version")
      .eq("candidate_id", candidate_id)
      .maybeSingle();

    const parseScore = (val: unknown) =>
      val !== null && val !== undefined && String(val).trim() !== "" ? Number(val) : null;

    const payload: Record<string, unknown> = {
      candidate_id,
      evaluator_id: user.id,
      technical_score: parseScore(technical_score),
      public_speaking_score: parseScore(public_speaking_score),
      projects_score: parseScore(projects_score),
      overall_score: parseScore(overall_score),
      general_remarks: general_remarks || null,
      technical_remarks: technical_remarks || null,
      interview_remarks: interview_remarks || null,
      updated_at: new Date().toISOString(),
    };

    if (existingEv) {
      payload.version = (existingEv.version ?? 0) + 1;
      const { error: updateErr } = await db
        .from("evaluations")
        .update(payload)
        .eq("id", existingEv.id);

      if (updateErr) {
        // Fallback to upsert on candidate_id on conflict
        const { error: upsertErr } = await db
          .from("evaluations")
          .upsert(payload, { onConflict: "candidate_id" });

        if (upsertErr) {
          return NextResponse.json({ error: upsertErr.message }, { status: 400 });
        }
      }
    } else {
      payload.version = 1;
      const { error: upsertErr } = await db
        .from("evaluations")
        .upsert(payload, { onConflict: "candidate_id" });

      if (upsertErr) {
        return NextResponse.json({ error: upsertErr.message }, { status: 400 });
      }
    }

    if (recommendation) {
      await db.from("candidates").update({ recommendation }).eq("id", candidate_id);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save evaluation";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
