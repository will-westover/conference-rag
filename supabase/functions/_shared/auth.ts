import { createClient } from "@supabase/supabase-js";
import { json } from "./cors.ts";

// Checks the caller's JWT. Returns { user } if it's valid, or { error } holding a ready-made 401 Response.
// We deploy with --no-verify-jwt (the gateway can't verify Supabase's newer ES256 tokens), so this check is ours.
export async function requireAuth(
  req: Request,
): Promise<{ user: { id: string; email?: string } } | { error: Response }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: json({ error: "Missing Authorization header" }, 401) };
  }

  // A new client per request, carrying THIS caller's token. Never share one client across requests:
  // a function instance serves many users, and a shared client could act as the wrong person.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  // Asks Supabase Auth to verify the token's signature and expiry and to look the user up.
  // A logged-out browser sends the anon key as its Bearer token; that's a valid JWT but has no user, so it fails here.
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { error: json({ error: "Invalid or expired token" }, 401) };
  }

  return { user: { id: user.id, email: user.email } };
}
