import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const jar = await cookies();
    const auth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => jar.getAll(), setAll: () => {} } }
    );

    const { data: { user } } = await auth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Check existing profile
    const { data: existingProfile } = await db
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    const isUserAdmin = user.email?.toLowerCase() === "binaryclub@gmail.com" || user.email?.toLowerCase().startsWith("shivamgupta@");

    if (!existingProfile) {
      // Auto-create active profile for this panel/user account
      const nameFromEmail = user.email ? user.email.split("@")[0] : "Panel User";
      const { data: newProfile, error: insertErr } = await db
        .from("profiles")
        .insert({
          id: user.id,
          full_name: user.user_metadata?.full_name || nameFromEmail,
          role: isUserAdmin ? "ADMIN" : "INTERVIEWER",
          is_active: true,
        })
        .select()
        .single();

      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 400 });
      }
      return NextResponse.json({ success: true, profile: newProfile, created: true });
    } else {
      const updates: Record<string, unknown> = {};
      if (!existingProfile.is_active) updates.is_active = true;
      if (isUserAdmin && existingProfile.role !== "ADMIN") updates.role = "ADMIN";

      if (Object.keys(updates).length > 0) {
        const { data: updatedProfile, error: updateErr } = await db
          .from("profiles")
          .update(updates)
          .eq("id", user.id)
          .select()
          .single();

        if (updateErr) {
          return NextResponse.json({ error: updateErr.message }, { status: 400 });
        }
        return NextResponse.json({ success: true, profile: updatedProfile, updated: true });
      }
    }

    return NextResponse.json({ success: true, profile: existingProfile });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Ensure profile error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
