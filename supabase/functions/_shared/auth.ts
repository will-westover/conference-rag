import { createClient } from "@supabase/supabase-js";
import { json } from "./cors.ts";

// Checks the caller's JWT. Returns { user } if it's valid, or { error } holding a ready-made 401 Response.
// We deploy with --no-verify-jwt (the gateway can't verify Supabase's newer ES256 tokens), so this check is ours.
export async function requireAuth(
  req: Request,
): Promise<{ user: { id: string; email?: string } } | { error: Response }> {
  // TODO: read the "Authorization" header from req; if it's missing, return { error: json({ error: "Missing Authorization header" }, 401) }

  // TODO: createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } })

  // TODO: const { data: { user }, error } = await supabase.auth.getUser() — Supabase Auth verifies the signature + expiry for you

  // TODO: if error or no user, return a 401 { error }; otherwise return { user }

  throw new Error("TODO: implement requireAuth"); // delete this line once the TODOs above are done
}
