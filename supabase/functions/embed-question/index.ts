import "@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
import { requireAuth } from "../_shared/auth.ts";
import { createClient } from "@supabase/supabase-js";

// Longest question we'll embed. Caps what one request can cost us (~500 tokens).
const MAX_QUESTION_CHARS = 2000;

// POST { question } → { embedding: number[1536] }. Called by getEmbedding() in app.js.
Deno.serve(async (req) => {
  // The browser sends an OPTIONS "preflight" before the real request to ask if cross-origin calls are allowed.
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Reject anyone who isn't logged in before doing anything that costs money
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  try {
    const { question } = await req.json();
    if (typeof question !== "string" || !question.trim()) {
      return json({ error: "Missing or invalid 'question' field" }, 400);
    }
    if (question.length > MAX_QUESTION_CHARS) {
      return json({ error: `Question is too long (max ${MAX_QUESTION_CHARS} characters)` }, 400);
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return json({ error: "OPENAI_API_KEY not configured" }, 500);

    // Cache lookup. "How can I find peace?" and "how can i find  peace? " are the same question,
    // so normalize before hashing. The service-role client bypasses RLS: question_cache has no
    // policies, so this function is the only thing that can read or write it.
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const questionHash = await sha256(question.trim().toLowerCase().replace(/\s+/g, " "));

    const { data: cached } = await admin
      .from("question_cache")
      .select("embedding")
      .eq("question_hash", questionHash)
      .maybeSingle();
    if (cached) {
      // pgvector comes back in its text format "[0.1,0.2,...]", which happens to be valid JSON
      return json({ embedding: JSON.parse(cached.embedding), cached: true });
    }

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      // Same model as scripts/04_embed_data.py; vectors from different models aren't comparable
      body: JSON.stringify({ model: "text-embedding-3-small", input: question.trim() }),
    });

    // 502 Bad Gateway = "a service behind me failed". Passing OpenAI's own status through would be misleading:
    // an OpenAI 401 (bad API key) would look to the browser like the USER's login had failed.
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return json({ error: `OpenAI error: ${err.error?.message ?? response.statusText}` }, 502);
    }

    const data = await response.json();
    const embedding: number[] = data.data[0].embedding;

    // Best effort: if the cache write fails the user still gets their embedding, it just won't be cached.
    // ignoreDuplicates handles two people asking the same new question at the same moment.
    const { error: cacheError } = await admin
      .from("question_cache")
      .upsert({ question_hash: questionHash, embedding: JSON.stringify(embedding) }, {
        onConflict: "question_hash",
        ignoreDuplicates: true,
      });
    if (cacheError) console.error("question_cache write failed:", cacheError.message);

    return json({ embedding, cached: false });
  } catch (err) {
    // Anything unexpected (bad JSON body, network failure) becomes a 500 instead of crashing the function.
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

// Hex SHA-256 of a string, using the Web Crypto API built into Deno
async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
